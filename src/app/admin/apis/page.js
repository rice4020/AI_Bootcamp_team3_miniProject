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
  
  // 확장(토글)된 API 상태 관리
  const [expandedApiId, setExpandedApiId] = useState(null);

  useEffect(() => {
    const adminSession = localStorage.getItem('roadfood_admin_session');
    if (!adminSession) {
      alert("관리자 권한이 필요한 서비스입니다.");
      router.push('/admin');
      return;
    }
    setIsAdmin(true);
    setApiList(MOCK_APIS);
  }, []);

  // 토글 열기/닫기
  const handleToggleExpand = (id) => {
    if (expandedApiId === id) {
      setExpandedApiId(null);
    } else {
      setExpandedApiId(id);
    }
  };

  // 모의 승인 / 반려 기능
  const handleApproveDetail = (apiId, detailId, approve = true) => {
    alert(`해당 수집 항목이 ${approve ? '승인' : '반려'} 처리되어 소비자 지도 데이터베이스에 실시간 반영 조치되었습니다.`);
    
    const updated = apiList.map(api => {
      if (api.id === apiId) {
        const updatedDetails = api.details.map(det => {
          if (det.id === detailId) {
            return { ...det, state: approve ? '승인됨' : '반려됨' };
          }
          return det;
        });
        return { ...api, details: updatedDetails };
      }
      return api;
    });

    setApiList(updated);
  };

  // 모의 동기화 갱신 작동
  const handleSyncApi = (apiName) => {
    alert(`🔄 [${apiName}] 공공 API 커넥션 연결 확인 후, 최신 데이터 테이블의 강제 갱신(Sync)을 성공적으로 마쳤습니다.`);
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
                        onClick={() => handleSyncApi(api.name)}
                        style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                      >
                        🔄 강제 동기화
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
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent)', display: 'block', marginBottom: '14px' }}>
                        📡 수집 데이터 실시간 검수 목록 (승인 및 조정 대상)
                      </span>

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
                                {det.value || det.address || det.result}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              {/* 현재 상태 뱃지 */}
                              <span style={{
                                fontSize: '0.75rem',
                                color: det.state === '승인됨' ? 'var(--success)' : det.state === '대기중' ? 'var(--warning)' : 'var(--text-secondary)'
                              }}>
                                {det.state}
                              </span>

                              {/* 승인/반려 조작 액션 (대기 중 상태일 때 노출) */}
                              {det.state === '대기중' && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    onClick={() => handleApproveDetail(api.id, det.id, true)}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '0.75rem',
                                      background: 'rgba(0, 184, 148, 0.1)',
                                      color: 'var(--success)',
                                      border: '1px solid rgba(0, 184, 148, 0.2)',
                                      borderRadius: '6px'
                                    }}
                                  >
                                    승인
                                  </button>
                                  <button
                                    onClick={() => handleApproveDetail(api.id, det.id, false)}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '0.75rem',
                                      background: 'rgba(214, 48, 49, 0.1)',
                                      color: 'var(--danger)',
                                      border: '1px solid rgba(214, 48, 49, 0.2)',
                                      borderRadius: '6px'
                                    }}
                                  >
                                    반려
                                  </button>
                                </div>
                              )}
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      </main>
    </div>
  );
}
