import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const TRUCKS_FILE = path.join(DATA_DIR, 'trucks.json');

// 트럭 데이터 파일의 안전성 확보 및 읽기 함수
async function getTrucksData() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(TRUCKS_FILE);
    } catch {
      // 파일이 없을 경우 빈 배열로 초기화
      await fs.writeFile(TRUCKS_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }

    const fileContent = await fs.readFile(TRUCKS_FILE, 'utf-8');
    const data = JSON.parse(fileContent);

    // 🚨 이전 프로젝트의 단일 객체 구조인 경우 배열 형태로 자동 마이그레이션
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      console.log('🔄 이전 단일 트럭 데이터를 다중 트럭 배열 데이터로 변환합니다.');
      const lat = data.location?.lat ?? 37.528532;
      const lng = data.location?.lng ?? 126.932822;
      const status = data.status === 'open' || data.status === 'active' ? 'active' : 'prepare';

      const migrated = [
        {
          id: 'owner123',
          ownerUsername: 'owner123',
          name: data.location?.name || '여의도 한강공원 물빛광장',
          category: 'skewer', // 기본값 분식/꼬치
          lat: lat,
          lng: lng,
          status: status,
          intro: data.location?.desc || '여의나루역 2번 출구 야시장 라인 안쪽 세번째 부스',
          menu: [
            { name: '오리지널 핫도그', price: 4000 },
            { name: '치즈 핫도그', price: 4500 }
          ],
          stock: 30,
          waitingTeams: 0
        }
      ];

      // 마이그레이션된 배열을 다시 파일에 저장
      await fs.writeFile(TRUCKS_FILE, JSON.stringify(migrated, null, 2), 'utf-8');
      return migrated;
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('트럭 데이터 파일 읽기 오류:', error);
    return [];
  }
}

// 트럭 데이터 파일 쓰기 함수
async function saveTrucksData(data) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(TRUCKS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('트럭 데이터 파일 쓰기 오류:', error);
    return false;
  }
}

// GET /api/trucks: 트럭 목록 반환
export async function GET() {
  const trucks = await getTrucksData();
  return NextResponse.json({ success: true, data: trucks });
}

// POST /api/trucks: 트럭 정보 추가 또는 업데이트
export async function POST(request) {
  try {
    const updatedTruck = await request.json();
    if (!updatedTruck || !updatedTruck.ownerUsername) {
      return NextResponse.json({ success: false, error: '부적합한 파라미터 규격입니다.' }, { status: 400 });
    }

    const trucks = await getTrucksData();
    const idx = trucks.findIndex(t => t.ownerUsername === updatedTruck.ownerUsername);

    if (idx !== -1) {
      // 기존 트럭 업데이트
      trucks[idx] = { ...trucks[idx], ...updatedTruck };
    } else {
      // 신규 트럭 추가
      trucks.push({
        id: updatedTruck.ownerUsername,
        ...updatedTruck
      });
    }

    const success = await saveTrucksData(trucks);
    if (success) {
      return NextResponse.json({ success: true, message: '푸드트럭 정보가 정상 저장되었습니다.' });
    } else {
      return NextResponse.json({ success: false, error: '파일 저장 중 에러가 발생했습니다.' }, { status: 500 });
    }
  } catch (error) {
    console.error('트럭 업데이트 API 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
