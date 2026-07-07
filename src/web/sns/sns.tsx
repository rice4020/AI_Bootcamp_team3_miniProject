// web/sns 폴더 - 소비자(일반 사용자) SNS 홍보 문구 조회 및 사장님 문구 생성/편집 모듈
import { sql, IS_MOCK_MODE } from '../../lib/db';

// ─── 타입 정의 ───────────────────────────────────────────────
export type PromptStyle = '감성형' | '유쾌형' | '정보전달형';

export interface PublicSnsPost {
  id?: number;
  owner_id: string;        // 사장님 회원 ID
  location: string;        // 영업 장소
  menu: string;            // 판매 메뉴
  prompt_style: string;    // 감성형, 유쾌형, 정보전달형
  generated_content: string; // AI가 최초 생성한 문구
  edited_content: string;  // 최종 공개 문구 (사장님이 수정한 버전)
  created_at?: string;
}

// ─── 모의 데이터 정의 ──────────────────────────────────────────
const MOCK_SNS_POSTS: PublicSnsPost[] = [
  {
    id: 1,
    owner_id: 'owner_taco',
    location: '서울숲 입구 앞 도로',
    prompt_style: '감성형',
    menu: '정통 멕시칸 타코 (3pcs 9,000원)',
    generated_content: '✨ 노을이 아름답게 내려앉는 이곳, 서울숲 입구 앞 도로에서 작은 여유를 나누고 싶습니다.',
    edited_content: '🌮 오늘 날씨 좋은 금요일! 서울숲 입구에서 멕시칸 타코 트럭 오픈했습니다! 맥주 안주로 최고니 놀러 오세요! 🍻',
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 2,
    owner_id: 'owner_waffle',
    location: '한양대 정문 앞',
    prompt_style: '유쾌형',
    menu: '벨기에 와플 & 에이드 세트',
    generated_content: '🔥 텐션 업! 배고픔 타파! 한양대 정문 앞 맛도리 트럭 출격 완료했습니다!',
    edited_content: '🧇 바쁜 일상 속, 달콤한 쉼표 하나. 한양대 정문 앞에서 갓 구운 벨기에 와플 향기를 전해드립니다. ☕✨',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString()
  }
];

// ─── [내장 AI 에이전트 생성 엔진] ────────────────────────────────────
export async function generateInstagramNotice(
  location: string,
  menu: string,
  style: PromptStyle
): Promise<string> {
  const templates = {
    '감성형': [
      `✨ 노을이 아름답게 내려앉는 이곳, 📍 ${location}에서 작은 여유를 나누고 싶습니다.\n\n바쁜 하루의 마무리를 저희 🍴 ${menu}와 함께 감성 가득 채워보시는 건 어떨까요? 따뜻한 온도 그대로 정성껏 구워 기다리겠습니다. 놀러 오세요. ☕🍂`,
      `🌙 달빛 아래 은은하게 흐르는 맛있는 냄새. 📍 ${location}에 소담히 자리를 폈습니다.\n\n바람이 선선한 오늘, 정성으로 준비한 🍴 ${menu} 한 입으로 지친 마음에 작은 쉼표를 찍어보세요. ✨`
    ],
    '유쾌형': [
      `🔥 텐션 업! 배고픔 타파! 📍 ${location}에 맛도리 트럭 출격 완료했습니다! 🚚💨\n\n한번 먹으면 멈출 수 없는 중독성 갑 🍴 ${menu} 대기 중! 다이어트는 내일부터, 맛있는 건 오늘 당장 먹어야 정신건강에 이롭습니다! 얼른 뛰어오세요! 🏃‍♂️💨💨`,
      `🚨 [속보] 맛의 혁명군 📍 ${location} 점령 완료!\n\n오늘 점심/저녁 메뉴 고민은 사치입니다. 🍴 ${menu}가 준비되어 있으니까요! 배꼽 시계 울리면 묻지도 따지지도 말고 컴온! 🥳🌮`
    ],
    '정보전달형': [
      `📢 [푸드트럭 영업 공지]\n\n금일 영업 장소는 📍 ${location} 입니다.\n대표 메뉴는 [${menu}] 이며, 현재 당일 한정 재고로 정성껏 신선하게 조리 중입니다.\n\n📍 위치: ${location}\n🍴 주요 메뉴: ${menu}\n⏰ 현 시간부로 영업을 정상 개시하오니 이용에 참고하시기 바랍니다.`,
      `📋 [실시간 영업 안내]\n\n안녕하세요! 지금 📍 ${location}에서 영업을 오픈하였습니다.\n당일 소진 시까지 판매가 진행되며, 맛있는 🍴 ${menu}를 신속하고 정결하게 준비하여 드리고 있습니다. 많은 성원 부탁드립니다.`
    ]
  };

  const selectedTemplates = templates[style] || templates['정보전달형'];
  const randomIndex = Math.floor(Math.random() * selectedTemplates.length);
  
  await new Promise(resolve => setTimeout(resolve, 200));
  return selectedTemplates[randomIndex];
}

// ─── 함수 정의 ───────────────────────────────────────────────

/**
 * 최근 SNS 홍보 문구 목록을 최신순으로 조회합니다. (소비자 공개용)
 */
