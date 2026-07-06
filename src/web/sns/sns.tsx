// web/sns 폴더 - 소비자(일반 사용자) SNS 홍보 문구 조회 모듈
import { sql, IS_MOCK_MODE } from '../../lib/db';

// ─── 타입 정의 ───────────────────────────────────────────────
// 소비자에게 보여줄 SNS 홍보 문구 데이터 구조
interface PublicSnsPost {
  id: number;
  owner_id: string;        // 어떤 사장님의 홍보글인지
  location: string;        // 영업 장소
  menu: string;            // 판매 메뉴
  edited_content: string;  // 최종 공개 문구 (사장님이 수정한 버전)
  created_at: string;
}

// ─── 모의 데이터 정의 ──────────────────────────────────────────
const MOCK_SNS_POSTS: PublicSnsPost[] = [
  {
    id: 1,
    owner_id: 'owner_taco',
    location: '서울숲 입구 앞 도로',
    menu: '정통 멕시칸 타코 (3pcs 9,000원)',
    edited_content: '🌮 오늘 날씨 좋은 금요일! 서울숲 입구에서 멕시칸 타코 트럭 오픈했습니다! 맥주 안주로 최고니 놀러 오세요! 🍻',
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 2,
    owner_id: 'owner_waffle',
    location: '한양대 정문 앞',
    menu: '벨기에 와플 & 에이드 세트',
    edited_content: '🧇 바쁜 일상 속, 달콤한 쉼표 하나. 한양대 정문 앞에서 갓 구운 벨기에 와플 향기를 전해드립니다. ☕✨',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString()
  }
];

// ─── 함수 정의 ───────────────────────────────────────────────

/**
 * 최근 SNS 홍보 문구 목록을 최신순으로 조회합니다. (소비자 공개용)
 * @param limit - 가져올 최대 개수 (기본값: 10개)
 */
async function getRecentSnsPosts(limit: number = 10): Promise<PublicSnsPost[]> {
  if (IS_MOCK_MODE) return MOCK_SNS_POSTS.slice(0, limit);
  const rows = await sql`
    SELECT id, owner_id, location, menu, edited_content, created_at
    FROM sns_announcements
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows as PublicSnsPost[];
}

/**
 * 특정 장소 키워드로 SNS 홍보 글을 검색합니다.
 * @param locationKeyword - 검색할 장소 이름 (예: '강남', '홍대')
 */
async function searchSnsPostsByLocation(locationKeyword: string): Promise<PublicSnsPost[]> {
  if (IS_MOCK_MODE) {
    return MOCK_SNS_POSTS.filter(p => p.location.toLowerCase().includes(locationKeyword.toLowerCase()));
  }
  const rows = await sql`
    SELECT id, owner_id, location, menu, edited_content, created_at
    FROM sns_announcements
    WHERE location ILIKE ${'%' + locationKeyword + '%'}
    ORDER BY created_at DESC
  `;
  return rows as PublicSnsPost[];
}

/**
 * 특정 메뉴 키워드로 SNS 홍보 글을 검색합니다.
 * @param menuKeyword - 검색할 메뉴명 (예: '닭꼬치', '타코야키')
 */
async function searchSnsPostsByMenu(menuKeyword: string): Promise<PublicSnsPost[]> {
  if (IS_MOCK_MODE) {
    return MOCK_SNS_POSTS.filter(p => p.menu.toLowerCase().includes(menuKeyword.toLowerCase()));
  }
  const rows = await sql`
    SELECT id, owner_id, location, menu, edited_content, created_at
    FROM sns_announcements
    WHERE menu ILIKE ${'%' + menuKeyword + '%'}
    ORDER BY created_at DESC
  `;
  return rows as PublicSnsPost[];
}


// ─── 실행 진입점 (npm run dev:web:sns 로 직접 실행 시) ───────
async function main() {
  console.log('📱 [소비자용] 최근 SNS 홍보 문구 목록\n');

  const posts = await getRecentSnsPosts(5); // 최신 5개만 출력

  if (posts.length === 0) {
    console.log('⚠️  등록된 SNS 홍보 문구가 없습니다.');
    return;
  }

  console.log(`최근 ${posts.length}개의 홍보 문구:`);
  console.log('────────────────────────────────────────');

  posts.forEach((post, index) => {
    const date = new Date(post.created_at).toLocaleDateString('ko-KR');
    console.log(`\n[${index + 1}] 📍 ${post.location} | 🍴 ${post.menu} | 📅 ${date}`);
    console.log(`    💬 ${post.edited_content}`);
  });
}

main().catch((err) => {
  console.error('❌ 오류 발생:', err.message);
  process.exit(1);
});

export { getRecentSnsPosts, searchSnsPostsByLocation, searchSnsPostsByMenu };
