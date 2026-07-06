"use client";

import React, { useEffect, useState } from 'react';

/**
 * 🚚 데스크톱 중앙 팝업 & 모바일 바텀시트 자동 전환형 공통 모달
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div 
        className="modal-content glass-panel"
        style={isMobile ? {
          maxHeight: '80vh', // 최대 모바일 높이 고정
          overflowY: 'auto'
        } : {}}
      >
        {/* 모달 닫기 버튼 */}
        <button 
          className="modal-close-btn" 
          onClick={onClose} 
          aria-label="Close"
          style={isMobile ? { top: '24px', right: '20px' } : {}}
        >
          ✕
        </button>
        
        {/* 모달 헤더 */}
        {title && (
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            marginBottom: '20px',
            marginTop: isMobile ? '8px' : '0', // 모바일 바텀시트 손잡이 여유 공간
            background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {title}
          </h3>
        )}

        {/* 모달 바디 */}
        <div style={{ paddingBottom: isMobile ? '24px' : '0' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
