/**
 * 🚚 MVP 로컬 데이터베이스 헬퍼 (localStorage 기반 Mock DB)
 * 추후 Supabase 등으로 스위칭하기 용이하도록 한곳에 모듈화합니다.
 */

const USERS_KEY = "roadfood_users";
const SESSION_KEY = "roadfood_session";
const TRUCKS_KEY = "roadfood_trucks";

// 기본 사장님 더미 계정 세팅 (테스트용)
const DEFAULT_OWNER = {
  username: "owner123",
  password: "password123!", // 제약 조건 만족
  name: "홍길동",
  phone: "010-1234-5678",
  birthdate: "1990-01-01",
  email: "owner@foodtruck.com",
  needPasswordChange: false,
};

const EXTRA_OWNERS = [
  { username: "superadmin", password: "admin123!@#", name: "총관리자", phone: "010-0000-0000", birthdate: "1980-01-01", email: "admin@yojari.com", needPasswordChange: false },
  { username: "truck1", password: "truck123!", name: "푸드트럭1 점주", phone: "010-1111-1111", birthdate: "1991-01-01", email: "truck1@yojari.com", needPasswordChange: false },
  { username: "truck2", password: "truck123!", name: "푸드트럭2 점주", phone: "010-2222-2222", birthdate: "1992-01-01", email: "truck2@yojari.com", needPasswordChange: false },
  { username: "truck3", password: "truck123!", name: "푸드트럭3 점주", phone: "010-3333-3333", birthdate: "1993-01-01", email: "truck3@yojari.com", needPasswordChange: false },
];

// 초기화 함수
export function initDb() {
  if (typeof window === "undefined") return;
  
  const existingUsers = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  const usersToInsert = [DEFAULT_OWNER, ...EXTRA_OWNERS];
  
  const mergedUsers = [...existingUsers];
  for (const newU of usersToInsert) {
      const idx = mergedUsers.findIndex(u => u.username === newU.username);
      if (idx === -1) {
          mergedUsers.push(newU);
      } else {
          mergedUsers[idx] = newU; // 오타 수정 등 최신 패스워드 반영
      }
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(mergedUsers));
  
  if (!localStorage.getItem(TRUCKS_KEY)) {
    // 사장님 1(owner123)의 기본 트럭 세팅
    const defaultTrucks = [
      {
        ownerUsername: "owner123",
        name: "길동이네 타코야끼",
        category: "takoyaki",
        lat: 37.5665,
        lng: 126.9780,
        status: "prepare", // 기본 준비중
        intro: "신선한 문어가 가득 들어있는 정통 타코야끼!",
        menu: [
          { name: "오리지널 타코야끼 (8알)", price: 5000 },
          { name: "치즈 타코야끼 (8알)", price: 6000 }
        ],
        stock: 30,
        waitingTeams: 0
      }
    ];
    localStorage.setItem(TRUCKS_KEY, JSON.stringify(defaultTrucks));
  }
}

// 1. 회원가입: 아이디 중복 확인
export async function checkUsernameDuplicate(username) {
  try {
    const res = await fetch('/api/auth/check-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.isDuplicate;
  } catch (err) {
    console.error(err);
    return false;
  }
}

// 2. 회원가입: 사용자 등록
export async function registerUser(user) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '회원가입에 실패했습니다.');
  }
  return data;
}

