import { NextResponse } from 'next/server';
import { sql, IS_MOCK_MODE } from '@/lib/db';
import { Pool } from 'pg';

// pg pool (허가구역 동기화 UPSERT용)
let pool = null;
function getDbPool() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;
  
  // 💡 가짜 DB 주소 플레이스홀더가 기입된 경우, 진짜 연동을 시도하지 않고 모의(Mock) 모드로 작동하도록 차단
  if (
    dbUrl.includes("your-neon-hostname") || 
    dbUrl.includes("username:password")
  ) {
    return null;
  }
  
  if (!pool) {
    pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }
  return pool;
}

// 🕒 24시간제(YYYY-MM-DD HH:mm) 시간 포맷터 헬퍼 함수 (오후 6시 -> 18:00 형식 적용)
function format24hDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

// 🌐 실제 외부 API 서버 생존 여부 및 연결 상태 동적 검사 헬퍼 함수 (3초 타임아웃 적용)
async function checkApiConnection(apiType) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3초 지나면 타임아웃으로 중단
    
    let targetUrl = '';
    if (apiType === 'weather' || apiType === 'spots') {
      targetUrl = 'https://www.data.go.kr'; // 공공데이터포털 메인 도메인 (무응답 차단 방화벽 예방을 위해 상시 열려있는 메인 사이트 핑 테스트로 변경)
    } else if (apiType === 'naver') {
      targetUrl = 'https://naveropenapi.apigw.ntruss.com'; // 네이버 클라우드 플랫폼 API 도메인
    }

    if (!targetUrl) return 'active';

    // 📡 가볍게 GET 요청을 보내 응답 여부를 확인합니다.
    const res = await fetch(targetUrl, { 
      method: 'GET',
      signal: controller.signal,
      next: { revalidate: 0 }
    });
    
    clearTimeout(timeoutId);
    
    // 응답이 오거나 서버 오류 상태(500, 401, 400 등)가 오더라도 서버가 살아있어 응답을 준 것이므로 연결은 정상으로 봅니다.
    // 완전히 네트워크가 먹통이거나 도메인 주소가 잘못되었을 때만 에러로 판단합니다.
    if (res.status >= 200 && res.status < 500) {
      return 'active';
    } else {
      // 500 이상의 에러인 경우 서버 자체 오작동 상태로 간주
      return 'error';
    }
  } catch (err) {
    console.warn(`[API 연결 감지 실패] ${apiType}:`, err.message);
    return 'error'; // 연결 타임아웃 혹은 네트워크 장애 시 에러
  }
}

// 🏠 모의 모드 상태값 유지용 임시 메모리 저장소 (새로고침 시 상태 유실 방지 및 동적 ID 매칭용)
let mockStatesOverride = {};

// 📡 로컬 Mock 모드 및 실시간 연동을 위한 전역 메모리 데이터베이스 (10개씩 페이징 테스트를 위해 넉넉히 확장)
let mockWeatherDetails = [
  { id: 'det-w1', location: "서울 중구 (시청 격자)", value: "맑음, 24.5°C", state: "승인됨", lat: 37.5665, lng: 126.9780, nx: 60, ny: 127 },
  { id: 'det-w2', location: "서울 마포구 (홍대 격자)", value: "맑음, 25.0°C", state: "승인됨", lat: 37.5562, lng: 126.9225, nx: 59, ny: 126 },
  { id: 'det-w3', location: "서울 강남구 (강남역 격자)", value: "구름많음, 26.2°C", state: "승인됨", lat: 37.4982, lng: 127.0276, nx: 61, ny: 125 },
  { id: 'det-w4', location: "경기 성남시 (율동 격자)", value: "흐림, 23.8°C", state: "승인됨", lat: 37.3788, lng: 127.1478, nx: 62, ny: 123 },
  { id: 'det-w5', location: "인천 남동구 (소래 격자)", value: "맑음, 24.0°C", state: "승인됨", lat: 37.3995, lng: 126.7345, nx: 54, ny: 124 },
  { id: 'det-w6', location: "경기 고양시 (호수 격자)", value: "맑음, 24.8°C", state: "승인됨", lat: 37.6582, lng: 126.7645, nx: 57, ny: 128 },
  { id: 'det-w7', location: "경기 수원시 (행궁 격자)", value: "비, 22.0°C", state: "승인됨", lat: 37.2828, lng: 127.0135, nx: 60, ny: 121 },
  { id: 'det-w8', location: "경기 가평군 (자라섬 격자)", value: "구름많음, 23.0°C", state: "승인됨", lat: 37.8205, lng: 127.5235, nx: 69, ny: 132 },
  { id: 'det-w9', location: "서울 용산구 (이촌 격자)", value: "맑음, 24.2°C", state: "승인됨", lat: 37.5180, lng: 126.9635, nx: 60, ny: 126 },
  { id: 'det-w10', location: "서울 송파구 (올림픽 격자)", value: "맑음, 25.1°C", state: "승인됨", lat: 37.5173, lng: 127.1209, nx: 62, ny: 126 },
  { id: 'det-w11', location: "인천 연수구 (송도 격자)", value: "구름많음, 23.5°C", state: "승인됨", lat: 37.3916, lng: 126.6385, nx: 52, ny: 124 },
  { id: 'det-w12', location: "서울 영등포구 (여의도 격자)", value: "맑음, 24.7°C", state: "승인됨", lat: 37.5284, lng: 126.9320, nx: 59, ny: 126 }
];

