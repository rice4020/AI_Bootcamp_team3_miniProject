// @ts-nocheck
// web/sns 폴더 - 사장님용 주변 행사 정보 조회 및 AI 마케팅 분석 모듈
import { sql } from '../../lib/db';
import 'dotenv/config';

// ─── 타입 정의 ───────────────────────────────────────────────
export interface EventDetail {
  id: number;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  scale: string;
  latitude?: number | null;
  longitude?: number | null;
  description?: string;
  createdAt?: string;
}

export interface MarketingStrategy {
  estimatedDemand: string; // 예상 수요 레벨 (상/중/하)
  recommendedStockMultiplier: number; // 권장 재고 배율 (예: 1.5배)
  weatherRiskAlert: string; // 날씨 리스크 주의사항
  strategySummary: string; // 종합 마케팅 조언
}

export interface EventAnalysisResult {
  event: EventDetail;
  weather?: {
    region: string;
    forecastDate: string;
    temperature: number;
    skyStatus: string;
    rainProbability: number;
  };
  strategy?: MarketingStrategy;
}

// ─── 기상청 격자 변환 헬퍼 (위경도 -> X/Y 격자 좌표) ───────────────────
function convertLatLngToGrid(lat: number, lng: number) {
  const RE = 6371.00877; // 지구 반경(km)
  const GRID = 5.0; // 격자 간격(km)
  const SLAT1 = 30.0; // 투영 위도1(degree)
  const SLAT2 = 60.0; // 투영 위도2(degree)
  const OLON = 126.0; // 기준점 경도(degree)
  const OLAT = 38.0; // 기준점 위도(degree)
  const XO = 43; // 기준점 X좌표(GRID)
  const YO = 136; // 기준점 Y좌표(GRID)

  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = re * sf / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const x = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const y = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

  return { x, y };
}

// ─── [내장 AI 에이전트 분석 엔진] ────────────────────────────────────
export async function analyzeEventStrategy(
  eventTitle: string,
  scale: string,
  temp: number,
  skyStatus: string,
  rainProb: number
): Promise<MarketingStrategy> {
  let estimatedDemand: '상' | '중' | '하' = '중';
  let recommendedStockMultiplier = 1.0;
  let weatherRiskAlert = '특이 없음';
  let strategySummary = '';

  // 1. 날씨 분석
  if (rainProb >= 60 || skyStatus.includes('비') || skyStatus.includes('눈') || skyStatus.includes('강우') || skyStatus.includes('강설')) {
    estimatedDemand = '하';
    recommendedStockMultiplier = 0.7;
    weatherRiskAlert = `우천/강설 확률(${rainProb}%)이 매우 높습니다. 방수 장비를 구비하시고, 외부 대기 공간용 천막 설치가 요망됩니다.`;
  } else if (temp >= 30) {
    estimatedDemand = '중';
    recommendedStockMultiplier = 1.1;
    weatherRiskAlert = `섭씨 ${temp}도의 폭염이 예상됩니다. 식자재 신선도 관리에 유의하시고, 시원한 음료 메뉴 비중을 늘리십시오.`;
  } else if (temp <= 5) {
    estimatedDemand = '중';
    recommendedStockMultiplier = 0.9;
    weatherRiskAlert = `한파 기온(${temp}도)입니다. 보온 패키징을 제공하고, 따뜻한 어묵 국물 등의 서비스 메뉴가 효과적입니다.`;
  } else {
    estimatedDemand = '상';
    recommendedStockMultiplier = 1.5;
    weatherRiskAlert = '맑고 쾌적한 야외 활동 기후입니다. 매출 극대화를 노리십시오.';
  }

  // 2. 규모 분석 추가 반영
  if (scale.includes('대규모') || scale.includes('1만명') || scale.includes('5만명') || scale.includes('만명')) {
    if (estimatedDemand !== '하') {
      estimatedDemand = '상';
      recommendedStockMultiplier += 0.3;
    }
  }

  // 3. 종합 요약 생성
  strategySummary = `[${eventTitle}] 행사(${scale} 규모)의 핵심 전략: 예상 수요는 [${estimatedDemand}] 수준입니다. ` +
    `현재 예보 날씨(${skyStatus}, 기온 ${temp}℃)를 고려할 때, 평상시 대비 재고를 ${recommendedStockMultiplier}배 확보할 것을 추천합니다. ` +
    `마케팅 제언: 방문객 밀집도가 높으므로 회전율이 높은 메뉴 구성과 직관적인 대기 라인 관리가 관건입니다.`;

  return {
    estimatedDemand,
    recommendedStockMultiplier: parseFloat(recommendedStockMultiplier.toFixed(1)),
    weatherRiskAlert,
    strategySummary
  };
}

