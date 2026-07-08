import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

// 📡 관리자 컨텐츠 관리용 통합 API 라우트 (Neon DB 연동)

// 헬퍼: 입력된 location 주소 혹은 위경도 문자열에서 lat, lng를 파싱/매핑
function parseLocationToCoords(locationStr) {
  const coordsRegex = /^([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)$/;
  const match = locationStr.trim().match(coordsRegex);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng, formatted: `${lat}, ${lng}` };
    }
  }

  const text = locationStr.toLowerCase();
  let lat = null;
  let lng = null;

  if (text.includes('여의도')) {
    lat = 37.5284; lng = 126.9320;
  } else if (text.includes('홍대')) {
    lat = 37.5562; lng = 126.9225;
  } else if (text.includes('강남')) {
    lat = 37.4982; lng = 127.0276;
  } else if (text.includes('반포')) {
    lat = 37.5113; lng = 126.9965;
  } else if (text.includes('서울숲')) {
    lat = 37.5443; lng = 127.0374;
  } else if (text.includes('뚝섬')) {
    lat = 37.5298; lng = 127.0700;
  } else if (text.includes('망원')) {
    lat = 37.5557; lng = 126.8943;
  } else if (text.includes('인천') || text.includes('송도')) {
    lat = 37.3789; lng = 126.6713;
  } else if (text.includes('당진')) {
    lat = 36.8936; lng = 126.6293;
  }

  const formatted = (lat && lng) ? `${lat}, ${lng}` : '존재하지 않음';
  return { lat, lng, formatted };
}

