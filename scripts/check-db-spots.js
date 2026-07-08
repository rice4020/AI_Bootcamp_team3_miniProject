const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// .env.local 파일에서 DATABASE_URL 읽어오기
function loadEnvDbUrl() {
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/);
  return match ? match[1] : null;
}

async function verifySpotsInDb() {
  const dbUrl = loadEnvDbUrl();
  if (!dbUrl) {
    console.error("❌ [.env.local] DATABASE_URL 환경변수를 찾을 수 없습니다.");
    return;
  }

  console.log("🔌 [Neon DB] 검증용 커넥션 풀을 연결합니다...");
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // 1. "Spot" 테이블 레코드 건수 조회
    const countRes = await pool.query('SELECT COUNT(*) as count FROM "Spot"');
    const totalCount = countRes.rows[0].count;
    console.log(`\n🎉 [Neon DB 검증 성공] "Spot" 테이블 데이터 총 개수: ${totalCount}건`);

    // 2. 상위 3건 실데이터 샘플 출력
    const sampleRes = await pool.query('SELECT id, name, address, latitude, longitude, description FROM "Spot" ORDER BY id ASC LIMIT 3');
    console.log('📋 [Neon DB 검증 성공] 실제 적재된 데이터 샘플 (3건):');
    sampleRes.rows.forEach((row, idx) => {
      console.log(`\n👉 [샘플 ${idx + 1}] ID: ${row.id}`);
      console.log(`   - 허가구역명: ${row.name}`);
      console.log(`   - 소재지 주소: ${row.address}`);
      console.log(`   - 위경도 좌표: (${row.latitude}, ${row.longitude})`);
      console.log(`   - 운영 규칙 (description): ${row.description.slice(0, 100)}...`);
    });

  } catch (err) {
    console.error("❌ Neon DB 조회 중 에러 발생:", err.message);
  } finally {
    await pool.end();
    console.log("\n🔌 [Neon DB] 검증용 커넥션 풀 안전 해제 완료.");
  }
}

verifySpotsInDb();
