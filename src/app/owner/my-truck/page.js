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
  const [mainCategory, setMainCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [customCategory, setCustomCategory] = useState(''); // 직접 입력받을 카테고리명
  const [isCustomMode, setIsCustomMode] = useState(false);    // 직접 입력 모드 활성화 여부

  // 기본 고정 카테고리 리스트
  const DEFAULT_CATS = ['snack', 'sweet', 'skewer', 'takoyaki', 'meat'];

  // 메뉴 리스트 State
  const [menuList, setMenuList] = useState([]);
  
  // 신규 메뉴 등록용 State
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuPrice, setNewMenuPrice] = useState('');

  // DB 카테고리 State
  const [dbCategories, setDbCategories] = useState([]);

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
    
    // DB 카테고리 로드 후 트럭 정보 세팅
    const fetchMenusAndTruck = async () => {
      let loadedCats = [];
      try {
        const res = await fetch('/api/menus');
        const data = await res.json();
        if (data.success) {
          setDbCategories(data.menus);
          loadedCats = data.menus.map(c => `${c.category}-${c.subCategory}`);
        }
      } catch (err) {
        console.error('메뉴 로드 실패', err);
      }

      let truckData = null;
      try {
        const truckRes = await fetch('/api/trucks');
        const trucksList = await truckRes.json();
        const myDbTruck = trucksList.find(t => t.ownerName === userSession.username);
        if (myDbTruck) {
          truckData = myDbTruck;
        } else {
          truckData = getTruckInfo(userSession.username);
        }
      } catch (err) {
        console.error('트럭 로드 실패', err);
        truckData = getTruckInfo(userSession.username);
      }

      if (truckData) {
        setTruck(truckData);
        setTruckName(truckData.name || '');
        setTruckIntro(truckData.intro || '');
        setMenuList(truckData.menu || []);
        
        // 이전 하드코딩 값(DEFAULT_CATS)이거나 DB값인지 체크
        if (DEFAULT_CATS.includes(truckData.category)) {
          setMainCategory(truckData.category);
          setSubCategory('');
          setIsCustomMode(false);
        } else if (loadedCats.includes(truckData.category)) {
          const [m, s] = truckData.category.split('-');
          setMainCategory(m);
          setSubCategory(s);
          setIsCustomMode(false);
        } else {
          setMainCategory('custom');
          setSubCategory('');
          setCustomCategory(truckData.category || '');
          setIsCustomMode(true);
        }
      } else {
        setTruck({});
      }
    };

    fetchMenusAndTruck();
  }, []);

  // 2. 통합 일괄 업데이트
  const handleSaveAll = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // 💡 카테고리 결정 (직접 입력 모드일 경우 customCategory 값 저장)
    const finalCategory = isCustomMode 
      ? customCategory.trim() 
      : (subCategory ? `${mainCategory}-${subCategory}` : mainCategory);

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
      menu: menuList, // 💡 메뉴 리스트도 일괄 저장
    };

    updateTruckInfo(session.username, updated);
    setTruck(updated);
    alert("🚚 트럭 정보 및 메뉴가 일괄 저장되었습니다.");
  };

  // 3. 신규 메뉴 추가 (Create)
  const handleAddMenu = (e) => {
    e.preventDefault();

    if (menuList.length >= 5) {
      alert("메뉴는 최대 5개까지만 등록할 수 있습니다.");
      return;
    }

    if (!newMenuName.trim() || !newMenuPrice) {
      alert("메뉴 이름과 가격을 바르게 입력해 주세요.");
      return;
    }

    const priceNum = parseInt(newMenuPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("가격을 올바른 정수형으로 기입해 주세요.");
      return;
    }

    const updatedMenu = [...menuList, { name: newMenuName, price: priceNum, isSoldOut: false }];
    setMenuList(updatedMenu);
    
    // 입력 초기화
    setNewMenuName('');
    setNewMenuPrice('');
    alert("✨ 메뉴가 목록에 추가되었습니다. 하단의 [설정 일괄 저장하기]를 누르시면 최종 반영됩니다.");
  };

  // 4. 메뉴 삭제 (Delete)
  const handleDeleteMenu = (idxToRemove) => {
    if (!confirm("정말 이 메뉴를 삭제하시겠습니까? 삭제 후 하단의 일괄 저장 버튼을 눌러야 최종 반영됩니다.")) return;

    const updatedMenu = menuList.filter((_, idx) => idx !== idxToRemove);
    setMenuList(updatedMenu);
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

      <main className="mobile-safe-bottom" style={{ flex: 1, padding: '40px 24px', display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
        <div className="responsive-grid-2" style={{ maxWidth: '960px', width: '100%' }}>
          
          {/* 1. 좌측 영역: 트럭 정보 */}
          <section className="glass-panel" style={{ padding: '32px', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              🚚 트럭 정보
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Input
                id="mt-name"
                label="푸드트럭 이름"
                value={truckName}
                onChange={(e) => setTruckName(e.target.value)}
                required
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="input-label">음식 카테고리</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {/* 대분류 */}
                  <select
                    value={mainCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMainCategory(val);
                      if (val === 'custom') {
                        setIsCustomMode(true);
                        setSubCategory('');
                      } else {
                        setIsCustomMode(false);
                        const availableSubs = dbCategories.filter(c => c.category === val);
                        if (availableSubs.length > 0) {
                          setSubCategory(availableSubs[0].subCategory);
                        } else {
                          setSubCategory('');
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      background: 'rgba(0, 0, 0, 0.02)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      outline: 'none',
                    }}
                  >
                    <option value="" disabled hidden>대분류 선택</option>
                    <option value="snack" style={{ background: 'var(--surface)' }} hidden>분식 (떡볶이/튀김) 🍢</option>
                    <option value="sweet" style={{ background: 'var(--surface)' }} hidden>디저트 (호떡/크레페) 🥞</option>
                    <option value="skewer" style={{ background: 'var(--surface)' }} hidden>꼬치 (닭꼬치/염통) 🍢</option>
                    <option value="takoyaki" style={{ background: 'var(--surface)' }} hidden>타코야끼 🐙</option>
                    <option value="meat" style={{ background: 'var(--surface)' }} hidden>양식 (스테이크/버거) 🥩</option>

                    {Array.from(new Set(dbCategories.map(cat => cat.category))).map(mainCat => (
                      <option key={mainCat} value={mainCat} style={{ background: 'var(--surface)' }}>
                        {mainCat}
                      </option>
                    ))}
                    <option value="custom" style={{ background: 'var(--surface)' }}>직접 입력하기 ✍️</option>
                  </select>

                  {/* 소분류 */}
                  {!isCustomMode && mainCategory && !DEFAULT_CATS.includes(mainCategory) && (
                    <select
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'rgba(0, 0, 0, 0.02)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                        outline: 'none',
                      }}
                    >
                      {dbCategories
                        .filter(cat => cat.category === mainCategory)
                        .map(cat => (
                          <option key={cat.id} value={cat.subCategory} style={{ background: 'var(--surface)' }}>
                            {cat.subCategory}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </div>

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
            </div>
          </section>

          {/* 2. 우측 영역: 푸드트럭 메뉴관리 */}
          <section className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                🍽️ 푸드트럭 메뉴관리
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                판매할 대표 메뉴를 자유롭게 등록 및 삭제할 수 있습니다.
              </p>
            </div>

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
                        opacity: item.isSoldOut ? 0.6 : 1,
                        transition: 'opacity 0.2s'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)', textDecoration: item.isSoldOut ? 'line-through' : 'none' }}>
                          {item.name}
                        </span>
                        <span style={{ color: 'var(--accent)', marginLeft: '12px', fontWeight: '600', textDecoration: item.isSoldOut ? 'line-through' : 'none' }}>
                          {item.price.toLocaleString()}원
                        </span>
                        {item.isSoldOut && (
                          <span style={{ marginLeft: '8px', fontSize: '0.7rem', fontWeight: '850', padding: '2px 6px', borderRadius: '4px', background: 'rgba(214, 48, 49, 0.1)', color: '#D63031', border: '1px solid rgba(214, 48, 49, 0.2)' }}>
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

        {/* 3. 하단 저장 버튼 영역 (통합) */}
        <div style={{ maxWidth: '960px', width: '100%', marginTop: '24px' }}>
          <Button onClick={handleSaveAll} variant="primary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}>
            설정 일괄 저장하기
          </Button>
        </div>
      </main>
    </div>
  );
}
