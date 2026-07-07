"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Button from '../../../components/Button';
import { getCurrentSession, getTruckInfo, updateTruckInfo, logoutUser, initDb } from '../../../utils/authDb';

// 📡 주변 축제/행사 기준 데이터 (지역 축제 시너지 계산용)
const BASE_EVENTS = [
  { id: 'ev-1', name: "서울 밤도깨비 야시장", district: "영등포구", location: "여의도 한강공원" },
  { id: 'ev-2', name: "홍대 버스킹 페스티벌", district: "마포구", location: "홍대 걷고싶은거리" },
  { id: 'ev-3', name: "신촌 물총 축제", district: "서대문구", location: "신촌 연세로" },
  { id: 'ev-4', name: "청계천 푸드 밤 페스타", district: "중구", location: "청계천 광통교" },
  { id: 'ev-5', name: "반포 달빛 야시장", district: "서초구", location: "반포 한강공원" },
  { id: 'ev-6', name: "DDP 가을 패션 위크", district: "중구", location: "동대문 DDP" },
  { id: 'ev-7', name: "가평 자라섬 재즈페스티벌", district: "가평군", location: "가라섬 수변광장" },
  { id: 'ev-8', name: "일산 호수꽃박람회", district: "고양시", location: "일산 호수공원" }
];

// 👥 [김유환 추가] 스팟 이름을 분석하여 예상 일평균 유동인구를 반환하는 헬퍼 함수
const getEstimatedPopulation = (spot) => {
  const name = spot.name || spot.description || "";
  if (name.includes("강남역")) return 45000;
  if (name.includes("홍대") || name.includes("신촌")) return 35000;
  if (name.includes("여의도 한강") || name.includes("반포 한강")) return 32000;
  if (name.includes("뚝섬 한강") || name.includes("망원 한강")) return 28000;
  if (name.includes("동대문 디자인") || name.includes("DDP")) return 25000;
  if (name.includes("올림픽공원") || name.includes("서울숲공원")) return 22000;
  if (name.includes("대학로") || name.includes("청계천")) return 20000;
  if (name.includes("송도 센트럴") || name.includes("일산 호수")) return 18000;
  if (name.includes("수원 화성")) return 15000;
  if (name.includes("어린이대공원") || name.includes("중앙공원")) return 12000;
  if (name.includes("율동공원") || name.includes("배곧생명")) return 10000;
  return 4500; // 기본 유동인구
};

// 🍲 [김유환 추가] 사장님의 트럭 메뉴 명칭을 분석하여 주력 카테고리를 동적으로 추출하는 헬퍼 함수
const getOwnerFoodCategory = (truck) => {
  if (!truck) return "일반 분식/스낵";
  const truckName = truck.name || "";
  const menuNames = (truck.menu || []).map(m => m.name).join(" ");
  
  if (truckName.includes("타코야끼") || menuNames.includes("타코") || menuNames.includes("문어")) {
    return "타코야끼/일식";
  }
  if (truckName.includes("와플") || truckName.includes("커피") || menuNames.includes("와플") || menuNames.includes("디저트") || menuNames.includes("에이드")) {
    return "와플/디저트";
  }
  if (truckName.includes("꼬치") || menuNames.includes("꼬치") || menuNames.includes("핫도그") || menuNames.includes("바베큐")) {
    return "꼬치/바베큐";
  }
  return "일반 분식/스낵";
};

