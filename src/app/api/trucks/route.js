import { sql, IS_MOCK_MODE } from '@/lib/db';

/**
 * 🚚 푸드트럭 실시간 목록 조회 API
 * GET /api/trucks
 */
export async function GET(request) {
  // 1. [안전장치] 만약 로컬에 DATABASE_URL이 지정되어 있지 않은 가상 모드(Mock Mode)라면
  //    데이터베이스 서버에 절대 접근하지 않고 즉시 안전하게 빈 배열을 반환합니다.
  if (IS_MOCK_MODE) {
    console.log('ℹ️ [API/trucks] DATABASE_URL이 없어 가상(Mock) 모드로 작동 중입니다. DB 연결을 건너뜁니다.');
    return Response.json([]);
  }

  try {
    console.log('🔄 [API/trucks] Neon Database 실시간 푸드트럭 데이터 쿼리 시작...');
    
    // 2. 우선 핵심 관리 테이블인 "FoodTruck" (Prisma 규격) 조회를 시도합니다.
    try {
      const rows = await sql`
        SELECT 
          id, 
          "ownerId" AS "ownerName", 
          "truckName" AS name, 
          menu, 
          "priceInfo", 
          stock, 
          status, 
          latitude, 
          longitude, 
          notice 
        FROM "FoodTruck"
      `;
      
      // 데이터가 정상 조회되었으면 가공하여 클라이언트에 전달합니다.
      const formatted = rows.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category || 'snack', // 기본값 매칭
        lat: Number(r.latitude),
        lng: Number(r.longitude),
        status: String(r.status).toLowerCase(), // 소문자 통일 (preparing, active, sold_out, closed 등)
        ownerName: r.ownerName,
        phone: "010-1234-5678", // 보안상 기본값 대입
        intro: r.notice || "안녕하세요! 실시간 영업 정보입니다.",
        menu: r.menu ? JSON.parse(r.menu) : [],
        stock: Number(r.stock || 0),
        waitingTeams: 0 // 기본값 세팅
      }));

      return Response.json(formatted);

    } catch (prismaError) {
      console.warn('⚠️ [API/trucks] "FoodTruck" 테이블 조회 실패. 임시 "food_trucks" 테이블로 전환합니다:', prismaError.message);
      
      // 3. 만약 "FoodTruck"이 없다면, 임시/대시보드 통계용 테이블인 "food_trucks" 조회를 시도합니다.
      const rows = await sql`
        SELECT 
          id, 
          owner_username AS "ownerName", 
          truck_name AS name, 
          status, 
          latitude, 
          longitude 
        FROM food_trucks
      `;

      const formatted = rows.map(r => ({
        id: r.id,
        name: r.name,
        category: 'snack', // 임시 카테고리
        lat: Number(r.latitude),
        lng: Number(r.longitude),
        status: String(r.status).toLowerCase(), // active, preparing, sold_out, inactive 등
        ownerName: r.ownerName,
        phone: "010-1234-5678",
        intro: "실시간 위치 정보가 갱신되었습니다.",
        menu: [],
        stock: 0,
        waitingTeams: 0
      }));

      return Response.json(formatted);
    }

  } catch (error) {
    // 4. 데이터베이스 테이블이 아직 마이그레이션 전이거나 기타 에러 발생 시 크래시 방지를 위해 빈 배열을 반환합니다.
    console.error('❌ [API/trucks] Neon DB 연동 중 오류가 발생했습니다. 빈 배열을 반환합니다:', error.message);
    return Response.json([]);
  }
}

/**
 * 🚚 푸드트럭 정보 및 메뉴 실시간 Neon DB 업데이트 API
 * PUT /api/trucks
 */
export async function PUT(request) {
  if (IS_MOCK_MODE) {
    return Response.json({ success: true, message: "MOCK 모드: DB 저장을 생략합니다." });
  }

  try {
    const { ownerUsername, name, category, intro, menu, stock, waitingTeams, status, lat, lng } = await request.json();
    console.log(`🔄 [API/trucks] Neon Database 푸드트럭 정보 업데이트 시작 (Owner: ${ownerUsername})...`);

    const menuStr = JSON.stringify(menu || []);

    // 1. 해당 사장님 ID(ownerId)를 기준으로 먼저 UPDATE 쿼리를 시도합니다.
    let res = await sql`
      UPDATE "FoodTruck"
      SET 
        "truckName" = ${name},
        menu = ${menuStr},
        stock = ${stock || 0},
        status = ${status || 'inactive'},
        notice = ${intro || ''},
        "updatedAt" = NOW()
      WHERE "ownerId" = ${ownerUsername}
      RETURNING *
    `;

    // 2. 만약 해당 ownerId의 트럭 레코드가 존재하지 않는다면 신규 생성(INSERT)해 줍니다.
    if (!res || res.length === 0) {
      res = await sql`
        INSERT INTO "FoodTruck" (
          id, 
          "ownerId", 
          "truckName", 
          menu, 
          stock, 
          status, 
          latitude, 
          longitude, 
          notice, 
          "updatedAt"
        )
        VALUES (
          ${ownerUsername + '_truck'}, 
          ${ownerUsername}, 
          ${name}, 
          ${menuStr}, 
          ${stock || 0}, 
          ${status || 'inactive'}, 
          ${lat || null}, 
          ${lng || null}, 
          ${intro || ''}, 
          NOW()
        )
        RETURNING *
      `;
    }

    console.log(`✅ [API/trucks] 푸드트럭 정보 DB 동기화 성공 (ID: ${res[0].id})`);
    return Response.json({ success: true, data: res[0] });

  } catch (error) {
    console.error("❌ [API/trucks] 푸드트럭 DB 동기화 실패:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

