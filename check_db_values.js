const { sql } = require('./src/lib/db');
async function check() {
  try {
    const trucks = await sql`SELECT id, "ownerId", status FROM "FoodTruck"`;
    console.log("Trucks:", JSON.stringify(trucks));
    
    const users = await sql`SELECT id, username, "isActive" FROM "User"`;
    console.log("Users:", JSON.stringify(users));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
check();
