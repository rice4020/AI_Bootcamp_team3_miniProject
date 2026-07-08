// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Button from '../../components/Button';

interface StatsState {
  totalUsers: number;
  activeTrucks: number;
  totalTrucks: number;
  suspendedUsers: number;
  // 신동원님 연동 API 집계 추가 속성
  total?: number;
  approved?: number;
  rejected?: number;
  pending?: number;
  weather?: string;
  naverTotal?: number;
  weatherTotal?: number;
  weatherStatus?: string;
  spotsStatus?: string;
  naverStatus?: string;
  commercialTotal?: number;
  commercialStatus?: string;
  culturalTotal?: number;
  culturalStatus?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [mapProvider, setMapProvider] = useState('naver'); // 기본 지도 공급자 ('naver' 또는 'osm')
  const [stats, setStats] = useState<StatsState>({
    totalUsers: 0,
    activeTrucks: 0,
    totalTrucks: 0,
    suspendedUsers: 0,
    total: 0,
    naverTotal: 0,
    weatherTotal: 0,
    weatherStatus: 'active',
    spotsStatus: 'active',
    naverStatus: 'active',
    commercialTotal: 0,
    commercialStatus: 'active',
    culturalTotal: 0,
    culturalStatus: 'active'
  });

  // 📡 상세 목록 팝업 상태 정의
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailType, setDetailType] = useState(''); // 'owners' | 'active_trucks' | 'total_trucks' | 'suspended_users'
  const [detailData, setDetailData] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // 📡 실시간 Neon DB 통계 및 외부 API 소모율 병렬 페치 실행 함수
  const fetchDbStats = async () => {
    try {
      setDashboardLoading(true);
      const [statsRes, apisRes] = await Promise.all([
        fetch('/api/admin/stats').then(r => r.json()),
        fetch('/api/admin/apis?type=dashboard').then(r => r.json()).catch(() => ({ success: false }))
      ]);

      let mergedStats: StatsState = {
        totalUsers: 0,
        activeTrucks: 0,
        totalTrucks: 0,
        suspendedUsers: 0
      };

      if (statsRes.success) {
        mergedStats.totalUsers = statsRes.totalUsers || 0;
        mergedStats.activeTrucks = statsRes.activeTrucks || 0;
        mergedStats.totalTrucks = statsRes.totalTrucks || 0;
        mergedStats.suspendedUsers = statsRes.suspendedUsers || 0;
      }

      if (apisRes.success && apisRes.stats) {
        const apiStats = apisRes.stats;
        mergedStats = {
          ...mergedStats,
          total: apiStats.total || 0,
          approved: apiStats.approved || 0,
          rejected: apiStats.rejected || 0,
          pending: apiStats.pending || 0,
          weather: apiStats.weather || '',
          naverTotal: apiStats.naverTotal || 0,
          weatherTotal: apiStats.weatherTotal || 0,
          weatherStatus: apiStats.weatherStatus || 'active',
          spotsStatus: apiStats.spotsStatus || 'active',
          naverStatus: apiStats.naverStatus || 'active',
          commercialTotal: apiStats.commercialTotal || 0,
          commercialStatus: apiStats.commercialStatus || 'active',
          culturalTotal: apiStats.culturalTotal || 0,
          culturalStatus: apiStats.culturalStatus || 'active'
        };
      }

      setStats(mergedStats);
    } catch (err) {
      console.error('Failed to load dashboard statistics from Neon DB:', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  // 1. 관리자 세션 체크 및 데이터 수집
  useEffect(() => {
    const adminSession = localStorage.getItem('roadfood_admin_session');
    if (!adminSession) {
      alert("관리자 권한이 필요한 서비스입니다.");
      router.push('/admin');
      return;
    }
    setIsAdmin(true);

    // 로컬 지도 API 설정 불러오기
    const savedProvider = localStorage.getItem('roadfood_map_provider') || 'naver';
    setMapProvider(savedProvider);

    fetchDbStats();
  }, [router]);

  // 📡 1.2 카드 클릭 시 상세 데이터 패치 핸들러
  const handleCardClick = async (type: string) => {
    setDetailType(type);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    setDetailData([]);
    try {
      const response = await fetch(`/api/admin/stats/detail?type=${type}`);
      const result = await response.json();
      if (result.success) {
        setDetailData(result.data || []);
      } else {
        console.error(result.error);
      }
    } catch (err) {
      console.error('Failed to fetch details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // 1.5 지도를 실시간으로 변경하는 컨트롤 함수
  const handleToggleMap = (provider: string) => {
    localStorage.setItem('roadfood_map_provider', provider);
    setMapProvider(provider);
  };

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
        <Navbar userType="admin" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>관리자 세션을 검증하고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      {/* 관리자 전용 헤더 */}
      <Navbar userType="admin" />

      <main style={{ flex: 1, padding: '40px 24px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* 👋 종합 모니터링 대시보드 타이틀 및 실시간 상태 동적 갱신 버튼 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '850', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                📊 종합 모니터링 대시보드
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                푸드트럭 구역 수집 현황 및 외부 연동 API 트래픽 통계를 실시간으로 파악합니다.
              </p>
            </div>
            <Button 
              variant="secondary" 
              onClick={fetchDbStats} 
              disabled={dashboardLoading}
              style={{ padding: '10px 20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {dashboardLoading ? '🔄 갱신 중...' : '🔄 실시간 상태 동적 갱신'}
            </Button>
          </div>

          {/* 🔌 5대 외부 연동 API 현황 (신동원님 기능 이식 및 스타일 융합) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', borderLeft: '4px solid #0984e3', paddingLeft: '10px' }}>
              🔌 연동 API 요약 현황
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px'
            }}>
              {/* 1. 기상청 동네정보 API */}
              <div className="glass-panel clickable-card" onClick={() => router.push('/admin/apis?focus=api-1')} style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px', gap: '12px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>기상청 동네예보 API</span>
                  <span style={{ fontSize: '0.72rem', color: '#0984e3', background: 'rgba(9, 132, 227, 0.1)', border: '1px solid rgba(9, 132, 227, 0.25)', padding: '2px 8px', borderRadius: '20px', fontWeight: '800', whiteSpace: 'nowrap' }}>1일 기준</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '20px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>수집건수</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0984e3' }}>
                      {stats.weatherTotal || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>건</span>
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>상태정보</div>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      color: stats.weatherStatus === 'active' ? 'var(--success)' : 'var(--danger)',
                      background: stats.weatherStatus === 'active' ? 'rgba(0, 184, 148, 0.1)' : 'rgba(214, 48, 49, 0.1)',
                      border: `1px solid ${stats.weatherStatus === 'active' ? 'var(--success)' : 'var(--danger)'}`,
                      padding: '4px 16px',
                      borderRadius: '12px',
                      display: 'inline-block'
                    }}>
                      {stats.weatherStatus === 'active' ? '🟢 연결정상' : '🔴 연결장애'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. 전국 푸드트럭 허가구역 점용공간 API */}
              <div className="glass-panel clickable-card" onClick={() => router.push('/admin/apis?focus=api-2')} style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px', gap: '12px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>전국 푸드트럭 허가구역 점용공간 API</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--primary)', background: 'rgba(108, 92, 231, 0.1)', border: '1px solid rgba(108, 92, 231, 0.25)', padding: '2px 8px', borderRadius: '20px', fontWeight: '800', whiteSpace: 'nowrap' }}>1개월 기준</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '20px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>수집건수</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary)' }}>
                      {stats.total || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>건</span>
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>상태정보</div>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      color: stats.spotsStatus === 'active' ? 'var(--success)' : 'var(--danger)',
                      background: stats.spotsStatus === 'active' ? 'rgba(0, 184, 148, 0.1)' : 'rgba(214, 48, 49, 0.1)',
                      border: `1px solid ${stats.spotsStatus === 'active' ? 'var(--success)' : 'var(--danger)'}`,
                      padding: '4px 16px',
                      borderRadius: '12px',
                      display: 'inline-block'
                    }}>
                      {stats.spotsStatus === 'active' ? '🟢 연결정상' : '🔴 연결장애'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. 네이버 지도 플랫폼 Geocoding API */}
              <div className="glass-panel clickable-card" onClick={() => router.push('/admin/apis?focus=api-3')} style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px', gap: '12px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>네이버 지도 플랫폼 Geocoding API</span>
                  <span style={{ fontSize: '0.72rem', color: '#6c5ce7', background: 'rgba(108, 92, 231, 0.1)', border: '1px solid rgba(108, 92, 231, 0.25)', padding: '2px 8px', borderRadius: '20px', fontWeight: '800', whiteSpace: 'nowrap' }}>실시간 기준</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '20px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>수집건수</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#6c5ce7' }}>
                      {stats.naverTotal || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>건</span>
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>상태정보</div>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      color: stats.naverStatus === 'active' ? 'var(--success)' : 'var(--danger)',
                      background: stats.naverStatus === 'active' ? 'rgba(0, 184, 148, 0.1)' : 'rgba(214, 48, 49, 0.1)',
                      border: `1px solid ${stats.naverStatus === 'active' ? 'var(--success)' : 'var(--danger)'}`,
                      padding: '4px 16px',
                      borderRadius: '12px',
                      display: 'inline-block'
                    }}>
                      {stats.naverStatus === 'active' ? '🟢 연결정상' : '🔴 연결장애'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. 소상공인 상권분석 API */}
              <div className="glass-panel clickable-card" onClick={() => router.push('/admin/apis?focus=api-4')} style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px', gap: '12px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>소상공인 상권분석 API</span>
                  <span style={{ fontSize: '0.72rem', color: '#eab543', background: 'rgba(234, 181, 67, 0.1)', border: '1px solid rgba(234, 181, 67, 0.25)', padding: '2px 8px', borderRadius: '20px', fontWeight: '800', whiteSpace: 'nowrap' }}>실시간 기준</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '20px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>수집건수</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fdcb6e' }}>
                      {stats.commercialTotal || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>건</span>
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>상태정보</div>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      color: stats.commercialStatus === 'active' ? 'var(--success)' : 'var(--danger)',
                      background: stats.commercialStatus === 'active' ? 'rgba(0, 184, 148, 0.1)' : 'rgba(214, 48, 49, 0.1)',
                      border: `1px solid ${stats.commercialStatus === 'active' ? 'var(--success)' : 'var(--danger)'}`,
                      padding: '4px 16px',
                      borderRadius: '12px',
                      display: 'inline-block'
                    }}>
                      {stats.commercialStatus === 'active' ? '🟢 연결정상' : '🔴 연결장애'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. 행사문화 포털 API */}
              <div className="glass-panel clickable-card" onClick={() => router.push('/admin/apis?focus=api-5')} style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px', gap: '12px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>행사문화 포털 API</span>
                  <span style={{ fontSize: '0.72rem', color: '#e84393', background: 'rgba(232, 67, 147, 0.1)', border: '1px solid rgba(232, 67, 147, 0.25)', padding: '2px 8px', borderRadius: '20px', fontWeight: '800', whiteSpace: 'nowrap' }}>실시간 기준</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '20px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>수집건수</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#e84393' }}>
                      {stats.culturalTotal || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>건</span>
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>상태정보</div>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      color: stats.culturalStatus === 'active' ? 'var(--success)' : 'var(--danger)',
                      background: stats.culturalStatus === 'active' ? 'rgba(0, 184, 148, 0.1)' : 'rgba(214, 48, 49, 0.1)',
                      border: `1px solid ${stats.culturalStatus === 'active' ? 'var(--success)' : 'var(--danger)'}`,
                      padding: '4px 16px',
                      borderRadius: '12px',
                      display: 'inline-block'
                    }}>
                      {stats.culturalStatus === 'active' ? '🟢 연결정상' : '🔴 연결장애'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <style jsx global>{`
            .clickable-card {
              transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .clickable-card:hover {
              transform: translateY(-4px);
              box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15) !important;
            }
          `}</style>

        </div>
      </main>

      {/* 📡 실시간 Neon DB 상세 목록 팝업 모달 */}
      {isDetailModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: '750px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '28px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            {/* 모달 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                {detailType === 'owners' && '🎡 전체 가입 사장님 목록'}
                {detailType === 'active_trucks' && '🟢 현재 활성 트럭 (영업중) 목록'}
                {detailType === 'total_trucks' && '🚚 등록 푸드트럭 전체 목록'}
                {detailType === 'suspended_users' && '🔴 계정 일시 정지 목록'}
              </h3>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            {/* 모달 바디 (목록 테이블) */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {detailLoading ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  데이터를 불러오는 중입니다...
                </div>
              ) : detailData.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  현재 해당 항목의 데이터가 존재하지 않습니다.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)' }}>
                      {detailType === 'owners' && (
                        <>
                          <th style={{ padding: '12px 8px' }}>이름</th>
                          <th style={{ padding: '12px 8px' }}>아이디</th>
                          <th style={{ padding: '12px 8px' }}>이메일</th>
                          <th style={{ padding: '12px 8px' }}>연락처</th>
                          <th style={{ padding: '12px 8px' }}>가입일</th>
                        </>
                      )}
                      {detailType === 'active_trucks' && (
                        <>
                          <th style={{ padding: '12px 8px' }}>상호명</th>
                          <th style={{ padding: '12px 8px' }}>점주명</th>
                          <th style={{ padding: '12px 8px' }}>위도</th>
                          <th style={{ padding: '12px 8px' }}>경도</th>
                        </>
                      )}
                      {detailType === 'total_trucks' && (
                        <>
                          <th style={{ padding: '12px 8px' }}>상호명</th>
                          <th style={{ padding: '12px 8px' }}>점주명</th>
                          <th style={{ padding: '12px 8px' }}>주요메뉴</th>
                          <th style={{ padding: '12px 8px' }}>상태</th>
                        </>
                      )}
                      {detailType === 'suspended_users' && (
                        <>
                          <th style={{ padding: '12px 8px' }}>이름</th>
                          <th style={{ padding: '12px 8px' }}>아이디</th>
                          <th style={{ padding: '12px 8px' }}>이메일</th>
                          <th style={{ padding: '12px 8px' }}>역할</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {detailData.map((row: any) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-main)' }}>
                        {detailType === 'owners' && (
                          <>
                            <td style={{ padding: '12px 8px', fontWeight: '700' }}>{row.name}</td>
                            <td style={{ padding: '12px 8px' }}>{row.username}</td>
                            <td style={{ padding: '12px 8px' }}>{row.email}</td>
                            <td style={{ padding: '12px 8px' }}>{row.phone || '-'}</td>
                            <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{row.createdAt}</td>
                          </>
                        )}
                        {detailType === 'active_trucks' && (
                          <>
                            <td style={{ padding: '12px 8px', fontWeight: '700' }}>{row.truckName}</td>
                            <td style={{ padding: '12px 8px' }}>{row.ownerName}</td>
                            <td style={{ padding: '12px 8px' }}>{row.latitude ? parseFloat(row.latitude).toFixed(4) : '-'}</td>
                            <td style={{ padding: '12px 8px' }}>{row.longitude ? parseFloat(row.longitude).toFixed(4) : '-'}</td>
                          </>
                        )}
                        {detailType === 'total_trucks' && (
                          <>
                            <td style={{ padding: '12px 8px', fontWeight: '700' }}>{row.truckName}</td>
                            <td style={{ padding: '12px 8px' }}>{row.ownerName}</td>
                            <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{row.menu || '미지정'}</td>
                            <td style={{ padding: '12px 8px' }}>
                              <span style={{
                                padding: '3px 6px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                background: row.status === 'active' ? 'rgba(0, 184, 148, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                color: row.status === 'active' ? '#00B894' : 'var(--text-secondary)'
                              }}>
                                {row.status === 'active' ? '영업중' : '준비/비활성'}
                              </span>
                            </td>
                          </>
                        )}
                        {detailType === 'suspended_users' && (
                          <>
                            <td style={{ padding: '12px 8px', fontWeight: '700' }}>{row.name}</td>
                            <td style={{ padding: '12px 8px' }}>{row.username}</td>
                            <td style={{ padding: '12px 8px' }}>{row.email}</td>
                            <td style={{ padding: '12px 8px' }}>{row.role}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* 모달 푸터 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '20px' }}>
              <Button onClick={() => setIsDetailModalOpen(false)} variant="secondary" style={{ padding: '8px 20px' }}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