// 🌐 기상청 격자 변환 헬퍼 (위경도 -> X/Y 격자 좌표)
function convertLatLngToGrid(lat, lng) {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;

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

// 📡 실시간 특정 위치 기상 수집 및 Neon DB Upsert 동기화 함수
async function fetchAndSyncWeather(lat, lng, regionName) {
  const serviceKey = process.env.KOREA_WEATHER_API_KEY || process.env.PUBLIC_DATA_API_SERVICE_KEY;
  if (!serviceKey) return null;

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
    const apiResponse = await fetch(targetUrl, { next: { revalidate: 60 } });

    if (apiResponse.ok) {
      const resJson = await apiResponse.json();
      const items = resJson?.response?.body?.items?.item;

      if (items && Array.isArray(items)) {
        let tempStr = '24.0';
        let ptyStr = '0';

        items.forEach(item => {
          if (item.category === 'T1H') tempStr = item.obsrValue;
          if (item.category === 'PTY') ptyStr = item.obsrValue;
        });

        let skyStatus = '맑음 ☀️';
        let rainProbability = 10;

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
        const dateStr = `${year}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;

        // DB 캐싱 Upsert (기존 데이터 삭제 후 갱신)
        await sql`
          DELETE FROM "WeatherForecast"
          WHERE "region" = ${regionName}
        `;

        await sql`
          INSERT INTO "WeatherForecast" ("region", "forecastDate", "temperature", "skyStatus", "rainProbability")
          VALUES (${regionName}, ${dateStr}::date, ${temperature}, ${skyStatus}, ${rainProbability})
        `;
        return true;
      }
    }
  } catch (err) {
    console.error('⚠️ [Sync Weather Error]:', err.message);
  }
  return false;
}

// 1. 행사 및 날씨 예보 리스트 조회 (검색 쿼리 및 좌표기반 기상동기화 지원)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const regionParam = searchParams.get('region');

    const tab = searchParams.get('tab') || 'event';

    // 검색 키워드가 있으면 title/location ILIKE 필터링, 없으면 전체 조회
    let events;
    if (query.trim()) {
      const searchPattern = `%${query.trim()}%`;
      if (tab === 'sns') {
        events = await sql`
          SELECT "id", "title", "location", "startDate", "endDate", "scale", "latitude", "longitude", "description"
          FROM "SnsExtraction"
          WHERE "title" ILIKE ${searchPattern} OR "location" ILIKE ${searchPattern}
          ORDER BY "startDate" ASC
        `;
      } else {
        events = await sql`
          SELECT "id", "title", "location", "startDate", "endDate", "scale", "latitude", "longitude", "description"
          FROM "Event"
          WHERE "title" ILIKE ${searchPattern} OR "location" ILIKE ${searchPattern}
          ORDER BY "startDate" ASC
        `;
      }
    } else {
      if (tab === 'sns') {
        events = await sql`
          SELECT "id", "title", "location", "startDate", "endDate", "scale", "latitude", "longitude", "description"
          FROM "SnsExtraction"
          ORDER BY "startDate" ASC
        `;
      } else {
        events = await sql`
          SELECT "id", "title", "location", "startDate", "endDate", "scale", "latitude", "longitude", "description"
          FROM "Event"
          ORDER BY "startDate" ASC
        `;
      }
    }

    // 📍 좌표 쿼리 매개변수가 들어오면, 기상청 API 연동을 통해 동적으로 DB 캐시를 갱신
    if (latParam && lngParam && regionParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        await fetchAndSyncWeather(lat, lng, regionParam);
      }
    }

    let weather = [];
    if (regionParam && regionParam.includes('존재하지 않음')) {
      weather = [];
    } else {
      if (regionParam) {
        weather = await sql`
          SELECT "id", "region", "forecastDate", "temperature", "skyStatus", "rainProbability"
          FROM "WeatherForecast"
          WHERE "region" = ${regionParam}
          ORDER BY "forecastDate" ASC
          LIMIT 7
        `;
      }

      // 💡 선택 지역 날씨 정보가 없거나, 초기 로딩 시 기본적으로 '수도권 권역' 기준으로 날씨 표시
      if (!weather || weather.length === 0) {
        const defaultRegion = regionParam || '수도권 권역';
        weather = await sql`
          SELECT "id", "region", "forecastDate", "temperature", "skyStatus", "rainProbability"
          FROM "WeatherForecast"
          WHERE "region" = ${defaultRegion}
          ORDER BY "forecastDate" ASC
          LIMIT 7
        `;
      }

      // 💡 날씨 캐시가 비어있는 경우, 첫 관리자 대시보드 뷰어용 기본 3일 기상 예보를 자동 캐시 적재 (Fail-safe)
      if (weather.length === 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const afterTomorrowStr = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const targetRegion = regionParam || '수도권 권역';
        await sql`
          INSERT INTO "WeatherForecast" ("region", "forecastDate", "temperature", "skyStatus", "rainProbability")
          VALUES 
            (${targetRegion}, ${todayStr}::date, 28.0, '맑음 ☀️', 10),
            (${targetRegion}, ${tomorrowStr}::date, 26.0, '흐림 ☁️', 30),
            (${targetRegion}, ${afterTomorrowStr}::date, 24.0, '비 🌧️', 80)
          ON CONFLICT DO NOTHING
        `;

        weather = await sql`
          SELECT "id", "region", "forecastDate", "temperature", "skyStatus", "rainProbability"
          FROM "WeatherForecast"
          WHERE "region" = ${targetRegion}
          ORDER BY "forecastDate" ASC
          LIMIT 7
        `;
      }
    }

    // 날짜 포맷 표준화 (YYYY-MM-DD) + 위경도 좌표를 프론트엔드에 전달
    const formattedEvents = events.map((ev) => ({
      id: ev.id,
      name: ev.title,
      period: `${new Date(ev.startDate).toISOString().split('T')[0].slice(5)} ~ ${new Date(ev.endDate).toISOString().split('T')[0].slice(5)}`,
      startDate: new Date(ev.startDate).toISOString().split('T')[0],
      endDate: new Date(ev.endDate).toISOString().split('T')[0],
      scale: ev.scale,
      location: ev.location,
      latitude: ev.latitude,
      longitude: ev.longitude,
      description: ev.description
    }));

    const formattedWeather = weather.map((w) => {
      // YYYY-MM-DD 포맷에 따라 날짜 라벨 계산
      const dateObj = new Date(w.forecastDate);
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const dateLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()} (${days[dateObj.getDay()]})`;

      return {
        id: w.id,
        date: dateLabel,
        condition: w.skyStatus,
        temp: `${w.temperature}°C`,
        rainProb: `${w.rainProbability}%`,
        region: w.region
      };
    });

    return NextResponse.json({
      success: true,
      events: formattedEvents,
      weather: formattedWeather
    });
  } catch (err) {
    console.error('❌ [Admin Content API GET Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, location, startDate, endDate, scale, description, tab } = body;
 
    if (!title || !location || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }
 
    const { lat, lng, formatted } = parseLocationToCoords(location);
 
    let result;
    if (tab === 'sns') {
      result = await sql`
        INSERT INTO "SnsExtraction" ("title", "location", "startDate", "endDate", "scale", "latitude", "longitude", "description")
        VALUES (${title}, ${formatted}, ${startDate}, ${endDate}, ${scale || '미지정'}, ${lat}, ${lng}, ${description || ''})
        RETURNING "id"
      `;
    } else {
      result = await sql`
        INSERT INTO "Event" ("title", "location", "startDate", "endDate", "scale", "latitude", "longitude", "description")
        VALUES (${title}, ${formatted}, ${startDate}, ${endDate}, ${scale || '미지정'}, ${lat}, ${lng}, ${description || ''})
        RETURNING "id"
      `;
    }
 
    return NextResponse.json({ success: true, id: result[0].id });
  } catch (err) {
    console.error('❌ [Admin Content API POST Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// 3. 행사 삭제 (DELETE)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const tab = searchParams.get('tab') || 'event';
 
    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 행사 ID가 필요합니다.' }, { status: 400 });
    }
 
    if (tab === 'sns') {
      await sql`
        DELETE FROM "SnsExtraction"
        WHERE "id" = ${parseInt(id)}
      `;
    } else {
      await sql`
        DELETE FROM "Event"
        WHERE "id" = ${parseInt(id)}
      `;
    }
 
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ [Admin Content API DELETE Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// 4. 행사 수정 (PUT)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, title, location, startDate, endDate, scale, tab } = body;
 
    if (!id || !title || !location || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }
 
    const { lat, lng, formatted } = parseLocationToCoords(location);
 
    if (tab === 'sns') {
      await sql`
        UPDATE "SnsExtraction"
        SET "title" = ${title},
            "location" = ${formatted},
            "startDate" = ${startDate}::date,
            "endDate" = ${endDate}::date,
            "scale" = ${scale || '미지정'}
        WHERE "id" = ${parseInt(id)}
      `;
    } else {
      await sql`
        UPDATE "Event"
        SET "title" = ${title},
            "location" = ${formatted},
            "startDate" = ${startDate}::date,
            "endDate" = ${endDate}::date,
            "scale" = ${scale || '미지정'},
            "latitude" = ${lat},
            "longitude" = ${lng}
        WHERE "id" = ${parseInt(id)}
      `;
    }
 
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ [Admin Content API PUT Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

