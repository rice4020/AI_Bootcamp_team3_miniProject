import { sql } from '../src/lib/db';

async function seedMenu() {
  console.log('🌱 FoodTruckMenu 테이블 셋업 및 초기 데이터(Seed) 삽입을 시작합니다.');

  try {
    // 1. FoodTruckMenu 테이블 생성 (없을 경우)
    await sql`
      CREATE TABLE IF NOT EXISTS "FoodTruckMenu" (
        "id" SERIAL PRIMARY KEY,
        "category" VARCHAR(50) NOT NULL,
        "subCategory" VARCHAR(100) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('✅ FoodTruckMenu 테이블이 준비되었습니다.');

    // 2. 초기 데이터 정의
    const menus = [
      { category: '분식', subCategory: '떡볶이' },
      { category: '분식', subCategory: '김밥' },
      { category: '디저트', subCategory: '호떡' },
      { category: '디저트', subCategory: '크레페' },
      { category: '꼬치', subCategory: '닭꼬치' },
      { category: '꼬치', subCategory: '염통' },
      { category: '타꼬야끼', subCategory: '타꼬야끼' },
      { category: '양식', subCategory: '스테이크' },
      { category: '양식', subCategory: '버거' },
      { category: '이태리음식', subCategory: '이태리음식' }, 
    ];

    // 3. 데이터 삽입 (존재 여부 체크 후 삽입)
    for (const menu of menus) {
      const existing = await sql`
        SELECT * FROM "FoodTruckMenu" 
        WHERE "category" = ${menu.category} AND "subCategory" = ${menu.subCategory}
      `;
      
      if (existing.length === 0) {
        await sql`
          INSERT INTO "FoodTruckMenu" ("category", "subCategory")
          VALUES (${menu.category}, ${menu.subCategory})
        `;
        console.log(`➕ 메뉴 추가됨: [${menu.category}] ${menu.subCategory}`);
      } else {
        console.log(`⏩ 이미 존재하는 메뉴: [${menu.category}] ${menu.subCategory}`);
      }
    }

    // 4. User 테이블에 신규 컬럼 추가 (ALTER TABLE)
    console.log('🌱 User 테이블 스키마 업데이트를 확인합니다.');
    try {
      await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "truckPhotoUrl" VARCHAR(255)`;
      await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "menuCategoryId" INTEGER REFERENCES "FoodTruckMenu"("id")`;
      console.log('✅ User 테이블 컬럼 (truckPhotoUrl, menuCategoryId) 업데이트 완료');
    } catch (e: any) {
      console.log('⚠️ User 테이블 업데이트 스킵 (테이블이 아직 없거나 다른 이유):', e.message);
    }

    console.log('🎉 모든 초기 셋업이 완료되었습니다.');
  } catch (error) {
    console.error('❌ 메뉴 데이터 시딩 중 에러 발생:', error);
  }
}

// 스크립트 단독 실행을 위한 코드
seedMenu().then(() => process.exit(0));
