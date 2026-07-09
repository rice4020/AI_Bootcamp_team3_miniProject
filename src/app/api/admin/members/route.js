import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const users = await sql`
      SELECT id, username, name, phone, email, role, "isActive", "createdAt"
      FROM "User"
      WHERE role = 'owner'
      ORDER BY "createdAt" DESC
    `;
    
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Failed to fetch members:', error);
    return NextResponse.json({ success: false, message: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { username, isSuspended } = await request.json();
    
    if (!username) {
      return NextResponse.json({ success: false, message: 'username이 필요합니다.' }, { status: 400 });
    }

    const isActive = !isSuspended;

    await sql`
      UPDATE "User"
      SET "isActive" = ${isActive}
      WHERE username = ${username}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update member status:', error);
    return NextResponse.json({ success: false, message: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
}
