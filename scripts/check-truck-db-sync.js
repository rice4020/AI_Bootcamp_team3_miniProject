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

async function verifyTruckMenuInDb() {
  const dbUrl = loadEnvDbUrl();
  if (!dbUrl) {
    console.error("❌ [.env.local] DATABASE_URL 환경변수를 찾을 수 없습니다.");
    return;
  }

  console.log("🔌 [Neon DB] 푸드트럭 테이블 상태를 조회하기 위해 연결합니다...");
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 사장님 테스트용 계정 'owner123'의 푸드트럭 조회
    const res = await pool.query(`
      SELECT id, "ownerId", "truckName", menu, stock, status, notice, "updatedAt"
      FROM "FoodTruck"
      WHERE "ownerId" = 'owner123'
    `);

    if (res.rows.length === 0) {
      console.log('ℹ️ [Neon DB] 아직 debugowner1 사장님의 푸드트럭 정보가 DB에 적재되지 않았습니다.');
    } else {
      const truck = res.rows[0];
      console.log(`\n🎉 [Neon DB 조회 성공] 현재 debugowner1 점주님의 푸드트럭 정보:`);
      console.log(`👉 ID: ${truck.id}`);
      console.log(`👉 상호명 (truckName): ${truck.truckName}`);
      console.log(`👉 재고 (stock): ${truck.stock}개`);
      console.log(`👉 실시간 영업상태 (status): ${truck.status}`);
      console.log(`👉 사장님 한마디 (notice): ${truck.notice}`);
      console.log(`👉 📋 메뉴 리스트 (menu JSON):`);
      console.log(JSON.stringify(JSON.parse(truck.menu || "[]"), null, 2));
      console.log(`👉 최종 갱신시각 (updatedAt): ${truck.updatedAt}`);
    }

  } catch (err) {
    console.error("❌ Neon DB 조회 중 오류 발생:", err.message);
  } finally {
    await pool.end();
    console.log("\n🔌 [Neon DB] 검수용 풀 안전 종료 완료.");
  }
}

verifyTruckMenuInDb();
