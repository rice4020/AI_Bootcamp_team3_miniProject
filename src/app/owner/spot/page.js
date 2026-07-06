"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Button from '../../../components/Button';
import { getCurrentSession, getTruckInfo, updateTruckInfo, initDb } from '../../../utils/authDb';

// 🟢 추천 합법 영업 허가구역 더미데이터 5개
const RECOMMENDED_SPOTS = [
  {
    id: 'spot-1',
    name: "여의도 한강공원 멀티플라자 광장",
    location: "서울 영등포구 여의동로 330",
    lat: 37.5284,
    lng: 126.9320,
    rules: "합법 점용 허가구역 | 오후 2시 ~ 오후 10시 영업 가능 | 연간 이용료 120만원 | 한식/분식 최적화",
    advantage: "야간 한강 나들이 유동인구 2만 명 이상 보장, 주말 돗자리 인파 집중 지역",
    isMock: true
  },
  {
    id: 'spot-2',
    name: "마포구 홍대 걷고싶은거리 버스킹 광장",
    location: "서울 마포구 어울마당로 115",
    lat: 37.5562,
    lng: 126.9225,
    rules: "지자체 청년창업 허가구역 | 주말 오전 11시 ~ 오후 9시 | 청년창업자 가산점 혜택 스팟",
    advantage: "1020 젊은 유동인구 밀집, 디저트(호떡/타코야끼/에이드) 메뉴 판매량 극대화 구역",
    isMock: true
  },
  {
    id: 'spot-3',
    name: "강남 푸르지오 아파트 수요장터",
    location: "서울 서초구 사평대로 290",
    lat: 37.4982,
    lng: 127.0276,
    rules: "⚠️ 관리사무소 사전 협의 필요 | 아파트 내부 입주민 알뜰장 | 매주 수요일 오전 10시 ~ 오후 8시",
    advantage: "아파트 대단지 입주민 가족 단위 고정 고객층 확보, 분식/디저트/반찬류 강세 구역",
    isApartment: true,
    isMock: true
  },
  {
    id: 'spot-4',
    name: "청계천 광통교 남단 하천변 광장",
    location: "서울 중구 남대문로9길 40",
    lat: 37.5688,
    lng: 126.9802,
    rules: "지자체 문화축제 연계구역 | 평일 오후 5시 ~ 오후 10시, 주말 상시 허용 | 관광 특구 상권",
    advantage: "도심 야간 산책 직장인 및 외국인 관광객 다수 분포, 이색 퓨전 양식 메뉴 인기",
    isMock: true
  },
  {
    id: 'spot-5',
    name: "반포 한강공원 세빛섬 달빛광장",
    location: "서울 서초구 신반포로11길 40",
    lat: 37.5113,
    lng: 126.9965,
    rules: "한강공원 공식 푸드트럭 구역 | 매주 금/토 오후 4시 ~ 오후 11시 (달빛무지개분수 운영시간 연계)",
    advantage: "분수 쇼 관람 인파 집중으로 피크타임(오후 7~9시) 매출액 극대화, 분식 및 음료 권장",
    isMock: true
  }
];

export default function OwnerRecommendedSpotsPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [truck, setTruck] = useState(null);
  const [spotsList, setSpotsList] = useState(RECOMMENDED_SPOTS); // 기본 Fallback

  // 1. 로그인 세션 확인 및 트럭 로드
  useEffect(() => {
    const userSession = getCurrentSession();
    if (!userSession) {
      alert("로그인이 필요합니다.");
      router.push('/auth/login');
      return;
    }

    // 💡 실시간 계정 정지 여부 교차 검증!
    initDb();
    const users = JSON.parse(localStorage.getItem("roadfood_users") || "[]");
    const dbUser = users.find(u => u.username === userSession.username);
    if (dbUser && dbUser.isSuspended) {
      alert("운영진에 의해 계정이 정지되었습니다. 즉시 로그아웃되며 서비스 접근이 차단됩니다.");
      logoutUser();
      router.push('/auth/login');
      return;
    }

    // 임시 비밀번호 가드
    if (userSession.needPasswordChange) {
      router.push('/auth/change-password');
      return;
    }

    setSession(userSession);
    
    const truckData = getTruckInfo(userSession.username);
    if (truckData) {
      setTruck(truckData);
    }
  }, []);

  // 1.5 전국 실시간 공공데이터 허가 스팟 API 패치 및 추천 스팟 가공
  useEffect(() => {
    const fetchGovSpots = async () => {
      try {
        console.log("📡 [Spots Page] 실시간 허가 스팟 공공데이터 호출...");
        const res = await fetch('/api/legal-spots');
        const resData = await res.json();
        
        if (resData.success && resData.data && resData.data.length > 0) {
          // 실시간 데이터 중 상위 6개를 파싱하여 추천 카드로 정제
          const formatted = resData.data.slice(0, 6).map((item, idx) => {

            // "관리기관: 기관" 형태 분리
            const agencyMatch = item.rules.match(/관리기관:\s*([^|]*)/);
            const agency = agencyMatch ? agencyMatch[1].trim() : "해당 지자체";

            return {
              id: item.id || `gov-spot-${idx}`,
              name: item.name,
              location: item.address || "도로명 정보 없음",
              lat: item.latitude,
              lng: item.longitude,
              rules: item.description || "합법 영업 구역",
              isApartment: item.isApartment || false,
              isMock: resData.isMock || false, // ◀ API Mock 상태 주입!
              advantage: "정부 공공데이터에 등록된 합법 구역으로 단속 과태료 걱정 없이 청년/소상공인 우대 혜택을 받고 안정적인 매출 확보가 가능합니다."
            };
          });
          setSpotsList(formatted);
          console.log("✅ [Spots Page] 실시간 공공데이터 추천 스팟 리스트 셋업 완료");
        }
      } catch (err) {
        console.warn("⚠️ [Spots Page] 실시간 API 로딩 실패, 기본 Mock 데이터를 사용합니다:", err);
      }
    };
    fetchGovSpots();
  }, []);

  // 2. 해당 스팟으로 즉시 이동하여 영업 개시 처리
  const handleStartSalesAtSpot = (spot) => {
    if (!truck || !session) return;
    
    const updated = {
      ...truck,
      status: 'active',
      lat: spot.lat,
      lng: spot.lng
    };

    updateTruckInfo(session.username, updated);
    alert(`🟢 [${spot.name}] 위치로 사장님의 트럭 영업이 즉시 개시되었습니다!\n소비자 지도 상에 🟢영업중 상태로 노출됩니다.`);
    router.push('/owner'); // 지도 홈으로 보내서 실시간 마커 확인 가능하게 함
  };

  if (!session || !truck) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
        <Navbar userType="owner" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      {/* 사장님 네비게이션 헤더 */}
      <Navbar userType="owner" truckStatus={truck.status} />

      <main className="mobile-safe-bottom" style={{ flex: 1, padding: '40px 24px', display: 'flex', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '8px' }}>
              🟢 전국 실시간 합법 푸드트럭 허가구역 추천
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              행정안전부 공공데이터 API를 실시간 연동하여 과태료 걱정 없이 안심하고 장사할 수 있는 지자체 인증 상권 요지 목록입니다.<br />
              원하는 자리를 선택해 즉시 내 영업 주소로 설정하고 지도로 넘어가 보세요!
            </p>
          </div>

          {/* 스팟 카드 목록 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {spotsList.map(spot => (
              <div
                key={spot.id}
                className="glass-panel-hover"
                style={{
                  padding: '24px',
                  background: '#FFFFFF',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  boxShadow: 'var(--shadow-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                        {spot.name}
                      </h3>
                      {spot.isApartment && (
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#EF4444',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          ⚠️ 관리사무소 사전 협의 필요
                        </span>
                      )}
                      {spot.isMock && (
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          background: 'rgba(9, 132, 227, 0.1)',
                          color: '#0984e3',
                          border: '1px solid rgba(9, 132, 227, 0.25)',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}>
                          더미데이터 🧪
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{spot.location}</span>
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: 'var(--success)',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    허가 구역 🟢
                  </span>
                </div>

                <hr style={{ border: 'none', borderBottom: '1px solid var(--border)' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>📌 운영 규칙:</span>{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>{spot.rules}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>⭐ 상권 장점:</span>{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>{spot.advantage}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <Button
                    variant="primary"
                    onClick={() => handleStartSalesAtSpot(spot)}
                    style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
                  >
                    🟢 이 추천 자리에서 즉시 영업 시작하기
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => router.push(`/owner?lat=${spot.lat}&lng=${spot.lng}`)}
                    style={{ padding: '10px', fontSize: '0.85rem' }}
                  >
                    🗺️ 지도에서 위치 보기
                  </Button>
                </div>

              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}
