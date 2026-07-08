import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const RESERVATIONS_FILE = path.join(DATA_DIR, 'reservations.json');

// 예약 파일 읽기
async function getReservationsData() {
  try {
    const fileContent = await fs.readFile(RESERVATIONS_FILE, 'utf-8');
    const data = JSON.parse(fileContent);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

// 예약 파일 쓰기
async function saveReservationsData(data) {
  try {
    await fs.writeFile(RESERVATIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    return false;
  }
}

// POST /api/reservations/status: 예약 처리 (승인/거절/삭제)
export async function POST(request) {
  try {
    const { id, action } = await request.json();
    if (!id || !action) {
      return NextResponse.json({ success: false, error: '파라미터 누락' }, { status: 400 });
    }

    let reservations = await getReservationsData();
    const originalLength = reservations.length;

    if (action === 'delete') {
      reservations = reservations.filter(r => r.id !== id);
      if (reservations.length === originalLength) {
        return NextResponse.json({ success: false, error: '삭제할 예약을 찾을 수 없습니다.' }, { status: 404 });
      }
    } else {
      const idx = reservations.findIndex(r => r.id === id);
      if (idx === -1) {
        return NextResponse.json({ success: false, error: '예약을 찾을 수 없습니다.' }, { status: 404 });
      }
      // 'approve' -> 'approved', 'reject' -> 'rejected'
      reservations[idx].status = action === 'approve' ? 'approved' : 'rejected';
    }

    const success = await saveReservationsData(reservations);
    if (success) {
      return NextResponse.json({ success: true, message: `예약 조치 (${action})가 적용되었습니다.` });
    } else {
      return NextResponse.json({ success: false, error: '파일 저장 중 에러 발생' }, { status: 500 });
    }
  } catch (error) {
    console.error('예약 상태 조치 API 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
