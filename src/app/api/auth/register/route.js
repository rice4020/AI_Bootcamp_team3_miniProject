import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { randomUUID } from 'crypto';

export async function POST(req) {
  try {
    const data = await req.json();
    const { username, password, name, phone, email, role, menuCategory, menuSub, photoUrl, menuCategoryId } = data;

    if (!username || !password || !name || !email) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    // Check duplicate
    const exists = await sql`SELECT "id" FROM "User" WHERE "username" = ${username}`;
    if (exists.length > 0) {
      return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 400 });
    }

    // Insert user
    const userId = randomUUID();
    const newUser = await sql`
      INSERT INTO "User" ("id", "username", "password", "name", "phone", "email", "role", "truckPhotoUrl", "menuCategoryId")
      VALUES (${userId}, ${username}, ${password}, ${name}, ${phone}, ${email}, ${role || 'owner'}, ${photoUrl || null}, ${menuCategoryId || null})
      RETURNING "id", "username"
    `;

    // Insert food_truck if role is owner (or OWNER from legacy)
    if (role === 'owner' || role === 'OWNER') {
      const fullMenu = (menuCategory && menuSub) ? `${menuCategory} - ${menuSub}` : '미정';
      const truckId = randomUUID();
      await sql`
        INSERT INTO "FoodTruck" ("id", "ownerId", "truckName", "menu", "notice")
        VALUES (
          ${truckId},
          ${userId}, 
          ${name + ' 사장님의 푸드트럭'}, 
          ${fullMenu}, 
          '안녕하세요! 맛있는 음식을 대접하겠습니다.'
        )
      `;
    }

    return NextResponse.json({ success: true, username: newUser[0].username });
  } catch (error) {
    console.error('Failed to register user:', error);
    
    // 이메일 중복 고유 제약 조건 위반 에러코드 처리
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 가입된 이메일 주소입니다. 다른 이메일을 사용해 주세요.' }, { status: 400 });
    }
    
    return NextResponse.json({ error: '회원가입 처리 중 서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