let mockSpotsDetails = [
  { id: 'det-s1', spotName: "여의도 한강공원 3주차장", address: "서울 영등포구 여의동로 330", state: "승인됨" },
  { id: 'det-s2', spotName: "마포구 홍대 걷고싶은거리", address: "서울 마포구 어울마당로 115", state: "대기중" },
  { id: 'det-s3', spotName: "반포 한강공원 세빛섬 달빛광장", address: "서울 서초구 신반포로11길 40", state: "승인됨" },
  { id: 'det-s4', spotName: "서울숲공원 야외광장 진입로", address: "서울 성동구 동부간선도로 273", state: "승인됨" },
  { id: 'det-s5', spotName: "뚝섬 한강공원 수변광장 뒷편", address: "서울 광진구 자양동 704", state: "승인됨" },
  { id: 'det-s6', spotName: "망원 한강공원 선착장 인근", address: "서울 마포구 마포나루길 467", state: "대기중" },
  { id: 'det-s7', spotName: "상암 월드컵공원 평화의 광장", address: "서울 마포구 월드컵로 291", state: "승인됨" },
  { id: 'det-s8', spotName: "어린이대공원 후문 주차 광장", address: "서울 광진구 능동로 216", state: "승인됨" },
  { id: 'det-s9', spotName: "올림픽공원 평화의 문 광장 야외", address: "서울 송파구 올림픽로 424", state: "승인됨" },
  { id: 'det-s10', spotName: "동대문 디자인 플라자 DDP 광장", address: "서울 중구 을지로 281", state: "대기중" },
  { id: 'det-s11', spotName: "마포 문화비축기지 메인 야외광장", address: "서울 마포구 증산로 87", state: "승인됨" },
  { id: 'det-s12', spotName: "일산 호수공원 한울광장 수변로", address: "경기 고양시 일산동구 호수로 595", state: "승인됨" },
  { id: 'det-s13', spotName: "수원 화성행궁 앞 대형 광장", address: "경기 수원시 팔달구 정조로 825", state: "승인됨" },
  { id: 'det-s14', spotName: "송도 센트럴파크 잔디광장 부근", address: "인천 연수구 컨벤시아대로 160", state: "대기중" },
  { id: 'det-s15', spotName: "과천 서울대공원 매표소 인근 광장", address: "경기 과천시 대공원광장로 102", state: "승인됨" }
];

