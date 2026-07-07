import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

// 🧹 만료된 행사 자동 정리 API (endDate가 오늘 이전인 레코드 삭제)
// 매일 24시(자정)에 호출하거나, 수동으로 트리거하여 지나간 축제 데이터를 정리
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 삭제 전 대상 건수 먼저 조회 (로깅용)
    const expiredCount = await sql`
      SELECT COUNT(*) as cnt FROM "Event"
      WHERE "endDate" < ${today}::date
    `;

    const targetCount = parseInt(expiredCount[0].cnt);

    if (targetCount === 0) {
      console.log(`🧹 [Cleanup] 만료된 행사가 없습니다. (기준일: ${today})`);
      return NextResponse.json({
        success: true,
        message: '삭제 대상 행사가 없습니다.',
        deleted: 0,
        referenceDate: today
      });
    }

    // 만료 행사 일괄 삭제
    const deleted = await sql`
      DELETE FROM "Event"
      WHERE "endDate" < ${today}::date
      RETURNING "id", "title", "endDate"
    `;

    console.log(`🧹 [Cleanup] 만료 행사 ${deleted.length}건 삭제 완료 (기준일: ${today})`);

    return NextResponse.json({
      success: true,
      message: `만료된 행사 ${deleted.length}건이 정리되었습니다.`,
      deleted: deleted.length,
      referenceDate: today,
      // 삭제된 행사 목록 일부 샘플 (최대 10건)
      sample: deleted.slice(0, 10).map(e => ({
        id: e.id,
        title: e.title,
        endDate: new Date(e.endDate).toISOString().split('T')[0]
      }))
    });

  } catch (err) {
    console.error('❌ [Cleanup Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
