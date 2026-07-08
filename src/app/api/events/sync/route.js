import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

// 📡 공공데이터포털 전국문화축제 API 동기화 라우터
// 빌드 시점 정적 프리렌더링 방지 — 런타임 호출 전용 라우트
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const serviceKey = process.env.PUBLIC_DATA_API_SERVICE_KEY;

  if (!serviceKey) {
    console.error('⚠️ [Sync API] PUBLIC_DATA_API_SERVICE_KEY 환경 변수가 설정되지 않았습니다.');
    return NextResponse.json({ success: false, error: 'API Service Key가 누락되었습니다.' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const shouldReset = searchParams.get('reset') === 'true';

    if (shouldReset) {
      console.log('🧹 [Sync API] 강제 리셋(?reset=true) 파라미터 감지. Event 테이블 기존 데이터를 전체 소거합니다.');
      await sql`DELETE FROM "Event"`;
    }
    // 1. 공공데이터포털 API 호출 (1000개 수집)
    const targetUrl = `http://api.data.go.kr/openapi/tn_pubr_public_cltur_fstvl_api?serviceKey=${encodeURIComponent(serviceKey)}&type=json&pageNo=1&numOfRows=1000`;
    
    console.log('📡 [Sync API] 전국문화축제 공공데이터 수집 시작...');
    const apiResponse = await fetch(targetUrl, { next: { revalidate: 0 } });

    if (!apiResponse.ok) {
      throw new Error(`공공 API 통신 실패 (Status: ${apiResponse.status})`);
    }

    const resJson = await apiResponse.json();
    const items = resJson?.response?.body?.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('API 응답에 축제 데이터 레코드가 존재하지 않습니다.');
    }

    console.log(`📡 [Sync API] ${items.length}건의 로우 데이터 수신 성공. Neon DB 적재 처리를 개시합니다.`);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const item of items) {
      const title = item.fstvlNm || '문화 축제';
      const startDateStr = item.fstvlStartDate;
      const endDateStr = item.fstvlEndDate;
      const description = item.fstvlCo || item.fstvlCn || '';
      
      const lat = parseFloat(item.latitude);
      const lng = parseFloat(item.longitude);

      // 날짜 파싱 검증 및 이미 종료된 행사(만료된 축제) 필터링
      const todayStr = new Date().toISOString().split('T')[0];
      if (!startDateStr || !endDateStr || endDateStr < todayStr) {
        skippedCount++;
        continue;
      }

      // 2. Neon DB에 이미 동일한 이름과 시작 날짜를 가진 행사가 등록되어 있는지 확인
      const existing = await sql`
        SELECT "id" FROM "Event"
        WHERE "title" = ${title} AND "startDate" = ${startDateStr}::date
        LIMIT 1
      `;

      if (existing.length > 0) {
        skippedCount++;
        continue;
      }

      // 인파 유동인구 규모 매핑 (축제 소개글, 주최 정보 등을 기반으로 대/중/소 구분)
      let scale = '중규모';
      const combinedText = (title + description + (item.auspcInstt || '')).toLowerCase();
      if (combinedText.includes('국제') || combinedText.includes('월드') || combinedText.includes('페스티벌') || combinedText.includes('대규모')) {
        scale = '대규모';
      } else if (combinedText.includes('동네') || combinedText.includes('소규모') || combinedText.includes('어린이')) {
        scale = '소규모';
      }

      const validLat = (!isNaN(lat) && lat > 32 && lat < 43) ? lat : null;
      const validLng = (!isNaN(lng) && lng > 124 && lng < 133) ? lng : null;
      
      // 도로명 주소(rdnmadr) 혹은 지번 주소(lnmadr)를 활용하여 정식 location 값을 적재
      let locationAddress = item.rdnmadr || item.lnmadr;
      if (!locationAddress) {
        if (validLat && validLng) {
          locationAddress = `${validLat.toFixed(4)}, ${validLng.toFixed(4)} (좌표 기준)`;
        } else {
          locationAddress = '주소 정보 없음';
        }
      }

      // 3. Neon DB "Event" 테이블에 적재
      await sql`
        INSERT INTO "Event" ("title", "location", "startDate", "endDate", "scale", "latitude", "longitude", "description")
        VALUES (
          ${title}, 
          ${locationAddress}, 
          ${startDateStr}::date, 
          ${endDateStr}::date, 
          ${scale}, 
          ${validLat}, 
          ${validLng}, 
          ${description}
        )
      `;
      insertedCount++;
    }

    console.log(`✅ [Sync API] Neon DB 동기화 완료! (신규 적재: ${insertedCount}건 / 중복 스킵: ${skippedCount}건)`);
    return NextResponse.json({
      success: true,
      message: `전국문화축제 동기화가 완료되었습니다.`,
      inserted: insertedCount,
      skipped: skippedCount
    });

  } catch (err) {
    console.error('❌ [Sync API Sync Process Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