async function getRecentSnsPosts(limit: number = 10): Promise<PublicSnsPost[]> {
  if (IS_MOCK_MODE) return MOCK_SNS_POSTS.slice(0, limit);
  const rows = await sql`
    SELECT id, owner_id, location, menu, prompt_style, generated_content, edited_content, created_at
    FROM sns_announcements
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows as PublicSnsPost[];
}

/**
 * 특정 장소 키워드로 SNS 홍보 글을 검색합니다.
 */
async function searchSnsPostsByLocation(locationKeyword: string): Promise<PublicSnsPost[]> {
  if (IS_MOCK_MODE) {
    return MOCK_SNS_POSTS.filter(p => p.location.toLowerCase().includes(locationKeyword.toLowerCase()));
  }
  const rows = await sql`
    SELECT id, owner_id, location, menu, prompt_style, generated_content, edited_content, created_at
    FROM sns_announcements
    WHERE location ILIKE ${'%' + locationKeyword + '%'}
    ORDER BY created_at DESC
  `;
  return rows as PublicSnsPost[];
}

/**
 * 특정 메뉴 키워드로 SNS 홍보 글을 검색합니다.
 */
async function searchSnsPostsByMenu(menuKeyword: string): Promise<PublicSnsPost[]> {
  if (IS_MOCK_MODE) {
    return MOCK_SNS_POSTS.filter(p => p.menu.toLowerCase().includes(menuKeyword.toLowerCase()));
  }
  const rows = await sql`
    SELECT id, owner_id, location, menu, prompt_style, generated_content, edited_content, created_at
    FROM sns_announcements
    WHERE menu ILIKE ${'%' + menuKeyword + '%'}
    ORDER BY created_at DESC
  `;
  return rows as PublicSnsPost[];
}

/**
 * 사장님이 새로운 SNS 피드 문구를 AI 에이전트를 통해 생성하고 편집 후 최종 등록(DB 저장)합니다.
 */
async function generateAndSaveSnsNotice(
  ownerId: string,
  location: string,
  menu: string,
  style: PromptStyle,
  userEditedContent?: string
): Promise<PublicSnsPost> {
  // 1. 내장 AI 생성 엔진 호출
  const generated = await generateInstagramNotice(location, menu, style);

  // 2. 사장님이 수정한 내용이 없으면 AI가 생성해준 문구를 그대로 사용
  const finalContent = userEditedContent || generated;

  const newPost: PublicSnsPost = {
    owner_id: ownerId,
    location,
    menu,
    prompt_style: style,
    generated_content: generated,
    edited_content: finalContent,
    created_at: new Date().toISOString()
  };

  if (IS_MOCK_MODE) {
    MOCK_SNS_POSTS.unshift({ ...newPost, id: MOCK_SNS_POSTS.length + 1 });
    console.log('✨ [Mock DB] 새로운 SNS 홍보 글이 정상 저장되었습니다.');
    return newPost;
  }

  // 3. 실제 Neon DB 저장
  const result = await sql`
    INSERT INTO sns_announcements (owner_id, location, menu, prompt_style, generated_content, edited_content)
    VALUES (${ownerId}, ${location}, ${menu}, ${style}, ${generated}, ${finalContent})
    RETURNING id, owner_id, location, menu, prompt_style, generated_content, edited_content, created_at
  `;

  return result[0] as PublicSnsPost;
}

// ─── 실행 진입점 (npm run dev:web:sns 로 직접 실행 시) ───────
async function main() {
  console.log('📱 [사장님 모듈] 5.1 & 5.2 SNS 문구 생성 및 편집 시뮬레이션');
  console.log('────────────────────────────────────────');

  const testOwner = 'owner_kim';
  const testLocation = '강남역 11번 출구 스파오 앞';
  const testMenu = '수제 직화 닭꼬치 (간장/매콤 3,500원)';
  
  console.log(`\n1. AI 홍보 문구 생성 진행 (스타일: 감성형)`);
  const post = await generateAndSaveSnsNotice(testOwner, testLocation, testMenu, '감성형');
  console.log(`🤖 AI 생성 원본:\n"${post.generated_content}"`);

  console.log(`\n2. 사장님이 확인 후 직접 문구를 수정하는 단계 시뮬레이션`);
  const modifiedText = post.generated_content + '\n\n🔥 [오픈기념 이벤트] 닭꼬치 3개 구매 시 시원한 콜라 서비스 증정! 🔥';
  
  const finalSaved = await generateAndSaveSnsNotice(testOwner, testLocation, testMenu, '감성형', modifiedText);
  console.log(`💾 DB 최종 반영본:\n"${finalSaved.edited_content}"`);

  console.log('\n📱 [소비자 모듈] 최근 SNS 홍보 문구 목록 조회');
  console.log('────────────────────────────────────────');
  const posts = await getRecentSnsPosts(5);
  posts.forEach((p, idx) => {
    console.log(`[${idx + 1}] 📍 ${p.location} | 🍴 ${p.menu}`);
    console.log(`    💬 ${p.edited_content}\n`);
  });
}

if (require.main === module || process.env.NODE_ENV === 'test' || IS_MOCK_MODE) {
  main().catch((err) => {
    console.error('❌ 오류 발생:', err.message);
  });
}

export { getRecentSnsPosts, searchSnsPostsByLocation, searchSnsPostsByMenu, generateAndSaveSnsNotice };
