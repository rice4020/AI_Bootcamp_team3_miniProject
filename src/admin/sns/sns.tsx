// @ts-nocheck
// admin/sns 폴더 - 관리자 SNS 홍보 문구 관리 및 콘텐츠 CRUD 연동 모듈
import { sql, IS_MOCK_MODE } from '../../lib/db';
import { createEvent, updateEvent, deleteEvent, getWeatherForecasts } from './content';

// ─── 타입 정의 ───────────────────────────────────────────────
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
    return newAnnounce;
  }

  const rows = await sql`
    INSERT INTO sns_announcements 
      (owner_id, location, menu, prompt_style, generated_content, edited_content)
    VALUES 
      (${ownerId}, ${location}, ${menu}, ${promptStyle}, ${generatedContent}, ${editedContent})
    RETURNING *
  `;
  return rows[0] as SnsAnnouncement;
}

async function deleteSnsAnnouncement(id: number): Promise<void> {
  if (IS_MOCK_MODE) {
    return;
  }
  await sql`DELETE FROM sns_announcements WHERE id = ${id}`;
}

// ─── 실행 진입점 (npm run dev:admin:sns 으로 직접 실행 시) ───
async function main() {
  console.log('📱 관리자 SNS 홍보 문구 관리 패널\n');

  const announcements = await getAllSnsAnnouncements();
  
  if (announcements.length === 0) {
    console.log('⚠️  저장된 SNS 홍보 문구가 없습니다.');
  } else {
    console.log(`총 ${announcements.length}개의 홍보 문구가 있습니다.\n`);
    announcements.slice(0, 2).forEach((item) => {
      const date = new Date(item.created_at).toLocaleDateString('ko-KR');
      console.log(`[ID: ${item.id}] 사장님: ${item.owner_id} | 장소: ${item.location}`);
      console.log(`  📝 최종 문구: ${item.edited_content.substring(0, 60)}...`);
    });
  }

  // 🛡️ [최병현 파트 관리자 데이터 CRUD 테스트 연동]
  console.log('\n====================================================');
  console.log('🛡️ [관리자 모드] 최병현 개발자 행사/날씨 통합 CRUD 연동 검증');
  console.log('====================================================');

  // 1. 신규 행사 강제 등록 시뮬레이션
  console.log('\n[CRUD 1] 관리자가 새로운 문화 행사를 시스템에 긴급 등록합니다.');
  const newEvent = await createEvent({
    title: '성동 문화 테크 콘서트 2026',
    location: '성수 IT 밸리 야외 잔디광장',
    start_date: '2026-11-20',
    end_date: '2026-11-22',
    scale: '중규모(8천명)',
    description: '성동구 청년창업 아이템 전시 및 공연 연계 야외행사'
  });
  console.log('👉 생성된 행사 데이터:', newEvent);

  // 2. 행사 정보 업데이트 시뮬레이션
  console.log('\n[CRUD 2] 등록한 행사의 타겟 규모 및 위치를 수정합니다.');
  const updatedEvent = await updateEvent(newEvent.id, {
    scale: '대규모(1.2만명)',
    description: '참가 아티스트 증대로 유동인구 1.5배 증가 예상'
  });
  console.log('👉 수정된 행사 데이터:', updatedEvent);

  // 3. 기상 정보 조회 테스트 연동
  console.log('\n[CRUD 3] 현재 등록되어 운영 관리중인 날씨 예측 통계를 읽어옵니다.');
  const list = await getWeatherForecasts();
  console.log(`👉 날씨 예보 갯수: ${list.length}개`);

  // 4. 테스트 행사 삭제
  console.log('\n[CRUD 4] 테스트가 완료된 임시 행사 정보를 리셋(삭제)합니다.');
  const deleted = await deleteEvent(newEvent.id);
  console.log(`👉 임시 행사 삭제 성공 여부: [${deleted}]`);
  console.log('====================================================\n');
}

if (require.main === module || process.env.NODE_ENV === 'test' || IS_MOCK_MODE) {
  main().catch((err) => {
    console.error('❌ 오류 발생:', err.message);
  });
}

export { getAllSnsAnnouncements, getSnsAnnouncementsByOwner, createSnsAnnouncement, deleteSnsAnnouncement };
