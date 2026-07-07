// @ts-nocheck
// admin/sns 폴더 - 관리자 전용 통합 행사 및 날씨 데이터 CRUD 모듈
import { sql, IS_MOCK_MODE } from '../../lib/db';
import { EventDetail } from '../../web/sns/event';

// ─── 타입 정의 ───────────────────────────────────────────────
export interface WeatherForecast {
  id?: number;
  region: string;
  forecast_date: string;
  temperature: number;
  sky_status: string;
  rain_probability: number;
}

// ─── 모의 로컬 상태 DB ─────────────────────────────────────────
let MOCK_EVENTS_DB: EventDetail[] = [
  {
    id: 1,
    title: '서울숲 재즈 페스티벌 2026',
    location: '서울숲 야외무대',
    start_date: '2026-10-10',
    end_date: '2026-10-12',
    scale: '대규모(3만명)',
    description: '서울숲 가을 정취 아래서 국내외 실력파 아티스트들이 참가하는 야외 음악 축제입니다.'
  }
];

let MOCK_WEATHER_DB: WeatherForecast[] = [
  {
    id: 1,
    region: '성동구',
    forecast_date: '2026-10-10',
    temperature: 18.5,
    sky_status: '맑음 ☀️',
    rain_probability: 10
  }
];

// ─── [1] 행사(Event) CRUD 구현 ──────────────────────────────────

export async function createEvent(event: Omit<EventDetail, 'id'>): Promise<EventDetail> {
  if (IS_MOCK_MODE) {
    const newEvent = { ...event, id: MOCK_EVENTS_DB.length + 1 };
    MOCK_EVENTS_DB.push(newEvent);
    return newEvent;
  }
  const result = await sql`
    INSERT INTO events (title, location, start_date, end_date, scale, description)
    VALUES (${event.title}, ${event.location}, ${event.start_date}, ${event.end_date}, ${event.scale}, ${event.description || ''})
    RETURNING id, title, location, start_date, end_date, scale, description
  `;
  return {
    ...result[0],
    start_date: new Date(result[0].start_date).toISOString().split('T')[0],
    end_date: new Date(result[0].end_date).toISOString().split('T')[0]
  } as EventDetail;
}

export async function updateEvent(id: number, event: Partial<EventDetail>): Promise<EventDetail | null> {
  if (IS_MOCK_MODE) {
    const idx = MOCK_EVENTS_DB.findIndex(e => e.id === id);
    if (idx === -1) return null;
    MOCK_EVENTS_DB[idx] = { ...MOCK_EVENTS_DB[idx], ...event };
    return MOCK_EVENTS_DB[idx];
  }
  const existing = await sql`SELECT id FROM events WHERE id = ${id}`;
  if (existing.length === 0) return null;

  const result = await sql`
    UPDATE events
    SET title = COALESCE(${event.title}, title),
        location = COALESCE(${event.location}, location),
        start_date = COALESCE(${event.start_date ? new Date(event.start_date) : null}, start_date),
        end_date = COALESCE(${event.end_date ? new Date(event.end_date) : null}, end_date),
        scale = COALESCE(${event.scale}, scale),
        description = COALESCE(${event.description}, description)
    WHERE id = ${id}
    RETURNING id, title, location, start_date, end_date, scale, description
  `;
  return {
    ...result[0],
    start_date: new Date(result[0].start_date).toISOString().split('T')[0],
    end_date: new Date(result[0].end_date).toISOString().split('T')[0]
  } as EventDetail;
}

export async function deleteEvent(id: number): Promise<boolean> {
  if (IS_MOCK_MODE) {
    const originalLength = MOCK_EVENTS_DB.length;
    MOCK_EVENTS_DB = MOCK_EVENTS_DB.filter(e => e.id !== id);
    return MOCK_EVENTS_DB.length < originalLength;
  }
  const result = await sql`
    DELETE FROM events WHERE id = ${id}
    RETURNING id
  `;
  return result.length > 0;
}

// ─── [2] 날씨(Weather) CRUD 구현 ───────────────────────────────

export async function getWeatherForecasts(): Promise<WeatherForecast[]> {
  if (IS_MOCK_MODE) return MOCK_WEATHER_DB;
  const rows = await sql`
    SELECT id, region, forecast_date, temperature, sky_status, rain_probability
    FROM weather_forecasts
    ORDER BY forecast_date ASC
  `;
  return rows.map((r: any) => ({
    ...r,
    forecast_date: new Date(r.forecast_date).toISOString().split('T')[0],
    temperature: parseFloat(r.temperature),
    rain_probability: parseInt(r.rain_probability)
  })) as WeatherForecast[];
}

