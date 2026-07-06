// web/truck 폴더 - 소비자(일반 사용자) 푸드트럭 상세 조회 모듈
import { sql, IS_MOCK_MODE } from '../../lib/db';

// ─── 타입 정의 ───────────────────────────────────────────────
// 소비자가 볼 수 있는 트럭 상세 정보 구조
interface TruckDetail {
  id: number;
  owner_username: string;   // 사장님 아이디
  truck_name: string;       // 트럭 상호명
  status: string;           // 영업 상태
  latitude: number | null;  // 현재 위도
  longitude: number | null; // 현재 경도
  updated_at: string;       // 마지막 정보 업데이트 시각
}

// 상태 값에 대한 한국어 이모지 매핑
const STATUS_EMOJI: Record<string, string> = {
  active:    '🟢 영업중',
  preparing: '🟡 준비중',
  sold_out:  '🔴 재고소진',
  inactive:  '⚫ 휴업',
};

// ─── 모의 데이터 정의 ──────────────────────────────────────────
const MOCK_TRUCK_DETAILS: TruckDetail[] = [
  { id: 1, owner_username: 'owner_taco', truck_name: '서울숲 멕시칸 타코야', status: 'active', latitude: 37.5444, longitude: 127.0428, updated_at: new Date().toISOString() },
  { id: 2, owner_username: 'owner_waffle', truck_name: '벨기에 와플 아저씨', status: 'preparing', latitude: 37.5562, longitude: 127.0448, updated_at: new Date().toISOString() },
  { id: 3, owner_username: 'owner_chicken', truck_name: '바삭바삭 옛날통닭', status: 'sold_out', latitude: 37.5665, longitude: 126.9780, updated_at: new Date().toISOString() },
];

// ─── 함수 정의 ───────────────────────────────────────────────

/**
 * 전체 트럭 목록을 소비자 화면용으로 조회합니다.
 * (영업중인 트럭이 상단에 오도록 정렬)
 */
async function getAllTrucksForWeb(): Promise<TruckDetail[]> {
  if (IS_MOCK_MODE) return MOCK_TRUCK_DETAILS;
  const rows = await sql`
    SELECT id, owner_username, truck_name, status, latitude, longitude, updated_at
    FROM food_trucks
    ORDER BY 
      CASE status
        WHEN 'active'    THEN 1
        WHEN 'preparing' THEN 2
        WHEN 'sold_out'  THEN 3
        ELSE 4
      END,
      updated_at DESC
  `;
  return rows as TruckDetail[];
}

/**
 * 특정 ID의 트럭 상세 정보를 가져옵니다.
 * @param id - 조회할 트럭 ID
 */
async function getTruckById(id: number): Promise<TruckDetail | null> {
  if (IS_MOCK_MODE) {
    return MOCK_TRUCK_DETAILS.find(t => t.id === id) || null;
  }
  const rows = await sql`
    SELECT id, owner_username, truck_name, status, latitude, longitude, updated_at
    FROM food_trucks
    WHERE id = ${id}
  `;
  if (rows.length === 0) return null;
  return rows[0] as TruckDetail;
}

/**
 * 영업중인 트럭만 조회합니다. (지도 마커 표시용)
 */
async function getActiveTrucksWithLocation(): Promise<TruckDetail[]> {
  if (IS_MOCK_MODE) {
    return MOCK_TRUCK_DETAILS.filter(t => t.status === 'active' && t.latitude !== null && t.longitude !== null);
  }
  const rows = await sql`
    SELECT id, owner_username, truck_name, status, latitude, longitude, updated_at
    FROM food_trucks
    WHERE status = 'active'
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
  `;
  return rows as TruckDetail[];
}


// ─── 실행 진입점 (npm run dev:web:truck 로 직접 실행 시) ─────
async function main() {
  console.log('🚚 [소비자용] 전체 푸드트럭 목록 조회\n');

  const trucks = await getAllTrucksForWeb();

  if (trucks.length === 0) {
    console.log('⚠️  등록된 트럭이 없습니다.');
    return;
  }

  console.log(`총 ${trucks.length}대의 트럭이 등록되어 있습니다.\n`);
  console.log('────────────────────────────────────────────────────');

  trucks.forEach((truck) => {
    const statusLabel = STATUS_EMOJI[truck.status] || truck.status;
    const location = truck.latitude
      ? `위도 ${truck.latitude}, 경도 ${truck.longitude}`
      : '위치 정보 없음';
    console.log(`  ${statusLabel}  🍴 ${truck.truck_name}  |  사장님: ${truck.owner_username}  |  📍 ${location}`);
  });

  // 지도 표시용 영업중 트럭 별도 조회
  const mapTrucks = await getActiveTrucksWithLocation();
  console.log(`\n🗺️  지도에 표시 가능한 영업중 트럭: ${mapTrucks.length}대`);
}

main().catch((err) => {
  console.error('❌ 오류 발생:', err.message);
  process.exit(1);
});

export { getAllTrucksForWeb, getTruckById, getActiveTrucksWithLocation };