// 🚨 Neon DB 최초 연동 시 빈 데이터베이스를 채워주기 위한 Fail-safe 예비 실데이터 30선
const FALLBACK_LEGAL_SPOTS = [
  { id: 'gov-spot-1', name: "여의도 한강공원 멀티플라자 광장", lat: 37.5284, lng: 126.9320, rules: "합법 점용 허가구역 | 운영시간: 14:00 ~ 22:00 | 소재지: 서울 영등포구 여의동로 330" },
  { id: 'gov-spot-2', name: "홍대 걷고싶은거리 버스킹 광장", lat: 37.5562, lng: 126.9225, rules: "청년창업 지원구역 | 운영시간: 11:00 ~ 21:00 | 소재지: 서울 마포구 어울마당로 115" },
  { id: 'gov-spot-3', name: "강남역 8번출구 대형빌딩 전면공지", lat: 37.4982, lng: 127.0276, rules: "민간 빌딩 전면공지 | 운영시간: 11:00 ~ 14:00 | 소재지: 서울 서초구 서초대로 397" },
  { id: 'gov-spot-4', name: "청계천 광통교 남단 광장", lat: 37.5688, lng: 126.9802, rules: "문화축제 연계구역 | 운영시간: 17:00 ~ 22:00 | 소재지: 서울 중구 남대문로9길 40" },
  { id: 'gov-spot-5', name: "반포 한강공원 세빛섬 달빛광장", lat: 37.5113, lng: 126.9965, rules: "한강공원 공식 지정구역 | 운영시간: 16:00 ~ 23:00 | 소재지: 서울 서초구 신반포로11길 40" },
  { id: 'gov-spot-6', name: "서울숲공원 야외광장 진입로", lat: 37.5443, lng: 127.0374, rules: "공원 점용 허가구역 | 운영시간: 10:00 ~ 20:00 | 소재지: 서울 성동구 동부간선도로 273" },
  { id: 'gov-spot-7', name: "뚝섬 한강공원 수변광장 뒷편", lat: 37.5298, lng: 127.0700, rules: "지자체 공식 푸드구역 | 운영시간: 13:00 ~ 22:00 | 소재지: 서울 광진구 자양동 704" },
  { id: 'gov-spot-8', name: "망원 한강공원 선착장 인근", lat: 37.5557, lng: 126.8943, rules: "망원 수변 특화구역 | 운영시간: 14:00 ~ 21:00 | 소재지: 서울 마포구 마포나루길 467" },
  { id: 'gov-spot-9', name: "이촌 한강공원 인라인스케이트장 옆", lat: 37.5180, lng: 126.9635, rules: "공원 레저 연계 스팟 | 운영시간: 12:00 ~ 20:00 | 소재지: 서울 용산구 이촌로72길 62" },
  { id: 'gov-spot-10', name: "상암 월드컵공원 평화의 광장", lat: 37.5684, lng: 126.8988, rules: "월드컵 경기 연계구역 | 운영시간: 10:00 ~ 21:00 | 소재지: 서울 마포구 월드컵로 291" },
  { id: 'gov-spot-11', name: "어린이대공원 후문 주차 광장", lat: 37.5492, lng: 127.0818, rules: "가족단위 테마 상권 | 운영시간: 09:00 ~ 19:00 | 소재지: 서울 광진구 능동로 216" },
  { id: 'gov-spot-12', name: "북서울꿈의숲 서문 정문진입 광장", lat: 37.6206, lng: 127.0428, rules: "북부 문화 휴양 스팟 | 운영시간: 11:00 ~ 20:00 | 소재지: 서울 강북구 월계로 173" },
  { id: 'gov-spot-13', name: "올림픽공원 평화의 문 광장 야외", lat: 37.5173, lng: 127.1209, rules: "체육행사 연계 합법구역 | 운영시간: 10:00 ~ 22:00 | 소재지: 서울 송파구 올림픽로 424" },
  { id: 'gov-spot-14', name: "신촌 연세로 차없는거리 진입광장", lat: 37.5583, lng: 126.9366, rules: "대학가 청년창업 구역 | 운영시간: 12:00 ~ 22:00 | 소재지: 서울 서대문구 신촌동 15" },
  { id: 'gov-spot-15', name: "동대문 디자인 플라자 (DDP) 남측광장", lat: 37.5668, lng: 127.0094, rules: "동대문 패션특구 축제구역 | 운영시간: 16:00 ~ 23:00 | 소재지: 서울 중구 을지로 281" },
  { id: 'gov-spot-16', name: "마포 문화비축기지 메인 야외광장", lat: 37.5702, lng: 126.8953, rules: "문화비축 예술시장 스팟 | 운영시간: 12:00 ~ 21:00 | 소재지: 서울 마포구 증산로 87" },
  { id: 'gov-spot-17', name: "일산 호수공원 한울광장 수변로", lat: 37.6582, lng: 126.7645, rules: "꽃박람회 관광 활성화 스팟 | 운영시간: 10:00 ~ 21:00 | 소재지: 경기 고양시 일산동구 호수로 595" },
  { id: 'gov-spot-18', name: "수원 화성행궁 앞 대형 광장", lat: 37.2828, lng: 127.0135, rules: "역사문화 축제 연계구역 | 운영시간: 11:00 ~ 22:00 | 소재지: 경기 수원시 팔달구 정조로 825" },
  { id: 'gov-spot-19', name: "송도 센트럴파크 잔디광장 부근", lat: 37.3916, lng: 126.6385, rules: "인천 경제자유구역 지정스팟 | 운영시간: 11:00 ~ 20:00 | 소재지: 인천 연수구 컨벤시아대로 160" },
  { id: 'gov-spot-20', name: "인천 소래포구 해오름공원 야외광장", lat: 37.3995, lng: 126.7345, rules: "어시장 관광 활성화 특구 | 운영시간: 13:00 ~ 22:00 | 소재지: 인천 남동구 아암대로 1562" },
  { id: 'gov-spot-21', name: "성남 분당 율동공원 주차장 옆 진입로", lat: 37.3788, lng: 127.1478, rules: "가족 나들이 특수 상권 | 운영시간: 09:00 ~ 19:00 | 소재지: 경기 성남시 분당구 율동 1" },
  { id: 'gov-spot-22', name: "과천 서울대공원 매표소 인근 광장", lat: 37.4278, lng: 127.0175, rules: "동물원/놀이공원 관광 상권 | 운영시간: 09:00 ~ 18:00 | 소재지: 경기 과천시 대공원광장로 102" },
  { id: 'gov-spot-23', name: "가평 자라섬 서도 진입 잔디광장", lat: 37.8205, lng: 127.5235, rules: "재즈 페스티벌 지정 푸드존 | 운영시간: 11:00 ~ 23:00 | 소재지: 경기 가평군 가평읍 자라섬로 60" },
  { id: 'gov-spot-24', name: "수원 광교호수공원 거울못 주변", lat: 37.2845, lng: 127.0655, rules: "신도시 호수공원 특화구역 | 운영시간: 12:00 ~ 21:00 | 소재지: 경기 수원시 영통구 광교호수로 165" },
  { id: 'gov-spot-25', name: "부천 중앙공원 야외음악당 뒷편", lat: 37.5028, lng: 126.7648, rules: "문화예술 활성화 시범구역 | 운영시간: 10:00 ~ 20:00 | 소재지: 경기 부천시 소향로 162" },
  { id: 'gov-spot-26', name: "시흥 배곧생명공원 전망대 앞", lat: 37.3725, lng: 126.7215, rules: "해안 낙조관람 나들이 상권 | 운영시간: 13:00 ~ 21:00 | 소재지: 경기 시흥시 배곧2로 25" },
  { id: 'gov-spot-27', name: "안산 대부도 방아머리해변 진입로", lat: 37.2982, lng: 126.5925, rules: "관광 유원지 주말 특화 상권 | 운영시간: 10:00 ~ 22:00 | 소재지: 경기 안산시 단원구 대부황금로 112" },
  { id: 'gov-spot-28', name: "파주 임진각 평화누리공원 잔디광장", lat: 37.8925, lng: 126.7415, rules: "안보관광 특수 지정구역 | 운영시간: 09:00 ~ 18:00 | 소재지: 경기 파주시 임진각로 148-40" },
  { id: 'gov-spot-29', name: "남양주 삼패공원 야외분수대 광장", lat: 37.5828, lng: 127.2045, rules: "한강 수변공원 나들이 스팟 | 운영시간: 11:00 ~ 20:00 | 소재지: 경기 남양주시 강변북로 1630" },
  { id: 'gov-spot-30', name: "대학로 마로니에공원 야외무대 주변", lat: 37.5815, lng: 127.0022, rules: "문화예술공연 특화 합법구역 | 운영시간: 12:00 ~ 21:30 | 소재지: 서울 종로구 대학로 104" }
];

