// admin/join 폴더 - 관리자 회원 관리 모듈
import { sql, IS_MOCK_MODE } from '../../lib/db';

// ─── 타입 정의 ───────────────────────────────────────────────
// DB의 users 테이블 구조에 맞춘 타입
interface User {
  id: number;
  username: string;
  role: 'customer' | 'owner' | 'admin'; // 역할 구분
  is_active: boolean;                    // 계정 활성 상태
  created_at: string;
}

// ─── 모의 데이터 정의 ──────────────────────────────────────────
const MOCK_USERS: User[] = [
  { id: 1, username: 'owner_taco', role: 'owner', is_active: true, created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 2, username: 'customer_lee', role: 'customer', is_active: true, created_at: new Date(Date.now() - 3600000 * 10).toISOString() },
  { id: 3, username: 'owner_waffle', role: 'owner', is_active: false, created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
  { id: 4, username: 'admin_master', role: 'admin', is_active: true, created_at: new Date(Date.now() - 3600000 * 48).toISOString() },
];

// ─── 함수 정의 ───────────────────────────────────────────────

/**
 * 전체 회원 목록을 최신 가입 순서로 조회합니다.
 */
async function getAllUsers(): Promise<User[]> {
  if (IS_MOCK_MODE) return MOCK_USERS;
  const rows = await sql`
    SELECT id, username, role, is_active, created_at
    FROM users
    ORDER BY created_at DESC
  `;
  return rows as User[];
}

/**
 * 특정 역할(customer / owner / admin)의 회원만 필터링해서 조회합니다.
 * @param role - 조회할 역할
 */
async function getUsersByRole(role: User['role']): Promise<User[]> {
  if (IS_MOCK_MODE) return MOCK_USERS.filter(u => u.role === role);
  const rows = await sql`
    SELECT id, username, role, is_active, created_at
    FROM users
    WHERE role = ${role}
    ORDER BY created_at DESC
  `;
  return rows as User[];
}

/**
 * 새로운 회원을 DB에 등록합니다.
 * @param username - 사용자 이름 (로그인 ID)
 * @param role     - 역할 (기본값: 'customer')
 */
async function createUser(username: string, role: User['role'] = 'customer'): Promise<User> {
  if (IS_MOCK_MODE) {
    const newUser: User = {
      id: MOCK_USERS.length + 1,
      username,
      role,
      is_active: true,
      created_at: new Date().toISOString()
    };
    console.log(`[Mock Mode] 신규 회원 등록 완료: ${username} (역할: ${role})`);
    return newUser;
  }

  const rows = await sql`
    INSERT INTO users (username, role, is_active)
    VALUES (${username}, ${role}, true)
    RETURNING id, username, role, is_active, created_at
  `;
  console.log(`✅ 신규 회원 등록 완료: ${username} (역할: ${role})`);
  return rows[0] as User;
}

/**
 * 특정 회원의 활성화/비활성화 상태를 변경합니다.
 * @param id       - 회원 ID
 * @param isActive - 활성화 여부 (true = 활성, false = 정지)
 */
async function toggleUserStatus(id: number, isActive: boolean): Promise<void> {
  if (IS_MOCK_MODE) {
    const status = isActive ? '✅ 활성화(Mock)' : '🚫 정지(Mock)';
    console.log(`[Mock Mode] 회원 ID ${id} 상태 변경: ${status}`);
    return;
  }

  await sql`
    UPDATE users SET is_active = ${isActive} WHERE id = ${id}
  `;
  const status = isActive ? '✅ 활성화' : '🚫 정지';
  console.log(`회원 ID ${id} 상태 변경: ${status}`);
}


// ─── 실행 진입점 (npm run dev:admin:join 으로 직접 실행 시) ──
async function main() {
  console.log('👥 관리자 회원 관리 패널\n');

  // 전체 회원 목록 출력
  const users = await getAllUsers();
  
  if (users.length === 0) {
    console.log('⚠️  등록된 회원이 없습니다.');
    return;
  }

  console.log(`총 ${users.length}명의 회원이 있습니다.\n`);
  console.log('ID  | 아이디          | 역할       | 활성상태 | 가입일');
  console.log('----+-----------------+------------+----------+--------');

  users.forEach((user) => {
    const activeFlag = user.is_active ? '🟢 활성' : '🔴 정지';
    const date = new Date(user.created_at).toLocaleDateString('ko-KR');
    console.log(
      `${String(user.id).padEnd(4)}| ${user.username.padEnd(16)}| ${user.role.padEnd(11)}| ${activeFlag.padEnd(9)}| ${date}`
    );
  });
}

main().catch((err) => {
  console.error('❌ 오류 발생:', err.message);
  process.exit(1);
});

export { getAllUsers, getUsersByRole, createUser, toggleUserStatus };
