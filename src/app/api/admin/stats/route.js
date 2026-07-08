import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. 전체 가입 사장님 수 (role = 'owner')
    const totalUsersRes = await sql`SELECT COUNT(*)::integer FROM "User" WHERE "role" = 'owner'`;
    const totalUsers = totalUsersRes[0].count;

    // 2. 현재 활성 영업중인 트럭 수 (status = 'active')
    const activeTrucksRes = await sql`SELECT COUNT(*)::integer FROM "FoodTruck" WHERE "status" = 'active'`;
    const activeTrucks = activeTrucksRes[0].count;

    // 3. 전체 등록 푸드트럭 수
    const totalTrucksRes = await sql`SELECT COUNT(*)::integer FROM "FoodTruck"`;
    const totalTrucks = totalTrucksRes[0].count;

    // 4. 계정 일시 정지 수 (isActive = false)
    const suspendedUsersRes = await sql`SELECT COUNT(*)::integer FROM "User" WHERE "isActive" = false`;
    const suspendedUsers = suspendedUsersRes[0].count;

    return NextResponse.json({
      success: true,
      totalUsers,
      activeTrucks,
      totalTrucks,
      suspendedUsers
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
