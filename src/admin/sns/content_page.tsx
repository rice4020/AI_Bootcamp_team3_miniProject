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

  // 데이터 리스트 State
  const [events, setEvents] = useState([]);
  const [weatherList, setWeatherList] = useState([]);

  // 검색 State
  const [searchQuery, setSearchQuery] = useState('');

  // 행사 편집/수정용 선택 State
  const [selectedEvent, setSelectedEvent] = useState(null);

  // 기상 기준 위치 State
  const [weatherRegion, setWeatherRegion] = useState('수도권 권역');

  // 행사 등록 폼 State
  const [eventName, setEventName] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventScale, setEventScale] = useState('');
  const [eventLocation, setEventLocation] = useState('');

  // 1. 데이터 조회 함수 (Neon DB 연동 API 호출, 검색 및 좌표기반 기상동기화 지원)
  const fetchContentData = async (query = '', lat = '', lng = '', region = '') => {
    try {
      let url = '/api/admin/content';
      const params = new URLSearchParams();
      
      if (query.trim()) params.append('q', query.trim());
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
        setWeatherList(result.weather || []);
        if (result.weather && result.weather.length > 0) {
          setWeatherRegion(result.weather[0].region);
        } else if (region) {
          setWeatherRegion(region);
        }
      } else {
        console.error('API Error:', result.error);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
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
    setLoading(true);
    await fetchContentData('', ev.latitude, ev.longitude, ev.name);
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
          description: isEdit ? selectedEvent.description : ''
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(isEdit ? "📝 행사 정보가 성공적으로 수정되었습니다." : "🎪 새로운 문화 행사가 성공적으로 등록되었습니다.");
        // 폼 초기화 및 수정 모드 클리어
        handleCancelEdit();
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
  };

  // 행사 수정 취소 핸들러
  const handleCancelEdit = () => {
    setSelectedEvent(null);
    setEventName('');
    setEventStartDate('');
    setEventEndDate('');
    setEventScale('');
    setEventLocation('');
  };

  // 4. 행사 삭제 요청 (DELETE)
  const handleDeleteEvent = async (id) => {
    if (!confirm("정말 이 행사를 시스템에서 제거하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/admin/content?id=${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        alert("🗑️ 행사가 정상 삭제되었습니다.");
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
        <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '8px' }}>
              🎪 행사/이벤트 관리
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              푸드트럭 지도에 노출될 문화 축제 스팟 및 날씨 상태 테이블을 관리자가 실시간 CRUD 제어합니다. (Neon DB 연동)
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', alignItems: 'start' }}>
            
            {/* 📋 좌측: 문화 행사 정보 관리 */}
            <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                🎡 문화 행사 정보 목록
              </h3>

              {/* 신규 등록 및 수정 폼 */}
              <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '24px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: selectedEvent ? 'var(--secondary)' : 'var(--primary)' }}>
                  {selectedEvent ? '✏️ 행사 정보 수정' : '+ 신규 행사 수동 등록'}
                </span>
                
                <Input
                  id="event-name-input"
                  label="행사명"
                  placeholder="예: 여의도 밤도깨비 야시장"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Input
                    id="event-start-date"
                    label="시작일"
                    type="date"
                    value={eventStartDate}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    required
                  />
                  <Input
                    id="event-end-date"
                    label="종료일"
                    type="date"
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
                  <Input
                    id="event-scale-input"
                    label="인파 규모"
                    placeholder="예: 대규모 (3만명)"
                    value={eventScale}
                    onChange={(e) => setEventScale(e.target.value)}
                  />
                  <Input
                    id="event-location-input"
                    label="구체적 행사 지역"
                    placeholder="예: 여의도 한강공원"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <Button type="submit" variant="primary" style={{ flex: 1 }}>
                    {selectedEvent ? '수정 완료' : '등록'}
                  </Button>
                  {selectedEvent && (
                    <Button type="button" variant="secondary" onClick={handleCancelEdit} style={{ flex: 1 }}>
                      취소
                    </Button>
                  )}
                </div>
              </form>

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                          borderRadius: '10px', 
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                          e.currentTarget.style.borderColor = 'var(--primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                        title="클릭 시 이 행사의 기상 상황을 실시간 동기화합니다"
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{ev.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            📍 장소: {ev.location} | 📅 기간: {ev.startDate} ~ {ev.endDate} ({ev.scale})
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button 
                            variant="secondary" 
                            onClick={(e) => { e.stopPropagation(); handleStartEdit(ev); }}
                            style={{ padding: '6px 12px', fontSize: '0.75rem', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '6px' }}
                          >
                            수정
                          </Button>
                          <Button 
                            variant="secondary" 
                            onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id); }}
                            style={{ padding: '6px 12px', fontSize: '0.75rem', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '6px' }}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
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

              {loading ? (
                <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>날씨 데이터를 연동하고 있습니다...</p>
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

        </div>
      </main>
    </div>
  );
}
