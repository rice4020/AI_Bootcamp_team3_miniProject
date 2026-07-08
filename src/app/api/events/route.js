import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { IS_MOCK_MODE } from '@/lib/db';

let pool = null;

function getDbPool() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.trim() === "") return null;
  if (!pool) {
    pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 5000
    });
  }
  return pool;
}

// 🎪 전국 주요 문화예술 행사 10선 가짜 데이터 (Mock Fallback)
const FALLBACK_EVENTS = [
  {
    id: "mock-evt-1",
    name: "홍대 버스킹 스트리트 페스티벌",
    location: "서울 마포구 어울마당로 115",
    latitude: 37.5562,
    longitude: 126.9225,
    startDate: "2026-07-10",
    endDate: "2026-07-12",
    description: "홍대 거리공연 문화 활성화를 위한 다채로운 인디밴드 및 댄스크루의 버스킹 축제",
    source: "전국공연행사 정보 표준데이터"
  },
  {
    id: "mock-evt-2",
    name: "여의도 한강 썸머 뮤직 크루즈",
    location: "서울 영등포구 여의동로 330",
    latitude: 37.5284,
    longitude: 126.9320,
    startDate: "2026-07-24",
    endDate: "2026-07-26",
    description: "한강 바람을 쐬며 즐기는 선상 재즈 공연 및 푸드트럭 야시장 연계 파티",
    source: "전국문화축제 표준데이터"
  },
  {
    id: "mock-evt-3",
    name: "반포 달빛 무지개 분수 축제",
    location: "서울 서초구 신반포로11길 40",
    latitude: 37.5113,
    longitude: 126.9965,
    startDate: "2026-07-01",
    endDate: "2026-08-31",
    description: "세빛섬 야간 물빛 미디어 쇼와 함께 펼쳐지는 강바람 힐링 마켓",
    source: "전국문화축제 표준데이터"
  },
  {
    id: "mock-evt-4",
    name: "강남 빌딩숲 테이스티 로드페스타",
    location: "서울 서초구 서초대로 397",
    latitude: 37.4982,
    longitude: 127.0276,
    startDate: "2026-07-15",
    endDate: "2026-07-17",
    description: "오피스 직장인들을 겨냥한 이색 세계 요리 푸드트럭 페스티벌 및 길거리 버스킹",
    source: "전국공연행사 정보 표준데이터"
  },
  {
    id: "mock-evt-5",
    name: "청계천 야간 밤도깨비 등불 축제",
    location: "서울 중구 남대문로9길 40",
    latitude: 37.5688,
    longitude: 126.9802,
    startDate: "2026-07-18",
    endDate: "2026-07-20",
    description: "청계천 물결 위에 흐르는 화려한 한지 등불 공예와 연계 푸드코트 마켓",
    source: "전국문화축제 표준데이터"
  },
  {
    id: "mock-evt-6",
    name: "대학로 소극장 창작연극제",
    location: "서울 종로구 혜화동 대학로",
    latitude: 37.5822,
    longitude: 127.0018,
    startDate: "2026-08-01",
    endDate: "2026-08-10",
    description: "젊은 극단들의 창작 연극 릴레이 공연 및 마로니에 광장 야외 버스킹 대축제",
    source: "전국공연행사 정보 표준데이터"
  },
  {
    id: "mock-evt-7",
    name: "수원 화성행궁 한여름 야간개장",
    location: "수원시 팔달구 정조로 825",
    latitude: 37.2815,
    longitude: 127.0135,
    startDate: "2026-07-01",
    endDate: "2026-08-31",
    description: "세계문화유산 화성의 야간 미디어아트 맵핑 쇼 및 공방거리 먹거리 야시장",
    source: "전국문화축제 표준데이터"
  },
  {
    id: "mock-evt-8",
    name: "인천 송도 달빛 크래프트 비어 마켓",
    location: "인천 연수구 송도동 26-1",
    latitude: 37.4042,
    longitude: 126.6345,
    startDate: "2026-08-25",
    endDate: "2026-08-30",
    description: "전국 수제맥주 브루어리와 푸드트럭 안주 존이 결합된 대형 도심 캠핑 페스티벌",
    source: "전국공연행사 정보 표준데이터"
  },
  {
    id: "mock-evt-9",
    name: "일산 호수공원 썸머 가든쇼",
    location: "고양시 일산동구 호수로 595",
    latitude: 37.6582,
    longitude: 126.7725,
    startDate: "2026-07-20",
    endDate: "2026-07-28",
    description: "호수공원 야경과 함께하는 조경 전시 및 버스킹 앙상블 공연",
    source: "전국문화축제 표준데이터"
  },
  {
    id: "mock-evt-10",
    name: "강남 푸르지오 아파트 입주민 여름 대축제",
    location: "서울 서초구 사평대로 290",
    latitude: 37.4982,
    longitude: 127.0276,
    startDate: "2026-07-06",
    endDate: "2026-07-08",
    description: "대단지 입주민 여름 단합 대회 겸 푸드트럭 야시장 대축제 (사전 승인 구역)",
    source: "전국공연행사 정보 표준데이터"
  }
];

