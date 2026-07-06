"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Button from '../../../components/Button';
import Input from '../../../components/Input';

// 모의 축제/행사 기본 DB 데이터
const INITIAL_EVENTS = [
  { id: 1, name: "여의도 밤도깨비 야시장", period: "7.1 ~ 7.15", scale: "일평균 15,000명", location: "여의도 한강공원" },
  { id: 2, name: "홍대 버스킹 페스티벌", period: "7.4 ~ 7.6", scale: "일평균 8,000명", location: "홍대 걷고싶은거리" },
  { id: 3, name: "부산 바다 축제", period: "8.1 ~ 8.5", scale: "일평균 30,000명", location: "해운대 해수욕장" }
];

// 모의 날씨 예보 데이터
const INITIAL_WEATHER = [
  { id: 'w-1', date: "오늘 (현재)", condition: "맑음 ☀️", temp: "28°C", rainProb: "10%" },
  { id: 'w-2', date: "내일 (금)", condition: "흐림 ☁️", temp: "26°C", rainProb: "30%" },
  { id: 'w-3', date: "모레 (토)", condition: "비 ☔", temp: "24°C", rainProb: "80%" }
];

export default function AdminContentPage() {
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);

  // 데이터 리스트
  const [events, setEvents] = useState([]);
  const [weatherList, setWeatherList] = useState([]);

  // 행사 폼 선언 (Create/Update 겸용)
  const [selectedEvent, setSelectedEvent] = useState(null); // 수정 모드 시 선택된 객체
  const [eventName, setEventName] = useState('');
  const [eventPeriod, setEventPeriod] = useState('');
  const [eventScale, setEventScale] = useState('');
  const [eventLocation, setEventLocation] = useState('');

  // 1. 세션 체크 및 초기화
  useEffect(() => {
    const adminSession = localStorage.getItem('roadfood_admin_session');
    if (!adminSession) {
      alert("관리자 권한이 필요합니다.");
      router.push('/admin');
      return;
    }
    setIsAdmin(true);

    // 데이터 복원 혹은 초기화
    const localEvents = localStorage.getItem('roadfood_admin_events');
    const localWeather = localStorage.getItem('roadfood_admin_weather');

    if (localEvents) {
      setEvents(JSON.parse(localEvents));
    } else {
      setEvents(INITIAL_EVENTS);
      localStorage.setItem('roadfood_admin_events', JSON.stringify(INITIAL_EVENTS));
    }

    if (localWeather) {
      setWeatherList(JSON.parse(localWeather));
    } else {
      setWeatherList(INITIAL_WEATHER);
      localStorage.setItem('roadfood_admin_weather', JSON.stringify(INITIAL_WEATHER));
    }
  }, []);

  // 2. 행사 추가 또는 수정 (C/U)
  const handleSaveEvent = (e) => {
    e.preventDefault();
    if (!eventName.trim() || !eventLocation.trim()) {
      alert("행사 이름과 장소는 필수 기입입니다.");
      return;
    }

    let updatedEvents = [];

    if (selectedEvent) {
      // 수정 모드 (Update)
      updatedEvents = events.map(ev => {
        if (ev.id === selectedEvent.id) {
          return {
            ...ev,
            name: eventName,
            period: eventPeriod,
            scale: eventScale,
            location: eventLocation
          };
        }
        return ev;
      });
      alert("📝 행사 정보가 업데이트되었습니다.");
    } else {
      // 신규 등록 모드 (Create)
      const newId = events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 : 1;
      const newEvent = {
        id: newId,
        name: eventName,
        period: eventPeriod,
        scale: eventScale,
        location: eventLocation
      };
      updatedEvents = [...events, newEvent];
      alert("✨ 신규 행사가 활성화되었습니다.");
    }

    setEvents(updatedEvents);
    localStorage.setItem('roadfood_admin_events', JSON.stringify(updatedEvents));
    
    // 폼 클리어
    handleClearEventForm();
  };

  // 3. 행사 삭제 (Delete)
  const handleDeleteEvent = (id, e) => {
    e.stopPropagation(); // 목록 클릭 이벤트 전파 방지
    if (!confirm("정말 이 행사를 플랫폼 목록에서 완전 삭제하시겠습니까?")) return;

    const updated = events.filter(ev => ev.id !== id);
    setEvents(updated);
    localStorage.setItem('roadfood_admin_events', JSON.stringify(updated));
    
    if (selectedEvent && selectedEvent.id === id) {
      handleClearEventForm();
    }
    alert("🗑️ 행사가 정상 삭제되었습니다.");
  };

  // 상세 폼에 바인딩
  const handleSelectEvent = (ev) => {
    setSelectedEvent(ev);
    setEventName(ev.name);
    setEventPeriod(ev.period);
    setEventScale(ev.scale);
    setEventLocation(ev.location);
  };

  const handleClearEventForm = () => {
    setSelectedEvent(null);
    setEventName('');
    setEventPeriod('');
    setEventScale('');
    setEventLocation('');
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
              🎪 통합 행사 및 실시간 기상 상태 관리
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              푸드트럭 지도에 노출될 문화 축제 스팟 및 날씨 상태 테이블을 관리자가 실시간 CRUD 제어합니다.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
            
            {/* 1. 좌측 영역: 행사 관리 CRUD */}
            <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                  🎡 문화 행사 정보 목록
                </h3>
              </div>

              {/* 행사 추가/수정용 폼 */}
              <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.01)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary)' }}>
                  {selectedEvent ? '✍️ 행사 세부 정보 수정' : '+ 신규 행사 수동 등록'}
                </span>
                
                <Input
                  id="ev-form-name"
                  placeholder="행사명 (예: 여의도 밤도깨비 야시장)"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required
                />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Input
                    id="ev-form-period"
                    placeholder="기간 (예: 7.1~7.15)"
                    value={eventPeriod}
                    onChange={(e) => setEventPeriod(e.target.value)}
                  />
                  <Input
                    id="ev-form-scale"
                    placeholder="규모 (예: 1만명)"
                    value={eventScale}
                    onChange={(e) => setEventScale(e.target.value)}
                  />
                </div>

                <Input
                  id="ev-form-loc"
                  placeholder="구체적 행사 지역 (예: 여의도 한강공원)"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  required
                />

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <Button type="submit" variant="primary" style={{ flex: 2, padding: '10px', fontSize: '0.85rem' }}>
                    {selectedEvent ? '변경사항 저장' : '등록'}
                  </Button>
                  {selectedEvent && (
                    <Button type="button" variant="secondary" onClick={handleClearEventForm} style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}>
                      취소
                    </Button>
                  )}
                </div>
              </form>

              {/* 등록된 리스트 표출 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                {events.map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => handleSelectEvent(ev)}
                    className="glass-panel-hover"
                    style={{
                      padding: '16px',
                      background: selectedEvent?.id === ev.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                      border: selectedEvent?.id === ev.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>{ev.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        장소: {ev.location} | 기간: {ev.period}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteEvent(ev.id, e)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        color: 'var(--danger)',
                        borderRadius: '6px',
                        background: 'rgba(214,48,49,0.1)',
                        border: '1px solid rgba(214,48,49,0.2)'
                      }}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. 우측 영역: 날씨 정보 조회 */}
            <div className="glass-panel" style={{ padding: '32px', height: 'fit-content' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '20px' }}>
                  ☔ 실시간 연동 날씨 현황
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {weatherList.map(w => (
                  <div
                    key={w.id}
                    className="glass-panel"
                    style={{
                      padding: '16px',
                      background: 'rgba(0, 0, 0, 0.01)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>{w.date}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        기온: {w.temp} | 강수확률: {w.rainProb}
                      </div>
                    </div>
                    
                    <span style={{
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      color: 'var(--accent)'
                    }}>
                      {w.condition}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: '28px',
                padding: '16px',
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.6'
              }}>
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
