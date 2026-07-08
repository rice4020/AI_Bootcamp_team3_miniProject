"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Button from '../../../components/Button';

export default function AdminDashboardPage() {
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, pending: 0, weather: "맑음, 24.5°C", naverTotal: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  // 토스트 알림 헬퍼 함수
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'info' });
    }, 3000);
  };

  // 실시간 대시보드 통계 로드
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/apis?type=dashboard');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.stats) {
          setStats(json.stats);
        } else {
          showToast("통계 데이터를 파싱하지 못했습니다.", "error");
        }
      } else {
        showToast("서버로부터 데이터를 가져오지 못했습니다.", "error");
      }
    } catch (err) {
      console.error("대시보드 통계 로드 실패:", err);
      showToast("대시보드 데이터를 불러오는 중 에러가 발생했습니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const adminSession = localStorage.getItem('roadfood_admin_session');
    if (!adminSession) {
      router.push('/admin');
      return;
    }
    setIsAdmin(true);
    fetchDashboardStats();
  }, []);

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

  // 네이버 API 소모율 백분율 계산 (일일 제한 10,000건 기준)
  const naverLimit = 10000;
  const naverUsagePercent = parseFloat((((stats.naverTotal || 0) / naverLimit) * 100).toFixed(1));
  const isNaverWarning = naverUsagePercent >= 80;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>
      {/* 🧭 관리자 상단 네비게이션 바 */}
      <Navbar userType="admin" />

      <main style={{ flex: 1, padding: '40px 24px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          {/* 👋 인사말 및 헤더 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '850', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                📊 종합 모니터링 대시보드
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                푸드트럭 구역 수집 현황 및 외부 연동 API 트래픽 통계를 실시간으로 파악합니다.
              </p>
            </div>
            <Button variant="secondary" onClick={fetchDashboardStats} disabled={loading} style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
              {loading ? '🔄 갱신 중...' : '🔄 실시간 상태 동적 갱신'}
            </Button>
          </div>



          {/* 🔌 3대 외부 연동 API 현황 (사용자 손그림 스케치 완벽 반영) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', borderLeft: '4px solid #0984e3', paddingLeft: '10px' }}>
              🔌 연동 API 요약 현황
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px'
            }}>
              {/* 1. 기상청 동네정보 API */}
              <div className="glass-panel clickable-card" onClick={() => router.push('/admin/apis?focus=api-1')} style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px', gap: '12px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>기상청 동네예보 API</span>
                  <span style={{ fontSize: '0.72rem', color: '#0984e3', background: 'rgba(9, 132, 227, 0.1)', border: '1px solid rgba(9, 132, 227, 0.25)', padding: '2px 8px', borderRadius: '20px', fontWeight: '800', whiteSpace: 'nowrap' }}>1일 기준</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* 수집건수 */}
                  <div style={{ padding: '20px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>수집건수</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0984e3' }}>
                      {stats.weatherTotal || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>건</span>
                    </div>
                  </div>
                  {/* 상태정보 */}
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
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
              <div className="glass-panel clickable-card" onClick={() => router.push('/admin/apis?focus=api-2')} style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px', gap: '12px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>전국 푸드트럭 허가구역 점용공간 API</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--primary)', background: 'rgba(108, 92, 231, 0.1)', border: '1px solid rgba(108, 92, 231, 0.25)', padding: '2px 8px', borderRadius: '20px', fontWeight: '800', whiteSpace: 'nowrap' }}>1일 기준</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* 수집건수 */}
                  <div style={{ padding: '20px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>수집건수</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary)' }}>
                      {stats.total || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>건</span>
                    </div>
                  </div>
                  {/* 상태정보 */}
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
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
              <div className="glass-panel clickable-card" onClick={() => router.push('/admin/apis?focus=api-3')} style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px', gap: '12px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>네이버 지도 플랫폼 Geocoding API</span>
                  <span style={{ fontSize: '0.72rem', color: '#6c5ce7', background: 'rgba(108, 92, 231, 0.1)', border: '1px solid rgba(108, 92, 231, 0.25)', padding: '2px 8px', borderRadius: '20px', fontWeight: '800', whiteSpace: 'nowrap' }}>실시간 기준</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* 수집건수 */}
                  <div style={{ padding: '20px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>수집건수</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#6c5ce7' }}>
                      {stats.naverTotal || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>건</span>
                    </div>
                  </div>
                  {/* 상태정보 */}
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
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
              <div className="glass-panel clickable-card" onClick={() => router.push('/admin/apis?focus=api-4')} style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px', gap: '12px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>소상공인 상권분석 API</span>
                  <span style={{ fontSize: '0.72rem', color: '#eab543', background: 'rgba(234, 181, 67, 0.1)', border: '1px solid rgba(234, 181, 67, 0.25)', padding: '2px 8px', borderRadius: '20px', fontWeight: '800', whiteSpace: 'nowrap' }}>근처시</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* 수집건수 */}
                  <div style={{ padding: '20px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>수집건수</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fdcb6e' }}>
                      {stats.commercialTotal || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>건</span>
                    </div>
                  </div>
                  {/* 상태정보 */}
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
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
              <div className="glass-panel clickable-card" onClick={() => router.push('/admin/apis?focus=api-5')} style={{ padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px', gap: '12px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>행사문화 포털 API</span>
                  <span style={{ fontSize: '0.72rem', color: '#e84393', background: 'rgba(232, 67, 147, 0.1)', border: '1px solid rgba(232, 67, 147, 0.25)', padding: '2px 8px', borderRadius: '20px', fontWeight: '800', whiteSpace: 'nowrap' }}>근처시 + 실시간</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* 수집건수 */}
                  <div style={{ padding: '20px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>수집건수</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#e84393' }}>
                      {stats.culturalTotal || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>건</span>
                    </div>
                  </div>
                  {/* 상태정보 */}
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
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



        </div>
      </main>

      {/* 🍞 토스트 메시지 알림 레이어 */}
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

      {/* 💫 신규 검수 대기 깜빡임 및 카드 호버 스타일 블록 */}
      <style jsx global>{`
        @keyframes pulseGlow {
          0% {
            box-shadow: 0 0 8px rgba(241, 196, 15, 0.2);
            border-color: rgba(241, 196, 15, 0.3);
          }
          100% {
            box-shadow: 0 0 20px rgba(241, 196, 15, 0.45);
            border-color: rgba(241, 196, 15, 0.7);
          }
        }
        .clickable-card {
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .clickable-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2) !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
        }
      `}</style>
    </div>
  );
}