export async function createWeatherForecast(wf: WeatherForecast): Promise<WeatherForecast> {
  if (IS_MOCK_MODE) {
    const newWf = { ...wf, id: MOCK_WEATHER_DB.length + 1 };
    MOCK_WEATHER_DB.push(newWf);
    return newWf;
  }
  const result = await sql`
    INSERT INTO weather_forecasts (region, forecast_date, temperature, sky_status, rain_probability)
    VALUES (${wf.region}, ${wf.forecast_date}, ${wf.temperature}, ${wf.sky_status}, ${wf.rain_probability})
    RETURNING id, region, forecast_date, temperature, sky_status, rain_probability
  `;
  return {
    ...result[0],
    forecast_date: new Date(result[0].forecast_date).toISOString().split('T')[0],
    temperature: parseFloat(result[0].temperature),
    rain_probability: parseInt(result[0].rain_probability)
  } as WeatherForecast;
}

export async function updateWeatherForecast(id: number, wf: Partial<WeatherForecast>): Promise<WeatherForecast | null> {
  if (IS_MOCK_MODE) {
    const idx = MOCK_WEATHER_DB.findIndex(w => w.id === id);
    if (idx === -1) return null;
    MOCK_WEATHER_DB[idx] = { ...MOCK_WEATHER_DB[idx], ...wf };
    return MOCK_WEATHER_DB[idx];
  }
  const existing = await sql`SELECT id FROM weather_forecasts WHERE id = ${id}`;
  if (existing.length === 0) return null;

  const result = await sql`
    UPDATE weather_forecasts
    SET region = COALESCE(${wf.region}, region),
        forecast_date = COALESCE(${wf.forecast_date ? new Date(wf.forecast_date) : null}, forecast_date),
        temperature = COALESCE(${wf.temperature !== undefined ? wf.temperature : null}, temperature),
        sky_status = COALESCE(${wf.sky_status}, sky_status),
        rain_probability = COALESCE(${wf.rain_probability !== undefined ? wf.rain_probability : null}, rain_probability)
    WHERE id = ${id}
    RETURNING id, region, forecast_date, temperature, sky_status, rain_probability
  `;
  return {
    ...result[0],
    forecast_date: new Date(result[0].forecast_date).toISOString().split('T')[0],
    temperature: parseFloat(result[0].temperature),
    rain_probability: parseInt(result[0].rain_probability)
  } as WeatherForecast;
}

export async function deleteWeatherForecast(id: number): Promise<boolean> {
  if (IS_MOCK_MODE) {
    const originalLength = MOCK_WEATHER_DB.length;
    MOCK_WEATHER_DB = MOCK_WEATHER_DB.filter(w => w.id !== id);
    return MOCK_WEATHER_DB.length < originalLength;
  }
  const result = await sql`
    DELETE FROM weather_forecasts WHERE id = ${id}
    RETURNING id
  `;
  return result.length > 0;
}

// ─── 실행 진입점 (직접 실행 시) ─────────────────────────────
async function main() {
  console.log('🛡️ [관리자 모듈] 3. 행사 및 날씨 통합 데이터 관리 CRUD 시뮬레이션');
  console.log('────────────────────────────────────────');

  // 1. 신규 행사 등록 테스트
  console.log('\n[행사 등록 시도]');
  const event = await createEvent({
    title: '동대문 패션 페스타 2026',
    location: 'DDP 동대문디자인플라자 광장',
    start_date: '2026-11-05',
    end_date: '2026-11-07',
    scale: '대규모(5만명)',
    description: '글로벌 디자이너 패션쇼 및 푸드존 운영 야외 행사입니다.'
  });
  console.log('✨ 등록된 행사:', event);

  // 2. 행사 정보 수정 테스트
  console.log('\n[행사 정보 수정 시도]');
  const updated = await updateEvent(event.id, {
    scale: '대규모(7만명)',
    description: '규모 확장으로 방문객 대폭 상승 예상'
  });
  console.log('✏️ 수정된 행사 정보:', updated);

  // 3. 날씨 정보 관리 테스트
  console.log('\n[날씨 정보 등록 시도]');
  const wf = await createWeatherForecast({
    region: '동대문구',
    forecast_date: '2026-11-05',
    temperature: 12.0,
    sky_status: '구름조금 ☁️',
    rain_probability: 20
  });
  console.log('☀️ 등록된 날씨 정보:', wf);

  console.log('\n[전체 날씨 예보 목록 조회]');
  const weatherList = await getWeatherForecasts();
  console.log(weatherList);

  // 4. 삭제 테스트
  console.log('\n[테스트 데이터 정리 - 삭제 시도]');
  const deletedEvent = await deleteEvent(event.id);
  const deletedWeather = await deleteWeatherForecast(wf.id!);
  console.log(`행사 삭제 여부: ${deletedEvent} | 날씨 삭제 여부: ${deletedWeather}`);
}

if (require.main === module || process.env.NODE_ENV === 'test' || IS_MOCK_MODE) {
  main().catch((err) => {
    console.error('❌ 오류 발생:', err.message);
  });
}
