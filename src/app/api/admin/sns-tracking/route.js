import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const rows = await sql`
      SELECT id, title, location, description, "startDate" as start_date
      FROM "SnsExtraction"
      ORDER BY id DESC
      LIMIT 5
    `;
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Failed to fetch SNS tracking data:', error);
    return NextResponse.json({ success: false, message: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
}