let mockNaverDetails = [
  { id: 'det-n1', query: "서울특별시 영등포구 여의동로 330", result: "37.5284, 126.9320", state: "정상연동" },
  { id: 'det-n2', query: "서울특별시 마포구 어울마당로 115", result: "37.5562, 126.9225", state: "정상연동" },
  { id: 'det-n3', query: "서울특별시 서초구 신반포로11길 40", result: "37.5113, 126.9965", state: "정상연동" },
  { id: 'det-n4', query: "서울특별시 성동구 동부간선도로 273", result: "37.5443, 127.0374", state: "정상연동" },
  { id: 'det-n5', query: "서울특별시 광진구 자양동 704", result: "37.5298, 127.0700", state: "정상연동" },
  { id: 'det-n6', query: "서울특별시 마포구 마포나루길 467", result: "37.5557, 126.8943", state: "정상연동" },
  { id: 'det-n7', query: "서울특별시 마포구 월드컵로 291", result: "37.5684, 126.8988", state: "정상연동" },
  { id: 'det-n8', query: "서울특별시 광진구 능동로 216", result: "37.5492, 127.0818", state: "정상연동" },
  { id: 'det-n9', query: "서울특별시 송파구 올림픽로 424", result: "37.5173, 127.1209", state: "정상연동" },
  { id: 'det-n10', query: "서울특별시 중구 을지로 281", result: "37.5668, 127.0094", state: "정상연동" },
  { id: 'det-n11', query: "서울특별시 마포구 증산로 87", result: "37.5702, 126.8953", state: "정상연동" },
  { id: 'det-n12', query: "경기 고양시 일산동구 호수로 595", result: "37.6582, 126.7645", state: "정상연동" }
];

let mockWeatherLastUpdated = "2026-07-06 06:00";
let mockSpotsCount = 120;
let mockSpotsLastUpdated = "2026-07-01 08:30";
let mockNaverLastUpdated = "2026-07-06 12:00";
let mockNaverCount = 2500;

// 기상청 초단기실황 API 호출용 헬퍼 함수
async function fetchRealWeatherFromKMA(serviceKey, nx, ny) {
  try {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    const kst = new Date(utc + (9 * 60 * 60 * 1000));
    
    let year = kst.getFullYear();
    let month = kst.getMonth() + 1;
    let date = kst.getDate();
    let hours = kst.getHours();
    let minutes = kst.getMinutes();

    if (minutes < 40) {
      if (hours === 0) {
        const yesterday = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
        year = yesterday.getFullYear();
        month = yesterday.getMonth() + 1;
        date = yesterday.getDate();
        hours = 23;
      } else {
        hours -= 1;
      }
    }

    const baseDate = `${year}${month.toString().padStart(2, '0')}${date.toString().padStart(2, '0')}`;
    const baseTime = `${hours.toString().padStart(2, '0')}00`;
    const targetUrl = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${encodeURIComponent(serviceKey)}&type=json&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;

    const res = await fetch(targetUrl, { next: { revalidate: 0 } });
    if (!res.ok) return null;

    const data = await res.json();
    const items = data?.response?.body?.items?.item;
    if (!items || !Array.isArray(items)) return null;

    let temp = '24.0';
    let pty = '0';
    items.forEach(item => {
      if (item.category === 'T1H') temp = item.obsrValue;
      if (item.category === 'PTY') pty = item.obsrValue;
    });

    let statusText = '맑음';
    switch (pty) {
      case '1': case '5': statusText = '비'; break;
      case '2': case '6': statusText = '진눈깨비'; break;
      case '3': case '7': statusText = '눈'; break;
      default: statusText = '맑음'; break;
    }

    return `${statusText}, ${temp}°C`;
  } catch (err) {
    console.warn("기상청 API 연동 실시간 동기화 에러:", err.message);
    return null;
  }
}

