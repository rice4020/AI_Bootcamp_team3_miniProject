import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// 🔧 DB 테이블 목록 조회 (개발용, 프로덕션 배포 전 삭제 필요)
export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ error: 'DATABASE_URL 없음' }, { status: 500 });
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 현재 DB에 존재하는 모든 테이블 이름 조회
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    const tables = tablesResult.rows.map(r => r.table_name);

    // 각 테이블의 컬럼 정보도 조회
    const schemaResult = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    // 테이블별로 그룹화
    const schema = {};
    for (const row of schemaResult.rows) {
      if (!schema[row.table_name]) schema[row.table_name] = [];
      schema[row.table_name].push({ column: row.column_name, type: row.data_type });
    }

    return NextResponse.json({ tables, schema });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    await pool.end();
  }
}
