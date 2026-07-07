const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  await client.connect();

  const users = [
    {
      id: 'usr-superadmin',
      username: 'superadmin',
      password: 'admin123!@#',
      name: '총관리자',
      phone: '010-0000-0000',
      email: 'admin@yojari.com',
      role: 'superadmin',
      isActive: true
    },
    {
      id: 'usr-truck1',
      username: 'truck1',
      password: 'turck123!',
      name: '푸드트럭1 점주',
      phone: '010-1111-1111',
      email: 'truck1@yojari.com',
      role: 'owner',
      isActive: true
    },
    {
      id: 'usr-truck2',
      username: 'truck2',
      password: 'turck123!',
      name: '푸드트럭2 점주',
      phone: '010-2222-2222',
      email: 'truck2@yojari.com',
      role: 'owner',
      isActive: true
    },
    {
      id: 'usr-truck3',
      username: 'truck3',
      password: 'turck123!',
      name: '푸드트럭3 점주',
      phone: '010-3333-3333',
      email: 'truck3@yojari.com',
      role: 'owner',
      isActive: true
    }
  ];

  for (const user of users) {
    // 이미 존재하는지 확인
    const check = await client.query('SELECT username FROM "User" WHERE username = $1', [user.username]);
    if (check.rows.length === 0) {
      await client.query(`
        INSERT INTO "User" (id, username, password, name, phone, email, role, "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [user.id, user.username, user.password, user.name, user.phone, user.email, user.role, user.isActive]);
      console.log(`[추가 완료] ${user.username} 계정이 생성되었습니다.`);
    } else {
      console.log(`[이미 존재] ${user.username} 계정이 이미 있습니다.`);
    }
  }

  const allUsers = await client.query('SELECT username, role FROM "User"');
  console.log("=== 현재 등록된 User 목록 ===");
  console.table(allUsers.rows);

  await client.end();
}

main().catch(console.error);