// ─── 기상청 실시간 API 조회 및 DB 저장 헬퍼 ────────────────────────
async function fetchAndCacheLiveWeather(lat: number, lng: number, regionName: string, dateStr: string) {
  const serviceKey = process.env.KOREA_WEATHER_API_KEY;

  const FALLBACK_WEATHER = {
    region: regionName,
    forecastDate: dateStr,
    temperature: 24.5,
    skyStatus: '맑음 ☀️',
    rainProbability: 10
  };

  if (!serviceKey) {
    console.warn("⚠️ [Weather API] 기상청 서비스 키(KOREA_WEATHER_API_KEY)가 등록되지 않아 모의 날씨를 Neon DB에 임시 저장합니다.");
    
    // DB에 캐싱용 Upsert
    await sql`
      INSERT INTO "WeatherForecast" ("region", "forecastDate", "temperature", "skyStatus", "rainProbability", "updatedAt")
      VALUES (${FALLBACK_WEATHER.region}, ${FALLBACK_WEATHER.forecastDate}, ${FALLBACK_WEATHER.temperature}, ${FALLBACK_WEATHER.skyStatus}, ${FALLBACK_WEATHER.rainProbability}, CURRENT_TIMESTAMP)
      ON CONFLICT DO NOTHING
    `;
    return FALLBACK_WEATHER;
  }

  try {
    const { x: nx, y: ny } = convertLatLngToGrid(lat, lng);

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

    const targetUrl = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=100&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;

    const apiResponse = await fetch(targetUrl);
    if (!apiResponse.ok) {
      throw new Error(`기상청 HTTP 에러 (Status: ${apiResponse.status})`);
    }

    const resText = await apiResponse.text();
    const resJson = JSON.parse(resText);
    const resultCode = resJson?.response?.header?.resultCode;

    if (resultCode !== '00') {
      throw new Error(`[기상청 에러코드 ${resultCode}]`);
    }

    const items = resJson?.response?.body?.items?.item;
    if (!items || !Array.isArray(items)) {
      throw new Error('기상청 레코드 비어있음');
    }

    let tempStr = '24.0';
    let ptyStr = '0';

    items.forEach(item => {
      if (item.category === 'T1H') tempStr = item.obsrValue;
      if (item.category === 'PTY') ptyStr = item.obsrValue;
    });

    let skyStatus = '맑음 ☀️';
    let rainProbability = 0;

    switch (ptyStr) {
      case '1':
      case '5':
        skyStatus = '비 🌧️';
        rainProbability = 80;
        break;
      case '2':
      case '6':
        skyStatus = '진눈깨비 🌧️❄️';
        rainProbability = 70;
        break;
      case '3':
      case '7':
        skyStatus = '눈 ❄️';
        rainProbability = 90;
        break;
      default:
        skyStatus = '맑음 ☀️';
        rainProbability = 10;
        break;
    }

    const temperature = parseFloat(tempStr);

    // 💾 Neon DB "WeatherForecast" 테이블에 실시간 캐시 동적 쓰기 (Upsert)
    // forecastDate가 UNIQUE가 아니거나 여러 지역이 등록될 수 있으므로 기존 캐시 삭제 후 삽입
    await sql`
      DELETE FROM "WeatherForecast" 
      WHERE "region" = ${regionName} AND "forecastDate" = ${dateStr}
    `;
    await sql`
      INSERT INTO "WeatherForecast" ("region", "forecastDate", "temperature", "skyStatus", "rainProbability", "updatedAt")
      VALUES (${regionName}, ${dateStr}, ${temperature}, ${skyStatus}, ${rainProbability}, CURRENT_TIMESTAMP)
    `;

    return {
      region: regionName,
      forecastDate: dateStr,
      temperature,
      skyStatus,
      rainProbability
    };

  } catch (err) {
    console.warn("⚠️ 기상청 API 연동 실패. Fail-safe 복구용 더미데이터를 반환합니다:", err.message);
    
    await sql`
      INSERT INTO "WeatherForecast" ("region", "forecastDate", "temperature", "skyStatus", "rainProbability", "updatedAt")
      VALUES (${FALLBACK_WEATHER.region}, ${FALLBACK_WEATHER.forecastDate}, ${FALLBACK_WEATHER.temperature}, ${FALLBACK_WEATHER.skyStatus}, ${FALLBACK_WEATHER.rainProbability}, CURRENT_TIMESTAMP)
      ON CONFLICT DO NOTHING
    `;
    return FALLBACK_WEATHER;
  }
}

// ─── 함수 정의 ───────────────────────────────────────────────

/**
 * 다가오는 주변 행사 정보 목록을 최신순으로 가져옵니다.
 */
