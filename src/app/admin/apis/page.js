"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Button from '../../../components/Button';

// 모의 수집 API 정보 데이터
const MOCK_APIS = [
  {
    id: 'api-1',
    name: "기상청 동네예보 API",
    status: "active",
    lastUpdated: "2026-07-02 12:00",
    collectedCount: 48,
    details: [
      { id: 'det-1', location: "서울 중구", value: "맑음, 28°C", state: "승인됨" },
      { id: 'det-2', location: "서울 강남구", value: "맑음, 29°C", state: "대기중" },
    ]
  },
  {
    id: 'api-2',
    name: "전국 푸드트럭 허가구역 점용공간 API",
    status: "active",
    lastUpdated: "2026-07-01 08:30",
    collectedCount: 120,
    details: [
      { id: 'det-3', spotName: "여의도 한강공원 3주차장", address: "서울 영등포구", state: "승인됨" },
      { id: 'det-4', spotName: "마포구 홍대 걷고싶은거리", address: "서울 마포구", state: "대기중" },
    ]
  },
  {
    id: 'api-3',
    name: "네이버 지도 플랫폼 Geocoding API",
    status: "active",
    lastUpdated: "2026-06-30 23:00",
    collectedCount: 2500,
    details: [
      { id: 'det-5', query: "서울 특별시청", result: "37.5665, 126.9780", state: "정상연동" }
    ]
  }
];

