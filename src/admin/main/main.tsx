// admin/main 폴더 - 관리자 대시보드 통계 조회 모듈
import { sql, IS_MOCK_MODE } from '../../lib/db';

// ─── 타입 정의 ───────────────────────────────────────────────
interface DashboardStats {
  totalUsers: number;       // 전체 가입 사용자 수
  activeTrucks: number;     // 현재 영업중인 트럭 수
  totalTrucks: number;      // 전체 등록 트럭 수
  inactiveTrucks: number;   // 비활성(휴업/소진) 트럭 수
}

// ─── 함수 정의 ───────────────────────────────────────────────

/**
 * 전체 가입 유저 수를 DB에서 가져옵니다.
 */
async function getTotalUsers(): Promise<number> {
  if (IS_MOCK_MODE) return 120; // 가상 데이터
  const result = await sql`SELECT COUNT(*) AS count FROM users`;
  return Number(result[0].count);
}

/**
 * 현재 영업중(active)인 푸드트럭 수를 DB에서 가져옵니다.
 */
async function getActiveTrucks(): Promise<number> {
  if (IS_MOCK_MODE) return 15; // 가상 데이터
  const result = await sql`SELECT COUNT(*) AS count FROM food_trucks WHERE status = 'active'`;
  return Number(result[0].count);
}

/**
 * 전체 등록된 푸드트럭 수를 DB에서 가져옵니다.
 */
async function getTotalTrucks(): Promise<number> {
  if (IS_MOCK_MODE) return 32; // 가상 데이터
  const result = await sql`SELECT COUNT(*) AS count FROM food_trucks`;
  return Number(result[0].count);
}

/**
 * 비활성 상태(sold_out, inactive) 푸드트럭 수를 가져옵니다.
 */
async function getInactiveTrucks(): Promise<number> {
  if (IS_MOCK_MODE) return 17; // 가상 데이터
  const result = await sql`
    SELECT COUNT(*) AS count FROM food_trucks 
    WHERE status IN ('sold_out', 'inactive')
  `;
  return Number(result[0].count);
}

/**
 * 관리자 대시보드 전체 통계를 한 번에 조회합니다.
 */
async function getDashboardStats(): Promise<DashboardStats> {
  if (IS_MOCK_MODE) {
    return {
      totalUsers: 120,
      activeTrucks: 15,
      totalTrucks: 32,
      inactiveTrucks: 17
    };
  }

  const [totalUsers, activeTrucks, totalTrucks, inactiveTrucks] = await Promise.all([
    getTotalUsers(),
    getActiveTrucks(),
    getTotalTrucks(),
    getInactiveTrucks(),
  ]);

  return { totalUsers, activeTrucks, totalTrucks, inactiveTrucks };
}


// ─── 실행 진입점 (npm run dev:admin:main 으로 직접 실행 시) ─────
async function main() {
  console.log('🛡️  관리자 대시보드 통계 조회 중...\n');

  const stats = await getDashboardStats();

  console.log('📊 시스템 현황 대시보드');
  console.log('========================');
  console.log(`👤 전체 가입 사용자 : ${stats.totalUsers} 명`);
  console.log(`🟢 영업중 트럭       : ${stats.activeTrucks} 대`);
  console.log(`🚚 전체 등록 트럭    : ${stats.totalTrucks} 대`);
  console.log(`🔴 비활성 트럭       : ${stats.inactiveTrucks} 대`);
  console.log('========================');
}

// 이 파일을 직접 실행할 때만 main() 호출
main().catch((err) => {
  console.error('❌ 오류 발생:', err.message);
  process.exit(1);
});

// 다른 파일에서 가져다 쓸 수 있도록 함수 내보내기
export { getDashboardStats, getTotalUsers, getActiveTrucks, getTotalTrucks };
