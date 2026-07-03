// web/join 폴더 - 소비자(일반 사용자) 회원가입 모듈
import { sql, IS_MOCK_MODE } from '../../lib/db';

// ─── 타입 정의 ───────────────────────────────────────────────
// 회원가입 시 입력받는 데이터 구조
interface RegisterInput {
  username: string; // 사용할 로그인 ID
  role?: 'customer' | 'owner'; // 가입 역할 (기본값: customer)
}

// 가입 결과로 반환되는 새 회원 정보
interface NewUser {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

// ─── 모의 데이터 정의 ──────────────────────────────────────────
const MOCK_EXISTING_USERNAMES = ['test_customer_01', 'owner_taco', 'admin_master'];

// ─── 함수 정의 ───────────────────────────────────────────────

/**
 * 해당 username이 이미 사용 중인지 확인합니다.
 * @param username - 확인할 사용자 이름
 * @returns true면 이미 존재함 (중복), false면 사용 가능
 */
async function checkUsernameDuplicate(username: string): Promise<boolean> {
  if (IS_MOCK_MODE) {
    return MOCK_EXISTING_USERNAMES.includes(username);
  }
  const rows = await sql`
    SELECT id FROM users WHERE username = ${username}
  `;
  return rows.length > 0; // 조회 결과가 있으면 중복
}

/**
 * 새 회원을 DB에 등록합니다.
 * - 중복 아이디 확인 후 등록
 * @param input - 회원가입 입력 정보 (username, role)
 */
async function registerUser(input: RegisterInput): Promise<NewUser | null> {
  const { username, role = 'customer' } = input;

  // 1. 중복 아이디 확인
  const isDuplicate = await checkUsernameDuplicate(username);
  if (isDuplicate) {
    console.log(`⚠️  '${username}'은 이미 사용중인 아이디입니다.`);
    return null;
  }

  if (IS_MOCK_MODE) {
    const mockNewUser: NewUser = {
      id: Math.floor(Math.random() * 1000) + 100,
      username,
      role,
      is_active: true,
      created_at: new Date().toISOString()
    };
    console.log(`[Mock Mode] 🎉 회원가입 성공! 아이디: ${mockNewUser.username}, 역할: ${mockNewUser.role}`);
    return mockNewUser;
  }

  // 2. DB에 새 회원 삽입
  const rows = await sql`
    INSERT INTO users (username, role, is_active)
    VALUES (${username}, ${role}, true)
    RETURNING id, username, role, is_active, created_at
  `;


  const newUser = rows[0] as NewUser;
  console.log(`🎉 회원가입 성공! 아이디: ${newUser.username}, 역할: ${newUser.role}`);
  return newUser;
}

// ─── 실행 진입점 (npm run dev:web:join 으로 직접 실행 시) ────
async function main() {
  console.log('📝 [소비자용] 회원가입 테스트\n');

  // 테스트: 새 소비자 회원 등록 시도
  const testUser = await registerUser({ username: 'test_customer_01', role: 'customer' });

  if (testUser) {
    console.log('\n✅ 등록된 회원 정보:');
    console.log(`  ID       : ${testUser.id}`);
    console.log(`  아이디   : ${testUser.username}`);
    console.log(`  역할     : ${testUser.role}`);
    console.log(`  활성상태 : ${testUser.is_active ? '활성' : '비활성'}`);
    console.log(`  가입일   : ${new Date(testUser.created_at).toLocaleDateString('ko-KR')}`);
  }
}

main().catch((err) => {
  console.error('❌ 오류 발생:', err.message);
  process.exit(1);
});

export { registerUser, checkUsernameDuplicate };
