"use client";

import React from 'react';

/**
 * 🚚 프리미엄 공통 버튼 컴포넌트
 * @param {Object} props
 * @param {React.ReactNode} props.children - 버튼 내부 텍스트나 아이콘
 * @param {string} [props.type="button"] - 버튼 타입 (button, submit, reset)
 * @param {boolean} [props.disabled=false] - 활성화 여부
 * @param {boolean} [props.loading=false] - 로딩 상태 여부
 * @param {string} [props.variant="primary"] - 스타일 종류 (primary, secondary)
 * @param {Function} [props.onClick] - 클릭 핸들러 함수
 * @param {Object} [props.style] - 커스텀 인라인 스타일
 * @param {string} [props.className] - 추가 클래스네임
 */
export default function Button({
  children,
  type = "button",
  disabled = false,
  loading = false,
  variant = "primary",
  onClick,
  style = {},
  className = "",
  ...rest
}) {
  const baseClass = variant === "primary" ? "btn-primary" : "btn-secondary";
  
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClass} ${className}`}
      style={style}
      {...rest}
    >
      {loading ? (
        <>
          {/* 간단한 SVG 로딩 스피너 */}
          <svg
            style={{
              animation: "spin 1s linear infinite",
              width: "16px",
              height: "16px",
              marginRight: "6px",
            }}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              style={{ opacity: 0.25 }}
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              style={{ opacity: 0.75 }}
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          로딩 중...
        </>
      ) : (
        children
      )}
      
      {/* 로딩 애니메이션을 위한 inline style tag */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
