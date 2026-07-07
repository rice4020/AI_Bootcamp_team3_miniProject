import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// 🚨 Neon DB 연동 실패 또는 DATABASE_URL이 없을 때 사용할 Fail-safe 정적 실데이터 30선
const FALLBACK_LEGAL_SPOTS = [
  {
    id: 'gov-spot-1',
    name: "여의도 한강공원 멀티플라자 광장",
    lat: 37.5284,
    lng: 126.9320,
    rules: "합법 점용 허가구역 | 운영시간: 14:00 ~ 22:00 | 소재지: 서울 영등포구 여의동로 330",
  },
  {
    id: 'gov-spot-2',
    name: "홍대 걷고싶은거리 버스킹 광장",
    lat: 37.5562,
    lng: 126.9225,
    rules: "청년창업 지원구역 | 운영시간: 11:00 ~ 21:00 | 소재지: 서울 마포구 어울마당로 115",
  },
  {
    id: 'gov-spot-3',
    name: "강남역 8번출구 대형빌딩 전면공지",
    lat: 37.4982,
    lng: 127.0276,
    rules: "민간 빌딩 전면공지 | 운영시간: 11:00 ~ 14:00 | 소재지: 서울 서초구 서초대로 397",
  },
  {
    id: 'gov-spot-4',
    name: "청계천 광통교 남단 광장",
    lat: 37.5688,
    lng: 126.9802,
    rules: "문화축제 연계구역 | 운영시간: 17:00 ~ 22:00 | 소재지: 서울 중구 남대문로9길 40",
  },
  {
    id: 'gov-spot-5',
    name: "반포 한강공원 세빛섬 달빛광장",
    lat: 37.5113,
    lng: 126.9965,
    rules: "한강공원 공식 지정구역 | 운영시간: 16:00 ~ 23:00 | 소재지: 서울 서초구 신반포로11길 40",
  },
  {
    id: 'gov-spot-6',
    name: "서울숲공원 야외광장 진입로",
    lat: 37.5443,
    lng: 127.0374,
    rules: "공원 점용 허가구역 | 운영시간: 10:00 ~ 20:00 | 소재지: 서울 성동구 동부간선도로 273",
  },
  {
    id: 'gov-spot-7',
    name: "뚝섬 한강공원 수변광장 뒷편",
    lat: 37.5298,
    lng: 127.0700,
    rules: "지자체 공식 푸드구역 | 운영시간: 13:00 ~ 22:00 | 소재지: 서울 광진구 자양동 704",
  },
  {
    id: 'gov-spot-8',
    name: "망원 한강공원 선착장 인근",
    lat: 37.5557,
    lng: 126.8943,
    rules: "망원 수변 특화구역 | 운영시간: 14:00 ~ 21:00 | 소재지: 서울 마포구 마포나루길 467",
  },
  {
    id: 'gov-spot-9',
    name: "이촌 한강공원 인라인스케이트장 옆",
    lat: 37.5180,
    lng: 126.9635,
    rules: "공원 레저 연계 스팟 | 운영시간: 12:00 ~ 20:00 | 소재지: 서울 용산구 이촌로72길 62",
  },
  {
    id: 'gov-spot-10',
    name: "상암 월드컵공원 평화의 광장",
    lat: 37.5684,
    lng: 126.8988,
    rules: "월드컵 경기 연계구역 | 운영시간: 10:00 ~ 21:00 | 소재지: 서울 마포구 월드컵로 291",
  },
  {
    id: 'gov-spot-11',
    name: "어린이대공원 후문 주차 광장",
    lat: 37.5492,
    lng: 127.0818,
    rules: "가족단위 테마 상권 | 운영시간: 09:00 ~ 19:00 | 소재지: 서울 광진구 능동로 216",
  },
  {
    id: 'gov-spot-12',
    name: "북서울꿈의숲 서문 정문진입 광장",
    lat: 37.6206,
    lng: 127.0428,
    rules: "북부 문화 휴양 스팟 | 운영시간: 11:00 ~ 20:00 | 소재지: 서울 강북구 월계로 173",
  },
  {
    id: 'gov-spot-13',
    name: "올림픽공원 평화의 문 광장 야외",
    lat: 37.5173,
    lng: 127.1209,
    rules: "체육행사 연계 합법구역 | 운영시간: 10:00 ~ 22:00 | 소재지: 서울 송파구 올림픽로 424",
  },
  {
    id: 'gov-spot-14',
    name: "신촌 연세로 차없는거리 진입광장",
    lat: 37.5583,
    lng: 126.9366,
    rules: "대학가 청년창업 구역 | 운영시간: 12:00 ~ 22:00 | 소재지: 서울 서대문구 신촌동 15",
  },
  {
    id: 'gov-spot-15',
    name: "동대문 디자인 플라자 (DDP) 남측광장",
    lat: 37.5668,
    lng: 127.0094,
    rules: "동대문 패션특구 축제구역 | 운영시간: 16:00 ~ 23:00 | 소재지: 서울 중구 을지로 281",
  },
  {
    id: 'gov-spot-16',
    name: "마포 문화비축기지 메인 야외광장",
    lat: 37.5702,
    lng: 126.8953,
    rules: "문화비축 예술시장 스팟 | 운영시간: 12:00 ~ 21:00 | 소재지: 서울 마포구 증산로 87",
  },
  {
    id: 'gov-spot-17',
    name: "일산 호수공원 한울광장 수변로",
    lat: 37.6582,
    lng: 126.7645,
    rules: "꽃박람회 관광 활성화 스팟 | 운영시간: 10:00 ~ 21:00 | 소재지: 경기 고양시 일산동구 호수로 595",
  },
  {
    id: 'gov-spot-18',
    name: "수원 화성행궁 앞 대형 광장",
    lat: 37.2828,
    lng: 127.0135,
    rules: "역사문화 축제 연계구역 | 운영시간: 11:00 ~ 22:00 | 소재지: 경기 수원시 팔달구 정조로 825",
  },
  {
    id: 'gov-spot-19',
    name: "송도 센트럴파크 잔디광장 부근",
    lat: 37.3916,
    lng: 126.6385,
    rules: "인천 경제자유구역 지정스팟 | 운영시간: 11:00 ~ 20:00 | 소재지: 인천 연수구 컨벤시아대로 160",
  },
  {
    id: 'gov-spot-20',
    name: "인천 소래포구 해오름공원 야외광장",
    lat: 37.3995,
    lng: 126.7345,
    rules: "어시장 관광 활성화 특구 | 운영시간: 13:00 ~ 22:00 | 소재지: 인천 남동구 아암대로 1562",
  },
  {
    id: 'gov-spot-21',
    name: "성남 분당 율동공원 주차장 옆 진입로",
    lat: 37.3788,
    lng: 127.1478,
    rules: "가족 나들이 특수 상권 | 운영시간: 09:00 ~ 19:00 | 소재지: 경기 성남시 분당구 율동 1",
  },
  {
    id: 'gov-spot-22',
    name: "과천 서울대공원 매표소 인근 광장",
    lat: 37.4278,
    lng: 127.0175,
    rules: "동물원/놀이공원 관광 상권 | 운영시간: 09:00 ~ 18:00 | 소재지: 경기 과천시 대공원광장로 102",
  },
  {
    id: 'gov-spot-23',
    name: "가평 자라섬 서도 진입 잔디광장",
    lat: 37.8205,
    lng: 127.5235,
    rules: "재즈 페스티벌 지정 푸드존 | 운영시간: 11:00 ~ 23:00 | 소재지: 경기 가평군 가평읍 자라섬로 60",
  },
  {
    id: 'gov-spot-24',
    name: "수원 광교호수공원 거울못 주변",
    lat: 37.2845,
    lng: 127.0655,
    rules: "신도시 호수공원 특화구역 | 운영시간: 12:00 ~ 21:00 | 소재지: 경기 수원시 영통구 광교호수로 165",
  },
  {
    id: 'gov-spot-25',
    name: "부천 중앙공원 야외음악당 뒷편",
    lat: 37.5028,
    lng: 126.7648,
    rules: "문화예술 활성화 시범구역 | 운영시간: 10:00 ~ 20:00 | 소재지: 경기 부천시 소향로 162",
  },
  {
    id: 'gov-spot-26',
    name: "시흥 배곧생명공원 전망대 앞",
    lat: 37.3725,
    lng: 126.7215,
    rules: "해안 낙조관람 나들이 상권 | 운영시간: 13:00 ~ 21:00 | 소재지: 경기 시흥시 배곧2로 25",
  },
  {
    id: 'gov-spot-27',
    name: "안산 대부도 방아머리해변 진입로",
    lat: 37.2982,
    lng: 126.5925,
    rules: "관광 유원지 주말 특화 상권 | 운영시간: 10:00 ~ 22:00 | 소재지: 경기 안산시 단원구 대부황금로 112",
  },
  {
    id: 'gov-spot-28',
    name: "파주 임진각 평화누리공원 잔디광장",
    lat: 37.8925,
    lng: 126.7415,
    rules: "안보관광 특수 지정구역 | 운영시간: 09:00 ~ 18:00 | 소재지: 경기 파주시 임진각로 148-40",
  },
  {
    id: 'gov-spot-29',
    name: "남양주 삼패공원 야외분수대 광장",
    lat: 37.5828,
    lng: 127.2045,
    rules: "한강 수변공원 나들이 스팟 | 운영시간: 11:00 ~ 20:00 | 소재지: 경기 남양주시 강변북로 1630",
  },
  {
    id: 'gov-spot-30',
    name: "대학로 마로니에공원 야외무대 주변",
    lat: 37.5815,
    lng: 127.0022,
    rules: "문화예술공연 특화 합법구역 | 운영시간: 12:00 ~ 21:30 | 소재지: 서울 종로구 대학로 104"
  }
];

