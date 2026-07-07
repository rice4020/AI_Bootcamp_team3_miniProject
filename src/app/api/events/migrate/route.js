import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. 이전에 가짜 서울시청 좌표로 채워졌던(기존에 NULL이었던) 데이터 원복
    // ID가 75, 78, 79, 80, 83 등의 대표 누락 행사 및 이와 동등하게 임의 처리된 항목들 원복
    const resultCoordsFallbackRollback = await sql`
      UPDATE "Event"
      SET "latitude" = NULL,
          "longitude" = NULL,
          "location" = '존재하지 않음'
      WHERE "location" = '37.5665, 126.9780' OR "location" = '37.5665,126.978' OR ("latitude" = 37.5665 AND "longitude" = 126.9780)
      RETURNING "id", "title", "location"
    `;

    console.log(`📦 [Migration Rollback] 가짜좌표 폴백 항목 복원 완료: ${resultCoordsFallbackRollback.length}건을 NULL/존재하지않음 상태로 복원했습니다.`);

    return NextResponse.json({
      success: true,
      message: '누락 위경도 좌표 데이터의 NULL 원복 마이그레이션이 완료되었습니다.',
      restoredNullCount: resultCoordsFallbackRollback.length,
      samples: resultCoordsFallbackRollback.slice(0, 5)
    });
  } catch (err) {
    console.error('❌ [Migration Rollback Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
