'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';

export default function SpotRecommendationPage() {
  const [interestAreas, setInterestAreas] = useState([]);
  const [newAreaInput, setNewAreaInput] = useState('');
  const [analysisData, setAnalysisData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);
  
  const router = useRouter();

  // Load interest areas
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('yojari_interest_areas');
      if (saved) {
        setInterestAreas(JSON.parse(saved));
      }
    }
  }, []);

  // Fetch data
  useEffect(() => {
    if (interestAreas.length > 0) {
      fetchAnalysisData(interestAreas);
    }
  }, [interestAreas]);

  const saveAreas = (areas) => {
    setInterestAreas(areas);
    if (typeof window !== 'undefined') {
      localStorage.setItem('yojari_interest_areas', JSON.stringify(areas));
    }
  };

  const handleAddArea = () => {
    const area = newAreaInput.trim();
    if (!area) return;
    if (interestAreas.length >= 5) {
      alert("관심 지역은 최대 5개까지만 등록할 수 있습니다.");
      return;
    }
    if (interestAreas.includes(area)) {
      alert("이미 등록된 지역입니다.");
      return;
    }
    saveAreas([...interestAreas, area]);
    setNewAreaInput('');
  };

  const handleStartBusiness = (spot) => {
    const lat = spot.lat || spot.latitude || 37.5665;
    const lng = spot.lng || spot.longitude || 126.9780;
    window.location.href = `/owner?myTruckLat=${lat}&myTruckLng=${lng}&mySpotName=${encodeURIComponent(spot.name)}`;
  };

  const handleRemoveArea = (area) => {
    saveAreas(interestAreas.filter(a => a !== area));
    if (selectedArea === area) setSelectedArea(null);
  };

  const fetchAnalysisData = async (areas) => {
    setLoading(true);
    const newData = { ...analysisData };
    
    // We will just fetch legal spots directly from API to count them
    // Assuming /api/legal-spots returns the spots. 
    // Wait, the main page uses FALLBACK_LEGAL_SPOTS. Let's fetch them from our local api.
    let legalSpotsList = [];
    try {
      const spotRes = await fetch('/api/legal-spots');
      const spotData = await spotRes.json();
      if (spotData && spotData.data) {
        legalSpotsList = spotData.data;
      }
    } catch(e) {
      console.log('failed fetching spots', e);
    }
    
    for (const area of areas) {
      if (newData[area] && !newData[area].error) continue;
      
      try {
        const osmRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=대한민국+서울+${encodeURIComponent(area)}`);
        const osmData = await osmRes.json();
        
        let lat = 37.5665;
        let lng = 126.9780;
        if (osmData && osmData.length > 0) {
          lat = parseFloat(osmData[0].lat);
          lng = parseFloat(osmData[0].lon);
        }

        const commRes = await fetch(`/api/commercial?lat=${lat}&lng=${lng}&radius=3000`);
        const commData = await commRes.json();

        const evtRes = await fetch(`/api/events?lat=${lat}&lng=${lng}&radius=3000`);
        const evtData = await evtRes.json();

        // [신규 연동] 유동인구 API 호출 (실시간 연동 기반)
        const popRes = await fetch(`/api/population?district=${encodeURIComponent(area)}`);
        const popData = await popRes.json();
        const pop = popData.population || 15000;

        let spotCount = 0;
        let spotsInArea = [];
        if (legalSpotsList && legalSpotsList.length > 0) {
          spotsInArea = legalSpotsList.filter(s => {
            const sLat = parseFloat(s.lat || s.latitude);
            const sLng = parseFloat(s.lng || s.longitude);
            const R = 6371;
            const dLat = (sLat - lat) * Math.PI / 180;
            const dLon = (sLng - lng) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat*Math.PI/180) * Math.cos(sLat*Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const dist = R * c;
            return dist <= 3;
          });
          spotCount = spotsInArea.length;
        }

        const competitors = commData.competitorCount || 0;
        const eventsCount = evtData.data ? evtData.data.length : 0;
        
        // SNS 언급량은 기존 시뮬레이터 로직 유지
        const seed = Math.abs(lat + lng) * 10000;
        const sns = Math.floor((seed % 10000) + 1000);

        const score = (spotCount * 10) + (pop / 1000) + (sns / 100) + (eventsCount * 5) - (competitors);
        
        let grade = 'C';
        let gradeIcon = '⚪';
        if (score >= 100) { grade = 'S'; gradeIcon = '🌟'; }
        else if (score >= 80) { grade = 'A'; gradeIcon = '🟢'; }
        else if (score >= 60) { grade = 'B'; gradeIcon = '🟡'; }

        newData[area] = { spotCount, spots: spotsInArea, pop, sns, competitors, eventsCount, grade, gradeIcon };
      } catch (err) {
        console.error("Error fetching data for area", area, err);
        newData[area] = { error: true };
      }
    }
    
    setAnalysisData(newData);
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f6fa' }}>
      <Navbar userType="owner" />

      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          <div style={{ textAlign: 'left', marginBottom: '10px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#2d3436', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 관심지역 상권 분석 및 5대 구 비교 대시보드
            </h1>
            <p style={{ color: '#636e72', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
              영업하고 싶으신 관심 자치구(최대 5개)를 등록하고 각 자치구의 영업 매력도와 경쟁도를 한눈에 비교해 보세요.<br/>
              지표를 기준으로 최적의 입지를 선택한 뒤 1:1 스팟 정밀 비교를 통해 오늘의 장사 명당을 낙점할 수 있습니다.
            </p>
          </div>

          {/* Section 1: Registration */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#2d3436', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🎯 내 관심 자치구 목록 (최대 5개)
            </h4>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              {interestAreas.map(area => (
                <div key={area} 
                  onClick={() => setSelectedArea(area)}
                  style={{
                    background: selectedArea === area ? '#ff7675' : '#ffffff',
                    color: selectedArea === area ? '#ffffff' : '#2d3436',
                    border: '1px solid #dfe6e9',
                    padding: '10px 18px', borderRadius: '30px', fontSize: '0.95rem',
                    display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                    fontWeight: selectedArea === area ? '700' : '500',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease'
                  }}>
                  {area}
                  <span onClick={(e) => { e.stopPropagation(); handleRemoveArea(area); }} style={{ color: selectedArea === area ? '#ffeaa7' : '#b2bec3', cursor: 'pointer', fontWeight: 'bold' }}>✕</span>
                </div>
              ))}
              
              {interestAreas.length < 5 && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    placeholder="예: 강남구, 중구" 
                    value={newAreaInput}
                    onChange={(e) => setNewAreaInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddArea()}
                    style={{ padding: '10px 16px', borderRadius: '30px', border: '1px solid #dfe6e9', fontSize: '0.95rem', outline: 'none', width: '200px' }}
                  />
                  <button onClick={handleAddArea} style={{ background: '#00b894', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', transition: 'background 0.2s' }}>추가</button>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Table */}
          <div style={{ background: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead style={{ background: '#f8f9fa' }}>
                <tr>
                  <th style={{ padding: '18px 16px', borderBottom: '1px solid #eee', color: '#636e72', fontSize: '0.9rem', fontWeight: '600' }}>관심 지역</th>
                  <th style={{ padding: '18px 16px', borderBottom: '1px solid #eee', color: '#636e72', fontSize: '0.9rem', fontWeight: '600' }}>총 허가스팟 수</th>
                  <th style={{ padding: '18px 16px', borderBottom: '1px solid #eee', color: '#636e72', fontSize: '0.9rem', fontWeight: '600' }}>평균 유동인구 (일)</th>
                  <th style={{ padding: '18px 16px', borderBottom: '1px solid #eee', color: '#636e72', fontSize: '0.9rem', fontWeight: '600' }}>평균 SNS 언급량 (더미)</th>
                  <th style={{ padding: '18px 16px', borderBottom: '1px solid #eee', color: '#636e72', fontSize: '0.9rem', fontWeight: '600' }}>동종 경쟁업체 (평균)</th>
                  <th style={{ padding: '18px 16px', borderBottom: '1px solid #eee', color: '#636e72', fontSize: '0.9rem', fontWeight: '600' }}>개최 축제 수</th>
                  <th style={{ padding: '18px 16px', borderBottom: '1px solid #eee', color: '#636e72', fontSize: '0.9rem', fontWeight: '600' }}>상권 매력도 등급</th>
                </tr>
              </thead>
              <tbody>
                {interestAreas.length === 0 && (
                  <tr><td colSpan="7" style={{ padding: '40px', color: '#b2bec3', fontSize: '0.95rem' }}>등록된 관심 지역이 없습니다. 관심 자치구를 추가해 주세요.</td></tr>
                )}
                {loading && interestAreas.length > 0 && Object.keys(analysisData).length < interestAreas.length && (
                  <tr><td colSpan="7" style={{ padding: '40px', color: '#0984e3', fontSize: '0.95rem', fontWeight: 'bold' }}>데이터를 실시간으로 분석 중입니다... ⏳</td></tr>
                )}
                {interestAreas.map(area => {
                  const data = analysisData[area];
                  if (!data) return null;
                  const isSelected = selectedArea === area;
                  return (
                    <tr key={area} onClick={() => setSelectedArea(area)} style={{ cursor: 'pointer', background: isSelected ? 'rgba(255, 118, 117, 0.04)' : '#fff', transition: 'background 0.2s', borderBottom: '1px solid #f1f2f6' }}>
                      <td style={{ padding: '20px 16px', fontWeight: '700', color: '#2d3436' }}>📍 {area}</td>
                      <td style={{ padding: '20px 16px', color: '#2d3436' }}>{data.spotCount}곳</td>
                      <td style={{ padding: '20px 16px', color: '#0984e3', fontWeight: '700' }}>{data.pop ? data.pop.toLocaleString() : '-'}명</td>
                      <td style={{ padding: '20px 16px', color: '#e17055', fontWeight: '700' }}>🔥 {data.sns ? data.sns.toLocaleString() : '-'}회</td>
                      <td style={{ padding: '20px 16px', color: '#d63031', fontWeight: '600' }}>{data.competitors}개</td>
                      <td style={{ padding: '20px 16px', color: '#9b59b6', fontWeight: '700' }}>{data.eventsCount}건</td>
                      <td style={{ padding: '20px 16px' }}>
                        <span style={{ background: isSelected ? '#ff7675' : '#f1f2f6', color: isSelected ? '#fff' : '#2d3436', padding: '6px 14px', borderRadius: '12px', fontWeight: '800', fontSize: '0.9rem', transition: 'all 0.2s' }}>
                          {data.grade} {data.gradeIcon}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Section 3: Spot Detail (1:1 Comparison) */}
          <div style={{ paddingBottom: '60px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#2d3436', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⭐ {selectedArea || '지역'} 내 추천 허가 스팟 비교 분석
            </h4>
            <div style={{ background: '#ffffff', border: '1px solid #eee', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              {!selectedArea ? (
                <p style={{ color: '#b2bec3', margin: 0, fontSize: '1rem' }}>위의 표나 태그에서 상세 분석할 지역을 선택해 주세요.</p>
              ) : analysisData[selectedArea]?.spots?.length > 0 ? (
                <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', padding: '10px 0', textAlign: 'left' }}>
                  {analysisData[selectedArea].spots.slice(0, 2).map((spot, index) => {
                    // Generate spot-specific realistic data based on coordinates seed
                    const spotLat = parseFloat(spot.lat || spot.latitude) || 37.5665;
                    const spotLng = parseFloat(spot.lng || spot.longitude) || 126.9780;
                    const spotSeed = Math.floor(Math.abs(spotLat + spotLng) * 100000);
                    
                    const avgPop = Math.floor(analysisData[selectedArea].pop / Math.max(1, analysisData[selectedArea].spots.length));
                    const spotPop = avgPop + (spotSeed % 2000) - 1000;
                    
                    const avgSns = Math.floor(analysisData[selectedArea].sns / Math.max(1, analysisData[selectedArea].spots.length));
                    const spotSns = avgSns + (spotSeed % 500);
                    
                    const trend = (spotSeed % 25) + 2;
                    const spotCompetitors = (spotSeed % 3);
                    const compLabel = spotCompetitors === 0 ? "낮음 🟢" : (spotCompetitors === 1 ? "보통 🟡" : "높음 🔴");
                    
                    const allTags = ['#핫플레이스', '#인기맛집', '#꿀맛보장', '#푸드트럭명물', '#간식맛집', '#인스타핫플', '#데이트코스', '#웨이팅필수', '#분위기깡패'];
                    const tagStart = spotSeed % (allTags.length - 2);
                    const tags = allTags.slice(tagStart, tagStart + 3);

                    return (
                      <div key={spot.id} style={{ flex: 1, minWidth: '300px', background: '#ffffff', border: '1px solid #dfe6e9', borderRadius: '16px', padding: '24px', boxShadow: '0 8px 20px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <span style={{ background: '#dff9fb', color: '#00b894', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800' }}>스팟 {index + 1}</span>
                          <span style={{ background: 'rgba(9, 132, 227, 0.1)', color: '#0984e3', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' }}>합법 구역</span>
                        </div>
                        <h5 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#2d3436', fontWeight: '800', lineHeight: '1.4' }}>{spot.name}</h5>
                        <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#636e72' }}>📍 {spot.location}</p>

                        {/* Expected Population */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f2f6', paddingBottom: '12px', marginBottom: '12px' }}>
                          <span style={{ color: '#636e72', fontSize: '0.9rem', fontWeight: '600' }}>👥 예상 유동인구</span>
                          <span style={{ color: '#0984e3', fontSize: '1.05rem', fontWeight: '800' }}>{spotPop.toLocaleString()}명/일</span>
                        </div>

                        {/* SNS Trending */}
                        <div style={{ background: '#fff5f5', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: '1px solid #ffeaa7' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ color: '#d63031', fontSize: '0.9rem', fontWeight: '800' }}>📱 실시간 SNS 핫플 반응 (더미)</span>
                            <span style={{ background: '#e17055', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800' }}>+{trend}% 상승세 📈</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ color: '#636e72', fontSize: '0.85rem' }}>태그 언급 수</span>
                            <span style={{ color: '#2d3436', fontSize: '1.05rem', fontWeight: '800' }}>{spotSns.toLocaleString()}회</span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {tags.map(tag => (
                              <span key={tag} style={{ color: '#e17055', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #fab1a0', padding: '2px 8px', borderRadius: '12px', background: '#fff' }}>{tag}</span>
                            ))}
                          </div>
                        </div>

                        {/* Competitors & Rules */}
                        <div style={{ marginBottom: '16px', borderBottom: '1px solid #f1f2f6', paddingBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ color: '#b2bec3', fontSize: '0.85rem', fontWeight: '600' }}>⚔️ 동종 경쟁 매장 (타코야끼/일식)</span>
                            <span style={{ color: '#00b894', fontSize: '0.85rem', fontWeight: '700' }}>{spotCompetitors}개 (경쟁도: {compLabel})</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#2d3436', fontSize: '0.9rem', fontWeight: '800' }}>🎪 영업 규칙</span>
                            <span style={{ color: '#636e72', fontSize: '0.8rem', lineHeight: '1.5' }}>운영시간: 평일/주말 10:00~22:00 | 휴무일: 없음<br/>허가일정: 2026-01-01 ~ 2026-12-31<br/>문의처: 02-2155-5346</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleStartBusiness(spot)} style={{ flex: 1, padding: '12px', background: '#ff7675', color: '#ffffff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', fontSize: '0.95rem', transition: 'background 0.2s', boxShadow: '0 4px 10px rgba(255, 118, 117, 0.3)' }}>🟢 여기서 영업예정</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: '20px' }}>
                  <p style={{ color: '#d63031', margin: '0 0 12px 0', fontSize: '1.05rem', fontWeight: '700' }}>📍 등록하신 [{selectedArea}] 내에 추천 허가 스팟 정보가 존재하지 않습니다.</p>
                  <p style={{ color: '#b2bec3', margin: 0, fontSize: '0.95rem' }}>다른 구(예: 영등포구, 마포구, 서초구 등)를 추가하여 대시보드를 비교해 보세요!</p>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
