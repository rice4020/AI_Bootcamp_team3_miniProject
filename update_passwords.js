const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  await client.connect();

  const query = `
    UPDATE "User"
    SET password = 'truck123!', "updatedAt" = NOW()
    WHERE username IN ('truck1', 'truck2', 'truck3')
  `;
  
  const res = await client.query(query);
  console.log(`[업데이트 완료] 총 ${res.rowCount}개의 계정 비밀번호가 'truck123!'로 변경되었습니다.`);

  await client.end();
}

main().catch(console.error);
