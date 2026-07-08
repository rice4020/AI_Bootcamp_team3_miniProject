import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json({ success: false, error: '조회할 타입(type)이 필요합니다.' }, { status: 400 });
    }

    let data = [];

    if (type === 'owners') {
      // 전체 사장님 계정 리스트
      data = await sql`
        SELECT "id", "username", "name", "phone", "email", to_char("createdAt", 'YYYY-MM-DD HH24:MI') as "createdAt"
        FROM "User"
        WHERE "role" = 'owner'
        ORDER BY "createdAt" DESC
      `;
    } else if (type === 'active_trucks') {
      // 영업중 활성 트럭 리스트
      data = await sql`
        SELECT t."id", t."truckName", t."status", t."latitude", t."longitude", u."name" AS "ownerName"
        FROM "FoodTruck" t
        JOIN "User" u ON t."ownerId" = u."id"
        WHERE t."status" = 'active'
        ORDER BY t."createdAt" DESC
      `;
    } else if (type === 'total_trucks') {
      // 전체 등록 트럭 리스트
      data = await sql`
        SELECT t."id", t."truckName", t."menu", t."status", u."name" AS "ownerName"
        FROM "FoodTruck" t
        JOIN "User" u ON t."ownerId" = u."id"
        ORDER BY t."createdAt" DESC
      `;
    } else if (type === 'suspended_users') {
      // 일시 정지 계정 리스트
      data = await sql`
        SELECT "id", "username", "name", "phone", "email", "role"
        FROM "User"
        WHERE "isActive" = false
        ORDER BY "createdAt" DESC
      `;
    } else {
      return NextResponse.json({ success: false, error: '유효하지 않은 타입입니다.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('❌ [Admin Stats Detail API Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
