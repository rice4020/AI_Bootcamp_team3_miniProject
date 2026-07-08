// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function AdminContentPage() {
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('event'); // 'event' or 'sns'

  // 데이터 리스트 State
  const [events, setEvents] = useState([]);
  const [weatherList, setWeatherList] = useState([]);

  // 검색 State
  const [searchQuery, setSearchQuery] = useState('');

  // 행사 편집/수정용 선택 State
  const [selectedEvent, setSelectedEvent] = useState(null);

  // 모달 활성화 State (등록/수정 팝업)
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 기상 기준 위치 State (초기 빈 문자열 설정으로 미선택 감지)
  const [weatherRegion, setWeatherRegion] = useState('');

  // 행사 등록 폼 State
  const [eventName, setEventName] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventScale, setEventScale] = useState('');
  const [eventLocation, setEventLocation] = useState('');

  // 1. 데이터 조회 함수 (Neon DB 연동 API 호출, 검색 및 좌표기반 기상동기화 지원)
  const fetchContentData = async (query = '', lat = '', lng = '', region = '', isWeatherOnly = false, tabParam = activeTab) => {
    if (isWeatherOnly) {
      setWeatherLoading(true);
    } else {
      setLoading(true);
    }
    try {
      let url = '/api/admin/content';
      const params = new URLSearchParams();
      
      if (query.trim()) params.append('q', query.trim());
      params.append('tab', tabParam);
      if (lat && lng && region) {
        params.append('lat', lat.toString());
        params.append('lng', lng.toString());
        params.append('region', region);
      }
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setEvents(result.events || []);
        // lat, lng, region이 명시적으로 전달된 경우(카드 클릭)에만 날씨 데이터 상태 업데이트
        if (lat && lng && region) {
          setWeatherList(result.weather || []);
          if (result.weather && result.weather.length > 0) {
            setWeatherRegion(result.weather[0].region);
          } else {
            setWeatherRegion(region);
          }
        }
      } else {
        console.error('API Error:', result.error);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
      setWeatherLoading(false);
    }
  };

  // 특정 행사 카드 클릭 시 실시간 날씨 위치 동적 갱신 핸들러 (위경도 없을 시 존재하지 않음 분기)
  const handleEventCardClick = async (ev) => {
    if (!ev.latitude || !ev.longitude) {
      // 위경도 좌표가 없는 경우 API 호출 차단 및 안내 상태로 갱신
      setWeatherList([]);
      setWeatherRegion(`${ev.name} (좌표 미등록)`);
      return;
    }
    await fetchContentData('', ev.latitude, ev.longitude, ev.name, true);
  };

  // 검색 실행 핸들러
  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    fetchContentData(searchQuery);
  };

  // 검색 초기화 핸들러
  const handleClearSearch = () => {
    setSearchQuery('');
    setLoading(true);
    fetchContentData('');
  };

  // 2. 세션 검증 및 최초 로드
  useEffect(() => {
    const adminSession = localStorage.getItem('roadfood_admin_session');
    if (!adminSession) {
      alert("관리자 권한이 필요합니다.");
      router.push('/admin');
      return;
    }
    setIsAdmin(true);
    fetchContentData();
  }, [router]);

  // 3. 행사 등록 또는 수정 요청 (POST / PUT)
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventName.trim() || !eventLocation.trim() || !eventStartDate || !eventEndDate) {
      alert("필수 입력값을 모두 작성해 주세요.");
      return;
    }

    try {
      const isEdit = !!selectedEvent;
      const url = '/api/admin/content';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: isEdit ? selectedEvent.id : undefined,
          title: eventName,
          location: eventLocation,
          startDate: eventStartDate,
          endDate: eventEndDate,
          scale: eventScale || '미지정',
          description: isEdit ? selectedEvent.description : '',
          tab: activeTab
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(isEdit ? "📝 정보가 성공적으로 수정되었습니다." : "🎪 성공적으로 등록되었습니다.");
        // 폼 초기화 및 수정 모드 클리어
        handleCancelEdit();
        setIsModalOpen(false);
        // 목록 갱신
        fetchContentData();
      } else {
        alert(`❌ 처리 실패: ${result.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('서버 통신 실패');
    }
  };

  // 행사 수정 모드 진입 핸들러
  const handleStartEdit = (ev) => {
    setSelectedEvent(ev);
    setEventName(ev.name);
    setEventStartDate(ev.startDate);
    setEventEndDate(ev.endDate);
    setEventScale(ev.scale);
    setEventLocation(ev.location);
    setIsModalOpen(true);
  };

  // 행사 수정 취소 핸들러
  const handleCancelEdit = () => {
    setSelectedEvent(null);
    setEventName('');
    setEventStartDate('');
    setEventEndDate('');
    setEventScale('');
    setEventLocation('');
    setIsModalOpen(false);
  };

  // 4. 행사 삭제 요청 (DELETE)
  const handleDeleteEvent = async (id) => {
    if (!confirm("정말 이 데이터를 시스템에서 제거하시겠습니까?")) return;
 
    try {
      const response = await fetch(`/api/admin/content?id=${id}&tab=${activeTab}`, {
        method: 'DELETE'
      });
      const result = await response.json();
 
      if (result.success) {
        alert("🗑️ 정상 삭제되었습니다.");
        fetchContentData();
      } else {
        alert(`❌ 삭제 실패: ${result.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('서버 통신 실패');
    }
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
      <Navbar userType="admin" />

      <main style={{ flex: 1, padding: '40px 24px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1250px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '8px' }}>
              🎪 통합 행사 및 실시간 기상 상태 관리
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              푸드트럭 지도에 노출될 문화 축제 스팟 및 날씨 상태 테이블을 관리자가 실시간 CRUD 제어합니다. (Neon DB 연동)
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', alignItems: 'start' }}>
            
            {/* 📋 좌측: 문화 행사 정보 관리 */}
            <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* 🔄 [토글 탭 스위치] 문화행사 DB ↔ SNS 블로그 추출 DB */}
              <div style={{ display: 'flex', gap: '8px', background: 'var(--surface-light)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '8px' }}>
                <button 
                  type="button"
                  onClick={() => { setActiveTab('event'); fetchContentData(searchQuery, '', '', '', false, 'event'); }}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    borderRadius: '8px',
                    background: activeTab === 'event' ? 'var(--primary)' : 'transparent',
                    color: activeTab === 'event' ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🎡 문화 행사 DB
                </button>
                <button 
                  type="button"
                  onClick={() => { setActiveTab('sns'); fetchContentData(searchQuery, '', '', '', false, 'sns'); }}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    borderRadius: '8px',
                    background: activeTab === 'sns' ? 'var(--primary)' : 'transparent',
                    color: activeTab === 'sns' ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  📱 SNS 블로그 추출 DB
                </button>
              </div>
 
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                  {activeTab === 'sns' ? '📱 SNS 블로그 추출 목록' : '🎡 문화 행사 정보 목록'}
                </h3>
                <Button 
                  type="button" 
                  variant="primary" 
                  onClick={() => { handleCancelEdit(); setIsModalOpen(true); }}
                  style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                >
                  {activeTab === 'sns' ? '+ 신규 데이터 등록' : '+ 신규 행사 등록'}
                </Button>
              </div>

              {/* 🔍 행사 검색바 */}
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <Input
                    id="event-search-input"
                    label="🔍 행사 검색"
                    placeholder="행사명 또는 장소를 입력하세요"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="primary" style={{ padding: '10px 18px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  검색
                </Button>
                {searchQuery && (
                  <Button type="button" variant="secondary" onClick={handleClearSearch} style={{ padding: '10px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    초기화
                  </Button>
                )}
              </form>

              {/* 검색 결과 카운트 */}
              {!loading && searchQuery && (
                <p style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '600' }}>
                  &quot;{searchQuery}&quot; 검색 결과: {events.length}건
                </p>
              )}

              {/* 리스트 출력 */}
              {loading ? (
                <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>행사 데이터를 조회하고 있습니다...</p>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px', 
                  maxHeight: '520px', 
                  overflowY: 'auto',
                  paddingRight: '6px',
                  scrollbarWidth: 'thin'
                }}>
                  {events.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>등록된 축제가 없습니다.</p>
                  ) : (
                    events.map(ev => (
                      <div 
                        key={ev.id} 
                        onClick={() => handleEventCardClick(ev)}
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '16px', 
                          background: 'var(--surface-light)', 
                          borderRadius: '12px', 
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                          e.currentTarget.style.borderColor = 'var(--primary)';
                          e.currentTarget.style.background = 'var(--background)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.background = 'var(--surface-light)';
                        }}
                        title="클릭 시 이 행사의 기상 상황을 실시간 동기화합니다"
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, paddingRight: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{ev.name}</span>
                            {ev.scale && (
                              <span style={{ 
                                fontSize: '0.7rem', 
                                padding: '2px 6px', 
                                background: 'rgba(255, 90, 95, 0.1)', 
                                color: 'var(--primary)', 
                                borderRadius: '4px',
                                fontWeight: '600'
                              }}>
                                {ev.scale}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            📍 <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{ev.location}</span>
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            📅 {ev.startDate} ~ {ev.endDate}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          <Button 
                            variant="secondary" 
                            onClick={(e) => { e.stopPropagation(); handleStartEdit(ev); }}
                            style={{ 
                              padding: '6px 12px', 
                              fontSize: '0.75rem', 
                              border: '1px solid var(--border)', 
                              color: 'var(--text-secondary)', 
                              borderRadius: '6px',
                              background: 'var(--surface)',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'var(--primary)';
                              e.currentTarget.style.color = 'var(--primary)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'var(--border)';
                              e.currentTarget.style.color = 'var(--text-secondary)';
                            }}
                          >
                            수정
                          </Button>
                          <Button 
                            variant="secondary" 
                            onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id); }}
                            style={{ 
                              padding: '6px 12px', 
                              fontSize: '0.75rem', 
                              border: '1px solid var(--border)', 
                              color: 'var(--text-secondary)', 
                              borderRadius: '6px',
                              background: 'var(--surface)',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'var(--danger)';
                              e.currentTarget.style.color = 'var(--danger)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'var(--border)';
                              e.currentTarget.style.color = 'var(--text-secondary)';
                            }}
                          >
                            삭제
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* ☔ 우측: 실시간 연동 날씨 현황 */}
            <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                  ☔ 실시간 연동 날씨 현황
                </h3>
                {!loading && weatherRegion && (
                  <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '4px 8px', 
                    background: 'var(--surface-light)', 
                    borderRadius: '6px', 
                    border: '1px solid var(--border)', 
                    color: weatherRegion.includes('미등록') || weatherRegion.includes('존재하지 않음') ? 'var(--secondary)' : 'var(--primary)', 
                    fontWeight: '600' 
                  }}>
                    📍 {weatherRegion} 기준
                  </span>
                )}
              </div>

              {!weatherRegion ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '60px 20px', 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px dashed var(--border)', 
                  borderRadius: '12px', 
                  gap: '16px' 
                }}>
                  <span style={{ fontSize: '3rem' }}>🎪🌦️</span>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.5', fontWeight: '500' }}>
                    행사 목록에서 보고 싶은 행사를 선택하시면<br />
                    해당 장소의 실시간 날씨 현황이 표시됩니다.
                  </p>
                </div>
              ) : weatherLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '16px' }}>
                  <div className="spinner" style={{
                    width: '36px',
                    height: '36px',
                    border: '3px solid rgba(255, 90, 95, 0.1)',
                    borderTop: '3px solid var(--primary)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    실시간 기상 예보를 연동하고 있습니다...
                  </p>
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              ) : weatherRegion.includes('미등록') || weatherRegion.includes('존재하지 않음') ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '40px 20px', 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '8px', 
                  gap: '12px' 
                }}>
                  <span style={{ fontSize: '2.5rem' }}>📍🚫</span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.4' }}>
                    이 행사는 상세 위경도 좌표가 등록되어 있지 않아<br />
                    실시간 날씨를 연동할 수 없습니다.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {weatherList.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>캐시된 예보가 없습니다. 행사 등록 시 기상청 실시간 동기화가 자동 처리됩니다.</p>
                  ) : (
                    weatherList.map(w => (
                      <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{w.date}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            기온: {w.temp} | 강수확률: {w.rainProb}
                          </span>
                        </div>
                        <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--primary)' }}>
                          {w.condition}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div style={{ marginTop: '10px', background: 'var(--surface-light)', padding: '14px', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', border: '1px solid var(--border)' }}>
                ℹ️ <strong>기상 데이터 자동 갱신 주기</strong><br />
                기상청 동네예보 API로부터 3시간 단위로 자동 수집됩니다. 데이터 임시 조정을 원할 시, API 연동 관리 탭을 확인해 주세요.
              </div>
            </div>

          </div>

          {/* 🎪 등록 및 수정 팝업 모달 */}
          {isModalOpen && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(4px)'
            }}>
              <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '550px',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                background: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                    {selectedEvent ? `✏️ ${activeTab === 'sns' ? 'SNS 추출 데이터' : '행사 정보'} 수정` : (activeTab === 'sns' ? '📱 신규 블로그 데이터 수동 등록' : '🎪 신규 행사 수동 등록')}
                  </h3>
                  <button 
                    onClick={handleCancelEdit} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      fontSize: '1.25rem', 
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      transition: 'color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <Input
                    id="event-name-input"
                    label="행사명 *"
                    placeholder="예: 여의도 밤도깨비 야시장"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    required
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <Input
                      id="event-start-date"
                      label="시작일 *"
                      type="date"
                      value={eventStartDate}
                      onChange={(e) => setEventStartDate(e.target.value)}
                      required
                    />
                    <Input
                      id="event-end-date"
                      label="종료일 *"
                      type="date"
                      value={eventEndDate}
                      onChange={(e) => setEventEndDate(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px' }}>
                    <Input
                      id="event-scale-input"
                      label="인파 규모"
                      placeholder="예: 대규모 (3만명)"
                      value={eventScale}
                      onChange={(e) => setEventScale(e.target.value)}
                    />
                    <Input
                      id="event-location-input"
                      label="구체적 행사 지역 *"
                      placeholder="예: 여의도 한강공원"
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    <Button type="submit" variant="primary" style={{ flex: 1 }}>
                      {selectedEvent ? '수정 완료' : '등록 완료'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={handleCancelEdit} style={{ flex: 1 }}>
                      취소
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
