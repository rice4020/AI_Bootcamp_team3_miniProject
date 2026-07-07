// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';

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

    // 로컬스토리지에서 실제 가입 및 활성 상태 집계
    interface UserItem {
      isSuspended?: boolean;
      [key: string]: any;
    }
    interface TruckItem {
      status?: string;
      [key: string]: any;
    }
    const users: UserItem[] = JSON.parse(localStorage.getItem('roadfood_users') || "[]");
    const trucks: TruckItem[] = JSON.parse(localStorage.getItem('roadfood_trucks') || "[]");

    const active = trucks.filter(t => t.status === 'active').length;

    // 모의 suspended(정지) 계정 데이터 집계 (임시)
    const suspended = users.filter(u => u.isSuspended).length;

    setStats({
      totalUsers: users.length,
      activeTrucks: active,
      totalTrucks: trucks.length,
      suspendedUsers: suspended
    });
  }, [router]);

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

            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>전체 가입 사장님</span>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.totalUsers} 명</span>
            </div>

            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--success)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: '600' }}>현재 활성 트럭 (영업중)</span>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--success)' }}>{stats.activeTrucks} 대</span>
            </div>

            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>등록 푸드트럭 수</span>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent)' }}>{stats.totalTrucks} 대</span>
            </div>

            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--danger)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: '600' }}>계정 일시 정지 수</span>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--danger)' }}>{stats.suspendedUsers} 건</span>
            </div>

          </div>

          {/* 실시간 큐 모아보기 리스트 */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>

            {/* 실시간 로그 테이블 */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '20px' }}>
                📡 실시간 플랫폼 이벤트 트래킹
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>📢 [영업개시] [한강 꿀닭꼬치]가 <strong>서울시청 광장</strong>에서 영업을 시작했습니다.</span>
                  <span style={{ color: 'var(--text-muted)' }}>방금 전</span>
                </div>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>📢 [가입] 새로운 사장님 계정 <code style={{ color: 'var(--primary)' }}>owner_taco</code>가 가입을 완료했습니다.</span>
                  <span style={{ color: 'var(--text-muted)' }}>10분 전</span>
                </div>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>📢 [재고소진] [마포 분식 대장]이 잔여 재고를 0으로 설정했습니다. (마커 🔴 변경)</span>
                  <span style={{ color: 'var(--text-muted)' }}>1시간 전</span>
                </div>
              </div>
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
    </div>
  );
}
