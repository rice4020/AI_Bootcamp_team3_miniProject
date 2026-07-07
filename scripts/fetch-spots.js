const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

/**
 * 📡 전국 푸드트럭 허가구역 표준데이터 공공 OpenAPI 수집 및 정제 스크립트
 */
async function fetchAndSaveSpots() {
  console.log('📡 [Data Builder] 전국 푸드트럭 허가구역 OpenAPI 수집을 시작합니다...');

  // 1. 공공데이터 인증키 불러오기
  const serviceKey = process.env.KOREA_WEATHER_API_KEY;
  if (!serviceKey) {
    console.error('❌ [.env.local] 파일에서 KOREA_WEATHER_API_KEY(공공 API 인증키)를 찾을 수 없습니다.');
    process.exit(1);
  }

  // 2. OpenAPI 호출 주소 설정 (최대 1,000건 수집)
  const targetUrl = `https://api.data.go.kr/openapi/tn_pubr_public_food_truck_permit_area_api?serviceKey=${serviceKey}&type=json&pageNo=1&numOfRows=1000`;

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`API 응답 실패 (Status: ${response.status})`);
    }

    const resData = await response.json();
    console.log('📡 [Debug] API Response Raw Data:', JSON.stringify(resData, null, 2));
    const items = resData?.response?.body?.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.warn('⚠️  API로부터 수신된 데이터가 없거나 형식이 바르지 않습니다.');
      return;
    }

    console.log(`📡 [Data Builder] 정부 API 수신 성공 (${items.length}건). 팀 DB (Spot) 규격으로 가공합니다...`);

    // 3. 우리 팀의 "Spot" DB 테이블 구조에 맞춰서 데이터 정밀 정제
    const cleanedSpots = [];
    
    items.forEach((item, index) => {
      const lat = parseFloat(item.latitude);
      const lng = parseFloat(item.longitude);

      // 좌표 값이 올바른 한국 영토 내 좌표 범위인 경우만 선별 수집
      if (!isNaN(lat) && !isNaN(lng) && lat > 33 && lat < 39 && lng > 124 && lng < 132) {
        
        // 도로명 주소를 최우선으로 하고, 없으면 지번 주소를 사용합니다.
        const address = (item.rdnmadr || item.lnmadr || '주소 정보 없음').trim();
        
        // 상세 시간 및 조건 텍스트 구성
        const youthFav = item.prtcstPermitAt === 'Y' ? '🟢 청년층/소외계층 신청 우대 구역' : '합법 점용 지정 구역';
        const startTm = item.operatingStrtTm || '미정';
        const endTm = item.operatingEndTm || '미정';
        const mngAgency = item.permitAreaMngNm || '지자체 관리기관';
        
        const description = `${youthFav} | 관리기관: ${mngAgency} | 운영시간: ${startTm} ~ ${endTm}`;

        cleanedSpots.push({
          id: `gov-spot-${index + 1}`,              // 고유 ID
          name: item.permitAreaNm || '푸드트럭 허가구역', // 허가구역명 (NOT NULL)
          address: address,                          // 도로명/지번 주소 (NOT NULL)
          latitude: lat,                             // 위도 (double precision, NOT NULL)
          longitude: lng,                            // 경도 (double precision, NOT NULL)
          description: description                   // 상세 설명 및 조건 (NULL 허용)
        });
      }
    });

    // 4. 저장 폴더(src/utils) 생성 및 파일 쓰기
    const destDir = path.join(__dirname, '../src/utils');
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const destPath = path.join(destDir, 'legal_spots_data.json');
    fs.writeFileSync(destPath, JSON.stringify(cleanedSpots, null, 2), 'utf8');

    console.log(`\n✅ [Data Builder] 정제 완료!`);
    console.log(`📂 저장 위치: ${destPath}`);
    console.log(`📊 수집 및 정제된 총 합법 스팟 개수: ${cleanedSpots.length}건\n`);

  } catch (error) {
    console.error('❌ [Data Builder] 데이터 수집 중 치명적인 오류 발생:', error.message);
  }
}

fetchAndSaveSpots();
