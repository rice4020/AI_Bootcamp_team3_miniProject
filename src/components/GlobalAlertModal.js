"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Modal from './Modal';

/**
 * 🌍 전역 알림(alert) 가로채기 모달 컴포넌트
 * window.alert 호출을 가로채서 자체 커스텀 모달로 띄워줍니다.
 */
export default function GlobalAlertModal() {
  const [alertQueue, setAlertQueue] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 기존 window.alert 저장
      const originalAlert = window.alert;

      // window.alert 몽키 패치 (덮어쓰기)
      window.alert = (message) => {
        // 메시지가 객체 형태일 경우 문자열로 안전하게 변환
        let msgStr = typeof message === 'string' ? message : String(message);
        // 리터럴 '\n' 문자열을 실제 줄바꿈 문자로 변환
        msgStr = msgStr.replace(/\\n/g, '\n');
        setAlertQueue((prevQueue) => [...prevQueue, msgStr]);
      };

      // 정리(Cleanup) 함수
      return () => {
        window.alert = originalAlert;
      };
    }
  }, []);

  // 큐 상태에 따라 모달 오픈 여부 결정
  useEffect(() => {
    if (alertQueue.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [alertQueue]);

  const handleClose = useCallback(() => {
    // 확인 버튼을 누르면 큐에서 현재 메시지를 제거합니다.
    setAlertQueue((prevQueue) => prevQueue.slice(1));
  }, []);

  // 현재 표시할 첫 번째 메시지
  const currentMessage = alertQueue[0] || '';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="알림">
      <div style={{ 
        textAlign: 'center', 
        padding: '20px 10px', 
        fontSize: '1rem', 
        lineHeight: '1.6', 
        whiteSpace: 'pre-wrap', 
        color: 'var(--text-main)',
        minHeight: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {currentMessage}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <button
          onClick={handleClose}
          style={{
            padding: '12px 40px',
            background: 'linear-gradient(135deg, #FF6B35 0%, #e84393 100%)',
            color: '#FFF',
            border: 'none',
            borderRadius: '24px',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(255, 107, 53, 0.3)',
            transition: 'transform 0.1s ease-in-out'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          확인
        </button>
      </div>
    </Modal>
  );
}