// 두 지점 간의 거리 계산 (Haversine 공식, 단위: km)
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // 지구 반경(km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const radiusParam = searchParams.get('radius'); // null이면 거리제한 없이 전부 노출

  const lat = latParam ? parseFloat(latParam) : null;
  const lng = lngParam ? parseFloat(lngParam) : null;
  const radius = radiusParam && radiusParam !== 'null' ? parseFloat(radiusParam) : null;

  // 1. 가상 모드(Mock Mode) 체크
  if (IS_MOCK_MODE) {
    console.log("ℹ️ [API/events] DATABASE_URL이 없어 가상(Mock) 행사 목록을 계산합니다.");
    const nearby = (radius && lat && lng)
      ? FALLBACK_EVENTS.filter(evt => getDistanceKm(lat, lng, evt.latitude, evt.longitude) <= radius)
      : FALLBACK_EVENTS;
    return NextResponse.json({ success: true, isMock: true, data: nearby });
  }

  const dbPool = getDbPool();
  if (!dbPool) {
    console.warn("⚠️ [API/events] DB 커넥션 획득 실패. 예비 가상 데이터를 제공합니다.");
    const nearby = (radius && lat && lng)
      ? FALLBACK_EVENTS.filter(evt => getDistanceKm(lat, lng, evt.latitude, evt.longitude) <= radius)
      : FALLBACK_EVENTS;
    return NextResponse.json({ success: true, isMock: true, data: nearby });
  }

  try {
    // 2. Event 테이블과 SnsExtraction 테이블을 UNION ALL로 통합 조회
    let dbEvents = [];
    try {
      const res = await dbPool.query(`
        SELECT
          id,
          title,
          location,
          latitude,
          longitude,
          "startDate" AS start_date,
          "endDate"   AS end_date,
          scale,
          description,
          'Event' AS source_table
        FROM "Event"

        UNION ALL

        SELECT
          id,
          title,
          location,
          latitude,
          longitude,
          "startDate" AS start_date,
          "endDate"   AS end_date,
          scale,
          description,
          'SnsExtraction' AS source_table
        FROM "SnsExtraction"

        ORDER BY
          -- 1순위: 진행 중인 행사 (오늘이 start~end 사이) 먼저
          CASE WHEN start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE THEN 0 ELSE 1 END,
          -- 2순위: 오늘로부터 가장 가까운 날짜 순
          ABS(start_date - CURRENT_DATE) ASC NULLS LAST
      `);
      dbEvents = res.rows;
      console.log(`✅ [API/events] Event(${res.rows.filter(r=>r.source_table==='Event').length}건) + SnsExtraction(${res.rows.filter(r=>r.source_table==='SnsExtraction').length}건) 통합 로드 성공.`);
    } catch (e1) {
      console.warn(`⚠️ [API/events] UNION 조회 실패, Event 단독 조회를 시도합니다:`, e1.message);
      try {
        const res2 = await dbPool.query(`
          SELECT
            id,
            title,
            location,
            latitude,
            longitude,
            "startDate" AS start_date,
            "endDate"   AS end_date,
            scale,
            description,
            'Event' AS source_table
          FROM "Event"
          ORDER BY
            CASE WHEN "startDate" <= CURRENT_DATE AND "endDate" >= CURRENT_DATE THEN 0 ELSE 1 END,
            ABS("startDate" - CURRENT_DATE) ASC NULLS LAST
        `);
        dbEvents = res2.rows;
        console.log(`✅ [API/events] "Event" 단독 테이블로부터 ${dbEvents.length}건 로드.`);
      } catch (e2) {
        console.warn(`❌ [API/events] 모든 행사 테이블 쿼리 실패:`, e2.message);
        throw e2;
      }
    }

    // 3. 불러온 DB 행사 목록에 대하여 반경 연산 필터링 실행
    const formatted = dbEvents.map(row => {
      // 출처 테이블에 따른 소스 라벨 결정
      const sourceTable = row.source_table || 'Event';
      const source = sourceTable === 'SnsExtraction'
        ? 'SNS 수집 데이터'
        : '전국문화축제 표준데이터';

      return {
        id: row.id,
        name: row.title,          // title → name으로 통일
        title: row.title,
        location: row.location,
        latitude: row.latitude ? parseFloat(row.latitude) : null,
        longitude: row.longitude ? parseFloat(row.longitude) : null,
        startDate: row.start_date ? new Date(row.start_date).toISOString().split('T')[0] : '미정',
        endDate: row.end_date ? new Date(row.end_date).toISOString().split('T')[0] : '미정',
        scale: row.scale || '',
        description: row.description || '',
        source,          // ◀ 출처 라벨
        sourceTable,     // ◀ 테이블 구분 (Event | SnsExtraction)
        isMock: false
      };
    });

    const filtered = (radius && lat && lng)
      ? formatted.filter(evt => getDistanceKm(lat, lng, evt.latitude, evt.longitude) <= radius)
      : formatted;

    return NextResponse.json({ success: true, isMock: false, data: filtered });

  } catch (dbError) {
    console.warn("⚠️ [API/events] DB 오류로 인해 예비 데이터를 필터링하여 출력합니다:", dbError.message);
    const nearby = (radius && lat && lng)
      ? FALLBACK_EVENTS.filter(evt => getDistanceKm(lat, lng, evt.latitude, evt.longitude) <= radius)
      : FALLBACK_EVENTS;
    return NextResponse.json({ success: true, isMock: true, data: nearby });
  }
}