// 🔌 Neon DB 연결을 위한 싱글톤 커넥션 풀 선언
let pool = null;

function getDbPool() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;
  
  // 💡 가짜 DB 주소 플레이스홀더가 기입된 경우, 진짜 연동을 시도하지 않고 모의(Mock) 모드로 작동하도록 차단
  if (
    dbUrl.includes("your-neon-hostname") || 
    dbUrl.includes("username:password")
  ) {
    return null;
  }

  if (!pool) {
    console.log("🔌 [Neon DB] 최초 연결 풀을 설정합니다.");
    pool = new Pool({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false // Neon DB 연결용 필수 SSL 설정
      },
      max: 10, // 커넥션 풀 크기 제한
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }
  return pool;
}

export async function GET(request) {
  // 공공데이터포털 서비스키 및 Neon DB URL 취득
  const { searchParams } = new URL(request.url || '');
  const forceSync = searchParams.get('force') === 'true';
  const serviceKey = process.env.KOREA_WEATHER_API_KEY;
  const dbPool = getDbPool();

  // 만약 DATABASE_URL이 지정되어 있지 않다면 즉시 로컬 백업 30대 명당을 던져줍니다 (연결 유예 및 Fail-safe 보장)
  if (!dbPool) {
    console.warn("⚠️ [API Route] DATABASE_URL이 기입되지 않아 임시 로컬 DB(Fallback)를 작동시킵니다. (나중에 연동 가능)");
    return NextResponse.json({ 
      success: true, 
      isMock: true, 
      data: FALLBACK_LEGAL_SPOTS, 
      info: "Neon DB 연동 유예 상태 (DATABASE_URL 설정 후 자동 데이터베이스 기동 가능)"
    });
  }

  try {
    // 1. 테이블 자동 감지 및 생성 (Neon DB 셋업 편의용)
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS legal_spots (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        rules TEXT,
        approved BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await dbPool.query(createTableQuery);

    // 하위 호환성 확보: 기존 테이블에 approved 컬럼이 없는 경우를 위한 조치
    await dbPool.query('ALTER TABLE legal_spots ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT TRUE');

    // 2. 현재 DB 내 저장 개수 및 마지막 자동 동기화 갱신 날짜 확인
    const countRes = await dbPool.query('SELECT COUNT(*) as count, MAX(updated_at) as last_update FROM legal_spots');
    const dbCount = parseInt(countRes.rows[0].count);
    const lastUpdate = countRes.rows[0].last_update ? new Date(countRes.rows[0].last_update) : null;

    // 🕒 동기화 주기: 데이터가 없거나 24시간이 경과한 경우 자가 동기화 실행 (forceSync 파라미터 유무 체크)
    const needsSync = forceSync || dbCount === 0 || !lastUpdate || (Date.now() - lastUpdate.getTime() > 24 * 60 * 60 * 1000);

    if (needsSync && serviceKey) {
      console.log("📡 [API Route] 24시간 주기 갱신 도달! 공공 OpenAPI에서 실시간 데이터를 동기화합니다...");
      try {
        // 공공데이터 OpenAPI 전국푸드트럭허가구역 1000개 수집
        const targetUrl = `https://api.data.go.kr/openapi/tn_pubr_public_food_truck_permit_area_api?serviceKey=${encodeURIComponent(serviceKey)}&type=json&pageNo=1&numOfRows=1000`;
        const apiResponse = await fetch(targetUrl, { next: { revalidate: 0 } }); // 강제 최신조회

        if (apiResponse.ok) {
          const resData = await apiResponse.json();
          const items = resData?.response?.body?.items;

          if (items && Array.isArray(items) && items.length > 0) {
            console.log(`📡 [API Route] 정부 API 수신 성공 (${items.length}건). Neon DB 적재를 실행합니다.`);
            
            // Neon DB에 트랜잭션 단위로 UPSERT (성능과 일관성 유지)
            await dbPool.query('BEGIN');
            try {
              for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const lat = parseFloat(item.latitude);
                const lng = parseFloat(item.longitude);

                // 유효 좌표 필터링
                if (!isNaN(lat) && !isNaN(lng) && lat > 33 && lat < 39 && lng > 124 && lng < 132) {
                  const name = item.permitAreaNm || "푸드트럭 허가구역";
                  const mngAgency = item.permitAreaMngNm || "지자체 관리기관";
                  const startTm = item.operatingStrtTm || "미정";
                  const endTm = item.operatingEndTm || "미정";
                  const address = item.rdnmadr || item.lnmadr || "주소 정보 없음";
                  const youthFav = item.prtcstPermitAt === 'Y' ? "🟢 청년층/소외계층 신청 우대 구역" : "합법 점용 지정 구역";
                  const rulesText = `${youthFav} | 관리기관: ${mngAgency} | 운영시간: ${startTm} ~ ${endTm} | 소재지: ${address}`;
                  
                  const id = `gov-spot-${i}`;

                  // SQL UPSERT 실행
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
              console.log("✅ [API Route] Neon DB 자동 동기화(UPSERT) 적재 완결!");
            } catch (txErr) {
              await dbPool.query('ROLLBACK');
              console.error("❌ [API Route] DB 트랜잭션 에러로 롤백을 실행합니다:", txErr.message);
              throw txErr;
            }
          }
        }
      } catch (syncErr) {
        console.warn("⚠️ [API Route] 실시간 백그라운드 동기화 실패 (기존 DB 데이터로 계속 제공):", syncErr.message);
      }
    }

    // 💡 만약 DB가 여전히 텅 비어있다면, 사용자 경험을 위해 백업 30대 명당 데이터를 DB에 강제 시딩(Seeding)합니다.
    const reCountRes = await dbPool.query('SELECT COUNT(*) as count FROM legal_spots');
    const finalDbCount = parseInt(reCountRes.rows[0].count || '0');
    if (finalDbCount === 0) {
      console.log("ℹ️ [API Route] Neon DB가 비어있습니다. 백업 30대 명당 데이터를 DB에 자동 시딩합니다...");
      await dbPool.query('BEGIN');
      try {
        for (let i = 0; i < FALLBACK_LEGAL_SPOTS.length; i++) {
          const spot = FALLBACK_LEGAL_SPOTS[i];
          await dbPool.query(`
            INSERT INTO legal_spots (id, name, lat, lng, rules, approved, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (id) DO NOTHING
          `, [spot.id, spot.name, spot.lat, spot.lng, spot.rules, true]);
        }
        await dbPool.query('COMMIT');
        console.log("✅ [API Route] Neon DB 백업 30대 명당 시딩 완결!");
      } catch (seedErr) {
        await dbPool.query('ROLLBACK');
        console.error("❌ [API Route] Neon DB 시딩 중 오류 발생:", seedErr.message);
      }
    }

    // 3. Neon DB에 저장되어 있는 모든 정제 데이터 긁어오기 (승인된 스팟만)
    const dbSpots = await dbPool.query('SELECT id, name, lat, lng, rules FROM legal_spots WHERE approved = TRUE ORDER BY id ASC');
    
    // 만약 동기화 실패 등의 연유로 DB가 아직 비어있다면, Fallback을 임시 공급
    if (dbSpots.rows.length === 0) {
      console.warn("⚠️ [API Route] DB가 비어 있어 임시 백업을 노출합니다.");
      return NextResponse.json({ success: true, isMock: true, data: FALLBACK_LEGAL_SPOTS });
    }

    const formatted = dbSpots.rows.map(row => ({
      id: row.id,
      name: row.name,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      rules: row.rules
    }));

    console.log(`✅ [API Route] Neon DB로부터 정제된 ${formatted.length}건 렌더링 완료.`);
    return NextResponse.json({ success: true, isMock: false, data: formatted });

  } catch (dbError) {
    console.error("❌ [API Route] Neon DB 통신 실패 (정적 Fallback 30선 대체):", dbError.message);
    return NextResponse.json({ 
      success: true, 
      isMock: true, 
      error: dbError.message,
      data: FALLBACK_LEGAL_SPOTS 
    });
  }
}
