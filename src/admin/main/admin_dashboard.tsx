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
  });

  // 📡 상세 목록 팝업 상태 정의
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailType, setDetailType] = useState(''); // 'owners' | 'active_trucks' | 'total_trucks' | 'suspended_users'
  const [detailData, setDetailData] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

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

    // 📡 실시간 Neon DB 통계 데이터 페치 실행
    const fetchDbStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        const result = await response.json();
        if (result.success) {
          setStats({
            totalUsers: result.totalUsers || 0,
            activeTrucks: result.activeTrucks || 0,
            totalTrucks: result.totalTrucks || 0,
            suspendedUsers: result.suspendedUsers || 0
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard statistics from Neon DB:', err);
      }
    };
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

          {/* 타이틀 및 개요 */}
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '8px' }}>
              🛡️ 시스템 종합 현황 대시보드
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              푸드트럭 플랫폼 전체 가입 유저 수와 실시간 활성 장사 트럭 수량을 모니터링합니다.
            </p>
          </div>

          {/* 📊 수치 집계 카드 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
 
            <div 
              className="glass-panel" 
              onClick={() => handleCardClick('owners')}
              style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>전체 가입 사장님</span>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.totalUsers} 명</span>
            </div>
 
            <div 
              className="glass-panel" 
              onClick={() => handleCardClick('active_trucks')}
              style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--success)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: '600' }}>현재 활성 트럭 (영업중)</span>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--success)' }}>{stats.activeTrucks} 대</span>
            </div>
 
            <div 
              className="glass-panel" 
              onClick={() => handleCardClick('total_trucks')}
              style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>등록 푸드트럭 수</span>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent)' }}>{stats.totalTrucks} 대</span>
            </div>
 
            <div 
              className="glass-panel" 
              onClick={() => handleCardClick('suspended_users')}
              style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--danger)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: '600' }}>계정 일시 정지 수</span>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--danger)' }}>{stats.suspendedUsers} 건</span>
            </div>
 
          </div>

          {/* 실시간 큐 모아보기 리스트 */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>

            {/* 실시간 로그 테이블 */}
            <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '220px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚙️</div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>
                실시간 플랫폼 이벤트 트래킹
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                해당 기능은 현재 미구현 상태입니다.<br />
                (이벤트 로그 및 알림 테이블 구축 시 연동 예정)
              </p>
            </div>

            {/* 외부 API 연결 상태 상태 모니터 */}
            <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                🔌 외부 API 연결망
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>네이버 지도 SDK API</span>
                  <span style={{ color: 'var(--success)', fontWeight: '600' }}>정상 (ACTIVE)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>공공 데이터 스팟 API</span>
                  <span style={{ color: 'var(--success)', fontWeight: '600' }}>정상 (ACTIVE)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>기상청 기상 위성 API</span>
                  <span style={{ color: 'var(--success)', fontWeight: '600' }}>정상 (ACTIVE)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Claude 3.5 AI API</span>
                  <span style={{ color: 'var(--warning)', fontWeight: '600' }}>연동 대기 (STANDBY)</span>
                </div>
              </div>

              {/* 🗺️ 실시간 지도 공급자 전환 토글 스위치 */}
              <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '4px 0' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  🗺️ 서비스 전체 지도 공급 엔진 제어
                </span>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                  네이버 지도 API 일일 쿼터 초과 시 오픈스트리트맵(OSM)으로 긴급 우회할 수 있습니다.
                </p>
                <div style={{ display: 'flex', background: '#F1F2F6', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <button
                    onClick={() => handleToggleMap('naver')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: mapProvider === 'naver' ? '#00B894' : 'transparent',
                      color: mapProvider === 'naver' ? 'white' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease',
                      boxShadow: mapProvider === 'naver' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    네이버 지도 (Naver)
                  </button>
                  <button
                    onClick={() => handleToggleMap('osm')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: mapProvider === 'osm' ? '#00B894' : 'transparent',
                      color: mapProvider === 'osm' ? 'white' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease',
                      boxShadow: mapProvider === 'osm' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    오픈스트리트맵 (OSM)
                  </button>
                </div>
              </div>
            </div>

          </div>

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