// ⚔️ [김유환 추가] 스팟의 대강의 경쟁 매장 수를 반환하는 헬퍼 함수 (소상공인 API 폴백 연계형)
const getCompetitorCount = (spot, category) => {
  const name = spot.name || "";
  let totalCount = 6;
  if (name.includes("강남역")) totalCount = 29;
  else if (name.includes("홍대") || name.includes("신촌")) totalCount = 24;
  else if (name.includes("여의도 한강") || name.includes("반포 한강")) totalCount = 5;
  else if (name.includes("뚝섬 한강") || name.includes("망원 한강")) totalCount = 4;
  else if (name.includes("동대문 디자인") || name.includes("DDP")) totalCount = 16;
  else if (name.includes("올림픽공원") || name.includes("서울숲공원")) totalCount = 8;
  else if (name.includes("대학로") || name.includes("청계천")) totalCount = 12;
  else if (name.includes("수원 화성")) totalCount = 11;

  // 💡 사장님이 파는 음식 카테고리에 국한하여 동종 업계의 요식업 내 비중을 대입합니다.
  let factor = 0.25; // 기본 비중 25%
  if (category === "타코야끼/일식") factor = 0.18; // 타코야끼 업종은 전문점으로 밀도가 낮음
  else if (category === "와플/디저트") factor = 0.32; // 디저트/커피는 밀도가 높음
  else if (category === "꼬치/바베큐") factor = 0.22;

  return Math.max(1, Math.round(totalCount * factor)); // 최소 1개 경쟁점은 보장
};

export default function OwnerRecommendedSpotsPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [truck, setTruck] = useState(null);
  
  // 🏛️ 전체 합법 허가구역 데이터셋 (API 패치 결과 보관)
  const [allSpots, setAllSpots] = useState([]);
  
  // 📱 SNS 실시간 수집 상권 트렌드 데이터셋
  const [snsTrends, setSnsTrends] = useState([]);
  
  // 🔍 관심지역(구 단위) 상태관리 (기본값 설정 및 로컬스토리지 보존)
  const [favoriteDistricts, setFavoriteDistricts] = useState(['영등포구', '마포구', '서초구']);
  const [selectedFav, setSelectedFav] = useState('영등포구'); // 분석할 관심지역 선택 상태
  const [newDistrictInput, setNewDistrictInput] = useState(''); // 관심구 입력 인풋값

  // 1. 로그인 확인 및 기본 세션 체크
  useEffect(() => {
    const userSession = getCurrentSession();
    if (!userSession) {
      alert("로그인이 필요합니다.");
      router.push('/auth/login');
      return;
    }

    initDb();
    const users = JSON.parse(localStorage.getItem("roadfood_users") || "[]");
    const dbUser = users.find(u => u.username === userSession.username);
    if (dbUser && dbUser.isSuspended) {
      alert("운영진에 의해 계정이 정지되었습니다. 즉시 로그아웃되며 서비스 접근이 차단됩니다.");
      logoutUser();
      router.push('/auth/login');
      return;
    }

    if (userSession.needPasswordChange) {
      router.push('/auth/change-password');
      return;
    }

    setSession(userSession);
    const truckData = getTruckInfo(userSession.username);
    if (truckData) {
      setTruck(truckData);
    }

    // 💾 로컬스토리지에서 관심 지역 불러오기
    const savedFavs = localStorage.getItem('roadfood_favorite_districts');
    if (savedFavs) {
      try {
        const parsed = JSON.parse(savedFavs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFavoriteDistricts(parsed);
          setSelectedFav(parsed[0]);
        }
      } catch (e) {
        console.warn("관심지역 파싱 실패, 기본값을 사용합니다.");
      }
    }
  }, []);

  // 1.5 전국 실시간 공공데이터 허가 스팟 전체 패치
  useEffect(() => {
    const fetchGovSpots = async () => {
      try {
        console.log("📡 [Spots Page] 공공데이터 스팟 데이터 조회...");
        const res = await fetch('/api/legal-spots');
        const resData = await res.json();
        
        if (resData.success && resData.data && resData.data.length > 0) {
          setAllSpots(resData.data);
        }
      } catch (err) {
        console.warn("⚠️ [Spots Page] 실시간 API 로딩 실패:", err);
      }
    };
    
    const fetchSnsTrends = async () => {
      try {
        console.log("📡 [Spots Page] 실시간 SNS 트렌드 데이터 조회...");
        const res = await fetch('/api/sns-trends');
        const resData = await res.json();
        if (resData.success && resData.data) {
          setSnsTrends(resData.data);
        }
      } catch (err) {
        console.warn("⚠️ [Spots Page] SNS 트렌드 API 로딩 실패:", err);
      }
    };

    fetchGovSpots();
    fetchSnsTrends();
  }, []);

  // 💾 관심 지역 추가 핸들러
  const handleAddDistrict = () => {
    const trimmed = newDistrictInput.trim();
    if (!trimmed) return;
    
    // 행정구 문자열 보정 (예: '마포' -> '마포구')
    let formatted = trimmed;
    if (!trimmed.endsWith('구') && !trimmed.endsWith('군' ) && !trimmed.endsWith('시')) {
      formatted = trimmed + '구';
    }

    if (favoriteDistricts.includes(formatted)) {
      alert("이미 등록된 관심 지역입니다.");
      return;
    }

    if (favoriteDistricts.length >= 5) {
      alert("관심 지역은 최대 5개까지만 등록이 가능합니다.");
      return;
    }

    const updated = [...favoriteDistricts, formatted];
    setFavoriteDistricts(updated);
    setSelectedFav(formatted); // 추가와 동시에 포커스 이동
    setNewDistrictInput('');
    localStorage.setItem('roadfood_favorite_districts', JSON.stringify(updated));
  };

  // 💾 관심 지역 삭제 핸들러
  const handleRemoveDistrict = (target) => {
    if (favoriteDistricts.length <= 1) {
      alert("적어도 1개 이상의 관심 지역은 유지해야 합니다.");
      return;
    }
    const updated = favoriteDistricts.filter(item => item !== target);
    setFavoriteDistricts(updated);
    
    // 만약 현재 선택된 관심지역을 지웠다면 다른 관심지역으로 포커스 교체
    if (selectedFav === target) {
      setSelectedFav(updated[0]);
    }
    localStorage.setItem('roadfood_favorite_districts', JSON.stringify(updated));
  };

  // 🧭 네이버 지도 길찾기 목적지 직접 입력 실행
  const handleOpenNavigation = (spot) => {
    if (!spot) return;
    const spotLat = parseFloat(spot.lat || spot.latitude);
    const spotLng = parseFloat(spot.lng || spot.longitude);
    const spotName = spot.name || "목적지";

    const url = `https://map.naver.com/v5/dir/,,,/to:${encodeURIComponent(spotName)},${spotLat},${spotLng}`;
    window.open(url, '_blank');
  };

  // 📱 [김유환 추가] 스팟의 SNS 인스타그램 트렌드 지표 매칭 및 동적 수식 연산기
  const getSnsDataForSpot = (spotName) => {
    const matched = snsTrends.find(t => spotName.includes(t.spotName) || t.spotName.includes(spotName));
    if (matched) return matched;
    
    // 가상 해시 일관 데이터셋 자동 융합 (모든 54개 공공데이터 스팟 매칭용)
    let hash = 0;
    for (let i = 0; i < spotName.length; i++) {
      hash = spotName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const absHash = Math.abs(hash);
    const hashtagCount = 3000 + (absHash % 6000);
    const growthNum = 2 + (absHash % 25);
    
    const pool = ["#인기맛집", "#푸드트럭명물", "#꿀맛보장", "#데이트코스", "#간식맛집", "#핫플레이스", "#인스타핫플", "#소상공인"];
    const keywords = [pool[absHash % pool.length], pool[(absHash + 3) % pool.length], pool[(absHash + 5) % pool.length]];
    
    return {
      spotName,
      hashtagCount,
      weeklyGrowth: `+${growthNum}%`,
      keywords
    };
  };

  // 🟢 해당 스팟으로 즉시 이동하여 영업 개시 처리
  const handleStartSalesAtSpot = (spot) => {
    if (!truck || !session) return;
    
    const spotLat = parseFloat(spot.lat || spot.latitude);
    const spotLng = parseFloat(spot.lng || spot.longitude);

    const updated = {
      ...truck,
      status: 'active',
      lat: spotLat,
      lng: spotLng
    };

    updateTruckInfo(session.username, updated);
    alert(`🟢 [${spot.name}] 위치로 사장님의 트럭 영업이 즉시 개시되었습니다!\n소비자 지도 상에 🟢영업중 상태로 노출됩니다.`);
    router.push('/owner'); // 지도 홈으로 보내서 실시간 마커 확인 가능하게 함
  };

  // 📊 각 관심 지역(구 단위)의 핵심 상권 통계 정보를 연산하는 분석 엔진 함수
  const analyzeDistrictMetrics = (districtName) => {
    // 1) 해당 구 텍스트를 포함하고 있는 허가스팟 필터링
    const districtSpots = allSpots.filter(s => 
      (s.address || s.location || "").includes(districtName) || 
      (s.name || "").includes(districtName)
    );

    const spotCount = districtSpots.length;
    const ownerCategory = getOwnerFoodCategory(truck);

    // 2) 평균 유동인구 계산
    const avgPopulation = spotCount > 0 
      ? Math.round(districtSpots.reduce((acc, curr) => acc + getEstimatedPopulation(curr), 0) / spotCount)
      : 0;

    // 3) 평균 동종 업종 경쟁업체 수 계산
    const avgCompetitors = spotCount > 0
      ? Math.round(districtSpots.reduce((acc, curr) => acc + getCompetitorCount(curr, ownerCategory), 0) / spotCount)
      : 0;

    // 4) 개최 예정 축제 수 필터링
    const festivals = BASE_EVENTS.filter(ev => ev.district === districtName).length;

    // 5) 평균 SNS 해시태그 수 산출
    const avgSnsMentions = spotCount > 0
      ? Math.round(districtSpots.reduce((acc, curr) => acc + getSnsDataForSpot(curr.name).hashtagCount, 0) / spotCount)
      : 0;

    // 6) 종합 상권 매력도 등급 산식
    // (평균 유동인구 500명당 1점) + (축제당 20점) + (평균 SNS 언급수 100개당 1점) - (경쟁점포당 5점)
    const score = (avgPopulation / 500) + (festivals * 20) + (avgSnsMentions / 100) - (avgCompetitors * 5);
    
    let grade = "C ⚪";
    if (score >= 80) grade = "S 🌟";
    else if (score >= 60) grade = "A 🟢";
    else if (score >= 40) grade = "B 🟡";

    return {
      name: districtName,
      spotCount,
      avgPopulation,
      avgCompetitors,
      festivals,
      avgSnsMentions,
      grade,
      rawSpots: districtSpots
    };
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

  // 등록된 5대 관심지역들의 실시간 분석 리스트 산출
  const analyzedFavoritesList = favoriteDistricts.map(dist => analyzeDistrictMetrics(dist));

  // 현재 유저가 상세 비교하기 위해 선택한 관심지역의 상세 지표 획득
  const activeDistrictAnalysis = analyzedFavoritesList.find(d => d.name === selectedFav) || analyzedFavoritesList[0];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      {/* 사장님 네비게이션 헤더 (⚠️ truck null 크래시 방지 옵셔널 체이닝 적용) */}
      <Navbar userType="owner" truckStatus={truck?.status} />

      <main className="mobile-safe-bottom" style={{ flex: 1, padding: '40px 24px', display: 'flex', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '850px', padding: '36px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* 타이틀 영역 */}
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
              📊 관심지역 상권 분석 및 5대 구 비교 대시보드
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              영업하고 싶으신 관심 자치구(최대 5개)를 등록하고 각 자치구의 영업 매력도와 경쟁도를 한눈에 비교해 보세요.<br />
              지표를 기준으로 최적의 입지를 선택한 뒤 1:1 스팟 정밀 비교를 통해 오늘의 장사 명당을 낙점할 수 있습니다.
            </p>
          </div>

          {/* 🔍 관심지역 등록 및 칩 관리 UI */}
          <div style={{
            background: 'var(--surface-light)',
            padding: '16px 20px',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)' }}>
              🎯 내 관심 자치구 목록 (최대 5개)
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {favoriteDistricts.map(dist => (
                <div
                  key={dist}
                  onClick={() => setSelectedFav(dist)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: selectedFav === dist ? 'var(--primary)' : '#FFFFFF',
                    color: selectedFav === dist ? '#FFFFFF' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: selectedFav === dist ? 'var(--primary)' : 'var(--border)',
                    boxShadow: selectedFav === dist ? 'var(--shadow-md)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>{dist}</span>
                  <span 
                    onClick={(e) => {
                      e.stopPropagation(); // 카드 선택 이벤트 전파 방지
                      handleRemoveDistrict(dist);
                    }}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      marginLeft: '2px',
                      color: selectedFav === dist ? '#FFFFFF' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                    title="제거"
                  >
                    ✕
                  </span>
                </div>
              ))}
              
              {favoriteDistricts.length < 5 && (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginLeft: '6px' }}>
                  <input
                    type="text"
                    placeholder="예: 강남구, 중구"
                    value={newDistrictInput}
                    onChange={(e) => setNewDistrictInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddDistrict();
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '0.75rem',
                      width: '110px',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={handleAddDistrict}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      background: 'var(--success)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    추가
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 📊 5대 관심지역 통계 데이터 비교 테이블 */}
          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-light)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '800', color: 'var(--text-secondary)' }}>관심 지역</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800', color: 'var(--text-secondary)', textAlign: 'center' }}>총 허가스팟 수</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800', color: 'var(--text-secondary)', textAlign: 'center' }}>평균 유동인구 (일)</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800', color: 'var(--text-secondary)', textAlign: 'center' }}>평균 SNS 언급량 (더미)</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800', color: 'var(--text-secondary)', textAlign: 'center' }}>동종 경쟁업체 (평균)</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800', color: 'var(--text-secondary)', textAlign: 'center' }}>개최 축제 수</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800', color: 'var(--text-secondary)', textAlign: 'center' }}>상권 매력도 등급</th>
                </tr>
              </thead>
              <tbody>
                {analyzedFavoritesList.map(item => (
                  <tr 
                    key={item.name}
                    onClick={() => setSelectedFav(item.name)}
                    style={{ 
                      borderBottom: '1px solid var(--border-light)', 
                      cursor: 'pointer',
                      background: selectedFav === item.name ? 'rgba(255, 107, 53, 0.05)' : '#FFFFFF',
                      transition: 'background 0.2s'
                    }}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: '800', color: 'var(--text-main)' }}>📍 {item.name}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700' }}>{item.spotCount}곳</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#0984e3', fontWeight: '700' }}>
                      {item.avgPopulation > 0 ? `${item.avgPopulation.toLocaleString()}명` : '-'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#e67e22', fontWeight: '700' }}>
                      {item.avgSnsMentions > 0 ? `🔥 ${item.avgSnsMentions.toLocaleString()}회` : '-'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--danger)', fontWeight: '700' }}>
                      {item.avgCompetitors > 0 ? `${item.avgCompetitors}개` : '-'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#9B59B6', fontWeight: '700' }}>{item.festivals}건</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '800', fontSize: '0.85rem' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: item.grade.includes('S') ? 'rgba(254, 203, 110, 0.15)' : 'rgba(0, 184, 148, 0.1)',
                        color: item.grade.includes('S') ? '#e1b12c' : 'var(--success)'
                      }}>{item.grade}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 🎯 1:1 추천 스팟 정밀 대조 비교 뷰 */}
          {activeDistrictAnalysis && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⭐ {activeDistrictAnalysis.name} 내 추천 허가 스팟 비교 분석
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: activeDistrictAnalysis.rawSpots.length >= 2 ? '1fr 1fr' : '1fr',
                gap: '16px'
              }}>
                {activeDistrictAnalysis.rawSpots.slice(0, 2).map((spot, idx) => {
                  const ownerCategory = getOwnerFoodCategory(truck);
                  const competitor = getCompetitorCount(spot, ownerCategory);
                  const population = getEstimatedPopulation(spot);
                  const isApartment = (spot.rulesDescription || spot.rules || "").includes("아파트") || (spot.rulesDescription || spot.rules || "").includes("관리사무소");

                  return (
                    <div
                      key={spot.id || idx}
                      className="glass-panel-hover"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: 'var(--shadow-md)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '0.62rem',
                            fontWeight: '800',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: 'var(--success)'
                          }}>스팟 {idx + 1}</span>
                          {isApartment && (
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: '800',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#EF4444'
                            }}>사전협의 필수 ⚠️</span>
                          )}
                        </div>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: '800', margin: '0 0 4px', color: 'var(--text-main)' }}>
                          {spot.name}
                        </h4>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>📍 {spot.address || spot.location}</p>
                      </div>

                      <hr style={{ border: 'none', borderBottom: '1px solid var(--border-light)', margin: '4px 0' }} />

                      {/* 스팟별 핵심 지표 비교 표출 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>👥 예상 유동인구</span>
                          <span style={{ fontWeight: '700', color: '#0984e3' }}>{population.toLocaleString()}명/일</span>
                        </div>
                        
                        {/* 📱 SNS 실시간 트렌드 지표 통합 연동 */}
                        {(() => {
                          const snsData = getSnsDataForSpot(spot.name);
                          return (
                            <div style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '6px', 
                              padding: '10px 12px', 
                              backgroundColor: 'rgba(255, 107, 53, 0.04)', 
                              border: '1px solid rgba(255, 107, 53, 0.12)', 
                              borderRadius: '12px',
                              margin: '2px 0'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  📱 실시간 SNS 핫플 반응 (더미)
                                </span>
                                <span style={{ 
                                  fontSize: '0.62rem', 
                                  fontWeight: '800', 
                                  color: '#FFFFFF', 
                                  backgroundColor: 'var(--primary)', 
                                  padding: '2px 6px', 
                                  borderRadius: '6px' 
                                }}>
                                  {snsData.weeklyGrowth} 상승세 📈
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>태그 언급 수</span>
                                <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{snsData.hashtagCount.toLocaleString()}회</span>
                              </div>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                                {snsData.keywords.map((kw, kIdx) => (
                                  <span key={kIdx} style={{ 
                                    fontSize: '0.62rem', 
                                    color: 'var(--primary)', 
                                    backgroundColor: '#FFFFFF', 
                                    border: '1px solid rgba(255, 107, 53, 0.25)', 
                                    padding: '1px 5px', 
                                    borderRadius: '4px',
                                    fontWeight: '700'
                                  }}>
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>⚔️ 동종 경쟁 매장 ({ownerCategory})</span>
                          <span style={{ fontWeight: '700', color: competitor >= 10 ? 'var(--danger)' : competitor >= 4 ? '#f1c40f' : 'var(--success)' }}>
                            {competitor}개 (경쟁도: {competitor >= 10 ? '높음🔴' : competitor >= 4 ? '보통🟡' : '낮음🟢'})
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: '700' }}>⏱️ 영업 규칙</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', lineHeight: '1.4' }}>
                            {spot.rules || spot.description || "지자체 푸드트럭 영업 허가 시간 규정 준수"}
                          </span>
                        </div>
                      </div>

                      {/* 실시간 액션 바로가기 버튼 */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                        <Button
                          variant="primary"
                          onClick={() => handleStartSalesAtSpot(spot)}
                          style={{ flex: 1, padding: '8px 10px', fontSize: '0.75rem', fontWeight: '800' }}
                        >
                          🟢 여기서 영업 개시
                        </Button>
                        <button
                          onClick={() => handleOpenNavigation(spot)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: '#03C75A', // 네이버 그린
                            color: '#FFFFFF',
                            border: 'none',
                            fontWeight: '800',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="네이버 지도 목적지 직접 연동 길찾기"
                        >
                          네이버 길안내 🧭
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
              
              {activeDistrictAnalysis.rawSpots.length === 0 && (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem'
                }}>
                  📍 등록하신 [{activeDistrictAnalysis.name}] 내에 추천 허가 스팟 정보가 존재하지 않습니다.<br />
                  다른 구(예: 영등포구, 마포구, 서초구 등)를 추가하여 대시보드를 비교해 보세요!
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
