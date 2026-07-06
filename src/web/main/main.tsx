// web/main 폴더 - 소비자(일반 사용자) 메인 화면 데이터 조회 모듈
import { sql, IS_MOCK_MODE } from '../../lib/db';

// ─── 타입 정의 ───────────────────────────────────────────────
// 소비자 화면에 보여줄 영업중 트럭 정보
interface ActiveTruck {
  id: number;
  truck_name: string;       // 트럭 상호명
  status: string;           // 영업 상태
  latitude: number | null;  // 위도
  longitude: number | null; // 경도
  updated_at: string;       // 마지막 업데이트 시각
}

// ─── 모의 데이터 정의 ──────────────────────────────────────────
const MOCK_ACTIVE_TRUCKS: ActiveTruck[] = [
  { id: 1, truck_name: '서울숲 멕시칸 타코야', status: 'active', latitude: 37.5444, longitude: 127.0428, updated_at: new Date().toISOString() },
  { id: 2, truck_name: '뚝섬 한강공원 컵밥트럭', status: 'active', latitude: 37.5284, longitude: 127.0683, updated_at: new Date().toISOString() },
];

// ─── 함수 정의 ───────────────────────────────────────────────

/**
 * 현재 영업중(active)인 트럭 목록을 소비자 화면용으로 조회합니다.
 */
async function getActiveTrucksForWeb(): Promise<ActiveTruck[]> {
  if (IS_MOCK_MODE) return MOCK_ACTIVE_TRUCKS;
  const rows = await sql`
    SELECT id, truck_name, status, latitude, longitude, updated_at
    FROM food_trucks
    WHERE status = 'active'
    ORDER BY updated_at DESC
  `;
  return rows as ActiveTruck[];
}

/**
 * 특정 키워드로 트럭 이름을 검색합니다.
 * @param keyword - 검색할 키워드
 */
async function searchTrucksByName(keyword: string): Promise<ActiveTruck[]> {
  if (IS_MOCK_MODE) {
    return MOCK_ACTIVE_TRUCKS.filter(t => t.truck_name.toLowerCase().includes(keyword.toLowerCase()));
  }
  const rows = await sql`
    SELECT id, truck_name, status, latitude, longitude, updated_at
    FROM food_trucks
    WHERE truck_name ILIKE ${'%' + keyword + '%'}
    ORDER BY updated_at DESC
  `;
  return rows as ActiveTruck[];
}

/**
 * 전체 트럭 영업 현황 통계 (소비자 화면 상단 요약 정보용)
 */
async function getTruckSummary(): Promise<{ active: number; total: number }> {
  if (IS_MOCK_MODE) {
    return { active: 2, total: 5 };
  }
  const [activeResult, totalResult] = await Promise.all([
    sql`SELECT COUNT(*) AS count FROM food_trucks WHERE status = 'active'`,
    sql`SELECT COUNT(*) AS count FROM food_trucks`,
  ]);
  return {
    active: Number(activeResult[0].count),
    total: Number(totalResult[0].count),
  };
}


// ─── 실행 진입점 (npm run dev:web:main 으로 직접 실행 시) ────
async function main() {
  console.log('🌐 [소비자용] 메인 화면 데이터 조회\n');

  // 요약 통계 출력
  const summary = await getTruckSummary();
  console.log(`📊 전체 ${summary.total}대 중 현재 ${summary.active}대 영업중\n`);

  // 영업중 트럭 목록 출력
  const trucks = await getActiveTrucksForWeb();

  if (trucks.length === 0) {
    console.log('😢 현재 영업중인 트럭이 없습니다.');
    return;
  }

  console.log('🟢 지금 영업중인 트럭 목록:');
  console.log('────────────────────────────────────────');
  trucks.forEach((truck) => {
    const location = truck.latitude
      ? `📍 위도 ${truck.latitude}, 경도 ${truck.longitude}`
      : '📍 위치 미등록';
    console.log(`🚚 ${truck.truck_name}  |  ${location}`);
  });
}

main().catch((err) => {
  console.error('❌ 오류 발생:', err.message);
  process.exit(1);
});

export { getActiveTrucksForWeb, searchTrucksByName, getTruckSummary };
