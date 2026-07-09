import { NextResponse } from 'next/server';
import { sql, IS_MOCK_MODE } from '@/lib/db';
import { SIGUNGU_LIST, convertLatLngToGrid, findNearestSigungu } from '@/lib/weatherLocations';

// ============================================================
// 🌤️ skyStatus 텍스트 → 이모지 아이콘 변환 함수
// ============================================================
function getWeatherIcon(skyStatus) {
  const iconMap = {
    '맑음': '☀️',
    '맑은 밤': '🌙',
    '비': '🌧️',
    '진눈깨비': '🌧️❄️',
    '눈': '❄️',
    '흐림': '☁️',
  };
  return iconMap[skyStatus] || '🌤️'; // 기본값
}


// ============================================================
// 🛡️ Fallback 날씨 데이터 (DB와 기상청 API 모두 실패 시)
// ============================================================
const FALLBACK_WEATHER = {
  temp: '24.5',
  statusText: '맑음',
  icon: '☀️',
  isMock: true,
  address: '내 위치 주변',
};

// ============================================================
// 📡 기상청 API 직접 호출 (DB 데이터가 없거나 오래된 경우 Fallback)
// 기존 weather/route.js의 로직을 그대로 유지합니다.
// ============================================================
async function fetchDirectFromKMA(lat, lng, serviceKey) {
  const { nx, ny } = convertLatLngToGrid(lat, lng);

  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const kst = new Date(utc + (9 * 60 * 60 * 1000));

  let year = kst.getFullYear();
  let month = kst.getMonth() + 1;
  let date = kst.getDate();
  let hours = kst.getHours();
  const minutes = kst.getMinutes();

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

  const targetUrl = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst`
    + `?serviceKey=${encodeURIComponent(serviceKey)}`
    + `&pageNo=1&numOfRows=100&dataType=JSON`
    + `&base_date=${baseDate}&base_time=${baseTime}`
    + `&nx=${nx}&ny=${ny}`;

  console.log(`📡 [Weather API] 기상청 직접 호출: baseDate=${baseDate}, baseTime=${baseTime}, nx=${nx}, ny=${ny}`);

  const apiResponse = await fetch(targetUrl, { next: { revalidate: 300 } });
  if (!apiResponse.ok) throw new Error(`기상청 HTTP 오류 (Status: ${apiResponse.status})`);

  const resText = await apiResponse.text();
  const resJson = JSON.parse(resText);

  const resultCode = resJson?.response?.header?.resultCode;
  const resultMsg = resJson?.response?.header?.resultMsg;
  if (resultCode !== '00') throw new Error(`기상청 오류 코드 ${resultCode}: ${resultMsg}`);

  const items = resJson?.response?.body?.items?.item;
  if (!items || !Array.isArray(items)) throw new Error('날씨 데이터가 비어있습니다.');

  let temp = '24.0';
  let pty = '0';

  items.forEach(item => {
    if (item.category === 'T1H') temp = item.obsrValue;
    if (item.category === 'PTY') pty = item.obsrValue;
  });

  let statusText = '맑음';
  let icon = '☀️';

  switch (pty) {
    case '1': case '5':
      statusText = '비'; icon = '🌧️'; break;
    case '2': case '6':
      statusText = '진눈깨비'; icon = '🌧️❄️'; break;
    case '3': case '7':
      statusText = '눈'; icon = '❄️'; break;
    default:
      const currentHour = kst.getHours();
      if (currentHour >= 19 || currentHour < 6) {
        statusText = '맑은 밤'; icon = '🌙';
      } else {
        statusText = '맑음'; icon = '☀️';
      }
      break;
  }

  console.log(`✅ [Weather API] 기상청 직접 호출 완료: ${icon} ${statusText} ${temp}°C`);
  return { temp, statusText, icon, isMock: false, nx, ny };
}

// ============================================================
// 🔍 DB에서 가장 가까운 도시의 최신 날씨 조회 함수
// 반환: { temp, statusText, icon, isMock: false } 또는 null(데이터 없음)
// ============================================================
async function fetchWeatherFromDb(lat, lng) {
  // DB 연결이 없는 경우(Mock 모드) 바로 null 반환
  if (IS_MOCK_MODE) return null;

  // 사용자 위치에서 가장 가까운 시군구 찾기 (전국 135개 기준)
  const nearestSigungu = findNearestSigungu(lat, lng);
  const regionName = nearestSigungu.name;

  // DB에서 해당 시군구의 오늘 날씨 데이터 조회
  const rows = await sql`
    SELECT "temperature", "skyStatus", "updatedAt"
    FROM "WeatherForecast"
    WHERE "region" = ${regionName}
      AND "forecastDate" = CURRENT_DATE
    ORDER BY "updatedAt" DESC
    LIMIT 1
  `;

  if (!rows || rows.length === 0) {
    console.log(`📭 [Weather API] DB에 ${regionName} 날씨 데이터 없음 → 직접 호출 Fallback`);
    return null;
  }

  const row = rows[0];
  const temp = String(parseFloat(row.temperature).toFixed(1));
  const statusText = row.skyStatus;
  const icon = getWeatherIcon(statusText);

  console.log(`✅ [Weather API] DB에서 ${regionName} 날씨 반환: ${icon} ${statusText} ${temp}°C`);

  return { temp, statusText, icon, isMock: false, region: regionName };
}

// ============================================================
// 🌤️ GET /api/weather?lat=xx&lng=xx
// 날씨 데이터 반환 우선순위 (수정됨):
//   1순위: 기상청 API 실시간 직접 호출
//   2순위: DB에 저장된 가장 가까운 도시의 최신 날씨 (API 실패 시)
//   3순위: Fallback 고정값 (모두 실패 시)
// ============================================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  const lat = parseFloat(latParam || '37.5665'); // 서울시청 기본값
  const lng = parseFloat(lngParam || '126.9780');

  // ─── 1순위: 기상청 API 직접 호출 ─────────────────────────
  const serviceKey = process.env.KOREA_WEATHER_API_KEY;

  if (serviceKey) {
    try {
      const kmaWeather = await fetchDirectFromKMA(lat, lng, serviceKey);
      return NextResponse.json({ success: true, data: kmaWeather });
    } catch (kmaErr) {
      console.warn('⚠️ [Weather API] 기상청 직접 호출 실패:', kmaErr.message);
    }
  } else {
    console.warn('⚠️ [Weather API] KOREA_WEATHER_API_KEY 없음 → DB 조회 시도');
  }

  // ─── 2순위: DB 조회 시도 ─────────────────────────────────
  try {
    const dbWeather = await fetchWeatherFromDb(lat, lng);
    if (dbWeather) {
      return NextResponse.json({ success: true, data: dbWeather });
    }
  } catch (dbErr) {
    console.warn('⚠️ [Weather API] DB 조회 중 오류 발생:', dbErr.message);
  }

  // ─── 3순위: 최종 Fallback ────────────────────────────────
  console.warn('⚠️ [Weather API] 모든 호출 실패 → Fallback 반환');
  return NextResponse.json({
    success: true,
    data: { ...FALLBACK_WEATHER, debugError: '기상청 API 및 DB 조회 모두 실패' },
  });
}
