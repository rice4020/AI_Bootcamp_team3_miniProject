import { NextResponse } from 'next/server';

// 🌐 기상청 격자 변환 헬퍼 (위경도 -> X/Y 격자 좌표)
function convertLatLngToGrid(lat, lng) {
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  const lat = parseFloat(latParam || '37.5665'); // 서울시청 기본값
  const lng = parseFloat(lngParam || '126.9780');

  // 기상청 서비스키
  const serviceKey = process.env.KOREA_WEATHER_API_KEY;

  // 🛡️ Fail-safe 예비 날씨 데이터 (기상청 API 장애 또는 미승인 시 동작)
  const FALLBACK_WEATHER = {
    temp: '24.5',
    statusText: '맑음',
    icon: '☀️',
    isMock: true,
    address: '내 위치 주변'
  };

  if (!serviceKey) {
    console.warn("⚠️ [Weather API] 기상청 서비스 키(KOREA_WEATHER_API_KEY)가 등록되지 않아 모의 날씨를 리턴합니다.");
    return NextResponse.json({ success: true, data: FALLBACK_WEATHER });
  }

  try {
    // 1. 위경도를 격자 좌표(nx, ny)로 변환
    const { x: nx, y: ny } = convertLatLngToGrid(lat, lng);

    // 2. 기상청 초단기실황 기준 시각 계산 (매시 40분 전에는 이전 시각 자료 요청)
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    const kst = new Date(utc + (9 * 60 * 60 * 1000)); // 한국 표준시 기준 보정

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

    // 3. 기상청 초단기실황 조회 OpenAPI 호출
    const targetUrl = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=100&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;
    
    console.log(`📡 [Weather API] 기상청 API 호출 시작: baseDate=${baseDate}, baseTime=${baseTime}, nx=${nx}, ny=${ny}`);
    
    const apiResponse = await fetch(targetUrl, { next: { revalidate: 300 } }); // 5분 캐싱
    
    if (!apiResponse.ok) {
      throw new Error(`기상청 HTTP 통신 에러 (Status: ${apiResponse.status})`);
    }

    const resText = await apiResponse.text();
    let resJson;
    try {
      resJson = JSON.parse(resText);
    } catch (e) {
      throw new Error(`기상청 API 응답이 JSON 형식이 아닙니다: ${resText.slice(0, 100)}`);
    }

    const resultCode = resJson?.response?.header?.resultCode;
    const resultMsg = resJson?.response?.header?.resultMsg;

    if (resultCode !== '00') {
      throw new Error(`[기상청 오류 코드 ${resultCode}] ${resultMsg}`);
    }

    const items = resJson?.response?.body?.items?.item;
    if (!items || !Array.isArray(items)) {
      throw new Error('기상청 날씨 데이터 레코드가 비어있습니다.');
    }

    // 4. 데이터 매핑 가공
    // PTY(강수형태): 0(없음), 1(비), 2(비/눈), 3(눈), 5(빗방울), 6(빗방울눈날림), 7(눈날림)
    // T1H(기온)
    let temp = '24.0';
    let pty = '0';

    items.forEach(item => {
      if (item.category === 'T1H') temp = item.obsrValue;
      if (item.category === 'PTY') pty = item.obsrValue;
    });

    let statusText = '맑음';
    let icon = '☀️';

    switch (pty) {
      case '1':
      case '5':
        statusText = '비';
        icon = '🌧️';
        break;
      case '2':
      case '6':
        statusText = '진눈깨비';
        icon = '🌧️❄️';
        break;
      case '3':
      case '7':
        statusText = '눈';
        icon = '❄️';
        break;
      default:
        // 밤시간(19시 이후, 06시 이전)에는 달 이모지로 고도화
        const currentHour = kst.getHours();
        if (currentHour >= 19 || currentHour < 6) {
          statusText = '맑은 밤';
          icon = '🌙';
        } else {
          statusText = '맑음';
          icon = '☀️';
        }
        break;
    }

    console.log(`✅ [Weather API] 기상청 실시간 날씨 데이터 변환 완료: ${icon} ${statusText} ${temp}°C`);
    return NextResponse.json({
      success: true,
      data: {
        temp,
        statusText,
        icon,
        isMock: false,
        nx,
        ny
      }
    });

  } catch (err) {
    console.warn("⚠️ [Weather API] 날씨 조회 중 실패하여 Fail-safe 백업 데이터셋을 반환합니다:", err.message);
    return NextResponse.json({
      success: true,
      data: {
        ...FALLBACK_WEATHER,
        debugError: err.message
      }
    });
  }
}
