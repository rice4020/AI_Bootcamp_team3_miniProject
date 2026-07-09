const fs = require('fs');
const { Pool } = require('pg');
let env = '';
try { env = fs.readFileSync('.env.local', 'utf8'); } catch(e) {}
if (!env) {
  try { env = fs.readFileSync('.env', 'utf8'); } catch(e) {}
}
const line = env.split('\n').find(l => l.startsWith('DATABASE_URL='));
const dbUrl = line ? line.split('=')[1].trim().replace(/^"|"$/g, '') : '';
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function migrate() {
  try {
    await pool.query('ALTER TABLE "FoodTruck" ADD COLUMN IF NOT EXISTS "category" VARCHAR(255)');
    console.log("Added category");
    await pool.query('ALTER TABLE "FoodTruck" ADD COLUMN IF NOT EXISTS "waitingTeams" INTEGER DEFAULT 0');
    console.log("Added waitingTeams");
    pool.end();
  } catch(e) {
    console.error(e.message);
    pool.end();
  }
}
migrate();
