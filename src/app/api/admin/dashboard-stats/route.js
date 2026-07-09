import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const usersRes = await sql`SELECT COUNT(*) FROM "User" WHERE role = 'owner'`;
    const trucksRes = await sql`SELECT COUNT(*) FROM "FoodTruck"`;
    const activeTrucksRes = await sql`SELECT COUNT(*) FROM "FoodTruck" WHERE LOWER(status) IN ('active', 'open')`;
    const suspendedUsersRes = await sql`SELECT COUNT(*) FROM "User" WHERE role = 'owner' AND "isActive" = false`;

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: parseInt(usersRes[0].count, 10),
        totalTrucks: parseInt(trucksRes[0].count, 10),
        activeTrucks: parseInt(activeTrucksRes[0].count, 10),
        suspendedUsers: parseInt(suspendedUsersRes[0].count, 10),
      }
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return NextResponse.json({ success: false, message: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
}
