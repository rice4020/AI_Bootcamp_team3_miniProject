import { NextResponse } from 'next/server';
import { sql, IS_MOCK_MODE } from '@/lib/db';
import { SIGUNGU_LIST, convertLatLngToGrid } from '@/lib/weatherLocations';

// SIGUNGU_LIST는 @/lib/weatherLocations 에서 import 합니다. (전국 135개 시군구)




// ============================================================
// 🌤️ 기상청 초단기실황 API 호출 함수 (격자 좌표 기준)
// 반환: { temperature, skyStatus, rainProbability } 또는 예외 발생
// ============================================================
async function fetchWeatherFromKMA(lat, lng, serviceKey) {
  const { nx, ny } = convertLatLngToGrid(lat, lng);

  // 기상청 기준 시각 계산 (매시 40분 이전은 이전 시각 데이터 요청)
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const kst = new Date(utc + (9 * 60 * 60 * 1000)); // 한국 표준시 보정

  let year = kst.getFullYear();
  let month = kst.getMonth() + 1;
  let date = kst.getDate();
  let hours = kst.getHours();
  const minutes = kst.getMinutes();

  // 매시 40분 전이면 한 시간 이전 데이터 요청 (기상청 API 특성)
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

  const apiResponse = await fetch(targetUrl, { cache: 'no-store' });
  if (!apiResponse.ok) {
    throw new Error(`기상청 HTTP 오류 (Status: ${apiResponse.status})`);
  }

  const resText = await apiResponse.text();
  const resJson = JSON.parse(resText);

  const resultCode = resJson?.response?.header?.resultCode;
  const resultMsg = resJson?.response?.header?.resultMsg;
  if (resultCode !== '00') {
    throw new Error(`기상청 오류 코드 ${resultCode}: ${resultMsg}`);
  }

  const items = resJson?.response?.body?.items?.item;
  if (!items || !Array.isArray(items)) {
    throw new Error('기상청 날씨 항목이 비어있습니다.');
  }

  // PTY(강수형태): 0=없음, 1=비, 2=비/눈, 3=눈, 5=빗방울, 6=빗방울눈날림, 7=눈날림
  // T1H(기온) 값 추출
  let temp = null;
  let pty = '0';

  items.forEach(item => {
    if (item.category === 'T1H') temp = item.obsrValue;
    if (item.category === 'PTY') pty = item.obsrValue;
  });

  if (temp === null) {
    throw new Error('기온(T1H) 데이터를 찾을 수 없습니다.');
  }

  // PTY 코드 → 하늘 상태 텍스트 변환
  let skyStatus = '맑음';
  let rainProbability = 0;

  switch (pty) {
    case '1':
    case '5':
      skyStatus = '비';
      rainProbability = 90;
      break;
    case '2':
    case '6':
      skyStatus = '진눈깨비';
      rainProbability = 70;
      break;
    case '3':
    case '7':
      skyStatus = '눈';
      rainProbability = 60;
      break;
    default:
      // 야간(19시 이후 ~ 6시 이전)에는 '맑은 밤'으로 구분
      const currentHour = kst.getHours();
      if (currentHour >= 19 || currentHour < 6) {
        skyStatus = '맑은 밤';
      } else {
        skyStatus = '맑음';
      }
      rainProbability = 0;
      break;
  }

  return {
    temperature: parseFloat(temp),  // 숫자형으로 변환하여 DB 저장
    skyStatus,
    rainProbability,
  };
}

// ============================================================
// 💾 DB 저장 함수: 당일 데이터가 없을 때만 INSERT (이미 있으면 skip)
// 비유: "오늘 일기는 하루에 한 번만 쓴다" — 중복 기록 방지
// ============================================================
async function saveWeatherIfNotExists(cityName, weatherData) {
  const { temperature, skyStatus, rainProbability } = weatherData;

  // 오늘 날짜(CURRENT_DATE) + 해당 도시 기준으로 이미 저장된 데이터가 있는지 확인
  const existing = await sql`
    SELECT id FROM "WeatherForecast"
    WHERE "region" = ${cityName}
      AND "forecastDate" = CURRENT_DATE
    LIMIT 1
  `;

  // 이미 오늘 데이터가 존재하면 저장하지 않고 skip
  if (existing && existing.length > 0) {
    console.log(`⏭️  [Weather Cron] ${cityName}: 오늘(${new Date().toISOString().split('T')[0]}) 데이터 이미 존재 → 저장 건너뜀`);
    return { skipped: true };
  }

  // 오늘 데이터가 없으면 새로 삽입
  await sql`
    INSERT INTO "WeatherForecast"
      ("region", "forecastDate", "temperature", "skyStatus", "rainProbability", "updatedAt")
    VALUES
      (${cityName}, CURRENT_DATE, ${temperature}, ${skyStatus}, ${rainProbability}, NOW())
  `;

  return { skipped: false };
}

// ============================================================
// 🔐 Cron 요청 인증 확인 함수
// CRON_SECRET 환경변수가 있으면 Authorization 헤더와 대조합니다.
// 없으면 개발/테스트 환경으로 간주하여 통과시킵니다.
// ============================================================
function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // 환경변수 없으면 개발 모드로 허용

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

