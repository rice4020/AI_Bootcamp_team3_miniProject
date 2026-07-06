"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { getCurrentSession, getTruckInfo, logoutUser, initDb } from '../../../utils/authDb';

// 📏 두 좌표 사이의 실제 거리를 구하는 Haversine 공식 (단위: km)
// 지구가 둥글기 때문에 단순 뺄셈으로는 거리를 구할 수 없어, 이 공식을 사용합니다
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 지구 반경(km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // km 단위로 반환
}

// 거리를 사람이 읽기 좋은 텍스트로 변환 (예: 1.2km, 850m)
function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

// 기본 행사 정보 (관리자가 등록 안 했을 때를 대비한 백업 데이터)
// 💡 lat/lng : 행사 장소의 실제 위경도 좌표
// 💡 scaleNum : 정렬에 사용하는 예상 일평균 인원 수 (숫자)
const DEFAULT_EVENTS = [
  {
    id: 1,
    name: "여의도 밤도깨비 야시장",
    period: "7.1 ~ 7.15",
    scale: "일평균 15,000명",
    scaleNum: 15000,
    location: "여의도 한강공원",
    lat: 37.5265,
    lng: 126.9330
  },
  {
    id: 2,
    name: "홍대 버스킹 페스티벌",
    period: "7.4 ~ 7.6",
    scale: "일평균 8,000명",
    scaleNum: 8000,
    location: "홍대 걷고싶은거리",
    lat: 37.5550,
    lng: 126.9210
  },
  {
    id: 3,
    name: "부산 바다 축제",
    period: "8.1 ~ 8.5",
    scale: "일평균 30,000명",
    scaleNum: 30000,
    location: "해운대 해수욕장",
    lat: 35.1581,
    lng: 129.1602
  },
  {
    id: 4,
    name: "광화문 한여름 밤의 푸드 페스타",
    period: "7.5 ~ 7.10",
    scale: "일평균 8,000명",
    scaleNum: 8000,
    location: "광화문 광장",
    lat: 37.5710,
    lng: 126.9768
  },
  {
    id: 5,
    name: "수원 화성 문화제",
    period: "7.15 ~ 7.20",
    scale: "일평균 12,000명",
    scaleNum: 12000,
    location: "수원 화성행궁 광장",
    lat: 37.2828,
    lng: 127.0135
  },
  {
    id: 6,
    name: "서울숲 피크닉 뮤직 페스타",
    period: "7.12 ~ 7.14",
    scale: "일평균 6,000명",
    scaleNum: 6000,
    location: "서울숲 공원",
    lat: 37.5443,
    lng: 127.0374
  }
];