export default function AdminApisPage() {
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [apiList, setApiList] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // 📊 푸드트럭 허가구역 실시간 통계 상태 추가
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, pending: 0 });
  
  // 🍞 커스텀 토스트 메시지 상태
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  // 확장(토글)된 API 상태 관리
  const [expandedApiId, setExpandedApiId] = useState(null);

  // 📄 각 API별 페이지네이션 상태 관리 (기상청, 허가구역, 네이버 지도)
  const [pages, setPages] = useState({
    'api-1': 1,
    'api-2': 1,
    'api-3': 1
  });

  // 토스트 알림 헬퍼 함수
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'info' });
    }, 4000);
  };

  // 실시간 API 상태 및 수집 내역 로드 (페이징 파라미터 쿼리 연동)
  const fetchApis = async (currentPages = pages) => {
    try {
      const q = `?page_api1=${currentPages['api-1']}&page_api2=${currentPages['api-2']}&page_api3=${currentPages['api-3']}`;
      const res = await fetch(`/api/admin/apis${q}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setApiList(json.data);
          if (json.stats) {
            setStats(json.stats); // 📊 실시간 통계 업데이트
          }
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
      // 자동화 테스트와 자연스러운 UX를 위해 alert 없이 즉시 리다이렉트
      router.push('/admin');
      return;
    }
    setIsAdmin(true);
    fetchApis();
  }, []);

  // 토글 열기/닫기
  const handleToggleExpand = (id) => {
    if (expandedApiId === id) {
      setExpandedApiId(null);
    } else {
      setExpandedApiId(id);
    }
  };

  // 실제 승인 / 반려 기능 연동
  const handleApproveDetail = async (apiId, detailId, approve = true) => {
    try {
      const res = await fetch('/api/admin/apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: approve ? 'approve' : 'reject',
          apiId,
          detailId
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          showToast(json.message || `성공적으로 ${approve ? '승인' : '반려'} 처리되었습니다.`, "success");
          fetchApis(); // UI 리프레시
        } else {
          showToast("⚠️ 오류 발생: " + json.error, "error");
        }
      } else {
        showToast("⚠️ 서버 통신 중 오류가 발생했습니다.", "error");
      }
    } catch (err) {
      showToast("⚠️ 승인/반려 조작 중 장애 발생: " + err.message, "error");
    }
  };

  // 실제 강제 동기화 프로세스 작동 연동
  const handleSyncApi = async (apiId, apiName) => {
    if (isSyncing) return;
    setIsSyncing(true);
    showToast(`🔄 [${apiName}] 동기화를 시작합니다. 잠시만 기다려 주세요...`, "info");
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      {/* 관리자 헤더 */}
      <Navbar userType="admin" />

      <main style={{ flex: 1, padding: '40px 24px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '8px' }}>
              🔌 외부 공공데이터 API 연동 관리자 센터
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              기상청, 점용공간허가, 네이버 지도 API 커넥터들의 트래픽 및 수집 내역을 수동 검수/조정하거나 승인 및 즉시 갱신합니다.
            </p>
          </div>

          {/* 📊 푸드트럭 허가구역 승인 현황 실시간 통계 대시보드 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            width: '100%'
          }}>
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--text-primary)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>전체 수집 구역</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800' }}>{stats.total} <span style={{ fontSize: '1rem', fontWeight: '500' }}>곳</span></div>
            </div>
            
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--success)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>🟢 영업 승인 구역</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--success)' }}>{stats.approved} <span style={{ fontSize: '1rem', fontWeight: '500' }}>곳</span></div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--error)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>🔴 검수 반려 구역</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--error)' }}>{stats.rejected} <span style={{ fontSize: '1rem', fontWeight: '500' }}>곳</span></div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--warning)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>🟡 신규 검수 대기</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--warning)' }}>{stats.pending} <span style={{ fontSize: '1rem', fontWeight: '500' }}>곳</span></div>
            </div>
          </div>

          {/* API 리스트 및 검수/조정 토글 패널 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {apiList.map(api => {
              const isExpanded = expandedApiId === api.id;
              
              return (
                <div key={api.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* API 헤더 정보 */}
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>{api.name}</span>
                        <span style={{
                          fontSize: '0.7rem',
                          background: 'rgba(0, 184, 148, 0.1)',
                          border: '1px solid var(--success)',
                          color: 'var(--success)',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: '600'
                        }}>
                          {api.status === 'active' ? '연결정상' : '연결장애'}
                        </span>
                      </h3>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                        최근 동기화일: {api.lastUpdated} | 누적 수집 건수: {api.collectedCount}건
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <Button
                        variant="secondary"
                        onClick={() => handleSyncApi(api.id, api.name)}
                        disabled={isSyncing}
                        style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                      >
                        {isSyncing && expandedApiId === api.id ? '🔄 동기화 중...' : '🔄 강제 동기화'}
                      </Button>
                      
                      <Button
                        variant="primary"
                        onClick={() => handleToggleExpand(api.id)}
                        style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                      >
                        {isExpanded ? '상세 닫기 ▲' : '상세 목록 열기 ▼'}
                      </Button>
                    </div>
                  </div>

                  {/* 토글 확장 상세 검수 영역 */}
                  {isExpanded && (
                    <div style={{
                      marginTop: '12px',
                      padding: '20px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent)' }}>
                          📡 수집 데이터 실시간 검수 목록 (승인 및 조정 대상)
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          * 전체 수집된 {api.collectedCount}건 중 최근 {api.details.length}건의 검수 항목만 표시 중입니다. (화면 과부하 방지)
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {api.details.map(det => (
                          <div
                            key={det.id}
                            style={{
                              padding: '14px',
                              background: 'rgba(255,255,255,0.01)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.85rem'
                            }}
                          >
                            <div>
                              <strong style={{ color: 'var(--text-primary)' }}>{det.location || det.spotName || det.query}</strong>
                              <span style={{ marginLeft: '12px', color: 'var(--text-secondary)' }}>
                                {det.value || (det.address ? `${det.address} ${det.lat && det.lng ? `(위도: ${det.lat}, 경도: ${det.lng})` : ''}` : det.result)}
                              </span>
                            </div>

                             <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              {/* 현재 상태 뱃지 */}
                              <span style={{
                                fontSize: '0.75rem',
                                color: det.state === '승인됨' ? 'var(--success)' : det.state === '대기중' ? 'var(--warning)' : 'var(--text-secondary)',
                                fontWeight: '700'
                              }}>
                                {det.state}
                              </span>

                              {/* 승인/반려 조작 액션 (전환형 구조로 유연하게 개선) */}
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {det.state !== '승인됨' && (
                                  <button
                                    onClick={() => handleApproveDetail(api.id, det.id, true)}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '0.75rem',
                                      background: 'rgba(0, 184, 148, 0.1)',
                                      color: 'var(--success)',
                                      border: '1px solid rgba(0, 184, 148, 0.2)',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    승인
                                  </button>
                                )}
                                {det.state !== '반려됨' && (
                                  <button
                                    onClick={() => handleApproveDetail(api.id, det.id, false)}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '0.75rem',
                                      background: 'rgba(214, 48, 49, 0.1)',
                                      color: 'var(--danger)',
                                      border: '1px solid rgba(214, 48, 49, 0.2)',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    반려
                                  </button>
                                )}
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>

                      {/* 📄 글래스모피즘 페이지네이션 네비게이션 UI (슬라이딩 윈도우 방식으로 레이아웃 터짐 방지) */}
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
                            marginTop: '20px',
                            paddingTop: '16px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                            flexWrap: 'wrap'
                          }}>
                            {/* 처음으로 */}
                            <button
                              disabled={current === 1}
                              onClick={() => handlePageChange(api.id, 1)}
                              style={{
                                padding: '6px 10px',
                                fontSize: '0.78rem',
                                background: 'rgba(255, 255, 255, 0.03)',
                                color: current === 1 ? 'rgba(255, 255, 255, 0.15)' : 'var(--text-primary)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '8px',
                                cursor: current === 1 ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              처음
                            </button>

                            {/* 이전 */}
                            <button
                              disabled={current === 1}
                              onClick={() => handlePageChange(api.id, current - 1)}
                              style={{
                                padding: '6px 10px',
                                fontSize: '0.78rem',
                                background: 'rgba(255, 255, 255, 0.03)',
                                color: current === 1 ? 'rgba(255, 255, 255, 0.15)' : 'var(--text-primary)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '8px',
                                cursor: current === 1 ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              이전
                            </button>
                            
                            {/* 왼쪽 생략 기호 */}
                            {start > 1 && (
                              <>
                                <button
                                  onClick={() => handlePageChange(api.id, 1)}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.82rem',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  1
                                </button>
                                {start > 2 && <span style={{ color: 'var(--text-secondary)', margin: '0 4px', fontSize: '0.85rem' }}>...</span>}
                              </>
                            )}

                            {/* 현재 페이지 윈도우 루프 */}
                            {Array.from({ length: end - start + 1 }, (_, idx) => {
                              const pNum = start + idx;
                              const isCurrent = pNum === current;
                              return (
                                <button
                                  key={pNum}
                                  onClick={() => handlePageChange(api.id, pNum)}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.82rem',
                                    fontWeight: isCurrent ? 'bold' : 'normal',
                                    background: isCurrent ? 'var(--primary)' : 'rgba(255, 255, 255, 0.03)',
                                    color: isCurrent ? '#FFF' : 'var(--text-secondary)',
                                    border: isCurrent ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: isCurrent ? '0 0 12px rgba(108, 92, 231, 0.4)' : 'none'
                                  }}
                                >
                                  {pNum}
                                </button>
                              );
                            })}

                            {/* 오른쪽 생략 기호 */}
                            {end < total && (
                              <>
                                {end < total - 1 && <span style={{ color: 'var(--text-secondary)', margin: '0 4px', fontSize: '0.85rem' }}>...</span>}
                                <button
                                  onClick={() => handlePageChange(api.id, total)}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.82rem',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {total}
                                </button>
                              </>
                            )}

                            {/* 다음 */}
                            <button
                              disabled={current === total}
                              onClick={() => handlePageChange(api.id, current + 1)}
                              style={{
                                padding: '6px 10px',
                                fontSize: '0.78rem',
                                background: 'rgba(255, 255, 255, 0.03)',
                                color: current === total ? 'rgba(255, 255, 255, 0.15)' : 'var(--text-primary)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '8px',
                                cursor: current === total ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              다음
                            </button>

                            {/* 끝으로 */}
                            <button
                              disabled={current === total}
                              onClick={() => handlePageChange(api.id, total)}
                              style={{
                                padding: '6px 10px',
                                fontSize: '0.78rem',
                                background: 'rgba(255, 255, 255, 0.03)',
                                color: current === total ? 'rgba(255, 255, 255, 0.15)' : 'var(--text-primary)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '8px',
                                cursor: current === total ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              끝
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      </main>

      {/* 🍞 커스텀 토스트 팝업 알림 레이어 */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '14px 24px',
          borderRadius: '16px',
          background: 
            toast.type === 'success' ? 'rgba(0, 184, 148, 0.95)' : 
            toast.type === 'error' ? 'rgba(214, 48, 49, 0.95)' : 'rgba(9, 132, 227, 0.95)',
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
          pointerEvents: 'none',
          animation: 'fadeInUp 0.3s ease'
        }}>
          <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
