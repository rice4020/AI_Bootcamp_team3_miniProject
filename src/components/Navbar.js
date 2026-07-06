"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

/**
 * 🚚 모바일 반응형 하단 탭바 & 데스크톱 상단바 통합 네비게이션
 */
export default function Navbar({
  userType = "user",
  truckStatus,
  onStatusChange
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  // 모바일 윈도우 크기 감지
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // 최초 1회 실행 및 리스너 등록
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 유저 권한별 메뉴 구성 및 아이콘 세팅 (모바일용)
  const getNavItems = () => {
    switch (userType) {
      case "owner":
        return [
          { label: "지도", href: "/owner", icon: "📍" },
          { label: "스팟추천", href: "/owner/spot", icon: "🟢" },
          { label: "행사정보", href: "/owner/events", icon: "🎡" },
          { label: "SNS홍보", href: "/owner/sns", icon: "📢" },
          { label: "트럭관리", href: "/owner/my-truck", icon: "⚙️" },
        ];
      case "admin":
        return [
          { label: "현황", href: "/admin/dashboard", icon: "📊" },
          { label: "API관리", href: "/admin/apis", icon: "🔌" },
          { label: "컨텐츠", href: "/admin/content", icon: "🎪" },
          { label: "회원정지", href: "/admin/members", icon: "👥" },
        ];
      default:
        // 일반 유저 (소비자)
        return [
          { label: "지도", href: "/", icon: "🍔" },
          { label: "사장님", href: "/auth/login", icon: "🚚" },
          { label: "관리자", href: "/admin", icon: "🛡️" },
        ];
    }
  };

  const navItems = getNavItems();

  // ---------------- 📱 1. 모바일 하단 탭바 렌더링 ----------------
  if (isMobile) {
    return (
      <div className="mobile-bottom-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
        
        {/* 모바일 사장님/관리자 로그아웃 버튼 (조그맣게 추가) */}
        {(userType === "owner" || userType === "admin") && (
          <button
            onClick={() => {
              if (confirm("로그아웃 하시겠습니까?")) {
                localStorage.removeItem(userType === "owner" ? "roadfood_session" : "roadfood_admin_session");
                alert("로그아웃 되었습니다.");
                router.push(userType === "owner" ? "/auth/login" : "/admin");
              }
            }}
            className="mobile-nav-item"
            style={{ border: 'none', background: 'none' }}
          >
            <span className="mobile-nav-icon">🚪</span>
            <span>로그아웃</span>
          </button>
        )}
      </div>
    );
  }

  // ---------------- 💻 2. 데스크톱 상단 바 렌더링 (기존 유지) ----------------
  return (
    <nav className="navbar glass-panel" style={{ borderRadius: '0', borderWidth: '0 0 1px 0' }}>
      <Link href={userType === "owner" ? "/owner" : userType === "admin" ? "/admin/dashboard" : "/"} className="nav-brand">
        <span>🚚</span>
        <span style={{ letterSpacing: '-0.5px' }}>
          {userType === "owner" ? "YOJARI OWNER" : userType === "admin" ? "YOJARI ADMIN" : "YOJARI"}
        </span>
      </Link>

      <div className="nav-links">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
              style={isActive ? { color: 'var(--primary)', fontWeight: '600' } : {}}
            >
              {item.label}
            </Link>
          );
        })}

        {/* 사장님 퀵 영업상태 표시 */}
        {userType === "owner" && truckStatus && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 
                truckStatus === 'active' ? 'var(--success)' : 
                truckStatus === 'prepare' ? 'var(--warning)' : 'var(--danger)',
              boxShadow: 
                truckStatus === 'active' ? 'var(--shadow-success)' : 'none'
            }} />
            <span style={{ fontWeight: '600' }}>
              {truckStatus === 'active' ? '영업중' : 
               truckStatus === 'prepare' ? '준비중' : '재료소진'}
            </span>
          </div>
        )}

        {(userType === "owner" || userType === "admin") && (
          <button
            onClick={() => {
              if (confirm("로그아웃 하시겠습니까?")) {
                localStorage.removeItem(userType === "owner" ? "roadfood_session" : "roadfood_admin_session");
                alert("로그아웃 되었습니다.");
                router.push(userType === "owner" ? "/auth/login" : "/admin");
              }
            }}
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              marginLeft: '8px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--danger)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
          >
            로그아웃
          </button>
        )}
      </div>
    </nav>
  );
}
