"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { getCurrentSession, getTruckInfo, updateTruckInfo, logoutUser, initDb } from '../../../utils/authDb';

export default function MyTruckManagementPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [truck, setTruck] = useState(null);

  // 트럭 기본 정보 State
  const [truckName, setTruckName] = useState('');
  const [truckIntro, setTruckIntro] = useState('');
  const [category, setCategory] = useState('snack');
  const [customCategory, setCustomCategory] = useState(''); // 직접 입력받을 카테고리명
  const [isCustomMode, setIsCustomMode] = useState(false);    // 직접 입력 모드 활성화 여부
  const [stock, setStock] = useState(0);
  const [waitingTeams, setWaitingTeams] = useState(0);

  // 기본 고정 카테고리 리스트
  const DEFAULT_CATS = ['snack', 'sweet', 'skewer', 'takoyaki', 'meat'];

  // 메뉴 리스트 State
  const [menuList, setMenuList] = useState([]);
  
  // 신규 메뉴 등록용 State
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuPrice, setNewMenuPrice] = useState('');

  // 1. 세션 확인 및 트럭 로딩
  useEffect(() => {
    const userSession = getCurrentSession();
    if (!userSession) {
      alert("로그인이 필요합니다.");
      router.push('/auth/login');
      return;
    }
    
    // 💡 실시간 계정 정지 여부 교차 검증!
    initDb();
    const users = JSON.parse(localStorage.getItem("roadfood_users") || "[]");
    const dbUser = users.find(u => u.username === userSession.username);
    if (dbUser && dbUser.isSuspended) {
      alert("운영진에 의해 계정이 정지되었습니다. 즉시 로그아웃되며 서비스 접근이 차단됩니다.");
      logoutUser();
      router.push('/auth/login');
      return;
    }

    // 임시 비밀번호 가드
    if (userSession.needPasswordChange) {
      router.push('/auth/change-password');
      return;
    }

    setSession(userSession);
    
    const truckData = getTruckInfo(userSession.username);
    if (truckData) {
      setTruck(truckData);
      setTruckName(truckData.name);
      setTruckIntro(truckData.intro);
      setStock(truckData.stock);
      setWaitingTeams(truckData.waitingTeams);
      setMenuList(truckData.menu || []);
      
      // 카테고리 초기값 세팅 (기존 저장된 카테고리가 사용자 정의 카테고리인지 체크)
      if (DEFAULT_CATS.includes(truckData.category)) {
        setCategory(truckData.category);
        setIsCustomMode(false);
      } else {
        setCategory('custom');
        setCustomCategory(truckData.category);
        setIsCustomMode(true);
      }
    } else {
      // 💡 [버그 픽스] 트럭 정보가 아예 없는 신규 유저일 경우 빈 객체로 세팅하여 무한 로딩 방지
      setTruck({});
    }
  }, []);

  // 2. 기본 정보 및 재고/대기 팀 일괄 업데이트
  const handleSaveBasicInfo = (e) => {
    e.preventDefault();

    // 💡 카테고리 결정 (직접 입력 모드일 경우 customCategory 값 저장)
    const finalCategory = isCustomMode ? customCategory.trim() : category;

    if (isCustomMode && !customCategory.trim()) {
      alert("⚠️ 직접 입력할 카테고리명을 입력해 주세요!");
      return;
    }

    const baseTruck = truck || {};
    const updated = {
      ...baseTruck,
      name: truckName,
      intro: truckIntro,
      category: finalCategory,
      stock: parseInt(stock) || 0,
      waitingTeams: parseInt(waitingTeams) || 0,
    };

    updateTruckInfo(session.username, updated);
    setTruck(updated);
    alert("🚚 트럭 기본 정보 및 실시간 재고/대기 팀 수량이 저장되었습니다.");
  };

  // 3. 신규 메뉴 추가 (Create)
  const handleAddMenu = (e) => {
    e.preventDefault();
    if (!newMenuName.trim() || !newMenuPrice) {
      alert("메뉴 이름과 가격을 바르게 입력해 주세요.");
      return;
    }

    const priceNum = parseInt(newMenuPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("가격을 올바른 정수형으로 기입해 주세요.");
      return;
    }

    const updatedMenu = [...menuList, { name: newMenuName, price: priceNum }];
    setMenuList(updatedMenu);
    
    // DB 저장
    const baseTruck = truck || {};
    const updated = { ...baseTruck, menu: updatedMenu };
    updateTruckInfo(session.username, updated);
    setTruck(updated);

    // 입력 초기화
    setNewMenuName('');
    setNewMenuPrice('');
    alert("✨ 새 메뉴가 등록되었습니다.");
  };

  // 4. 메뉴 삭제 (Delete)
  const handleDeleteMenu = (idxToRemove) => {
    if (!confirm("정말 이 메뉴를 삭제하시겠습니까?")) return;

    const updatedMenu = menuList.filter((_, idx) => idx !== idxToRemove);
    setMenuList(updatedMenu);

    const baseTruck = truck || {};
    const updated = { ...baseTruck, menu: updatedMenu };
    updateTruckInfo(session.username, updated);
    setTruck(updated);
    alert("🗑️ 메뉴가 삭제되었습니다.");
  };

  // 4.5 메뉴 품절 상태 토글 (isSoldOut Toggle)
  const handleToggleSoldOut = (idxToToggle) => {
    const updatedMenu = menuList.map((item, idx) => {
      if (idx === idxToToggle) {
        return { ...item, isSoldOut: !item.isSoldOut };
      }
      return item;
    });
    setMenuList(updatedMenu);

    const baseTruck = truck || {};
    const updated = { ...baseTruck, menu: updatedMenu };
    updateTruckInfo(session.username, updated);
    setTruck(updated);
  };

  if (!session || !truck) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
        <Navbar userType="owner" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>푸드트럭 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      {/* 사장님 전용 헤더 */}
      <Navbar userType="owner" truckStatus={truck.status} />

      <main className="mobile-safe-bottom" style={{ flex: 1, padding: '40px 24px', display: 'flex', justifyContent: 'center' }}>
        <div className="responsive-grid-2" style={{ maxWidth: '960px' }}>
          
          {/* 1. 좌측 영역: 트럭 기본 정보 및 실시간 재고/대기 설정 */}
          <section className="glass-panel" style={{ padding: '32px', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              🚚 트럭 프로필 & 실시간 현황
            </h3>

            <form onSubmit={handleSaveBasicInfo} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Input
                id="mt-name"
                label="푸드트럭 이름"
                value={truckName}
                onChange={(e) => setTruckName(e.target.value)}
                required
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="input-label">음식 카테고리</label>
                <select
                  value={category}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCategory(val);
                    if (val === 'custom') {
                      setIsCustomMode(true);
                    } else {
                      setIsCustomMode(false);
                    }
                  }}
                  style={{
                    background: 'rgba(0, 0, 0, 0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                  }}
                >
                  <option value="snack" style={{ background: 'var(--surface)' }}>분식 (떡볶이/튀김) 🍢</option>
                  <option value="sweet" style={{ background: 'var(--surface)' }}>디저트 (호떡/크레페) 🥞</option>
                  <option value="skewer" style={{ background: 'var(--surface)' }}>꼬치 (닭꼬치/염통) 🍢</option>
                  <option value="takoyaki" style={{ background: 'var(--surface)' }}>타코야끼 🐙</option>
                  <option value="meat" style={{ background: 'var(--surface)' }}>양식 (스테이크/버거) 🥩</option>
                  <option value="custom" style={{ background: 'var(--surface)' }}>직접 입력하기 ✍️</option>
                </select>
              </div>

              {/* 💡 직접 입력 모드 활성화 시 텍스트 인풋 표출 */}
              {isCustomMode && (
                <div style={{ marginTop: '2px' }}>
                  <Input
                    id="mt-custom-cat"
                    placeholder="새로운 카테고리 직접 입력 (예: 커피/음료 ☕)"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="input-label">트럭 한 줄 소개</label>
                <textarea
                  value={truckIntro}
                  onChange={(e) => setTruckIntro(e.target.value)}
                  required
                  rows="3"
                  placeholder="소비자 지도 팝업에 노출될 친절한 소개글을 작성해 주세요."
                  style={{
                    background: 'rgba(0, 0, 0, 0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    resize: 'none',
                    outline: 'none',
                  }}
                />
              </div>

              {/* ⚠️ 실시간 재고 & 대기 제어 단추 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Input
                  id="mt-stock"
                  label="실시간 재고 수량 (개)"
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  required
                />
                
                <Input
                  id="mt-waiting"
                  label="실시간 대기 줄 (팀)"
                  type="number"
                  value={waitingTeams}
                  onChange={(e) => setWaitingTeams(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" variant="primary" style={{ marginTop: '10px' }}>
                설정 일괄 저장하기
              </Button>
            </form>
          </section>

          {/* 2. 우측 영역: 메뉴 관리 CRUD */}
          <section className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                🍽️ 메뉴 통합 관리 (CRUD)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                판매할 대표 메뉴를 자유롭게 등록 및 삭제할 수 있습니다.
              </p>
            </div>

            {/* 신규 메뉴 등록 폼 */}
            <form onSubmit={handleAddMenu} className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }}>+ 새 메뉴 등록</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                <Input
                  id="new-m-name"
                  placeholder="메뉴명 (예: 파닭꼬치)"
                  value={newMenuName}
                  onChange={(e) => setNewMenuName(e.target.value)}
                />
                <Input
                  id="new-m-price"
                  placeholder="가격 (예: 3500)"
                  type="number"
                  value={newMenuPrice}
                  onChange={(e) => setNewMenuPrice(e.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary" style={{ padding: '10px', fontSize: '0.85rem' }}>
                등록하기
              </Button>
            </form>

            {/* 메뉴 리스트 조회 및 삭제 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '300px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                등록된 메뉴 ({menuList.length})
              </span>
              
              {menuList.length === 0 ? (
                <div style={{
                  padding: '40px 0',
                  textAlign: 'center',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  border: '1px dashed var(--border)',
                  borderRadius: '12px'
                }}>
                  등록된 메뉴가 없습니다. 상단 폼에서 새 메뉴를 추가해 주세요!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {menuList.map((item, idx) => (
                    <div
                      key={idx}
                      className="glass-panel"
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.9rem',
                        background: 'var(--surface-light)',
                        border: '1px solid var(--border)',
                        opacity: item.isSoldOut ? 0.6 : 1, // 품절 시 흐리게 처리
                        transition: 'opacity 0.2s'
                      }}
                    >
                      <div>
                        <span style={{ 
                          fontWeight: '600', 
                          color: 'var(--text-primary)',
                          textDecoration: item.isSoldOut ? 'line-through' : 'none' // 품절 시 취소선
                        }}>
                          {item.name}
                        </span>
                        <span style={{ 
                          color: 'var(--accent)', 
                          marginLeft: '12px', 
                          fontWeight: '600',
                          textDecoration: item.isSoldOut ? 'line-through' : 'none'
                        }}>
                          {item.price.toLocaleString()}원
                        </span>
                        {item.isSoldOut && (
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '0.7rem',
                            fontWeight: '850',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(214, 48, 49, 0.1)',
                            color: '#D63031',
                            border: '1px solid rgba(214, 48, 49, 0.2)'
                          }}>
                            품절 🔴
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleToggleSoldOut(idx)}
                          style={{
                            color: item.isSoldOut ? 'var(--success)' : '#D63031',
                            fontSize: '0.8rem',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: item.isSoldOut ? 'rgba(16, 185, 129, 0.08)' : 'rgba(214, 48, 49, 0.05)',
                            border: item.isSoldOut ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(214, 48, 49, 0.15)',
                            transition: 'all 0.2s',
                          }}
                        >
                          {item.isSoldOut ? '판매하기 🟢' : '품절 🔴'}
                        </button>
                        <button
                          onClick={() => handleDeleteMenu(idx)}
                          style={{
                            color: 'var(--danger)',
                            fontSize: '0.8rem',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: 'rgba(214, 48, 49, 0.1)',
                            border: '1px solid rgba(214, 48, 49, 0.2)',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => e.target.style.background = 'var(--danger)'}
                          onMouseLeave={(e) => e.target.style.background = 'rgba(214, 48, 49, 0.1)'}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </section>

        </div>
      </main>
    </div>
  );
}
