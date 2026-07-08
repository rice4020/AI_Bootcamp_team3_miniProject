import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const RESERVATIONS_FILE = path.join(DATA_DIR, 'reservations.json');

// 예약 파일 읽기
async function getReservationsData() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(RESERVATIONS_FILE);
    } catch {
      await fs.writeFile(RESERVATIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }

    const fileContent = await fs.readFile(RESERVATIONS_FILE, 'utf-8');
    const data = JSON.parse(fileContent);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('예약 파일 읽기 에러:', error);
    return [];
  }
}

// 예약 파일 쓰기
async function saveReservationsData(data) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(RESERVATIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('예약 파일 쓰기 에러:', error);
    return false;
  }
}

// GET /api/reservations: 예약 조회
export async function GET() {
  const reservations = await getReservationsData();
  return NextResponse.json({ success: true, data: reservations });
}

// POST /api/reservations: 예약 등록
export async function POST(request) {
  try {
    const newRes = await request.json();
    if (!newRes || !newRes.name || !newRes.address) {
      return NextResponse.json({ success: false, error: '예약 신청 형식이 누락되었습니다.' }, { status: 400 });
    }

    const reservations = await getReservationsData();
    const formattedRes = {
      id: `res-${Date.now()}`,
      name: newRes.name,
      phone: newRes.phone || '010-0000-0000',
      date: newRes.date || new Date().toISOString().split('T')[0],
      time: newRes.time || '18:00',
      scale: newRes.scale || '규모 미정',
      address: newRes.address,
      menu: newRes.menu || '기본 세트',
      status: 'pending', // 기본 대기중
      createdAt: new Date().toISOString()
    };

    reservations.unshift(formattedRes); // 최신 신청이 위로

    const success = await saveReservationsData(reservations);
    if (success) {
      return NextResponse.json({ success: true, data: formattedRes });
    } else {
      return NextResponse.json({ success: false, error: '예약 저장 중 에러 발생' }, { status: 500 });
    }
  } catch (error) {
    console.error('예약 등록 API 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
