const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

/**
 * 🗄️ Neon DB "Spot" 테이블 전국 푸드트럭 허가구역 데이터 적재 스크립트
 * 🚨 [규칙 준수] 네온 DB의 기존 스키마 구조는 변경하지 않고 데이터만 얌전히 집어넣습니다.
 */
async function seedSpots() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.trim() === "") {
    console.error('❌ [.env.local] 파일에서 DATABASE_URL(네온 DB 주소)를 찾을 수 없습니다.');
    console.error('   반드시 .env.local 파일에 데이터베이스 연결 문자열(DATABASE_URL)을 입력해 주세요.');
    process.exit(1);
  }

  console.log('🔌 [Neon DB] 연결을 시도합니다...');
  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false // Neon DB 필수 SSL 우회 보안 설정
    }
  });

  try {
    await client.connect();
    console.log('✅ [Neon DB] 연결 성공!');

    // 0. Neon DB 정의서 규격에 100% 매칭하는 "Spot" 테이블 최초 생성 (테이블이 없을 때만 안전 실행)
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS "Spot" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        "rulesDescription" TEXT,
        "createdAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(createTableQuery);
    console.log('✅ [Neon DB] "Spot" 테이블 존재 확인 완료!');

    // 1. 적재할 내장 JSON 데이터 불러오기 (전국 실제 54건)
    const jsonPath = path.join(__dirname, '../src/utils/legal_spots_data.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`적재할 데이터 파일이 존재하지 않습니다: ${jsonPath}`);
    }
    const spotsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`📊 적재할 데이터 총 개수: ${spotsData.length}건`);

    console.log('🔄 [Neon DB] Spot 테이블에 전국 데이터를 적재(UPSERT)합니다...');

    // 2. Neon DB 명세서 규격에 엄격하게 맞추어 INSERT/UPSERT 실행 (구조 변경 일절 없음)
    for (let i = 0; i < spotsData.length; i++) {
      const spot = spotsData[i];

      // 대소문자가 들어간 컬럼과 테이블명은 큰따옴표("")로 묶어야 오류 없이 정확히 들어갑니다.
      const query = `
        INSERT INTO "Spot" (id, name, address, latitude, longitude, "rulesDescription", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          address = EXCLUDED.address,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          "rulesDescription" = EXCLUDED."rulesDescription",
          "updatedAt" = NOW();
      `;

      const values = [
        spot.id,
        spot.name,
        spot.address,
        spot.latitude,
        spot.longitude,
        spot.description
      ];

      await client.query(query, values);
    }

    console.log('🎉 [Neon DB] Spot 테이블 전국 실제 데이터 100% 이식 완료!');

  } catch (error) {
    console.error('❌ [Neon DB] 데이터 적재 중 치명적인 에러 발생:', error.message);
  } finally {
    await client.end();
    console.log('🔌 [Neon DB] 연결 해제 완료.');
  }
}

seedSpots();
