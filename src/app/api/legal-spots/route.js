import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { IS_MOCK_MODE } from '@/lib/db';
import fallbackSpots from '@/utils/legal_spots_data.json';

// 🔌 Neon DB 연결을 위한 싱글톤 커넥션 풀 선언
let pool = null;

function getDbPool() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.trim() === "") return null;

  // 💡 가짜 DB 주소 플레이스홀더가 기입된 경우, 진짜 연동을 시도하지 않고 모의(Mock) 모드로 작동하도록 차단
  if (
    dbUrl.includes("your-neon-hostname") || 
    dbUrl.includes("username:password")
  ) {
    return null;
  }

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
export async function GET(request) {
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

  const { searchParams } = new URL(request.url || '');
  const forceSync = searchParams.get('force') === 'true';

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
    
    // A. 1단계: Spot 테이블 자동 생성 및 approved 컬럼 마이그레이션 점검
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS "Spot" (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        address VARCHAR(255) NOT NULL,
        latitude NUMERIC(10, 6) NOT NULL,
        longitude NUMERIC(10, 6) NOT NULL,
        "rulesDescription" TEXT,
        approved BOOLEAN DEFAULT TRUE,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 하위 호환성 확보: 기존 테이블에 approved 컬럼이 없는 경우를 위한 조치
    await dbPool.query('ALTER TABLE "Spot" ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT TRUE');

    // B. 2단계: 현재 DB 내 저장 개수 및 마지막 자동 동기화 갱신 날짜 확인
    const countRes = await dbPool.query('SELECT COUNT(*) AS count, MAX("updatedAt") AS last_update FROM "Spot"');
    const dbCount = parseInt(countRes.rows[0].count || '0');
    const lastUpdate = countRes.rows[0].last_update ? new Date(countRes.rows[0].last_update) : null;

    // 🕒 동기화 주기: 데이터가 없거나 24시간이 경과한 경우 자가 동기화 실행 (forceSync 파라미터 유무 체크)
    const needsSync = forceSync || dbCount === 0 || !lastUpdate || (Date.now() - lastUpdate.getTime() > 24 * 60 * 60 * 1000);

    if (needsSync && serviceKey) {
      console.log("📡 [API/legal-spots] 24시간 주기 갱신 도달! 공공 OpenAPI에서 실시간 데이터를 동기화합니다...");
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
                    INSERT INTO "Spot" (id, name, address, latitude, longitude, "rulesDescription", approved, "updatedAt")
                    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                    ON CONFLICT (id) DO UPDATE SET
                      name = EXCLUDED.name,
                      address = EXCLUDED.address,
                      latitude = EXCLUDED.latitude,
                      longitude = EXCLUDED.longitude,
                      "rulesDescription" = EXCLUDED."rulesDescription",
                      "updatedAt" = NOW()
                  `, [id, name, address, lat, lng, rulesText, true]);
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

    // 💡 만약 DB가 여전히 텅 비어있다면, 사용자 경험을 위해 백업 데이터를 DB에 강제 시딩(Seeding)합니다.
    const reCountRes = await dbPool.query('SELECT COUNT(*) AS count FROM "Spot"');
    const finalDbCount = parseInt(reCountRes.rows[0].count || '0');
    if (finalDbCount === 0) {
      console.log("ℹ      [API/legal-spots] Neon DB가 비어있습니다. 백업 데이터를 DB에 자동 시딩합니다...");
      await dbPool.query('BEGIN');
      try {
        for (let i = 0; i < fallbackSpots.length; i++) {
          const spot = fallbackSpots[i];
          await dbPool.query(`
            INSERT INTO "Spot" (id, name, address, latitude, longitude, "rulesDescription", approved, "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (id) DO NOTHING
          `, [spot.id || `fallback-spot-${i}`, spot.name, spot.address, parseFloat(spot.latitude || spot.lat), parseFloat(spot.longitude || spot.lng), spot.description || spot.rules, true]);
        }
        await dbPool.query('COMMIT');
        console.log("✅ [API/legal-spots] Neon DB 백업 명당 시딩 완결!");
      } catch (seedErr) {
        await dbPool.query('ROLLBACK');
        console.error("❌ [API/legal-spots] Neon DB 시딩 중 오류 발생:", seedErr.message);
      }
    }

    // C. 3단계: 동기화 처리를 마친 정식 테이블 "Spot"을 최종 조회하여 유저에게 반환합니다. (승인된 스팟만)
    const dbSpots = await dbPool.query(`
      SELECT 
        id, 
        name, 
        address, 
        latitude AS "lat", 
        longitude AS "lng", 
        "rulesDescription" AS "rules" 
      FROM "Spot" 
      WHERE approved = TRUE
      ORDER BY id ASC
    `);

    let formatted = dbSpots.rows.map(row => ({
      id: row.id,
      name: row.name,
      address: row.address,
      latitude: parseFloat(row.lat),
      longitude: parseFloat(row.lng),
      description: row.rules,
      isApartment: row.rules?.includes("⚠️ 관리사무소") || row.rules?.includes("아파트") || false
    }));

    // [중복 제거] 공공데이터 포털에서 동일한 장소(동일한 이름)가 다수 내려오는 현상 방지
    const uniqueSpotsMap = new Map();
    formatted.forEach(spot => {
      if (!uniqueSpotsMap.has(spot.name)) {
        uniqueSpotsMap.set(spot.name, spot);
      }
    });
    formatted = Array.from(uniqueSpotsMap.values());

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