// ============================================================
// 🕐 Cron 메인 실행 함수 (GET, POST 공용)
// Vercel Cron은 GET 방식으로 호출하므로 GET 핸들러에 연결합니다.
// 개발 테스트를 위해 브라우저에서도 GET으로 직접 호출 가능합니다.
// ============================================================
async function runWeatherSync(request) {
  // 인증 확인
  if (!isAuthorized(request)) {
    console.warn('⛔ [Weather Cron] 인증 실패 - 유효하지 않은 CRON_SECRET');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 기상청 API 키 확인
  const serviceKey = process.env.KOREA_WEATHER_API_KEY;
  if (!serviceKey) {
    console.warn('⚠️ [Weather Cron] KOREA_WEATHER_API_KEY가 없어 날씨 수집을 건너뜁니다.');
    return NextResponse.json({
      success: false,
      message: 'KOREA_WEATHER_API_KEY 환경변수가 설정되지 않았습니다.',
    }, { status: 200 });
  }

  // DB 모의 모드 확인
  if (IS_MOCK_MODE) {
    console.warn('⚠️ [Weather Cron] DB가 Mock 모드입니다. 실제 저장은 건너뜁니다.');
    return NextResponse.json({
      success: false,
      message: 'DATABASE_URL이 없어 Mock 모드로 동작 중입니다.',
    }, { status: 200 });
  }

  console.log(`📡 [Weather Cron] 전국 시군구(${SIGUNGU_LIST.length}개) 날씨 수집 시작...`);

  // ─── 격자(nx, ny) 기준으로 시군구를 그룹화 ─────────────────
  // 기상청 격자는 5km 단위 → 여러 시군구가 같은 격자에 속할 수 있음
  // 같은 격자는 API를 1번만 호출하여 중복 호출 방지
  const gridMap = new Map(); // key: "nx_ny", value: [시군구, ...]

  for (const sigungu of SIGUNGU_LIST) {
    const { nx, ny } = convertLatLngToGrid(sigungu.lat, sigungu.lng);
    const gridKey = `${nx}_${ny}`;
    if (!gridMap.has(gridKey)) {
      gridMap.set(gridKey, { nx, ny, sigungus: [] });
    }
    gridMap.get(gridKey).sigungus.push(sigungu);
  }

  console.log(`🗺️  [Weather Cron] 격자 중복제거 결과: ${SIGUNGU_LIST.length}개 시군구 → ${gridMap.size}개 고유 격자`);

  // 각 시군구별 날씨 수집 결과 기록용
  const results = [];

  // 고유 격자별로 API 1회 호출 후 해당 격자의 모든 시군구에 동일 데이터 저장
  for (const [gridKey, gridInfo] of gridMap) {
    const { nx, ny, sigungus } = gridInfo;
    // 대표 시군구의 좌표로 API 호출 (같은 격자이므로 동일 결과)
    const repSigungu = sigungus[0];

    try {
      // 기상청 API 호출 (격자 1회)
      const weatherData = await fetchWeatherFromKMA(repSigungu.lat, repSigungu.lng, serviceKey);

      // 같은 격자에 속한 모든 시군구에 동일 날씨 저장
      for (const sigungu of sigungus) {
        try {
          const saveResult = await saveWeatherIfNotExists(sigungu.name, weatherData);
          if (saveResult.skipped) {
            results.push({ city: sigungu.name, status: 'skipped', message: '오늘 데이터 이미 존재' });
          } else {
            results.push({ city: sigungu.name, status: 'success', data: weatherData });
            console.log(`✅ [Weather Cron] ${sigungu.name}: ${weatherData.temperature}°C / ${weatherData.skyStatus}`);
          }
        } catch (dbErr) {
          results.push({ city: sigungu.name, status: 'error', error: dbErr.message });
          console.error(`❌ [Weather Cron] ${sigungu.name} DB 저장 실패:`, dbErr.message);
        }
      }

    } catch (apiErr) {
      // 격자 API 호출 실패 시 해당 격자의 모든 시군구 error 처리
      for (const sigungu of sigungus) {
        results.push({ city: sigungu.name, status: 'error', error: apiErr.message });
      }
      console.error(`❌ [Weather Cron] 격자(${gridKey}) API 호출 실패:`, apiErr.message);
    }
  }

  const successCount = results.filter(r => r.status === 'success').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;
  const errorCount   = results.filter(r => r.status === 'error').length;
  console.log(`🎉 [Weather Cron] 완료: ${successCount}개 신규 저장 / ${skippedCount}개 skip / ${errorCount}개 오류`);

  return NextResponse.json({
    success: true,
    message: `${successCount}개 신규 저장 / ${skippedCount}개 이미 존재 skip / ${errorCount}개 오류`,
    gridCount: gridMap.size,
    totalSigungu: SIGUNGU_LIST.length,
    results,
    timestamp: new Date().toISOString(),
  });
}


// GET: Vercel Cron 자동 호출 및 개발 테스트용 수동 호출
export async function GET(request) {
  return runWeatherSync(request);
}

// POST: 외부 스케줄러 연동이 필요한 경우를 위한 보조 핸들러
export async function POST(request) {
  return runWeatherSync(request);
}
