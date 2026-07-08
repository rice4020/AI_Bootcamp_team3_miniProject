import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function POST(req) {
  try {
    const { username } = await req.json();
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const result = await sql`SELECT "id" FROM "User" WHERE "username" = ${username}`;
    
    return NextResponse.json({ isDuplicate: result.length > 0 });
  } catch (error) {
    console.error('Failed to check username:', error);
    return NextResponse.json({ error: '서버 오류로 아이디 중복 확인에 실패했습니다.' }, { status: 500 });
  }
}
