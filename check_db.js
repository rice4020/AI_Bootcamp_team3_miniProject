const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  
  console.log("=== 테이블 목록 ===");
  if (res.rows.length === 0) {
      console.log("테이블이 존재하지 않습니다.");
  } else {
      for (let row of res.rows) {
          console.log(`- ${row.table_name}`);
      }
      
      console.log("\n=== 테이블별 구조 ===");
      for (let row of res.rows) {
          console.log(`\n테이블명: ${row.table_name}`);
          const cols = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = $1
          `, [row.table_name]);
          for (let col of cols.rows) {
              console.log(`  - ${col.column_name} (${col.data_type})`);
          }
          
          console.log(`\n데이터 (최대 5건):`);
          const data = await client.query(`SELECT * FROM "${row.table_name}" LIMIT 5`);
          if (data.rows.length === 0) {
              console.log("  (데이터 없음)");
          } else {
              console.table(data.rows);
          }
      }
  }
  
  await client.end();
}

main().catch(console.error);
