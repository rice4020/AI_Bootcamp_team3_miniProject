import { NextResponse } from 'next/server';
import { sql, IS_MOCK_MODE } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const TRUCKS_FILE = path.join(DATA_DIR, 'trucks.json');

// 트럭 파일 데이터 로드 (폴백용)
async function getTrucksFileData() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(TRUCKS_FILE);
    } catch {
      await fs.writeFile(TRUCKS_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const fileContent = await fs.readFile(TRUCKS_FILE, 'utf-8');
    const data = JSON.parse(fileContent);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('⚠️ [API/trucks] 폴백 JSON 읽기 실패:', err.message);
    return [];
  }
}

// 트럭 파일 데이터 저장 (폴백용)
async function saveTrucksFileData(data) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(TRUCKS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('⚠️ [API/trucks] 폴백 JSON 쓰기 실패:', err.message);
    return false;
  }
}

/**
 * 🚚 푸드트럭 실시간 목록 조회 API
 * GET /api/trucks
 */
export async function GET(request) {
  // 1. 만약 DATABASE_URL이 없는 가상/Mock 모드라면 바로 파일 캐시를 로드해 리턴합니다.
  if (IS_MOCK_MODE) {
    console.log('ℹ️ [API/trucks] DATABASE_URL이 없어 가상(Mock) 파일 모드로 작동합니다.');
    const fileData = await getTrucksFileData();
    return NextResponse.json(fileData);
  }

  try {
    console.log('🔄 [API/trucks] Neon Database 실시간 푸드트럭 데이터 쿼리 시작...');
    
    // A. 1순위: Neon DB "FoodTruck" 테이블 조회
    try {
      const rows = await sql`
        SELECT 
          id, 
          "ownerId" AS "ownerName", 
          "truckName" AS name, 
          "category",
          menu, 
          "priceInfo", 
          stock, 
          "waitingTeams",
          status, 
          latitude, 
          longitude, 
          notice 
        FROM "FoodTruck"
      `;
      
      const formatted = rows.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category || 'snack',
        lat: Number(r.latitude),
        lng: Number(r.longitude),
        status: String(r.status).toLowerCase(), // preparing, active, sold_out, closed 등
        ownerName: r.ownerName,
        phone: "010-1234-5678",
        intro: r.notice || "안녕하세요! 실시간 영업 정보입니다.",
        menu: r.menu ? JSON.parse(r.menu) : [],
        stock: Number(r.stock || 0),
        waitingTeams: Number(r.waitingTeams || 0)
      }));

      return NextResponse.json(formatted);

    } catch (prismaError) {
      console.warn('⚠️ [API/trucks] "FoodTruck" 테이블 조회 실패. 임시 "food_trucks" 테이블로 전환합니다:', prismaError.message);
      
      try {
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

        return NextResponse.json(formatted);

      } catch (dbError) {
        console.warn('⚠️ [API/trucks] Neon DB 쿼리 실패. 로컬 파일 "trucks.json" 폴백을 시도합니다:', dbError.message);
        const fileData = await getTrucksFileData();
        return NextResponse.json(fileData);
      }
    }

  } catch (error) {
    console.error('❌ [API/trucks] Neon DB 및 파일 연동 장애:', error.message);
    return NextResponse.json([]);
  }
}

/**
 * 🚚 푸드트럭 정보 및 메뉴 실시간 Neon DB 및 파일 업데이트 API
 * PUT /api/trucks (또는 POST/PUT 지원)
 */
export async function PUT(request) {
  return await handleUpdate(request);
}

export async function POST(request) {
  return await handleUpdate(request);
}

