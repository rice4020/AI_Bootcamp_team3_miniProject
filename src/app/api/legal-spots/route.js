import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { IS_MOCK_MODE } from '@/lib/db';
import fallbackSpots from '@/utils/legal_spots_data.json';

// 🔌 Neon DB 연결을 위한 싱글톤 커넥션 풀 선언
let pool = null;

function getDbPool() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.trim() === "") return null;

  if (!pool) {
    console.log("🔌 [Neon DB] 스팟 API 최초 연결 풀을 설정합니다.");
    pool = new Pool({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false // Neon DB 연결용 필수 SSL 설정
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }
  return pool;
}

/**
 * 🎡 전국 푸드트럭 합법 허가구역(스팟) 목록 조회 API
 * GET /api/legal-spots
 */
export async function GET() {
  // 1. [안전장치] 만약 로컬에 DATABASE_URL이 지정되어 있지 않은 가상 모드(Mock Mode)라면
  //    데이터베이스 서버에 절대 접근하지 않고 즉시 내장된 전국 실제 데이터(54개)를 반환합니다.
  if (IS_MOCK_MODE) {
    console.log('ℹ️ [API/legal-spots] DATABASE_URL이 없어 가상(Mock) 모드로 작동 중합니다. 내장 전국 데이터를 공급합니다.');
    return NextResponse.json({ 
      success: true, 
      isMock: true, 
      data: fallbackSpots 
    });
  }

  // 💡 기상청 키보다 인코딩이 더 안전하게 제공되는 소상공인 범용 API Key를 1순위 동기화 키로 채택합니다.
  const serviceKey = process.env.KOREA_COMMERCIAL_API_KEY || process.env.KOREA_WEATHER_API_KEY;
  const dbPool = getDbPool();

  // 만약 환경 변수가 이상하여 DB 풀을 생성하지 못했을 때를 대비한 2차 폴백
  if (!dbPool) {
    console.warn("⚠️ [API/legal-spots] DB 풀을 기동할 수 없어 내장 전국 데이터(Fallback)를 작동시킵니다.");
    return NextResponse.json({ 
      success: true, 
      isMock: true, 
      data: fallbackSpots 
    });
  }

  try {
    console.log('🔄 [API/legal-spots] Neon Database 실시간 스팟 데이터 동기화 점검 시작...');
    
    // A. 현재 DB의 정식 테이블 "Spot" 내 데이터 개수를 선제 스캔합니다.
    let dbCount = 0;
    try {
      const countRes = await dbPool.query('SELECT COUNT(*) AS count FROM "Spot"');
      dbCount = parseInt(countRes.rows[0].count);
      console.log(`📊 [API/legal-spots] 현재 Neon DB 정식 Spot 테이블 레코드 수: ${dbCount}개`);
    } catch (tblErr) {
      console.warn('⚠️ [API/legal-spots] "Spot" 테이블 미존재 혹은 조회 오류. 자동 테이블 생성으로 우회합니다:', tblErr.message);
      // 테이블이 아직 DB에 없을 때 자동 복구를 위한 스키마 생성문 기동
      await dbPool.query(`
        CREATE TABLE IF NOT EXISTS "Spot" (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(150) NOT NULL,
          address VARCHAR(255) NOT NULL,
          latitude NUMERIC(10, 6) NOT NULL,
          longitude NUMERIC(10, 6) NOT NULL,
          "rulesDescription" TEXT,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    // B. 만약 DB에 저장된 스팟 개수가 너무 빈약하다면(예: MVP 테스트용 6건 상태 등),
    //    백엔드가 실시간으로 정부 OpenAPI를 노킹하여 전국 1,000건의 온전한 스팟 데이터를 땡겨와 DB에 싱크(UPSERT)합니다!
    if (dbCount < 10 && serviceKey) {
      console.log("📡 [API/legal-spots] DB 스팟 정보가 극히 부족하여 공공 OpenAPI 실시간 동기화를 가동합니다...");
      try {
        const targetUrl = `https://api.data.go.kr/openapi/tn_pubr_public_food_truck_permit_area_api?serviceKey=${serviceKey}&type=json&pageNo=1&numOfRows=1000`;
        const apiResponse = await fetch(targetUrl);

        if (apiResponse.ok) {
          const resData = await apiResponse.json();
          const items = resData?.response?.body?.items;

          if (items && Array.isArray(items) && items.length > 0) {
            const todayStr = new Date().toISOString().split('T')[0];
            await dbPool.query('BEGIN');
            
            try {
              for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const lat = parseFloat(item.latitude);
                const lng = parseFloat(item.longitude);

                // 유효 위경도 범위 체크
                if (!isNaN(lat) && !isNaN(lng) && lat > 33 && lat < 39 && lng > 124 && lng < 132) {
                  // 허가 기간 만료 스팟 필터
                  const endDe = item.permitAreaEndDe || item.operatingEndDe;
                  if (endDe && endDe.trim() !== "" && endDe < todayStr) {
                    continue; 
                  }

                  const name = item.permitAreaNm || "푸드트럭 허가구역";
                  const mngAgency = item.permitAreaMngNm || "지자체 관리기관";
                  const startTm = item.operatingStrtTm || "미정";
                  const endTm = item.operatingEndTm || "미정";
                  const address = item.rdnmadr || item.lnmadr || "주소 정보 없음";
                  
                  const isApt = item.permitAreaType === '99' || item.permitAreaType === 99 || name.includes('아파트') || address.includes('아파트');
                  
                  let rulesText = "";
                  if (isApt) {
                    rulesText = `⚠️ 관리사무소 사전 협의 필요 | 아파트 장터 구역 | 관리기관: ${mngAgency} | 운영시간: ${startTm} ~ ${endTm} | 소재지: ${address}`;
                  } else {
                    const youthFav = item.prtcstPermitAt === 'Y' ? "🟢 청년층/소외계층 신청 우대 구역" : "합법 점용 지정 구역";
                    rulesText = `${youthFav} | 관리기관: ${mngAgency} | 운영시간: ${startTm} ~ ${endTm} | 소재지: ${address}`;
                  }
                  
                  const id = `gov-spot-${i}`;

                  // Neon DB 정식 "Spot" 테이블에 실시간으로 UPSERT 동기화!
                  await dbPool.query(`
                    INSERT INTO "Spot" (id, name, address, latitude, longitude, "rulesDescription", "updatedAt")
                    VALUES ($1, $2, $3, $4, $5, $6, NOW())
                    ON CONFLICT (id) DO UPDATE SET
                      name = EXCLUDED.name,
                      address = EXCLUDED.address,
                      latitude = EXCLUDED.latitude,
                      longitude = EXCLUDED.longitude,
                      "rulesDescription" = EXCLUDED."rulesDescription",
                      "updatedAt" = NOW()
                  `, [id, name, address, lat, lng, rulesText]);
                }
              }
              await dbPool.query('COMMIT');
              console.log("✅ [API/legal-spots] 정부 OpenAPI 데이터를 Neon DB 'Spot' 테이블에 실시간 동기화 완결!");
            } catch (txErr) {
              await dbPool.query('ROLLBACK');
              console.error("❌ [API/legal-spots] DB 동기화 트랜잭션 에러 롤백:", txErr.message);
              throw txErr;
            }
          }
        }
      } catch (syncErr) {
        console.warn("⚠️ [API/legal-spots] 실시간 정부 API 동기화 실패 (로컬 및 기존 DB 데이터 병합으로 대체):", syncErr.message);
      }
    }

    // C. 동기화 처리를 마친 정식 테이블 "Spot"을 최종 조회하여 유저에게 반환합니다.
    const dbSpots = await dbPool.query(`
      SELECT 
        id, 
        name, 
        address, 
        latitude AS "lat", 
        longitude AS "lng", 
        "rulesDescription" AS "rules" 
      FROM "Spot" 
      ORDER BY id ASC
    `);

    const formatted = dbSpots.rows.map(row => ({
      id: row.id,
      name: row.name,
      address: row.address,
      latitude: parseFloat(row.lat),
      longitude: parseFloat(row.lng),
      description: row.rules,
      isApartment: row.rules?.includes("⚠️ 관리사무소") || row.rules?.includes("아파트") || false
    }));

    // 만약 여전히 통신실패 등으로 DB 개수가 10개 미만일 때 최후의 보루로 로컬 검증 백업본 병합 가동
    if (formatted.length < 10) {
      const existingNames = new Set(formatted.map(s => s.name));
      fallbackSpots.forEach(fallback => {
        if (!existingNames.has(fallback.name)) {
          formatted.push({
            id: fallback.id,
            name: fallback.name,
            address: fallback.address,
            latitude: parseFloat(fallback.latitude || fallback.lat),
            longitude: parseFloat(fallback.longitude || fallback.lng),
            description: fallback.description || fallback.rules,
            isApartment: (fallback.description || fallback.rules)?.includes("⚠️ 관리사무소") || (fallback.description || fallback.rules)?.includes("아파트") || false
          });
        }
      });
    }

    console.log(`✅ [API/legal-spots] 동기화 필터를 통과한 전국 총 ${formatted.length}건 데이터 수집 완료.`);
    return NextResponse.json({ success: true, isMock: false, data: formatted });

  } catch (dbError) {
    console.error("❌ [API/legal-spots] Neon DB 조회 장애 발생 (샘플 백업본으로 우회 공급):", dbError.message);
    return NextResponse.json({ 
      success: true, 
      isMock: true, 
      data: fallbackSpots 
    });
  }
}