export async function getUpcomingEvents(limit: number = 10): Promise<EventDetail[]> {
  const rows = await sql`
    SELECT "id", "title", "location", "startDate", "endDate", "scale", "latitude", "longitude", "description"
    FROM "Event"
    WHERE "endDate" >= CURRENT_DATE
    ORDER BY "startDate" ASC
    LIMIT ${limit}
  `;
  return rows.map((r: any) => ({
    ...r,
    startDate: new Date(r.startDate).toISOString().split('T')[0],
    endDate: new Date(r.endDate).toISOString().split('T')[0]
  })) as EventDetail[];
}

/**
 * 특정 행사의 상세 정보와 기상 예보를 연동하여 AI 마케팅 전략 추천 리포트를 생성합니다.
 */
export async function getEventDetails(eventId: number): Promise<EventAnalysisResult | null> {
  let event: EventDetail | null = null;
  let weather: any = null;

  // 1. 행사 정보 조회 (Neon DB)
  const eventRows = await sql`
    SELECT "id", "title", "location", "startDate", "endDate", "scale", "latitude", "longitude", "description"
    FROM "Event"
    WHERE "id" = ${eventId}
  `;

  if (eventRows.length > 0) {
    const rawEvent = eventRows[0];
    event = {
      ...rawEvent,
      startDate: new Date(rawEvent.startDate).toISOString().split('T')[0],
      endDate: new Date(rawEvent.endDate).toISOString().split('T')[0],
      latitude: rawEvent.latitude ? parseFloat(rawEvent.latitude) : null,
      longitude: rawEvent.longitude ? parseFloat(rawEvent.longitude) : null
    } as EventDetail;

    // 2. Neon DB 캐시에서 기존 날씨 조회
    const weatherRows = await sql`
      SELECT "region", "forecastDate", "temperature", "skyStatus", "rainProbability"
      FROM "WeatherForecast"
      WHERE "forecastDate" = ${event.startDate}
      LIMIT 1
    `;

    if (weatherRows.length > 0) {
      weather = {
        region: weatherRows[0].region,
        forecastDate: new Date(weatherRows[0].forecastDate).toISOString().split('T')[0],
        temperature: parseFloat(weatherRows[0].temperature),
        skyStatus: weatherRows[0].skyStatus,
        rainProbability: parseInt(weatherRows[0].rainProbability)
      };
    } else {
      // 3. 캐시가 없을 시 기상청 실시간 OpenAPI를 조회하여 캐시 저장 및 적용
      const lat = event.latitude || 37.5665; // 기본값: 서울시청
      const lng = event.longitude || 126.9780;
      const region = event.location.split(' ')[0] || '서울';
      
      weather = await fetchAndCacheLiveWeather(lat, lng, region, event.startDate);
    }
  }

  if (!event) return null;

  const activeWeather = weather || {
    region: '서울',
    forecastDate: event.startDate,
    temperature: 20.0,
    skyStatus: '맑음 ☀️',
    rainProbability: 10
  };

  // 4. AI 에이전트를 통한 비즈니스 전략 종합 분석
  const strategy = await analyzeEventStrategy(
    event.title,
    event.scale,
    activeWeather.temperature,
    activeWeather.skyStatus,
    activeWeather.rainProbability
  );

  return {
    event,
    weather: activeWeather,
    strategy
  };
}

// ─── 실행 진입점 (직접 실행 시) ─────────────────────────────
async function main() {
  console.log('🎪 [사장님 모듈] 4. 주변 행사 정보 및 AI 전략 분석 시뮬레이션 (Real API & Neon DB)');
  console.log('────────────────────────────────────────');

  const events = await getUpcomingEvents();
  console.log(`📋 예정된 행사 목록 (${events.length}건):`);
  events.forEach(e => {
    console.log(`- [ID: ${e.id}] ${e.title} (${e.startDate} ~ ${e.endDate} | 규모: ${e.scale})`);
  });

  if (events.length > 0) {
    const targetId = events[0].id;
    console.log(`\n🔍 행사 ID ${targetId}번에 대한 AI 에이전트 상세 입지/마케팅 분석 요청...`);
    const analysis = await getEventDetails(targetId);

    if (analysis) {
      console.log('========================================');
      console.log(`🎡 행사명  : ${analysis.event.title}`);
      console.log(`📍 위치    : ${analysis.event.location}`);
      console.log(`🌡️ 예보날씨: ${analysis.weather?.skyStatus} (기온 ${analysis.weather?.temperature}℃ / 강수확률 ${analysis.weather?.rainProbability}%)`);
      console.log('----------------------------------------');
      console.log('🤖 AI 에이전트 마케팅 분석 보고서:');
      console.log(`📦 권장 재고 규모 : 평소 대비 [${analysis.strategy?.recommendedStockMultiplier}배] 준비`);
      console.log(`⚠️ 날씨 리스크    : ${analysis.strategy?.weatherRiskAlert}`);
      console.log(`💡 종합 마케팅 제언: ${analysis.strategy?.strategySummary}`);
      console.log('========================================');
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ 오류 발생:', err.message);
  });
}