async function handleUpdate(request) {
  let params;
  try {
    params = await request.json();
  } catch (err) {
    return NextResponse.json({ success: false, error: '잘못된 JSON 바디 규격입니다.' }, { status: 400 });
  }

  const { ownerUsername, name, category, intro, menu, stock, status, lat, lng } = params;
  const username = ownerUsername || params.id;

  if (!username) {
    return NextResponse.json({ success: false, error: 'ownerUsername이 누락되었습니다.' }, { status: 400 });
  }

  // 1. Mock 모드일 시 로컬 JSON에만 기록
  if (IS_MOCK_MODE) {
    const fileData = await getTrucksFileData();
    const idx = fileData.findIndex(t => t.ownerUsername === username);
    const updatedObj = {
      id: username,
      ownerUsername: username,
      name: name || '푸드트럭',
      category: category || 'snack',
      lat: lat || 37.5285,
      lng: lng || 126.9328,
      status: status || 'inactive',
      intro: intro || '',
      menu: menu || [],
      stock: stock || 0,
      waitingTeams: 0
    };
    if (idx !== -1) {
      fileData[idx] = updatedObj;
    } else {
      fileData.push(updatedObj);
    }
    await saveTrucksFileData(fileData);
    return NextResponse.json({ success: true, message: "가상 모드: 로컬 파일에 데이터를 업데이트했습니다." });
  }

  try {
    console.log(`🔄 [API/trucks] Neon Database 푸드트럭 정보 업데이트 시작 (Owner: ${username})...`);
    const menuStr = JSON.stringify(menu || []);

    // A. 1순위: DB UPDATE 시도
    let res = await sql`
      UPDATE "FoodTruck"
      SET 
        "truckName" = ${name || '푸드트럭'},
        "category" = ${category || null},
        menu = ${menuStr},
        stock = ${stock || 0},
        "waitingTeams" = ${waitingTeams || 0},
        status = ${status || 'inactive'},
        notice = ${intro || ''},
        "updatedAt" = NOW()
      WHERE "ownerId" = ${username}
      RETURNING *
    `;

    // B. 레코드 없을 시 INSERT
    if (!res || res.length === 0) {
      res = await sql`
        INSERT INTO "FoodTruck" (
          id, 
          "ownerId", 
          "truckName", 
          "category",
          menu, 
          stock, 
          "waitingTeams",
          status, 
          latitude, 
          longitude, 
          notice, 
          "updatedAt"
        )
        VALUES (
          ${username + '_truck'}, 
          ${username}, 
          ${name || '푸드트럭'}, 
          ${category || null},
          ${menuStr}, 
          ${stock || 0}, 
          ${waitingTeams || 0},
          ${status || 'inactive'}, 
          ${lat || 37.5285}, 
          ${lng || 126.9328}, 
          ${intro || ''}, 
          NOW()
        )
        RETURNING *
      `;
    }

    // 파일 캐시와도 실시간 미러 동기화 (Fail-safe 보장)
    try {
      const fileData = await getTrucksFileData();
      const idx = fileData.findIndex(t => t.ownerUsername === username);
      const mirrorObj = {
        id: username,
        ownerUsername: username,
        name: name || '푸드트럭',
        category: category || 'snack',
        lat: lat || 37.5285,
        lng: lng || 126.9328,
        status: status || 'inactive',
        intro: intro || '',
        menu: menu || [],
        stock: stock || 0,
        waitingTeams: 0
      };
      if (idx !== -1) {
        fileData[idx] = mirrorObj;
      } else {
        fileData.push(mirrorObj);
      }
      await saveTrucksFileData(fileData);
    } catch (mirrorErr) {
      console.warn("⚠️ [API/trucks] 파일 동기화 미러링 실패:", mirrorErr.message);
    }

    console.log(`✅ [API/trucks] 푸드트럭 정보 DB 동기화 성공 (ID: ${res[0].id})`);
    return NextResponse.json({ success: true, data: res[0] });

  } catch (error) {
    console.error("❌ [API/trucks] 푸드트럭 DB 동기화 실패 (로컬 파일로 백업 저장 시도):", error.message);
    
    // DB 연결 문제 발생 시 최후 수단으로 파일에 영구 기록
    const fileData = await getTrucksFileData();
    const idx = fileData.findIndex(t => t.ownerUsername === username);
    const backupObj = {
      id: username,
      ownerUsername: username,
      name: name || '푸드트럭',
      category: category || 'snack',
      lat: lat || 37.5285,
      lng: lng || 126.9328,
      status: status || 'inactive',
      intro: intro || '',
      menu: menu || [],
      stock: stock || 0,
      waitingTeams: 0
    };
    if (idx !== -1) {
      fileData[idx] = backupObj;
    } else {
      fileData.push(backupObj);
    }
    await saveTrucksFileData(fileData);

    return NextResponse.json({ success: true, message: "DB 연결 실패로 인한 파일 캐시 저장 처리 완료." });
  }
}
