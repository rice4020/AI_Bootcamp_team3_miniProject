const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnvDbUrl() {
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/);
  return match ? match[1] : null;
}

async function verifyAllDb() {
  const dbUrl = loadEnvDbUrl();
  if (!dbUrl) {
    console.error("❌ DATABASE_URL을 찾을 수 없습니다.");
    return;
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. "Spot" 테이블 레코드 건수 및 구조
    const spotCountRes = await pool.query('SELECT COUNT(*) as count FROM "Spot"');
    console.log(`\n✅ "Spot" 테이블 전체 데이터 수: ${spotCountRes.rows[0].count}건`);

    const spotSamples = await pool.query('SELECT id, name, address, latitude, longitude, "rulesDescription" FROM "Spot" ORDER BY id ASC LIMIT 3');
    console.log('📋 "Spot" 테이블 데이터 샘플:');
    spotSamples.rows.forEach(row => {
      console.log(`- [${row.id}] ${row.name} | 주소: ${row.address} | 위경도: (${row.latitude}, ${row.longitude})`);
    });

    // 1-1. 경기도 광주시 데이터가 Spot 테이블에 있는지 확인
    const gwangjuSpots = await pool.query('SELECT id, name, address FROM "Spot" WHERE address LIKE \'%광주시%\' OR name LIKE \'%광주시%\'');
    console.log(`\n🔎 "Spot" 테이블 내 [광주시] 데이터 검색 결과: ${gwangjuSpots.rows.length}건 발견`);
    gwangjuSpots.rows.forEach(row => {
      console.log(`  - [${row.id}] ${row.name} | 주소: ${row.address}`);
    });

    // 2. "Event" 테이블 레코드 건수 및 구조
    const eventCountRes = await pool.query('SELECT COUNT(*) as count FROM "Event"');
    console.log(`\n✅ "Event" 테이블 전체 데이터 수: ${eventCountRes.rows[0].count}건`);

    const eventSamples = await pool.query('SELECT id, title, location, "startDate", "endDate", scale FROM "Event" ORDER BY id ASC LIMIT 3');
    console.log('📋 "Event" 테이블 데이터 샘플:');
    eventSamples.rows.forEach(row => {
      console.log(`- [${row.id}] ${row.title} | 장소: ${row.location} | 기간: ${row.startDate} ~ ${row.endDate} | 규모: ${row.scale}`);
    });

  } catch (err) {
    console.error("❌ DB 검증 에러:", err.message);
  } finally {
    await pool.end();
  }
}

verifyAllDb();
