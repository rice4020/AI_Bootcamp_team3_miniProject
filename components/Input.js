"use client";

import React from 'react';

/**
 * 🚚 프리미엄 공통 인풋 컴포넌트
 * @param {Object} props
 * @param {string} props.id - 인풋 고유 ID (라벨 연동 필수)
 * @param {string} props.label - 표시할 라벨
 * @param {string} [props.type="text"] - 인풋 타입
 * @param {string} [props.placeholder] - 안내 문구
 * @param {string} [props.error] - 에러 메시지 (있을 경우 붉은 텍스트 노출)
 * @param {boolean} [props.required=false] - 필수값 여부
 * @param {string} [props.className] - 추가 클래스네임
 */
export default function Input({
  id,
  label,
  type = "text",
  placeholder = "",
  error = "",
  required = false,
  className = "",
  ...rest
}) {
  return (
    <div className={`input-container ${className}`}>
      {label && (
        <label htmlFor={id} className="input-label">
          {label} {required && <span style={{ color: 'var(--primary)' }}>*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        required={required}
        className="input-field"
        style={error ? { borderColor: 'var(--danger)' } : {}}
        {...rest}
      />
      {error && <span className="input-error-msg">{error}</span>}
    </div>
  );
}
