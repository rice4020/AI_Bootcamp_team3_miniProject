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

  const serviceKey = process.env.KOREA_WEATHER_API_KEY;
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
    console.log('🔄 [API/legal-spots] Neon Database 실시간 스팟 데이터 조회 시작...');
    
    // 2. Neon DB의 정식 테이블인 "Spot" 조회를 1순위로 시도합니다. (팀 DB 구조)
    try {
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
        // DB 테이블 변경 없이 rules 내 문자열 조각을 인식하여 아파트 장터 여부를 동적으로 판별합니다.
        isApartment: row.rules?.includes("⚠️ 관리사무소") || row.rules?.includes("아파트") || false
      }));

      console.log(`✅ [API/legal-spots] "Spot" 테이블로부터 ${formatted.length}건 데이터 반환 완료.`);
      return NextResponse.json({ success: true, isMock: false, data: formatted });

    } catch (prismaError) {
      console.warn('⚠️ [API/legal-spots] "Spot" 테이블 조회 실패. 임시 "legal_spots" 테이블 조회로 전환합니다:', prismaError.message);
      
      // 3. 만약 "Spot"이 없다면, 기존 임시 테이블 "legal_spots"에서 조회를 시도합니다.
      //    (테이블 자동 생성 및 정부 OpenAPI 동기화 로직 가동)
      
      // 테이블 없으면 자동 생성
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS legal_spots (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          lat DOUBLE PRECISION NOT NULL,
          lng DOUBLE PRECISION NOT NULL,
          rules TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await dbPool.query(createTableQuery);

      // 데이터 갱신 점검
      const countRes = await dbPool.query('SELECT COUNT(*) as count, MAX(updated_at) as last_update FROM legal_spots');
      const dbCount = parseInt(countRes.rows[0].count);
      const lastUpdate = countRes.rows[0].last_update ? new Date(countRes.rows[0].last_update) : null;
      const needsSync = dbCount === 0 || !lastUpdate || (Date.now() - lastUpdate.getTime() > 24 * 60 * 60 * 1000);

      // 정부 API 동기화 가동
      if (needsSync && serviceKey) {
        console.log("📡 [API/legal-spots] 24시간 동기화 주기 도달! 공공 OpenAPI에서 실시간 데이터 갱신을 실행합니다...");
        try {
          const targetUrl = `https://api.data.go.kr/openapi/tn_pubr_public_food_truck_permit_area_api?serviceKey=${serviceKey}&type=json&pageNo=1&numOfRows=1000`;
          const apiResponse = await fetch(targetUrl);

          if (apiResponse.ok) {
            const resData = await apiResponse.json();
            const items = resData?.response?.body?.items;

            if (items && Array.isArray(items) && items.length > 0) {
              const todayStr = new Date().toISOString().split('T')[0]; // "2026-07-06"
              await dbPool.query('BEGIN');
              try {
                for (let i = 0; i < items.length; i++) {
                  const item = items[i];
                  const lat = parseFloat(item.latitude);
                  const lng = parseFloat(item.longitude);

                  // [필터 1] 위경도 값 누락 및 유효 범위 체크
                  if (!isNaN(lat) && !isNaN(lng) && lat > 33 && lat < 39 && lng > 124 && lng < 132) {
                    
                    // [필터 2] 오늘 날짜보다 이전인 허가 종료된 스팟 제외
                    const endDe = item.permitAreaEndDe || item.operatingEndDe;
                    if (endDe && endDe.trim() !== "") {
                      if (endDe < todayStr) {
                        continue; // 만료된 구역이므로 제외
                      }
                    }

                    const name = item.permitAreaNm || "푸드트럭 허가구역";
                    const mngAgency = item.permitAreaMngNm || "지자체 관리기관";
                    const startTm = item.operatingStrtTm || "미정";
                    const endTm = item.operatingEndTm || "미정";
                    const address = item.rdnmadr || item.lnmadr || "주소 정보 없음";
                    
                    // [필터 3] 장소유형이 99(아파트 장터)이거나 명칭/주소에 아파트가 포함될 경우
                    const isApt = item.permitAreaType === '99' || item.permitAreaType === 99 || name.includes('아파트') || address.includes('아파트');
                    
                    let rulesText = "";
                    if (isApt) {
                      rulesText = `⚠️ 관리사무소 사전 협의 필요 | 아파트 장터 구역 | 관리기관: ${mngAgency} | 운영시간: ${startTm} ~ ${endTm} | 소재지: ${address}`;
                    } else {
                      const youthFav = item.prtcstPermitAt === 'Y' ? "🟢 청년층/소외계층 신청 우대 구역" : "합법 점용 지정 구역";
                      rulesText = `${youthFav} | 관리기관: ${mngAgency} | 운영시간: ${startTm} ~ ${endTm} | 소재지: ${address}`;
                    }
                    
                    const id = `gov-spot-${i}`;

                    await dbPool.query(`
                      INSERT INTO legal_spots (id, name, lat, lng, rules, updated_at)
                      VALUES ($1, $2, $3, $4, $5, NOW())
                      ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        lat = EXCLUDED.lat,
                        lng = EXCLUDED.lng,
                        rules = EXCLUDED.rules,
                        updated_at = NOW()
                    `, [id, name, lat, lng, rulesText]);
                  }
                }
                await dbPool.query('COMMIT');
                console.log("✅ [API/legal-spots] 임시 테이블 자동 동기화(UPSERT) 적재 완결!");
              } catch (txErr) {
                await dbPool.query('ROLLBACK');
                console.error("❌ [API/legal-spots] DB 트랜잭션 에러로 롤백을 실행합니다:", txErr.message);
                throw txErr;
              }
            }
          }
        } catch (syncErr) {
          console.warn("⚠️ [API/legal-spots] 정부 API 동기화 실패 (기존 임시 DB로 진행):", syncErr.message);
        }
      }

      // 최종 "legal_spots" 조회 및 포맷팅 (우리의 Spot DB 스키마 규격으로 정제)
      const dbSpots = await dbPool.query('SELECT id, name, lat, lng, rules FROM legal_spots ORDER BY id ASC');
      
      const formatted = dbSpots.rows.map(row => {
        let address = "주소 정보 없음";
        const addrMatch = row.rules.match(/소재지:\s*(.*)/);
        if (addrMatch && addrMatch[1]) {
          address = addrMatch[1].trim();
        }
        
        const description = row.rules.split(" | 소재지:")[0];

        return {
          id: row.id,
          name: row.name,
          address: address,
          latitude: parseFloat(row.lat),
          longitude: parseFloat(row.lng),
          description: description,
          isApartment: row.rules?.includes("⚠️ 관리사무소") || row.rules?.includes("아파트") || false
        };
      });

      console.log(`✅ [API/legal-spots] 임시 "legal_spots"로부터 ${formatted.length}건 데이터 반환 완료.`);
      return NextResponse.json({ success: true, isMock: false, data: formatted });
    }

  } catch (dbError) {
    console.error("❌ [API/legal-spots] Neon DB 통신 실패 (내장 전국 데이터로 안전 우회):", dbError.message);
    return NextResponse.json({ 
      success: true, 
      isMock: true, 
      data: fallbackSpots 
    });
  }
}
