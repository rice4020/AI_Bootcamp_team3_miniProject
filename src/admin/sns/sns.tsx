// admin/sns 폴더 - 관리자 SNS 홍보 문구 관리 모듈
import { sql, IS_MOCK_MODE } from '../../lib/db';

// ─── 타입 정의 ───────────────────────────────────────────────
// DB의 sns_announcements 테이블 구조에 맞춘 타입
interface SnsAnnouncement {
  id: number;
  owner_id: string;           // 사장님 회원 ID
  location: string;           // 영업 장소
  menu: string;               // 판매 메뉴
  prompt_style: string;       // AI 문구 스타일 (감성형/유쾌형/정보전달형)
  generated_content: string;  // AI가 생성한 원본 문구
  edited_content: string;     // 사장님이 최종 수정한 문구
  created_at: string;
}

// ─── 모의 데이터 정의 ──────────────────────────────────────────
const MOCK_ANNOUNCEMENTS: SnsAnnouncement[] = [
  {
    id: 1,
    owner_id: 'owner_taco',
    location: '서울숲 입구 앞 도로',
    menu: '정통 멕시칸 타코 (3pcs 9,000원)',
    prompt_style: '유쾌형',
    generated_content: '맛있는 타코가 왔어요! 서울숲에서 만나요!',
    edited_content: '🌮 오늘 날씨 좋은 금요일! 서울숲 입구에서 멕시칸 타코 트럭 오픈했습니다! 맥주 안주로 최고니 놀러 오세요! 🍻',
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 2,
    owner_id: 'owner_waffle',
    location: '한양대 정문 앞',
    menu: '벨기에 와플 & 에이드 세트',
    prompt_style: '감성형',
    generated_content: '달콤한 와플로 오늘 하루를 달콤하게.',
    edited_content: '🧇 바쁜 일상 속, 달콤한 쉼표 하나. 한양대 정문 앞에서 갓 구운 벨기에 와플 향기를 전해드립니다. ☕✨',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString()
  }
];

// ─── 함수 정의 ───────────────────────────────────────────────

/**
 * 전체 SNS 홍보 문구 목록을 최신순으로 조회합니다.
 */
async function getAllSnsAnnouncements(): Promise<SnsAnnouncement[]> {
  if (IS_MOCK_MODE) return MOCK_ANNOUNCEMENTS;
  const rows = await sql`
    SELECT id, owner_id, location, menu, prompt_style,
           generated_content, edited_content, created_at
    FROM sns_announcements
    ORDER BY created_at DESC
  `;
  return rows as SnsAnnouncement[];
}

/**
 * 특정 사장님(owner_id)의 SNS 홍보 문구 목록을 조회합니다.
 * @param ownerId - 사장님 회원 ID
 */
async function getSnsAnnouncementsByOwner(ownerId: string): Promise<SnsAnnouncement[]> {
  if (IS_MOCK_MODE) return MOCK_ANNOUNCEMENTS.filter(a => a.owner_id === ownerId);
  const rows = await sql`
    SELECT id, owner_id, location, menu, prompt_style,
           generated_content, edited_content, created_at
    FROM sns_announcements
    WHERE owner_id = ${ownerId}
    ORDER BY created_at DESC
  `;
  return rows as SnsAnnouncement[];
}


/**
 * 새로운 SNS 홍보 문구를 DB에 저장합니다.
 * @param ownerId           - 사장님 ID
 * @param location          - 영업 장소
 * @param menu              - 판매 메뉴
 * @param promptStyle       - 문구 스타일
 * @param generatedContent  - AI 생성 문구
 * @param editedContent     - 최종 수정 문구
 */
async function createSnsAnnouncement(
  ownerId: string,
  location: string,
  menu: string,
  promptStyle: string,
  generatedContent: string,
  editedContent: string
): Promise<SnsAnnouncement> {
  if (IS_MOCK_MODE) {
    const newAnnounce: SnsAnnouncement = {
      id: MOCK_ANNOUNCEMENTS.length + 1,
      owner_id: ownerId,
      location,
      menu,
      prompt_style: promptStyle,
      generated_content: generatedContent,
      edited_content: editedContent,
      created_at: new Date().toISOString()
    };
    console.log(`[Mock Mode] SNS 문구 저장 완료 (ID: ${newAnnounce.id})`);
    return newAnnounce;
  }

  const rows = await sql`
    INSERT INTO sns_announcements 
      (owner_id, location, menu, prompt_style, generated_content, edited_content)
    VALUES 
      (${ownerId}, ${location}, ${menu}, ${promptStyle}, ${generatedContent}, ${editedContent})
    RETURNING *
  `;
  console.log(`✅ SNS 문구 저장 완료 (ID: ${rows[0].id})`);
  return rows[0] as SnsAnnouncement;
}

/**
 * 특정 SNS 게시물을 삭제합니다.
 * @param id - 삭제할 게시물 ID
 */
async function deleteSnsAnnouncement(id: number): Promise<void> {
  if (IS_MOCK_MODE) {
    console.log(`[Mock Mode] 🗑️ SNS 문구 삭제 완료 (ID: ${id})`);
    return;
  }

  await sql`DELETE FROM sns_announcements WHERE id = ${id}`;
  console.log(`🗑️  SNS 문구 삭제 완료 (ID: ${id})`);
}


// ─── 실행 진입점 (npm run dev:admin:sns 으로 직접 실행 시) ───
async function main() {
  console.log('📱 관리자 SNS 홍보 문구 관리 패널\n');

  const announcements = await getAllSnsAnnouncements();
  
  if (announcements.length === 0) {
    console.log('⚠️  저장된 SNS 홍보 문구가 없습니다.');
    return;
  }

  console.log(`총 ${announcements.length}개의 홍보 문구가 있습니다.\n`);

  announcements.forEach((item) => {
    const date = new Date(item.created_at).toLocaleDateString('ko-KR');
    console.log(`[ID: ${item.id}] 사장님: ${item.owner_id} | 장소: ${item.location} | 스타일: ${item.prompt_style} | 작성일: ${date}`);
    console.log(`  📝 최종 문구: ${item.edited_content.substring(0, 60)}...`);
    console.log('');
  });
}

main().catch((err) => {
  console.error('❌ 오류 발생:', err.message);
  process.exit(1);
});

export { getAllSnsAnnouncements, getSnsAnnouncementsByOwner, createSnsAnnouncement, deleteSnsAnnouncement };