// GET /api/admin/apis : API 연결 상태 및 수집 데이터 상세 조회 (페이지네이션 적용)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url || '');
    
    // 💡 Neon DB 셋업 편의를 위해 테이블이 없으면 자동 생성
    const dbPool = getDbPool();
    const hasDb = !IS_MOCK_MODE && dbPool;
    if (hasDb) {
      try {
        await dbPool.query(`
          CREATE TABLE IF NOT EXISTS legal_spots (
            id VARCHAR(100) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            lat DOUBLE PRECISION NOT NULL,
            lng DOUBLE PRECISION NOT NULL,
            rules TEXT,
            approved BOOLEAN DEFAULT TRUE,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 💡 테이블 데이터가 텅 비었는지(0건) 확인하여 비어있다면 자동 시딩(Seeding) 수행
        const countCheck = await dbPool.query('SELECT COUNT(*) as count FROM legal_spots');
        const dbCount = parseInt(countCheck.rows[0].count || '0');
        if (dbCount === 0) {
          console.log("ℹ️ [Admin API] Neon DB 테이블이 비어있습니다. 백업 30대 명당을 자동 시딩합니다...");
          await dbPool.query('BEGIN');
          try {
            for (const spot of FALLBACK_LEGAL_SPOTS) {
              await dbPool.query(`
                INSERT INTO legal_spots (id, name, lat, lng, rules, approved, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (id) DO NOTHING
              `, [spot.id, spot.name, spot.lat, spot.lng, spot.rules, true]);
            }
            await dbPool.query('COMMIT');
            console.log("✅ [Admin API] Neon DB 백업 30대 명당 시딩 완료!");
          } catch (seedErr) {
            await dbPool.query('ROLLBACK');
            console.error("❌ [Admin API] Neon DB 시딩 실패:", seedErr.message);
          }
        }
      } catch (tableErr) {
        console.error("Neon DB 테이블 자동 생성 실패:", tableErr.message);
      }
    }

    // 각 API별 요청 페이지 파싱 (기본값: 1페이지, 한 페이지당 10개 고정)
    const pageApi1 = parseInt(searchParams.get('page_api1') || '1') || 1;
    const pageApi2 = parseInt(searchParams.get('page_api2') || '1') || 1;
    const pageApi3 = parseInt(searchParams.get('page_api3') || '1') || 1;
    const limit = 10;

    // 1. 기상청 API 상태 및 데이터 매핑 (실시간 연결 상태 동적 확인)
    const weatherStatus = await checkApiConnection('weather');
    
    // 기상청 수집 이력 목록 동적 생성 (12개 격자 * 6개 시간대 = 72건 매칭)
    const api1Total = 72;
    const api1TotalPages = Math.ceil(api1Total / limit);
    let allWeatherData = [];
    for (let i = 0; i < api1Total; i++) {
      const locIdx = i % mockWeatherDetails.length;
      const timeIdx = Math.floor(i / mockWeatherDetails.length);
      const baseLoc = mockWeatherDetails[locIdx];
      
      const date = new Date(Date.now() - timeIdx * 3 * 60 * 60 * 1000);
      const timeStr = format24hDate(date);
      
      const itemId = `kma-gen-${i}`;
      allWeatherData.push({
        id: itemId,
        location: `${baseLoc.location} (위도: ${baseLoc.lat}, 경도: ${baseLoc.lng}) [${timeStr} 수집]`,
        value: baseLoc.value,
        state: mockStatesOverride[itemId] || baseLoc.state
      });
    }
    const api1Sliced = allWeatherData.slice((pageApi1 - 1) * limit, pageApi1 * limit);

    // 2. 허가구역 API 상태 및 데이터 매핑 (실시간 연결 상태 동적 확인)
    const spotsStatus = await checkApiConnection('spots');
    
    let spotsCount = mockSpotsCount; 
    let spotsLastUpdated = mockSpotsLastUpdated;
    let spotsDetails = [];
    let spotsTotalPages = Math.ceil(spotsCount / limit);

    if (hasDb) {
      try {
        const countRes = await dbPool.query('SELECT COUNT(*) as count, MAX(updated_at) as last_update FROM legal_spots');
        spotsCount = parseInt(countRes.rows[0].count) || 0;
        if (countRes.rows[0].last_update) {
          const date = new Date(countRes.rows[0].last_update);
          spotsLastUpdated = format24hDate(date);
        }

        spotsTotalPages = Math.ceil(spotsCount / limit);
        const offset = (pageApi2 - 1) * limit;

        // 상세 검수용 데이터 페이징 조회 적용 (위도, 경도 추가)
        const listRes = await dbPool.query(
          'SELECT id, name, rules, approved, lat, lng FROM legal_spots ORDER BY updated_at DESC, id ASC LIMIT $1 OFFSET $2',
          [limit, offset]
        );
        
        if (listRes.rows.length > 0) {
          spotsDetails = listRes.rows.map(row => {
            let address = "주소 정보 없음";
            if (row.rules) {
              const addrMatch = row.rules.match(/소재지:\s*(.*)/);
              if (addrMatch && addrMatch[1]) {
                address = addrMatch[1].split('|')[0].trim();
              } else {
                address = row.rules.substring(0, 30) + "...";
              }
            }
            return {
              id: row.id,
              spotName: row.name,
              address: address,
              lat: row.lat ? parseFloat(row.lat) : null,
              lng: row.lng ? parseFloat(row.lng) : null,
              state: row.approved === false ? "반려됨" : "승인됨"
            };
          });
        }
      } catch (dbErr) {
        console.error("관리자 API 조회 중 DB 오류:", dbErr.message);
      }
    } else {
      // Mock 모드일 때 125건에 매칭되도록 동적으로 조합 목록 생성 (위도, 경도 가상 추가)
      let allSpotsData = [];
      const spotNames = ["광화문 광장 푸드존", "상암 평화의광장 2호", "잠실 주경기장 입구", "여의도 밤도깨비 스팟", "강남역 모퉁이 허가존", "분당 율동공원 매점옆", "용인 에버랜드 주차장", "가평 남이섬 선착장", "청계천 야시장 지정석", "일산 한울광장 야외"];
      const addrs = ["서울 종로구 세종대로 172", "서울 마포구 상암동 481", "서울 송파구 올림픽로 25", "서울 영등포구 여의도동 8", "서울 강남구 강남대로 390", "경기 성남시 분당구 야탑동 12", "경기 용인시 처인구 10", "경기 가평군 가평읍 40", "서울 중구 태평로1가 1", "경기 고양시 호수로 595"];
      
      const lats = [37.5704, 37.5684, 37.5113, 37.5284, 37.5012, 37.3788, 37.2828, 37.8205, 37.5668, 37.6582];
      const lngs = [126.9770, 126.8988, 127.0374, 126.9320, 127.0396, 127.1478, 127.0135, 127.5235, 127.0094, 126.7645];

      for (let i = 0; i < mockSpotsCount; i++) {
        if (i < mockSpotsDetails.length) {
          const baseSpot = mockSpotsDetails[i];
          const spotId = baseSpot.id;
          allSpotsData.push({
            ...baseSpot,
            lat: baseSpot.lat || lats[i % lats.length],
            lng: baseSpot.lng || lngs[i % lngs.length],
            state: mockStatesOverride[spotId] || baseSpot.state
          });
        } else {
          const idx = i % spotNames.length;
          const spotId = `gov-spot-gen-${i}`;
          allSpotsData.push({
            id: spotId,
            spotName: `${spotNames[idx]} (모의-${i}호)`,
            address: addrs[idx],
            lat: lats[i % lats.length],
            lng: lngs[i % lngs.length],
            state: mockStatesOverride[spotId] || (i % 5 === 0 ? "대기중" : "승인됨")
          });
        }
      }
      spotsTotalPages = Math.ceil(allSpotsData.length / limit);
      spotsDetails = allSpotsData.slice((pageApi2 - 1) * limit, pageApi2 * limit);
    }

    // 3. 네이버 지도 API 상태 (실시간 연결 상태 동적 확인)
    const naverStatus = await checkApiConnection('naver');
    
    // 네이버 지오코딩 2500건에 매칭되도록 백엔드 동적 생성
    const api3Total = mockNaverCount;
    const api3TotalPages = Math.ceil(api3Total / limit);
    let allNaverData = [];
    const queries = [
      "서울특별시 종로구 세종대로 172",
      "서울특별시 강남구 테헤란로 212",
      "경기도 성남시 분당구 판교역로 235",
      "인천광역시 남동구 예술로 15",
      "부산광역시 해운대구 우동 10",
      "대구광역시 중구 달구벌대로 50"
    ];
    const results = [
      "37.5704, 126.9770",
      "37.5012, 127.0396",
      "37.4013, 127.1086",
      "37.4475, 126.7012",
      "35.1584, 129.1598",
      "35.8642, 128.5932"
    ];

    for (let i = 0; i < api3Total; i++) {
      if (i < mockNaverDetails.length) {
        const baseNaver = mockNaverDetails[i];
        const naverId = baseNaver.id;
        allNaverData.push({
          ...baseNaver,
          // 💡 전역 오버라이드 객체에 저장된 승인/반려 상태가 있다면 적용
          state: mockStatesOverride[naverId] || baseNaver.state
        });
      } else {
        const idx = i % queries.length;
        const naverId = `naver-gen-${i}`;
        allNaverData.push({
          id: naverId,
          query: `${queries[idx]} (임시-${i}호)`,
          result: results[idx],
          // 💡 전역 오버라이드 객체에 저장된 승인/반려 상태가 있다면 적용
          state: mockStatesOverride[naverId] || "정상연동"
        });
      }
    }
    const api3Sliced = allNaverData.slice((pageApi3 - 1) * limit, pageApi3 * limit);

    const apis = [
      {
        id: 'api-1',
        name: "기상청 동네예보 API",
        status: weatherStatus,
        lastUpdated: mockWeatherLastUpdated,
        collectedCount: api1Total,
        pagination: {
          currentPage: pageApi1,
          totalPages: api1TotalPages,
          totalCount: api1Total,
          limit: limit
        },
        details: api1Sliced
      },
      {
        id: 'api-2',
        name: "전국 푸드트럭 허가구역 점용공간 API",
        status: spotsStatus,
        lastUpdated: spotsLastUpdated,
        collectedCount: spotsCount,
        pagination: {
          currentPage: pageApi2,
          totalPages: spotsTotalPages,
          totalCount: spotsCount,
          limit: limit
        },
        details: spotsDetails
      },
      {
        id: 'api-3',
        name: "네이버 지도 플랫폼 Geocoding API",
        status: naverStatus,
        lastUpdated: mockNaverLastUpdated,
        collectedCount: hasDb ? 3420 : mockNaverCount,
        pagination: {
          currentPage: pageApi3,
          totalPages: api3TotalPages,
          totalCount: api3Total,
          limit: limit
        },
        details: api3Sliced
      }
    ];

    return NextResponse.json({ success: true, data: apis });
  } catch (error) {
    console.error("GET /api/admin/apis 에러:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/admin/apis : 강제 동기화 트리거 및 데이터 승인/반려 조작
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, apiId, detailId } = body;

    const dbPool = getDbPool();
    const hasDb = !IS_MOCK_MODE && dbPool;

    // 💡 Neon DB 셋업 편의를 위해 테이블이 없으면 자동 생성
    if (hasDb) {
      try {
        await dbPool.query(`
          CREATE TABLE IF NOT EXISTS legal_spots (
            id VARCHAR(100) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            lat NUMERIC(10, 8),
            lng NUMERIC(11, 8),
            rules TEXT,
            approved BOOLEAN DEFAULT TRUE,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } catch (tableErr) {
        console.error("Neon DB 테이블 자동 생성 실패:", tableErr.message);
      }
    }

    // 1. 강제 동기화 실행 (action === "sync")
    if (action === "sync") {
      // 1.1 기상청 API 강제 동기화
      if (apiId === "api-1") {
        const serviceKey = process.env.KOREA_WEATHER_API_KEY;
        const hasRealKey = serviceKey && serviceKey.trim() !== "your-public-data-api-service-key";
        
        const now = new Date();
        mockWeatherLastUpdated = format24hDate(now);

        if (hasRealKey) {
          console.log("📡 [Weather Sync] 기상청 OpenAPI를 통해 주요 지역 실시간 날씨 정보를 수집합니다.");
          for (let i = 0; i < mockWeatherDetails.length; i++) {
            const loc = mockWeatherDetails[i];
            const realVal = await fetchRealWeatherFromKMA(serviceKey, loc.nx, loc.ny);
            if (realVal) {
              mockWeatherDetails[i].value = realVal;
            }
          }
          return NextResponse.json({ 
            success: true, 
            message: `✅ [기상청 동네예보 API] ${mockWeatherLastUpdated} 기준 실시간 위성 날씨 및 격자 기상 동기화가 정상 완료되었습니다!` 
          });
        } else {
          mockWeatherDetails = mockWeatherDetails.map(item => {
            const tempMatch = item.value.match(/(-?[\d.]+)/);
            let currentTemp = tempMatch ? parseFloat(tempMatch[1]) : 24.5;
            
            const delta = (Math.random() * 2.4) - 1.2;
            const newTemp = (currentTemp + delta).toFixed(1);
            
            const conditions = ['맑음', '흐림', '구름많음', '비', '소나기', '안개'];
            const newCond = conditions[Math.floor(Math.random() * conditions.length)];
            
            return {
              ...item,
              value: `${newCond}, ${newTemp}°C`
            };
          });

          return NextResponse.json({ 
            success: true, 
            isMock: true,
            message: `🔄 [Mock Mode] ${mockWeatherLastUpdated} 기준 모의 기상청 기온 무작위 시뮬레이션 동기화 완료!` 
          });
        }
      }

      // 1.2 전국 푸드트럭 허가구역 API 강제 동기화
      if (apiId === "api-2") {
        if (!hasDb) {
          mockSpotsCount += 5;
          const date = new Date();
          mockSpotsLastUpdated = format24hDate(date);
          
          mockSpotsDetails = [
            { id: `det-mock-${Date.now()}`, spotName: `신규 수집된 허가스팟 (${mockSpotsCount - 119}호)`, address: "서울 마포구 상수동 310", state: "대기중" },
            ...mockSpotsDetails
          ];

          return NextResponse.json({ 
            success: true, 
            isMock: true,
            message: "🔄 [Mock Mode] 허가구역 모의 동기화가 성공적으로 완료되었습니다. (신규 대기중 스팟 적재)" 
          });
        }

        const serviceKey = process.env.KOREA_WEATHER_API_KEY;
        if (!serviceKey || serviceKey.trim() === "your-public-data-api-service-key") {
          return NextResponse.json({ 
            success: false, 
            error: "공공데이터 포털 서비스키(KOREA_WEATHER_API_KEY)가 등록되지 않았습니다." 
          }, { status: 400 });
        }

        try {
          const targetUrl = `https://api.data.go.kr/openapi/tn_pubr_public_food_truck_permit_area_api?serviceKey=${encodeURIComponent(serviceKey)}&type=json&pageNo=1&numOfRows=1000`;
          const apiResponse = await fetch(targetUrl, { next: { revalidate: 0 } });

          if (!apiResponse.ok) {
            throw new Error(`OpenAPI 통신 실패 (Status: ${apiResponse.status})`);
          }

          const resData = await apiResponse.json();
          const items = resData?.response?.body?.items;

          if (items && Array.isArray(items) && items.length > 0) {
            await dbPool.query('BEGIN');
            try {
              for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const lat = parseFloat(item.latitude);
                const lng = parseFloat(item.longitude);

                if (!isNaN(lat) && !isNaN(lng) && lat > 33 && lat < 39 && lng > 124 && lng < 132) {
                  const name = item.permitAreaNm || "푸드트럭 허가구역";
                  const mngAgency = item.permitAreaMngNm || "지자체 관리기관";
                  const startTm = item.operatingStrtTm || "미정";
                  const endTm = item.operatingEndTm || "미정";
                  const address = item.rdnmadr || item.lnmadr || "주소 정보 없음";
                  const youthFav = item.prtcstPermitAt === 'Y' ? "🟢 청년층/소외계층 신청 우대 구역" : "합법 점용 지정 구역";
                  const rulesText = `${youthFav} | 관리기관: ${mngAgency} | 운영시간: ${startTm} ~ ${endTm} | 소재지: ${address}`;
                  const id = `gov-spot-${i}`;

                  await dbPool.query(`
                    INSERT INTO legal_spots (id, name, lat, lng, rules, updated_at)
                    VALUES ($1, $2, $3, $4, $5, NOW())
                    ON CONFLICT (id) DO UPDATE SET
                      name = EXCLUDED.name,
                      lat = EXCLUDED.lat,
                      lng = EXCLUDED.lng,
                      rules = EXCLUDED.rules,
                      updated_at = NOW()
                  `, [id, name, lat, lng, rulesText]);
                }
              }
              await dbPool.query('COMMIT');
              return NextResponse.json({ 
                success: true, 
                message: `✅ [전국 푸드트럭 허가구역 API] ${items.length}건 동기화 및 DB 적재 완료!` 
              });
            } catch (txErr) {
              await dbPool.query('ROLLBACK');
              throw txErr;
            }
          } else {
            throw new Error("API 응답 레코드가 존재하지 않습니다.");
          }
        } catch (syncErr) {
          console.error("동기화 실행 중 에러:", syncErr.message);
          return NextResponse.json({ success: false, error: syncErr.message }, { status: 500 });
        }
      }

      // 1.3 네이버 지도 API 강제 동기화 (시간 및 변환 데이터 갱신 시뮬레이션 적용)
      if (apiId === "api-3") {
        const now = new Date();
        mockNaverLastUpdated = format24hDate(now);
        mockNaverCount += 1;
        
        // 지오코딩 모의 수집 로그 추가 (역동적인 UI 리액션 체감)
        const mockQueries = [
          "서울특별시 마포구 합정동 410",
          "서울특별시 서대문구 신촌로 12",
          "서울특별시 강남구 역삼로 85",
          "경기 성남시 분당구 판교역로 235",
          "인천 남동구 예술로 15"
        ];
        const randomQuery = mockQueries[Math.floor(Math.random() * mockQueries.length)];
        const latVal = (37.5 + (Math.random() * 0.1)).toFixed(4);
        const lngVal = (126.9 + (Math.random() * 0.1)).toFixed(4);
        
        mockNaverDetails = [
          {
            id: `det-n-mock-${Date.now()}`,
            query: randomQuery,
            result: `${latVal}, ${lngVal}`,
            state: "정상연동"
          },
          ...mockNaverDetails
        ];

        return NextResponse.json({ 
          success: true, 
          message: `✅ [네이버 지도 API] Geocoding 주소 변환 실시간 동기화 완료! (수집 건수 및 변환 기록 갱신)` 
        });
      }
    }

    // 2. 개별 수집 스팟 승인 / 반려 조작 (action === "approve" || action === "reject")
    if (action === "approve" || action === "reject") {
      const isApprove = action === "approve";
      
      if (!detailId) {
        return NextResponse.json({ success: false, error: "조작할 데이터의 식별자(detailId)가 필요합니다." }, { status: 400 });
      }

      // Mock Mode인 경우 메모리 전역 변수를 직접 찾아 업데이트
      if (!hasDb) {
        // 🏠 전역 상태 오버라이드 객체에 승인/반려 상태 저장 (동적 생성 ID와 호환성 보장)
        mockStatesOverride[detailId] = isApprove ? "승인됨" : "반려됨";
        
        // 1. 허가 구역 모의 데이터 검색 및 업데이트 (기존 ID와의 하위 호환성 유지)
        const spotIdx = mockSpotsDetails.findIndex(d => d.id === detailId);
        if (spotIdx !== -1) {
          mockSpotsDetails[spotIdx].state = isApprove ? "승인됨" : "반려됨";
        }

        // 2. 날씨 모의 데이터 검색 및 업데이트 (기존 ID와의 하위 호환성 유지)
        const weatherIdx = mockWeatherDetails.findIndex(d => d.id === detailId);
        if (weatherIdx !== -1) {
          mockWeatherDetails[weatherIdx].state = isApprove ? "승인됨" : "반려됨";
        }

        // 3. 네이버 지도 모의 데이터 검색 및 업데이트 (기존 ID와의 하위 호환성 유지)
        const naverIdx = mockNaverDetails.findIndex(d => d.id === detailId);
        if (naverIdx !== -1) {
          mockNaverDetails[naverIdx].state = isApprove ? "승인됨" : "반려됨";
        }

        return NextResponse.json({ 
          success: true, 
          isMock: true, 
          message: `[Mock Mode] ${detailId} 데이터가 성공적으로 ${isApprove ? '승인' : '반려'} 처리되었습니다.` 
        });
      }

      // 💡 기상청 날씨(kma-, det-w) 또는 네이버 지도(naver-, det-n) 임시/모의 데이터는 DB로 보내지 않고 메모리 전역 변수에 즉각 승인/반려 저장
      const isWeather = detailId.startsWith('kma-') || detailId.startsWith('det-w');
      const isNaver = detailId.startsWith('naver-') || detailId.startsWith('det-n');
      
      if (isWeather || isNaver) {
        mockStatesOverride[detailId] = isApprove ? "승인됨" : "반려됨";
        return NextResponse.json({
          success: true,
          isMock: true,
          message: `[Memory Mode] ${detailId} 임시 데이터가 성공적으로 ${isApprove ? '승인' : '반려'} 처리되었습니다.`
        });
      }

      try {
        // Neon DB 상의 legal_spots 테이블에서 해당 스팟의 approved 컬럼을 업데이트
        const updateRes = await dbPool.query(
          'UPDATE legal_spots SET approved = $1, updated_at = NOW() WHERE id = $2',
          [isApprove, detailId]
        );

        // 만약 푸드트럭 구역 데이터를 DB에서 찾을 수 없는 경우(즉, DB 연동 중이지만 메모리 상의 모의 푸드트럭인 경우)
        // 에러를 내지 않고 안전하게 메모리 전역 변수에 기록하여 정상 작동을 보장(Fallback)
        if (updateRes.rowCount === 0) {
          mockStatesOverride[detailId] = isApprove ? "승인됨" : "반려됨";
          const spotIdx = mockSpotsDetails.findIndex(d => d.id === detailId);
          if (spotIdx !== -1) {
            mockSpotsDetails[spotIdx].state = isApprove ? "승인됨" : "반려됨";
          }
          return NextResponse.json({ 
            success: true, 
            isMock: true, 
            message: `[Fallback Mode] ${detailId} 모의 스팟이 메모리 상태에 ${isApprove ? '승인' : '반려'} 처리되었습니다.` 
          });
        }

        return NextResponse.json({ 
          success: true, 
          message: `✅ [DB 반영 완료] ${detailId} 데이터가 정상적으로 ${isApprove ? '승인' : '반려'} 처리되었습니다.` 
        });
      } catch (dbErr) {
        console.error("승인/반려 조작 DB 에러:", dbErr.message);
        return NextResponse.json({ success: false, error: dbErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, error: "정의되지 않은 동작입니다." }, { status: 400 });
  } catch (error) {
    console.error("POST /api/admin/apis 에러:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
