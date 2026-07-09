"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Button from '../../../components/Button';

export default function AdminApisPage() {
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [apiList, setApiList] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [stats, setStats] = useState({
    weatherTotal: 0,
    weatherStatus: 'active',
    spotsStatus: 'active',
    naverTotal: 0,
    naverStatus: 'active',
    commercialTotal: 0,
    commercialStatus: 'active',
    culturalTotal: 0,
    culturalStatus: 'active',
    snsTotal: 0,
    snsStatus: 'active'
  });

  // 활성화된 API 탭 상태 관리 ('api-1' = 기상청, 'api-2' = 푸드트럭, 'api-3' = 네이버, 'api-4' = 상권분석, 'api-5' = 행사문화)
  const [activeTab, setActiveTab] = useState('api-1');

  // 📄 각 API별 페이지네이션 상태 관리
  const [pages, setPages] = useState({
    'api-1': 1,
    'api-2': 1,
    'api-3': 1,
    'api-4': 1,
    'api-5': 1
  });

  // 토스트 알림 헬퍼 함수
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'info' });
    }, 3000);
  };

  // 실시간 API 상태 및 수집 내역 로드
  const fetchApis = async (currentPages = pages) => {
    try {
      const q = `?type=systems&page_api1=${currentPages['api-1']}&page_api2=${currentPages['api-2']}&page_api3=${currentPages['api-3']}&page_api4=${currentPages['api-4']}&page_api5=${currentPages['api-5']}`;
      
      // 병렬 데이터 로딩
      const [apisRes, statsRes] = await Promise.all([
        fetch(`/api/admin/apis${q}`),
        fetch('/api/admin/apis?type=dashboard')
      ]);

      if (apisRes.ok) {
        const json = await apisRes.json();
        if (json.success && Array.isArray(json.data)) {
          setApiList(json.data);
        }
      }

      if (statsRes.ok) {
        const json = await statsRes.json();
        if (json.success && json.stats) {
          setStats(json.stats);
        }
      }
    } catch (err) {
      console.error("API 연동 정보 로드 실패:", err);
      showToast("API 연동 정보를 불러오지 못했습니다.", "error");
    }
  };

  // 특정 API의 페이지 변경 핸들러
  const handlePageChange = (apiId, newPage) => {
    const nextPages = { ...pages, [apiId]: newPage };
    setPages(nextPages);
    fetchApis(nextPages);
  };

  useEffect(() => {
    const adminSession = localStorage.getItem('roadfood_admin_session');
    if (!adminSession) {
      router.push('/admin');
      return;
    }
    setIsAdmin(true);
    fetchApis();

    // 💡 URL 쿼리 스트링에서 focus 대상 API 식별자(focus) 파싱하여 활성화 탭 세팅
    const params = new URLSearchParams(window.location.search);
    const focusId = params.get('focus');
    if (focusId && ['api-1', 'api-2', 'api-3', 'api-4', 'api-5'].includes(focusId)) {
      setActiveTab(focusId);
    }
  }, []);

  // 실제 강제 동기화 프로세스 작동 연동
  const handleSyncApi = async (apiId, apiName) => {
    if (isSyncing) return;
    setIsSyncing(true);
    showToast(`🔄 [${apiName}] 강제 동기화를 시작합니다. 잠시만 기다려 주세요...`, "info");
    try {
      const res = await fetch('/api/admin/apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          apiId
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          showToast(json.message || `🔄 [${apiName}] 강제 동기화 완료!`, "success");
          fetchApis(); // 갱신
        } else {
          showToast("⚠️ 동기화 실패: " + json.error, "error");
        }
      } else {
        showToast("⚠️ 서버 연결에 실패했습니다.", "error");
      }
    } catch (err) {
      showToast("⚠️ 동기화 장애 발생: " + err.message, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
        <Navbar userType="admin" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>관리자 페이지 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>
      {/* 🧭 관리자 네비게이션 바 */}
      <Navbar userType="admin" />

      <main style={{ flex: 1, padding: '40px 24px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '850', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              🔌 외부 연동 API 모니터링 센터
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              기상청 날씨 조회 API 및 네이버 지도 Geocoding API 커넥터들의 통신 상태, 요량 및 변환 수집 이력을 점검하고 강제 갱신합니다.
            </p>
          </div>

          {/* 🔌 6대 외부 연동 API 현황 그리드 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px'
          }}>
            {/* 1. 기상청 동네정보 API */}
            <div className="glass-panel clickable-card" onClick={() => setActiveTab('api-1')} style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between', cursor: 'pointer', border: activeTab === 'api-1' ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
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
            <div className="glass-panel clickable-card" onClick={() => setActiveTab('api-2')} style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between', cursor: 'pointer', border: activeTab === 'api-2' ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px', gap: '12px' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>전국 푸드트럭 허가구역 API</span>
                <span style={{ fontSize: '0.72rem', color: '#00b894', background: 'rgba(0, 184, 148, 0.1)', border: '1px solid rgba(0, 184, 148, 0.25)', padding: '2px 8px', borderRadius: '20px', fontWeight: '800', whiteSpace: 'nowrap' }}>실시간</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '20px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>제한스팟</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#00b894' }}>
                    100 <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>소</span>
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

            {/* 3. 네이버 지도 API */}
            <div className="glass-panel clickable-card" onClick={() => setActiveTab('api-3')} style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between', cursor: 'pointer', border: activeTab === 'api-3' ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px', gap: '12px' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>네이버 지도 API (Geocoding)</span>
                <span style={{ fontSize: '0.72rem', color: '#e84393', background: 'rgba(232, 67, 147, 0.1)', border: '1px solid rgba(232, 67, 147, 0.25)', padding: '2px 8px', borderRadius: '20px', fontWeight: '800', whiteSpace: 'nowrap' }}>실시간</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '20px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>일일 호출량</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#e84393' }}>
                    {stats.naverTotal || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>회</span>
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

            {/* 4. 소상공인 상권 정보 API */}
            <div className="glass-panel clickable-card" onClick={() => setActiveTab('api-4')} style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between', cursor: 'pointer', border: activeTab === 'api-4' ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px', gap: '12px' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>소상공인 상권정보 API</span>
                <span style={{ fontSize: '0.72rem', color: '#fdcb6e', background: 'rgba(253, 203, 110, 0.1)', border: '1px solid rgba(253, 203, 110, 0.25)', padding: '2px 8px', borderRadius: '20px', fontWeight: '800', whiteSpace: 'nowrap' }}>상권 정보</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '20px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>상권 수집</div>
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

            {/* 5. 서울특별시 문화/행사 API */}
            <div className="glass-panel clickable-card" onClick={() => setActiveTab('api-5')} style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between', cursor: 'pointer', border: activeTab === 'api-5' ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px', gap: '12px' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>서울 행사/문화 API</span>
                <span style={{ fontSize: '0.72rem', color: '#6c5ce7', background: 'rgba(108, 92, 231, 0.1)', border: '1px solid rgba(108, 92, 231, 0.25)', padding: '2px 8px', borderRadius: '20px', fontWeight: '800', whiteSpace: 'nowrap' }}>행사 정보</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '20px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>행사 수집</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#6c5ce7' }}>
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

            {/* 6. SNS AI 트렌드 추출 API */}
            <div className="glass-panel clickable-card" onClick={() => router.push('/admin/content')} style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between', cursor: 'pointer', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px', gap: '12px' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>SNS 트렌드 AI 추출 API</span>
                <span style={{ fontSize: '0.72rem', color: '#ffeaa7', background: 'rgba(255, 234, 167, 0.1)', border: '1px solid rgba(255, 234, 167, 0.25)', padding: '2px 8px', borderRadius: '20px', fontWeight: '800', whiteSpace: 'nowrap' }}>AI 분석</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '20px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>추출 로그</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fdcb6e' }}>
                    {stats.snsTotal || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>건</span>
                  </div>
                </div>
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>상태정보</div>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    color: stats.snsStatus === 'active' ? 'var(--success)' : 'var(--danger)',
                    background: stats.snsStatus === 'active' ? 'rgba(0, 184, 148, 0.1)' : 'rgba(214, 48, 49, 0.1)',
                    border: `1px solid ${stats.snsStatus === 'active' ? 'var(--success)' : 'var(--danger)'}`,
                    padding: '4px 16px',
                    borderRadius: '12px',
                    display: 'inline-block'
                  }}>
                    {stats.snsStatus === 'active' ? '🟢 연결정상' : '🔴 연결장애'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* 🗂️ 가로형 탭 메뉴 바 (3안: 패딩/폰트/라벨 컴팩트화로 1줄에 밀착 배치) */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '2px',
            gap: '6px',
            width: '100%',
            overflowX: 'hidden'
          }}>
            {[
              { id: 'api-1', label: '⛅ 기상청 날씨' },
              { id: 'api-2', label: '🚚 전국 푸드트럭' },
              { id: 'api-3', label: '🗺️ 네이버 지도' },
              { id: 'api-4', label: '🏢 소상공인 상권' },
              { id: 'api-5', label: '🎭 행사문화 포털' }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? '800' : '600',
                    color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                    background: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    borderBottom: isActive ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: '10px 10px 0 0',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 -4px 15px rgba(108, 92, 231, 0.2)' : 'none'
                  }}
                  className={isActive ? '' : 'tab-hover'}
                  title={tab.label}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 📄 선택된 API의 단독 상세 관리 패널 */}
          {(() => {
            const api = apiList.find(item => item.id === activeTab);
            if (!api) {
              return (
                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  데이터를 실시간 로드 중이거나, 연동 중인 API 목록이 존재하지 않습니다.
                </div>
              );
            }

            return (
              <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* 1. API 기본 메타 정보 및 강제 갱신 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '850', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span>{api.name}</span>
                      <span style={{
                        fontSize: '0.75rem',
                        background: api.status === 'active' ? 'rgba(0, 184, 148, 0.1)' : 'rgba(214, 48, 49, 0.1)',
                        border: `1px solid ${api.status === 'active' ? 'var(--success)' : 'var(--danger)'}`,
                        color: api.status === 'active' ? 'var(--success)' : 'var(--danger)',
                        padding: '2px 10px',
                        borderRadius: '8px',
                        fontWeight: '700'
                      }}>
                        {api.status === 'active' ? '🟢 연결정상' : '🔴 연결장애'}
                      </span>
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      최근 동기화일: <strong>{api.lastUpdated}</strong> | 누적 수집 건수: <strong>{api.collectedCount?.toLocaleString()}건</strong>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => handleSyncApi(api.id, api.name)}
                    disabled={isSyncing}
                    style={{ padding: '10px 20px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isSyncing ? '🔄 동기화 중...' : '🔄 실시간 강제 동기화'}
                  </Button>
                </div>

                {/* 2. 상세 수집 로그 & 리스트 영역 */}
                <div style={{
                  padding: '20px',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '750', color: 'var(--accent)' }}>
                      📂 실시간 수집 내역 로그 (페이지: {api.pagination?.currentPage || 1} / {api.pagination?.totalPages || 1})
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      최근 동기화 시점 기준 (페이지당 10개씩 표시)
                    </span>
                  </div>

                  {/* 수집 아이템 상세 매핑 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Array.isArray(api.details) && api.details.length > 0 ? (
                      api.details.map(det => (
                        <div
                          key={det.id}
                          style={{
                            padding: '12px 16px',
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.82rem'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>
                              {det.location || det.spotName || det.query || det.regionName || det.eventName}
                            </strong>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                              결과값: {det.value || det.address || det.result || det.zoneType || det.eventPeriod}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '0.72rem',
                            color: det.state === '반려됨' ? 'var(--danger)' : det.state === '대기중' ? 'var(--warning)' : 'var(--success)',
                            fontWeight: '700',
                            background: det.state === '반려됨' ? 'rgba(214, 48, 49, 0.08)' : det.state === '대기중' ? 'rgba(241, 196, 15, 0.08)' : 'rgba(0, 184, 148, 0.08)',
                            padding: '2px 8px',
                            borderRadius: '6px'
                          }}>
                            {det.state || "정상연동"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        수집 내역 로그가 존재하지 않습니다.
                      </div>
                    )}
                  </div>

                  {/* 📄 페이지네이션 네비게이션 UI */}
                  {api.pagination && api.pagination.totalPages > 1 && (() => {
                    const current = api.pagination.currentPage;
                    const total = api.pagination.totalPages;
                    const maxVisible = 5;
                    let start = Math.max(1, current - Math.floor(maxVisible / 2));
                    let end = Math.min(total, start + maxVisible - 1);
                    if (end - start + 1 < maxVisible) {
                      start = Math.max(1, end - maxVisible + 1);
                    }

                    return (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '24px',
                        paddingTop: '20px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        flexWrap: 'wrap'
                      }}>
                        <button
                          disabled={current === 1}
                          onClick={() => handlePageChange(api.id, 1)}
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            background: 'rgba(255, 255, 255, 0.03)',
                            color: current === 1 ? 'rgba(255, 255, 255, 0.15)' : 'var(--text-primary)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '8px',
                            cursor: current === 1 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          처음
                        </button>

                        <button
                          disabled={current === 1}
                          onClick={() => handlePageChange(api.id, current - 1)}
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            background: 'rgba(255, 255, 255, 0.03)',
                            color: current === 1 ? 'rgba(255, 255, 255, 0.15)' : 'var(--text-primary)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '8px',
                            cursor: current === 1 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          이전
                        </button>
                        
                        {Array.from({ length: end - start + 1 }, (_, idx) => {
                          const pNum = start + idx;
                          const isCurrent = pNum === current;
                          return (
                            <button
                              key={pNum}
                              onClick={() => handlePageChange(api.id, pNum)}
                              style={{
                                width: '30px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.78rem',
                                fontWeight: isCurrent ? 'bold' : 'normal',
                                background: isCurrent ? 'var(--primary)' : 'rgba(255, 255, 255, 0.03)',
                                color: isCurrent ? '#FFF' : 'var(--text-secondary)',
                                border: isCurrent ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isCurrent ? '0 0 10px rgba(108, 92, 231, 0.4)' : 'none'
                              }}
                            >
                              {pNum}
                            </button>
                          );
                        })}

                        <button
                          disabled={current === total}
                          onClick={() => handlePageChange(api.id, current + 1)}
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            background: 'rgba(255, 255, 255, 0.03)',
                            color: current === total ? 'rgba(255, 255, 255, 0.15)' : 'var(--text-primary)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '8px',
                            cursor: current === total ? 'not-allowed' : 'pointer'
                          }}
                        >
                          다음
                        </button>

                        <button
                          disabled={current === total}
                          onClick={() => handlePageChange(api.id, total)}
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            background: 'rgba(255, 255, 255, 0.03)',
                            color: current === total ? 'rgba(255, 255, 255, 0.15)' : 'var(--text-primary)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '8px',
                            cursor: current === total ? 'not-allowed' : 'pointer'
                          }}
                        >
                          끝
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}

        </div>
      </main>

      {/* 🍞 토스트 팝업 */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '14px 24px',
          borderRadius: '16px',
          background: toast.type === 'success' ? 'rgba(0, 184, 148, 0.95)' : toast.type === 'error' ? 'rgba(214, 48, 49, 0.95)' : 'rgba(9, 132, 227, 0.95)',
          color: '#FFFFFF',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          zIndex: 10000,
          fontSize: '0.88rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          pointerEvents: 'none'
        }}>
          <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* 💫 탭 전환 호버 피드백 스타일 주입 */}
      <style jsx global>{`
        .tab-hover:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          color: var(--text-primary) !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
        }
      `}</style>
    </div>
  );
}
