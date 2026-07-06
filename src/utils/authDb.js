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

// 초기화 함수
export function initDb() {
  if (typeof window === "undefined") return;
  
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_OWNER]));
  }
  
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
export function checkUsernameDuplicate(username) {
  initDb();
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  return users.some(u => u.username === username);
}

// 2. 회원가입: 사용자 등록
export function registerUser(user) {
  initDb();
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  
  if (users.some(u => u.username === user.username)) {
    throw new Error("이미 사용 중인 아이디입니다.");
  }
  
  users.push({
    ...user,
    needPasswordChange: false // 신규 가입자는 변경 대상 아님
  });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  // 신규 가입 사장님의 기본 빈 트럭도 함께 생성
  const trucks = JSON.parse(localStorage.getItem(TRUCKS_KEY) || "[]");
  trucks.push({
    ownerUsername: user.username,
    name: `${user.name} 사장님의 푸드트럭`,
    category: "snack",
    lat: 37.5665,
    lng: 126.9780,
    status: "prepare",
    intro: "안녕하세요! 맛있는 음식을 대접하겠습니다.",
    menu: [],
    stock: 0,
    waitingTeams: 0
  });
  localStorage.setItem(TRUCKS_KEY, JSON.stringify(trucks));
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
