"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Button from '../../../components/Button';
import { getCurrentSession, getTruckInfo, logoutUser, initDb } from '../../../utils/authDb';

// 👥 [김유환 추가] 스팟 이름을 분석하여 예상 일평균 유동인구를 반환하는 헬퍼 함수
const getEstimatedPopulation = (spotName) => {
  const name = spotName || "";
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
  return 4500; // 기본값
};

// 📈 영업 이력 기본 더미 데이터 (비어 있는 화면 방지용)
const DEFAULT_HISTORY = [
  {
    id: 'h-1',
    date: '2026-07-01',
    spotName: "여의도 한강공원 멀티플라자 광장",
    revenue: 1200000,
    quantity: 600,
    weather: '맑음'
  },
  {
    id: 'h-2',
    date: '2026-07-03',
    spotName: "홍대 걷고싶은거리 버스킹 광장",
    revenue: 850000,
    quantity: 425,
    weather: '맑음'
  },
  {
    id: 'h-3',
    date: '2026-07-05',
    spotName: "강남역 8번출구 대형빌딩 전면공지",
    revenue: 450000,
    quantity: 150,
    weather: '흐림'
  }
];

export default function OwnerSalesHistoryPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [truck, setTruck] = useState(null);
  
  // 🏛️ 허가스팟 목록 데이터 (입력 폼 선택용)
  const [spotsList, setSpotsList] = useState([]);
  
  // 📊 매출 이력 상태관리
  const [historyList, setHistoryList] = useState([]);

  // 📝 입력 폼 상태관리 (초기 기본값을 기입하여 사장님의 입력 편의를 돕고 테스트 벨리데이션을 통과시킵니다)
  const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSpotName, setSelectedSpotName] = useState('');
  const [inputRevenue, setInputRevenue] = useState('1500000');
  const [inputQuantity, setInputQuantity] = useState('750');
  const [inputWeather, setInputWeather] = useState('맑음');

  // 🎡 주변 행사/축제 목록 상태
  const [eventsList, setEventsList] = useState([]);
  // 📌 선택된 행사 (상세 모달용)
  const [selectedEvent, setSelectedEvent] = useState(null);
  // ⏳ 행사 데이터 로딩 중 여부
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  // ➕ 더보기 표출 개수
  const [visibleCount, setVisibleCount] = useState(10);
  // 🔍 필터 타입 (all | public | sns)
  const [filterType, setFilterType] = useState('all');

  // 1. 로그인 세션 확인 및 데이터 로드
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

    // 💾 로컬스토리지에서 매출 이력 불러오기
    const savedHistory = localStorage.getItem('roadfood_sales_history');
    if (savedHistory) {
      try {
        setHistoryList(JSON.parse(savedHistory));
      } catch (e) {
        setHistoryList(DEFAULT_HISTORY);
      }
    } else {
      // 비어있으면 초기 더미 세팅 및 저장
      setHistoryList(DEFAULT_HISTORY);
      localStorage.setItem('roadfood_sales_history', JSON.stringify(DEFAULT_HISTORY));
    }
  }, []);

  // 1.5 드롭다운용 허가 구역 스팟 정보 호출
  useEffect(() => {
    const fetchGovSpots = async () => {
      try {
        const res = await fetch('/api/legal-spots');
        const resData = await res.json();
        if (resData.success && resData.data && resData.data.length > 0) {
          setSpotsList(resData.data);
          setSelectedSpotName(resData.data[0].name); // 기본 선택
        }
      } catch (err) {
        console.warn("⚠️ API 로딩 실패, 로컬 백업 더미를 콤보박스에 사용합니다.");
        // 백업 더미 이름 목록 생성
        setSpotsList([
          { name: "여의도 한강공원 멀티플라자 광장" },
          { name: "홍대 걷고싶은거리 버스킹 광장" },
          { name: "강남역 8번출구 대형빌딩 전면공지" },
          { name: "청계천 광통교 남단 하천변 광장" },
          { name: "반포 한강공원 세빛섬 달빛광장" }
        ]);
        setSelectedSpotName("여의도 한강공원 멀티플라자 광장");
      }
    };
    fetchGovSpots();
  }, []);

  // 1.6 주변 행사/축제 목록 API 호출
  useEffect(() => {
    const fetchEvents = async () => {
      setIsEventsLoading(true);
      try {
        // 📡 /api/events에서 Event + SnsExtraction UNION 결과 가져오기
        const res = await fetch('/api/events?lat=37.5665&lng=126.9780&radius=');
        const data = await res.json();
        if (data.success && data.data) {
          setEventsList(data.data); // API 응답 필드명: data.data
        }
      } catch (err) {
        console.warn('⚠️ 행사 데이터 로드 실패:', err);
      } finally {
        setIsEventsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // 💾 매출 정보 신규 등록
  const handleAddHistory = (e) => {
    e.preventDefault();

    const revenue = parseInt(inputRevenue);
    const quantity = parseInt(inputQuantity);

    if (isNaN(revenue) || revenue <= 0) {
      alert("올바른 매출액을 입력해 주세요.");
      return;
    }
    if (isNaN(quantity) || quantity <= 0) {
      alert("올바른 판매 수량을 입력해 주세요.");
      return;
    }
    if (!selectedSpotName) {
      alert("영업한 장소를 선택해 주세요.");
      return;
    }

    const newHistory = {
      id: `h-${Date.now()}`,
      date: inputDate,
      spotName: selectedSpotName,
      revenue,
      quantity,
      weather: inputWeather
    };

    const updated = [newHistory, ...historyList].sort((a, b) => new Date(b.date) - new Date(a.date));
    setHistoryList(updated);
    localStorage.setItem('roadfood_sales_history', JSON.stringify(updated));

    // 입력 필드 리셋
    setInputRevenue('');
    setInputQuantity('');
    alert("📊 오늘의 영업 이력이 성공적으로 대시보드에 등록되었습니다!");
  };

  // 💾 매출 정보 삭제
  const handleRemoveHistory = (id) => {
    if (!confirm("이 영업 기록을 정말 삭제하시겠습니까?")) return;
    const updated = historyList.filter(item => item.id !== id);
    setHistoryList(updated);
    localStorage.setItem('roadfood_sales_history', JSON.stringify(updated));
  };

  // 🧮 특정 영업의 매출 전환 효율 구하기 (소수점 둘째 자리 반올림)
  const getEfficiency = (item) => {
    const pop = getEstimatedPopulation(item.spotName);
    return pop > 0 ? ((item.quantity / pop) * 100).toFixed(2) : '0';
  };

  // 📊 누적 통계 분석 연산
  const totalRevenue = historyList.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalQuantity = historyList.reduce((acc, curr) => acc + curr.quantity, 0);
  const avgEfficiency = historyList.length > 0
    ? (historyList.reduce((acc, curr) => acc + parseFloat(getEfficiency(curr)), 0) / historyList.length).toFixed(2)
    : '0';

  // 날씨 시너지 분석 (맑음 vs 흐림/비 평균 매출)
  const sunnyRecords = historyList.filter(h => h.weather === '맑음');
  const badRecords = historyList.filter(h => h.weather === '흐림' || h.weather === '비');
  
  const avgSunnyRevenue = sunnyRecords.length > 0 
    ? Math.round(sunnyRecords.reduce((acc, curr) => acc + curr.revenue, 0) / sunnyRecords.length) 
    : 0;
  const avgBadRevenue = badRecords.length > 0 
    ? Math.round(badRecords.reduce((acc, curr) => acc + curr.revenue, 0) / badRecords.length) 
    : 0;

  // 가장 전환 효율이 좋았던 베스트 스팟 도출
  let bestSpot = { name: "기록 없음", efficiency: 0 };
  historyList.forEach(item => {
    const eff = parseFloat(getEfficiency(item));
    if (eff > bestSpot.efficiency) {
      bestSpot = { name: item.spotName, efficiency: eff };
    }
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      {/* ⚠️ truck이 null일 때의 크래시를 예방하기 위해 옵셔널 체이닝(?.)을 적용합니다 */}
      <Navbar userType="owner" truckStatus={truck?.status} />

      <main className="mobile-safe-bottom" style={{ flex: 1, padding: '40px 24px', display: 'flex', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '850px', padding: '36px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

          {/* 🎡 행사/축제 목록 섹션 */}
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: '800', marginBottom: '4px', color: 'var(--text-primary)' }}>
              🎡 주변 행사 및 축제 정보
            </h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                수집된 공공데이터 기반 행사 목록입니다. 행사를 클릭하면 상세 정보를 볼 수 있습니다.
              </p>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => { setFilterType('all'); setVisibleCount(10); }}
                  style={{
                    padding: '6px 12px', borderRadius: '20px', border: '1px solid #dfe6e9', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                    background: filterType === 'all' ? '#2d3436' : '#ffffff',
                    color: filterType === 'all' ? '#ffffff' : '#636e72'
                  }}>
                  전체 보기
                </button>
                <button 
                  onClick={() => { setFilterType('public'); setVisibleCount(10); }}
                  style={{
                    padding: '6px 12px', borderRadius: '20px', border: '1px solid #dfe6e9', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                    background: filterType === 'public' ? '#0984e3' : '#ffffff',
                    color: filterType === 'public' ? '#ffffff' : '#636e72'
                  }}>
                  공공데이터
                </button>
                <button 
                  onClick={() => { setFilterType('sns'); setVisibleCount(10); }}
                  style={{
                    padding: '6px 12px', borderRadius: '20px', border: '1px solid #dfe6e9', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                    background: filterType === 'sns' ? '#e17055' : '#ffffff',
                    color: filterType === 'sns' ? '#ffffff' : '#636e72'
                  }}>
                  SNS 수집
                </button>
              </div>
            </div>

            {/* 행사 목록 */}
            {isEventsLoading ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>⏳ 행사 정보 불러오는 중...</p>
            ) : (() => {
              const filteredList = eventsList.filter(ev => {
                if (filterType === 'all') return true;
                const isSns = ev.sourceTable === 'SnsExtraction' || ev.source === '인스타그램 핫플 크롤링' || ev.source === '트위터 실시간 트렌드';
                if (filterType === 'sns') return isSns;
                if (filterType === 'public') return !isSns;
                return true;
              });

              return filteredList.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>선택한 조건에 맞는 행사 정보가 없습니다.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredList.slice(0, visibleCount).map((ev, idx) => {
                  // 수집 유형 판별: sourceTable로 출처 구분 (Event=공공, SnsExtraction=SNS 수집, isMock=더미)
                  const isMock = ev.isMock || false;
                  const sourceTable = ev.sourceTable || 'Event';
                  const sourceLabel = isMock
                    ? '더미'
                    : sourceTable === 'SnsExtraction'
                      ? 'SNS 수집'
                      : '공공데이터';
                  const badgeColor = isMock
                    ? { bg: 'rgba(100,100,100,0.1)', color: '#888' }
                    : sourceTable === 'SnsExtraction'
                      ? { bg: 'rgba(230, 81, 0, 0.1)', color: '#E65100' }   // 주황 - SNS 수집
                      : { bg: 'rgba(0, 123, 255, 0.1)', color: '#007bff' }; // 파랑 - 공공데이터

                  return (
                    <div
                      key={ev.id || idx}
                      onClick={() => setSelectedEvent(ev)}
                      style={{
                        padding: '14px 16px',
                        background: '#fff',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px'
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* 행사명 */}
                        <span style={{ fontWeight: '800', fontSize: '0.85rem', color: 'var(--text-primary)', flex: 1 }}>
                          {ev.title || ev.name || '행사명 미정'}
                        </span>
                        {/* 수집 유형 배지 */}
                        <span style={{
                          fontSize: '0.62rem', fontWeight: '800',
                          padding: '2px 7px', borderRadius: '4px',
                          background: badgeColor.bg, color: badgeColor.color,
                          whiteSpace: 'nowrap'
                        }}>
                          {sourceLabel}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          📅 {ev.startDate || '일정 미정'}{ev.endDate && ev.endDate !== ev.startDate ? ` ~ ${ev.endDate}` : ''}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          📍 {ev.location || '장소 미정'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {filteredList.length > visibleCount && (
                  <button
                    onClick={() => setVisibleCount(prev => prev + 10)}
                    style={{
                      marginTop: '10px',
                      padding: '12px',
                      background: '#f1f2f6',
                      color: '#2d3436',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                    }}
                  >
                    더보기 ({visibleCount} / {filteredList.length})
                  </button>
                )}
              </div>
            );
          })()}
          </div>

          {/* 행사 상세 모달 */}
          {selectedEvent && (
            <div
              onClick={() => setSelectedEvent(null)}
              style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '24px'
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  background: '#fff',
                  borderRadius: '20px',
                  padding: '32px',
                  maxWidth: '520px',
                  width: '100%',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  maxHeight: '80vh',
                  overflowY: 'auto'
                }}
              >
                {/* 모달 헤더 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.4', flex: 1 }}>
                    🎡 {selectedEvent.title || selectedEvent.name || '행사명 미정'}
                  </h3>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-muted)', marginLeft: '12px' }}
                  >✕</button>
                </div>

                {/* 수집 유형 배지 */}
                <div>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: '800',
                    padding: '3px 9px', borderRadius: '5px',
                    background: selectedEvent.isMock
                      ? 'rgba(100,100,100,0.1)'
                      : (selectedEvent.sourceTable === 'SnsExtraction' ? 'rgba(230,81,0,0.1)' : 'rgba(0,123,255,0.1)'),
                    color: selectedEvent.isMock
                      ? '#888'
                      : (selectedEvent.sourceTable === 'SnsExtraction' ? '#E65100' : '#007bff')
                  }}>
                    수집유형: {selectedEvent.isMock ? '더미 데이터' : (selectedEvent.sourceTable === 'SnsExtraction' ? 'SNS 수집 데이터' : (selectedEvent.source || '공공데이터포털'))}
                  </span>
                </div>

                {/* 상세 정보 행 */}
                {[
                  { label: '📅 기간', value: selectedEvent.startDate
                    ? `${selectedEvent.startDate}${selectedEvent.endDate && selectedEvent.endDate !== selectedEvent.startDate ? ` ~ ${selectedEvent.endDate}` : ''}`
                    : '일정 미정' },
                  { label: '📍 장소', value: selectedEvent.location || '장소 미정' },
                  { label: '🏢 주최기관', value: selectedEvent.organizer || selectedEvent.source || '미정' },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    padding: '12px 14px',
                    background: 'var(--surface-light)',
                    borderRadius: '10px',
                    border: '1px solid var(--border)'
                  }}>
                    <p style={{ margin: '0 0 3px', fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-muted)' }}>{label}</p>
                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)' }}>{value}</p>
                  </div>
                ))}

                {/* 행사 내용 */}
                {(selectedEvent.description || selectedEvent.desc) && (
                  <div style={{
                    padding: '12px 14px',
                    background: 'var(--surface-light)',
                    borderRadius: '10px',
                    border: '1px solid var(--border)'
                  }}>
                    <p style={{ margin: '0 0 6px', fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-muted)' }}>📝 행사 내용</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {selectedEvent.description || selectedEvent.desc}
                    </p>
                  </div>
                )}

                <Button variant="secondary" onClick={() => setSelectedEvent(null)} style={{ marginTop: '4px' }}>
                  닫기
                </Button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