// 3. 로그인 처리
export function loginUser(username, password) {
  initDb();
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  const user = users.find(u => u.username === username && u.password === password);
  
  if (!user) {
    throw new Error("아이디 또는 비밀번호가 일치하지 않습니다.");
  }

  if (user.isSuspended) {
    throw new Error("운영진에 의해 정지된 계정입니다. 고객센터에 문의하세요.");
  }
  
  // 세션 저장
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

// 4. 아이디 찾기
export function findUserId(name, phone, birthdate) {
  initDb();
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  const user = users.find(u => u.name === name && u.phone === phone && u.birthdate === birthdate);
  
  if (!user) {
    throw new Error("일치하는 회원 정보가 없습니다.");
  }
  return user.username;
}

// 5. 비밀번호 찾기 (임시비밀번호 발급)
export function findUserPassword(username, name, phone) {
  initDb();
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  const userIdx = users.findIndex(u => u.username === username && u.name === name && u.phone === phone);
  
  if (userIdx === -1) {
    throw new Error("일치하는 회원 정보가 없습니다.");
  }
  
  // 임시비밀번호 규칙: 휴대전화 번호 뒤 4자리 + 생년월일 6자리 조합으로 구성 (예: '5678900101!')
  const user = users[userIdx];
  const rawPhone = user.phone.replace(/[^0-9]/g, "");
  const lastFourPhone = rawPhone.slice(-4);
  const cleanBirth = user.birthdate.replace(/[^0-9]/g, "").slice(-6); // YYMMDD
  
  const tempPassword = `${lastFourPhone}${cleanBirth}!`;
  
  // 임시 비밀번호로 교체 및 강제변경 플래그 TRUE 설정
  users[userIdx].password = tempPassword;
  users[userIdx].needPasswordChange = true;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  
  return tempPassword;
}

// 6. 비밀번호 강제 변경
export function changeUserPassword(username, newPassword) {
  initDb();
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  const userIdx = users.findIndex(u => u.username === username);
  
  if (userIdx === -1) {
    throw new Error("존재하지 않는 회원입니다.");
  }
  
  users[userIdx].password = newPassword;
  users[userIdx].needPasswordChange = false; // 변경 완료 시 해제
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  
  // 현재 세션 정보도 업데이트
  const currentSession = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
  if (currentSession.username === username) {
    currentSession.password = newPassword;
    currentSession.needPasswordChange = false;
    localStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
  }
}

// 7. 내 세션 조회
export function getCurrentSession() {
  if (typeof window === "undefined") return null;
  const sessionData = localStorage.getItem(SESSION_KEY);
  return sessionData ? JSON.parse(sessionData) : null;
}

// 0. 하드코딩된 메뉴 리스트 조회 (카테고리 그룹화)
export function getTruckMenus() {
  return [
    { id: 1, category: "분식", sub_menu: "떡볶이" },
    { id: 2, category: "분식", sub_menu: "튀김" },
    { id: 3, category: "디저트", sub_menu: "호떡" },
    { id: 4, category: "디저트", sub_menu: "크레페" },
    { id: 5, category: "꼬치", sub_menu: "닭꼬치" },
    { id: 6, category: "꼬치", sub_menu: "염통" },
    { id: 7, category: "타꼬야끼", sub_menu: "타꼬야끼" },
    { id: 8, category: "양식", sub_menu: "스테이크" },
    { id: 9, category: "양식", sub_menu: "버거" },
    { id: 10, category: "이태리음식", sub_menu: "파스타" },
    { id: 11, category: "이태리음식", sub_menu: "피자" }
  ];
}

// 0-1. 새로운 메뉴 리스트 추가 (로컬 UI 전용)
export function addTruckMenu(category, subMenu) {
  // DB 연동이 사라졌으므로, UI상 처리만 지원 (단순 식별자 반환)
  return 999;
}

// 8. 내 트럭 정보 조회
export function getTruckInfo(username) {
  initDb();
  const trucks = JSON.parse(localStorage.getItem(TRUCKS_KEY) || "[]");
  return trucks.find(t => t.ownerUsername === username) || null;
}

// 9. 내 트럭 정보 업데이트
export function updateTruckInfo(username, updatedTruck) {
  initDb();
  const trucks = JSON.parse(localStorage.getItem(TRUCKS_KEY) || "[]");
  const idx = trucks.findIndex(t => t.ownerUsername === username);
  
  if (idx !== -1) {
    trucks[idx] = { ...trucks[idx], ...updatedTruck };
    localStorage.setItem(TRUCKS_KEY, JSON.stringify(trucks));
    
    // 일반 소비자용 모의 데이터(MOCK_TRUCKS)와 동기화를 위해, MOCK_TRUCKS에 세션 유저의 트럭이 있다면 변경해 줍니다.
    // MVP 상에서 일반 화면 지도 마커 연동을 위해 임시 저장
  }
}

// 10. 회원 탈퇴 (Hard Delete)
export function deleteUserAccount(username) {
  initDb();
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  const updatedUsers = users.filter(u => u.username !== username);
  localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
  
  const trucks = JSON.parse(localStorage.getItem(TRUCKS_KEY) || "[]");
  const updatedTrucks = trucks.filter(t => t.ownerUsername !== username);
  localStorage.setItem(TRUCKS_KEY, JSON.stringify(updatedTrucks));
  
  localStorage.removeItem(SESSION_KEY);
}

// 11. 로그아웃 처리
export function logoutUser() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}
