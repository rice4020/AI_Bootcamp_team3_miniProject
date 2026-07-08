const pg = require('pg');
const { Pool } = pg;

// Neon DB 커넥션 풀 생성
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_IU4wh7bFqukP@ep-calm-river-aoln0tpa-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

function format24hDate(date) {
  if (!date) return '';
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul'
  };
  const formatter = new Intl.DateTimeFormat('ko-KR', options);
  const parts = formatter.formatToParts(date);
  
  let yyyy = '', mm = '', dd = '', hh = '', min = '';
  parts.forEach(part => {
    if (part.type === 'year') yyyy = part.value;
    if (part.type === 'month') mm = part.value;
    if (part.type === 'day') dd = part.value;
    if (part.type === 'hour') hh = part.value;
    if (part.type === 'minute') min = part.value;
  });
  
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

async function run() {
  try {
    const res = await pool.query('SELECT COUNT(*) as count, MAX(updated_at) as last_update FROM legal_spots');
    console.log('--- Raw DB Output ---');
    console.log(res.rows[0]);
    console.log('last_update type:', typeof res.rows[0].last_update);
    console.log('last_update instanceof Date:', res.rows[0].last_update instanceof Date);
    
    if (res.rows[0].last_update) {
      const date = new Date(res.rows[0].last_update);
      console.log('Date toISOString:', date.toISOString());
      console.log('Date toString:', date.toString());
      console.log('Formatted to KST:', format24hDate(date));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