export default function OwnerEventsPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [truck, setTruck] = useState(null);

  // 행사 리스트 State
  const [eventList, setEventList] = useState([]);

  // 📍 내 현재 위치 State (기본값: 서울시청 좌표)
  const [myLocation, setMyLocation] = useState({ lat: 37.5665, lng: 126.9780 });
  const [isGpsLoaded, setIsGpsLoaded] = useState(false);

  // 🔽 현재 선택된 정렬 기준 ('distance' | 'scale')
  const [sortMode, setSortMode] = useState('distance');

  // 1. 세션 확인 및 행사 데이터 조회
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

    // 관리자가 행사/날씨 도구에서 등록한 로컬 행사 데이터 불러오기
    const storedEvents = localStorage.getItem('roadfood_admin_events');
    if (storedEvents) {
      const parsed = JSON.parse(storedEvents);
      // 기존 데이터에 scaleNum/lat/lng가 없을 경우 DEFAULT_EVENTS 값으로 보완
      const enriched = parsed.map(ev => {
        const def = DEFAULT_EVENTS.find(d => d.id === ev.id);
        return {
          scaleNum: def?.scaleNum ?? 0,
          lat: def?.lat ?? 37.5665,
          lng: def?.lng ?? 126.9780,
          ...ev
        };
      });
      setEventList(enriched);
    } else {
      setEventList(DEFAULT_EVENTS);
      localStorage.setItem('roadfood_admin_events', JSON.stringify(DEFAULT_EVENTS));
    }

    // 📍 GPS로 내 현재 위치 감지
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsGpsLoaded(true);
        },
        () => {
          // GPS 권한 거부 시 서울시청 기본값으로 조용히 계속 진행
          setIsGpsLoaded(false);
        }
      );
    }
  }, []);

  // 2. 정렬 로직: 선택된 sortMode에 따라 리스트를 재정렬
  const sortedEventList = [...eventList].sort((a, b) => {
    if (sortMode === 'distance') {
      // 내 위치와의 거리 오름차순 (가까운 곳이 위로)
      const distA = getDistance(myLocation.lat, myLocation.lng, a.lat ?? myLocation.lat, a.lng ?? myLocation.lng);
      const distB = getDistance(myLocation.lat, myLocation.lng, b.lat ?? myLocation.lat, b.lng ?? myLocation.lng);
      return distA - distB;
    } else {
      // 예상 인원 내림차순 (많은 곳이 위로)
      return (b.scaleNum ?? 0) - (a.scaleNum ?? 0);
    }
  });

  if (!session || !truck) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
        <Navbar userType="owner" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>사용자 정보를 불러오는 중입니다...</p>
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

          {/* 헤더 영역 */}
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '8px' }}>
              🎡 주변 문화 축제 및 행사 일정 분석
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              운영진이 실시간 공공데이터를 기반으로 수집/분석한 전국 단위 및 주변 주요 행사 일정 리스트입니다.<br />
              예상 규모와 장소를 참고하여 영업 스팟 선정 및 재고량 기획 등의 상권 전략에 활용해 보세요.
            </p>
          </div>

          {/* 🔽 정렬 기준 선택 탭 */}
          <div style={{
            display: 'flex',
            gap: '8px',
            padding: '6px',
            background: 'var(--surface-light)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', padding: '0 6px', whiteSpace: 'nowrap' }}>
              정렬 기준
            </span>
            {[
              { key: 'distance', label: '📍 가까운 순', tooltip: '내 현재 위치에서 가까운 행사 장소부터 표시합니다.' },
              { key: 'scale', label: '👥 예상인원 많은 순', tooltip: '예상 일일 방문객이 많은 행사부터 표시합니다.' }
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setSortMode(opt.key)}
                title={opt.tooltip}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: sortMode === opt.key
                    ? 'linear-gradient(135deg, var(--primary) 0%, #e84393 100%)'
                    : 'transparent',
                  color: sortMode === opt.key ? '#FFFFFF' : 'var(--text-secondary)',
                  boxShadow: sortMode === opt.key ? '0 4px 12px rgba(255,107,53,0.35)' : 'none'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 내 위치 안내 칩 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            padding: '10px 14px',
            background: 'var(--surface-light)',
            borderRadius: '10px',
            border: '1px solid var(--border)'
          }}>
            <span style={{
              width: '8px', height: '8px',
              borderRadius: '50%',
              background: isGpsLoaded ? '#00B894' : '#FDCB6E',
              flexShrink: 0,
              boxShadow: isGpsLoaded ? '0 0 0 3px rgba(0,184,148,0.2)' : '0 0 0 3px rgba(253,203,110,0.2)'
            }} />
            {isGpsLoaded
              ? `📍 내 현재 GPS 위치 기반으로 거리를 계산하고 있습니다. (${myLocation.lat.toFixed(4)}, ${myLocation.lng.toFixed(4)})`
              : '📍 GPS 위치를 가져오지 못해 서울시청 기준으로 거리를 계산합니다. (브라우저 위치 권한을 허용하면 정확해집니다)'
            }
          </div>

          {/* 행사 리스트 렌더링 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sortedEventList.length === 0 ? (
              <div style={{
                padding: '60px 0',
                textAlign: 'center',
                fontSize: '0.9rem',
                color: 'var(--text-muted)',
                border: '1px dashed var(--border)',
                borderRadius: '16px'
              }}>
                현재 등록된 주변 행사 일정이 존재하지 않습니다.
              </div>
            ) : (
              sortedEventList.map((ev, index) => {
                // 이 행사까지의 거리 계산
                const distKm = getDistance(
                  myLocation.lat, myLocation.lng,
                  ev.lat ?? myLocation.lat,
                  ev.lng ?? myLocation.lng
                );

                // 거리별 색상: 3km이내 초록, 10km이내 주황, 그 이상 빨강
                const distColor = distKm < 3 ? '#00B894' : distKm < 10 ? '#FF6B35' : '#D63031';

                return (
                  <div
                    key={ev.id}
                    className="glass-panel-hover"
                    style={{
                      padding: '24px',
                      background: '#FFFFFF',
                      border: index === 0 ? '2px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: '16px',
                      boxShadow: index === 0 ? '0 4px 20px rgba(255,107,53,0.15)' : 'var(--shadow-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* 1위 행사 강조 리본 뱃지 */}
                    {index === 0 && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        background: 'linear-gradient(135deg, var(--primary) 0%, #e84393 100%)',
                        color: '#FFF',
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        padding: '5px 14px',
                        borderBottomLeftRadius: '12px',
                        letterSpacing: '0.02em'
                      }}>
                        {sortMode === 'distance' ? '🏃 최근접 행사' : '👑 최다 인원 행사'}
                      </div>
                    )}

                    {/* 행사명 + 핵심 지표 배지 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: index === 0 ? '100px' : '0' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {ev.name}
                      </h3>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: `rgba(${distKm < 3 ? '0,184,148' : distKm < 10 ? '255,107,53' : '214,48,49'}, 0.1)`,
                          color: distColor,
                          border: `1px solid rgba(${distKm < 3 ? '0,184,148' : distKm < 10 ? '255,107,53' : '214,48,49'}, 0.25)`
                        }}>
                          📍 {formatDistance(distKm)}
                        </span>
                      </div>
                    </div>

                    <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: 0 }} />

                    {/* 행사 상세 정보 그리드 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', fontSize: '0.83rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '3px', fontSize: '0.72rem', fontWeight: '600' }}>위치</span>
                        <strong style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.84rem' }}>📍 {ev.location}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '3px', fontSize: '0.72rem', fontWeight: '600' }}>행사 기간</span>
                        <strong style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.84rem' }}>📅 {ev.period}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '3px', fontSize: '0.72rem', fontWeight: '600' }}>예상 집객 규모</span>
                        <strong style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.84rem' }}>👥 {ev.scale}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '3px', fontSize: '0.72rem', fontWeight: '600' }}>내 위치에서</span>
                        <strong style={{ fontWeight: '700', fontSize: '0.9rem', color: distColor }}>
                          🛣️ {formatDistance(distKm)}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 행사 정보 활용 팁 */}
          <div style={{
            background: 'var(--surface-light)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.8'
          }}>
            ℹ️ <strong>행사 정보 활용 팁:</strong><br />
            - 예상 집객 규모가 클수록 식재료 및 일회용기 재고를 평소보다 약 30% 이상 넉넉히 확보하시는 것을 권장합니다.<br />
            - 거리 색상 안내: <span style={{ color: '#00B894', fontWeight: '700' }}>●초록 3km 이내</span> &nbsp;
            <span style={{ color: '#FF6B35', fontWeight: '700' }}>●주황 10km 이내</span> &nbsp;
            <span style={{ color: '#D63031', fontWeight: '700' }}>●빨강 10km 초과</span>
          </div>

        </div>
      </main>
    </div>
  );
}
