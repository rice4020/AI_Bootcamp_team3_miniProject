// admin/truck 폴더 - 관리자 푸드트럭 관리 모듈
import { sql, IS_MOCK_MODE } from '../../lib/db';

// ─── 타입 정의 ───────────────────────────────────────────────
// DB의 food_trucks 테이블 구조에 맞춘 타입
interface FoodTruck {
  id: number;
  owner_username: string;   // 사장님 아이디
  truck_name: string;       // 트럭 상호명
  status: TruckStatus;      // 현재 영업 상태
  latitude: number | null;  // 현재 위치 위도
  longitude: number | null; // 현재 위치 경도
  updated_at: string;
}

// 푸드트럭이 가질 수 있는 상태값 목록
type TruckStatus = 'active' | 'preparing' | 'sold_out' | 'inactive';

// 상태 값에 대한 한국어 표시 이모지 매핑
const STATUS_LABEL: Record<TruckStatus, string> = {
  active:    '🟢 영업중',
  preparing: '🟡 준비중',
  sold_out:  '🔴 재고소진',
  inactive:  '⚫ 휴업',
};

// ─── 모의 데이터 정의 ──────────────────────────────────────────
const MOCK_TRUCKS: FoodTruck[] = [
  { id: 1, owner_username: 'owner_taco', truck_name: '서울숲 멕시칸 타코야', status: 'active', latitude: 37.5444, longitude: 127.0428, updated_at: new Date().toISOString() },
  { id: 2, owner_username: 'owner_waffle', truck_name: '벨기에 와플 아저씨', status: 'preparing', latitude: 37.5562, longitude: 127.0448, updated_at: new Date().toISOString() },
  { id: 3, owner_username: 'owner_chicken', truck_name: '바삭바삭 옛날통닭', status: 'sold_out', latitude: 37.5665, longitude: 126.9780, updated_at: new Date().toISOString() },
];

// ─── 함수 정의 ───────────────────────────────────────────────

/**
 * 전체 푸드트럭 목록을 최근 업데이트 순으로 조회합니다.
 */
async function getAllTrucks(): Promise<FoodTruck[]> {
  if (IS_MOCK_MODE) return MOCK_TRUCKS;
  const rows = await sql`
    SELECT id, owner_username, truck_name, status, latitude, longitude, updated_at
    FROM food_trucks
    ORDER BY updated_at DESC
  `;
  return rows as FoodTruck[];
}

/**
 * 특정 상태의 푸드트럭만 필터링해서 조회합니다.
 * @param status - 조회할 상태 ('active' | 'preparing' | 'sold_out' | 'inactive')
 */
async function getTrucksByStatus(status: TruckStatus): Promise<FoodTruck[]> {
  if (IS_MOCK_MODE) return MOCK_TRUCKS.filter(t => t.status === status);
  const rows = await sql`
    SELECT id, owner_username, truck_name, status, latitude, longitude, updated_at
    FROM food_trucks
    WHERE status = ${status}
    ORDER BY updated_at DESC
  `;
  return rows as FoodTruck[];
}

/**
 * 특정 푸드트럭의 영업 상태를 변경합니다.
 * @param id     - 트럭 ID
 * @param status - 변경할 상태
 */
async function updateTruckStatus(id: number, status: TruckStatus): Promise<void> {
  if (IS_MOCK_MODE) {
    console.log(`[Mock Mode] 🚚 트럭 ID ${id} 상태 변경: ${STATUS_LABEL[status]}`);
    return;
  }

  await sql`
    UPDATE food_trucks 
    SET status = ${status}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
  `;
  console.log(`🚚 트럭 ID ${id} 상태 변경: ${STATUS_LABEL[status]}`);
}

/**
 * 특정 푸드트럭의 실시간 위치를 업데이트합니다.
 * @param id        - 트럭 ID
 * @param latitude  - 위도
 * @param longitude - 경도
 */
async function updateTruckLocation(id: number, latitude: number, longitude: number): Promise<void> {
  if (IS_MOCK_MODE) {
    console.log(`[Mock Mode] 📍 트럭 ID ${id} 위치 업데이트: (${latitude}, ${longitude})`);
    return;
  }

  await sql`
    UPDATE food_trucks 
    SET latitude = ${latitude}, longitude = ${longitude}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
  `;
  console.log(`📍 트럭 ID ${id} 위치 업데이트: (${latitude}, ${longitude})`);
}


// ─── 실행 진입점 (npm run dev:admin:truck 으로 직접 실행 시) ─
async function main() {
  console.log('🚚 관리자 푸드트럭 관리 패널\n');

  const trucks = await getAllTrucks();

  if (trucks.length === 0) {
    console.log('⚠️  등록된 푸드트럭이 없습니다.');
    return;
  }

  console.log(`총 ${trucks.length}대의 트럭이 등록되어 있습니다.\n`);
  console.log('ID  | 트럭명                 | 사장님          | 상태');
  console.log('----+------------------------+-----------------+----------');

  trucks.forEach((truck) => {
    const label = STATUS_LABEL[truck.status];
    console.log(
      `${String(truck.id).padEnd(4)}| ${truck.truck_name.padEnd(23)} | ${truck.owner_username.padEnd(16)}| ${label}`
    );
  });

  // 상태별 통계 요약
  console.log('\n📊 상태별 요약');
  for (const status of Object.keys(STATUS_LABEL) as TruckStatus[]) {
    const count = trucks.filter((t) => t.status === status).length;
    console.log(`  ${STATUS_LABEL[status]}: ${count}대`);
  }
}

main().catch((err) => {
  console.error('❌ 오류 발생:', err.message);
  process.exit(1);
});

export { getAllTrucks, getTrucksByStatus, updateTruckStatus, updateTruckLocation };
