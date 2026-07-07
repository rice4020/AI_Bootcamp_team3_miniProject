/**
 * 🚚 MVP 로컬 데이터베이스 헬퍼 (localStorage 기반 Mock DB + 백엔드 파일 DB 실시간 백그라운드 동기화)
 */

const USERS_KEY = "roadfood_users";
const SESSION_KEY = "roadfood_session";
const TRUCKS_KEY = "roadfood_trucks";

// 기본 사장님 더미 계정 세팅 (테스트용)
const DEFAULT_OWNER = {
  username: "owner123",
  password: "password123!",
  name: "홍길동",
  phone: "010-1234-5678",
  birthdate: "1990-01-01",
  email: "owner@foodtruck.com",
  needPasswordChange: false,
};

// 초기화 및 백그라운드 서버 동기화 함수
export function initDb() {
  if (typeof window === "undefined") return;
  
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_OWNER]));
  }
  
  if (!localStorage.getItem(TRUCKS_KEY)) {
    const defaultTrucks = [
      {
        ownerUsername: "owner123",
        name: "길동이네 타코야끼",
        category: "takoyaki",
        lat: 37.5665,
        lng: 126.9780,
        status: "prepare",
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

  // 📡 백그라운드로 서버의 최신 트럭 데이터를 가져와 로컬스토리지 갱신
  fetch('/api/trucks')
    .then(res => res.json())
    .then(json => {
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        localStorage.setItem(TRUCKS_KEY, JSON.stringify(json.data));
      }
    })
    .catch(err => console.error("서버 트럭 데이터 동기화 실패:", err));
}

// 1. 회원가입: 아이디 중복 확인
export function checkUsernameDuplicate(username) {
  initDb();
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  return users.some(u => u.username === username);
}

// 2. 회원가입: 사용자 등록 (서버 API 동기 전송 추가)
export function registerUser(user) {
  initDb();
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  
  if (users.some(u => u.username === user.username)) {
    throw new Error("이미 사용 중인 아이디입니다.");
  }
  
  users.push({
    ...user,
    needPasswordChange: false
  });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  // 신규 가입 사장님의 기본 빈 트럭 생성
  const newTruck = {
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
  };

  const trucks = JSON.parse(localStorage.getItem(TRUCKS_KEY) || "[]");
  trucks.push(newTruck);
  localStorage.setItem(TRUCKS_KEY, JSON.stringify(trucks));

  // 📡 백그라운드로 서버에 등록 요청
  fetch('/api/trucks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newTruck)
  }).catch(err => console.error("서버 신규 트럭 등록 실패:", err));
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
  
  const user = users[userIdx];
  const rawPhone = user.phone.replace(/[^0-9]/g, "");
  const lastFourPhone = rawPhone.slice(-4);
  const cleanBirth = user.birthdate.replace(/[^0-9]/g, "").slice(-6);
  
  const tempPassword = `${lastFourPhone}${cleanBirth}!`;
  
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
  users[userIdx].needPasswordChange = false;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  
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

// 9. 내 트럭 정보 업데이트 (서버 API 동기 전송 추가)
export function updateTruckInfo(username, updatedTruck) {
  initDb();
  const trucks = JSON.parse(localStorage.getItem(TRUCKS_KEY) || "[]");
  const idx = trucks.findIndex(t => t.ownerUsername === username);
  
  let newTrucks = [...trucks];
  if (idx !== -1) {
    newTrucks[idx] = { ...newTrucks[idx], ...updatedTruck };
  } else {
    newTrucks.push({ ...updatedTruck, ownerUsername: username });
  }
  localStorage.setItem(TRUCKS_KEY, JSON.stringify(newTrucks));
  
  // 📡 백그라운드로 서버와 동기화
  fetch('/api/trucks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...updatedTruck, ownerUsername: username })
  }).catch(err => console.error("서버에 트럭 정보 동기화 실패:", err));
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
  
  // 📡 서버에서도 해당 유저의 트럭 비활성화(inactive) 처리
  const targetTruck = trucks.find(t => t.ownerUsername === username);
  if (targetTruck) {
    fetch('/api/trucks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...targetTruck, status: 'inactive', ownerUsername: username })
    }).catch(err => console.error("서버 탈퇴 트럭 상태 변경 실패:", err));
  }
  
  localStorage.removeItem(SESSION_KEY);
}

// 11. 로그아웃 처리
export function logoutUser() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}
