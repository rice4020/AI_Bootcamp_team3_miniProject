// @ts-nocheck
// web/truck 폴더 - 소비자(일반 사용자) 푸드트럭 상세 조회 및 사장님 AI 도구 연동 모듈
import { sql, IS_MOCK_MODE } from '../../lib/db';
import { getEventDetails, getUpcomingEvents } from '../sns/event';
import { generateAndSaveSnsNotice } from '../sns/sns';

// ─── 타입 정의 ───────────────────────────────────────────────
interface TruckDetail {
  id: number;
  owner_username: string;   // 사장님 아이디
  truck_name: string;       // 트럭 상호명
  status: string;           // 영업 상태
  latitude: number | null;  // 현재 위도
  longitude: number | null; // 현재 경도
  updated_at: string;       // 마지막 정보 업데이트 시각
}

const STATUS_EMOJI: Record<string, string> = {
  active: '🟢 영업중',
  preparing: '🟡 준비중',
  sold_out: '🔴 재고소진',
  inactive: '⚫ 휴업',
};

const MOCK_TRUCK_DETAILS: TruckDetail[] = [
  { id: 1, owner_username: 'owner_taco', truck_name: '서울숲 멕시칸 타코야', status: 'active', latitude: 37.5444, longitude: 127.0428, updated_at: new Date().toISOString() },
  { id: 2, owner_username: 'owner_waffle', truck_name: '벨기에 와플 아저씨', status: 'preparing', latitude: 37.5562, longitude: 127.0448, updated_at: new Date().toISOString() },
  { id: 3, owner_username: 'owner_chicken', truck_name: '바삭바삭 옛날통닭', status: 'sold_out', latitude: 37.5665, longitude: 126.9780, updated_at: new Date().toISOString() },
];

// ─── 함수 정의 ───────────────────────────────────────────────

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

  // 🤖 [최병현 파트 통합 시뮬레이션 및 검증 추가]
  console.log('\n====================================================');
  console.log('🤖 [사장님 모드] 최병현 개발자 구현 기능 연동 테스트 (4. 주변 행사 & 5. SNS 문구 생성)');
  console.log('====================================================');

  // 1. 사장님이 주변 행사/축제 정보 수집 분석을 요청하는 기능 연동 시뮬레이션
  console.log('\n[Step 1] 예정된 축제/행사 목록 조회 중...');
  const upEvents = await getUpcomingEvents(3);
  if (upEvents.length > 0) {
    const targetEvent = upEvents[0];
    console.log(`📡 선택한 행사: ${targetEvent.title} (ID: ${targetEvent.id})`);

    console.log('💡 AI 에이전트에게 축제 날씨 및 인파 분석 기반 재고 전략 추천 요청...');
    const details = await getEventDetails(targetEvent.id);
    if (details) {
      console.log(` -> 날씨 정보 : 기온 ${details.weather?.temperature}℃, 상태 ${details.weather?.sky_status}`);
      console.log(` -> 권장 재고 배율 : 평소 대비 [${details.strategy?.recommendedStockMultiplier}배] 준비 권장`);
      console.log(` -> 에이전트 주의보 : ${details.strategy?.weatherRiskAlert}`);
    }
  }

  // 2. 행사 입지 기반 SNS 인스타 홍보 문구 자동 생성 및 편집 저장 연동 시뮬레이션
  console.log('\n[Step 2] 행사 타겟 맞춤형 인스타그램 홍보글 AI 생성 및 DB 저장...');
  const testLocation = '뚝섬 한강시민공원 축제구역';
  const testMenu = '칠리 치즈 치킨 스테이크 & 에이드 세트';

  const savedPost = await generateAndSaveSnsNotice(
    'owner_taco',
    testLocation,
    testMenu,
    '유쾌형',
    '🎉 뚝섬 한강공원 맥주 페스티벌 점령 완료! 🍗 시원한 바람 맞으면서 갓 튀긴 칠리 치즈 스테이크 한 입 어떠세요? 실시간 대기팀 5팀이니 서두르세요! 🚀'
  );
  console.log('💾 최종 사장님 수정/저장본:');
  console.log(`"${savedPost.edited_content}"`);
  console.log('====================================================\n');
}

if (require.main === module || process.env.NODE_ENV === 'test' || IS_MOCK_MODE) {
  main().catch((err) => {
    console.error('❌ 오류 발생:', err.message);
  });
}

export { getAllTrucksForWeb, getTruckById, getActiveTrucksWithLocation };
