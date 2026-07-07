import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET() {
  try {
    const menus = await sql`SELECT * FROM "FoodTruckMenu" ORDER BY "category", "subCategory"`;
    return NextResponse.json({ success: true, menus });
  } catch (error) {
    console.error('메뉴 목록 불러오기 실패:', error);
    return NextResponse.json({ success: false, message: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
}
