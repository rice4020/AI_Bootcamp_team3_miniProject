// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { checkUsernameDuplicate, registerUser } from '../../utils/authDb';

export default function RegisterPage() {
  const router = useRouter();
  
  // 가입 진행 단계 (1: 기본 정보, 2: 상세 정보, 3: 가입 완료)
  const [step, setStep] = useState(1);

  // 1단계 입력값 및 에러
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [usernameChecked, setUsernameChecked] = useState(false);
  
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // 2단계 입력값 및 에러
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [email, setEmail] = useState('');
  
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [birthdateError, setBirthdateError] = useState('');
  const [emailError, setEmailError] = useState('');

  // 1. 아이디 제약조건 유효성 검증 함수
  const validateUsername = (val) => {
    // 4~20자리, 영어 소문자로 시작, 영어/숫자/언더바(_)만 허용
    const regex = /^[a-z][a-z0-9_]{3,19}$/;
    if (!regex.test(val)) {
      return "아이디는 4~20자의 영문 소문자, 숫자, 언더바(_)만 사용 가능하며, 반드시 영문 소문자로 시작해야 합니다.";
    }
    return "";
  };

  // 2. 비밀번호 표준 규칙 검증 함수
  const validatePassword = (val) => {
    // 8~16자의 영문 대소문자, 숫자, 특수문자가 각각 최소 1개 이상 포함
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
    if (!regex.test(val)) {
      return "비밀번호는 8~16자의 영문 대/소문자, 숫자, 특수문자(@$!%*?&)를 조합하여 설정해야 합니다.";
    }
    return "";
  };

  // 아이디 중복 체크 핸들러
  const handleCheckDuplicate = () => {
    setUsernameError('');
    setUsernameChecked(false);

    const valErr = validateUsername(username);
    if (valErr) {
      setUsernameError(valErr);
      return;
    }

    const isDuplicate = checkUsernameDuplicate(username);
    if (isDuplicate) {
      setUsernameError("이미 사용 중인 아이디입니다.");
    } else {
      setUsernameChecked(true);
      alert("사용 가능한 아이디입니다! 👍");
    }
  };

  // 1단계 제출 (다음 단계 이동)
  const handleStep1Submit = (e) => {
    e.preventDefault();
    setUsernameError('');
    setPasswordError('');
    setConfirmPasswordError('');

    // 아이디 중복확인 체크 필수
    if (!usernameChecked) {
      setUsernameError("아이디 중복 확인을 필수로 거쳐야 합니다.");
      return;
    }

    const uErr = validateUsername(username);
    const pErr = validatePassword(password);
    
    if (uErr) {
      setUsernameError(uErr);
      return;
    }
    if (pErr) {
      setPasswordError(pErr);
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError("비밀번호가 일치하지 않습니다.");
      return;
    }

    // 통과 시 2단계 이동
    setStep(2);
  };

  // 2단계 제출 (최종 회원가입 등록)
  const handleStep2Submit = (e) => {
    e.preventDefault();
    setNameError('');
    setPhoneError('');
    setBirthdateError('');
    setEmailError('');

    let hasError = false;

    // 간단한 폼 유효성 체크
    if (!name.trim()) {
      setNameError("이름은 필수 항목입니다.");
      hasError = true;
    }
    if (!/^\d{3}-\d{3,4}-\d{4}$/.test(phone)) {
      setPhoneError("휴대폰 번호 형식이 올바르지 않습니다. (예: 010-1234-5678)");
      hasError = true;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
      setBirthdateError("생년월일 형식이 올바르지 않습니다. (예: 1990-01-01)");
      hasError = true;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("이메일 주소 형식이 올바르지 않습니다.");
      hasError = true;
    }

    if (hasError) return;

    // 모든 검증 완료 후 최종 등록
    try {
      const newUser = {
        username,
        password,
        name,
        phone,
        birthdate,
        email,
      };
      registerUser(newUser);
      setStep(3); // 가입 완료 단계로 이동
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      <Navbar userType="user" />

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '40px' }}>
          
          {/* 가입 진행 스텝 인디케이터 (1단계 및 2단계 시 노출) */}
          {step < 3 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
              <span style={{
                width: '32px',
                height: '6px',
                borderRadius: '3px',
                backgroundColor: step === 1 ? 'var(--primary)' : 'rgba(255,255,255,0.1)'
              }} />
              <span style={{
                width: '32px',
                height: '6px',
                borderRadius: '3px',
                backgroundColor: step === 2 ? 'var(--primary)' : 'rgba(255,255,255,0.1)'
              }} />
            </div>
          )}

          {/* ---------------- 1단계: 기본 정보 입력 ---------------- */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', textAlign: 'center', marginBottom: '8px' }}>
                정보 입력 (1/2) 🔑
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '28px' }}>
                기본 계정 아이디와 비밀번호 규칙을 준수하여 입력해 주세요.
              </p>

              <form onSubmit={handleStep1Submit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 아이디 입력 + 중복확인 조합 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="input-label">아이디 <span style={{ color: 'var(--primary)' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="4~20자 영문 소문자/숫자/_ 조합"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setUsernameChecked(false);
                        setUsernameError('');
                      }}
                      required
                      style={{ flex: 1 }}
                    />
                    <Button
                      onClick={handleCheckDuplicate}
                      variant="secondary"
                      style={{ padding: '0 16px', fontSize: '0.85rem', flexShrink: 0 }}
                    >
                      중복확인
                    </Button>
                  </div>
                  {usernameError && <span className="input-error-msg">{usernameError}</span>}
                  {usernameChecked && (
                    <span style={{ color: 'var(--success)', fontSize: '0.8rem', marginTop: '2px' }}>
                      ✓ 사용 가능한 아이디입니다.
                    </span>
                  )}
                </div>

                <Input
                  id="reg-pw"
                  label="비밀번호"
                  type="password"
                  placeholder="8~16자 영문 대소문자+숫자+특수문자 조합"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  error={passwordError}
                  required
                />

                <Input
                  id="reg-pw-confirm"
                  label="비밀번호 확인"
                  type="password"
                  placeholder="비밀번호를 다시 입력해 주세요."
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setConfirmPasswordError('');
                  }}
                  error={confirmPasswordError}
                  required
                />

                <Button type="submit" variant="primary" style={{ marginTop: '10px' }}>
                  다음 단계로 ➔
                </Button>
              </form>
            </div>
          )}

          {/* ---------------- 2단계: 상세 정보 입력 ---------------- */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', textAlign: 'center', marginBottom: '8px' }}>
                상세 정보 입력 (2/2) 👤
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '28px' }}>
                사장님의 인적사항을 기입해 주시면 가입이 최종 완료됩니다.
              </p>

              <form onSubmit={handleStep2Submit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <Input
                  id="reg-name"
                  label="이름"
                  placeholder="실명을 입력해 주세요."
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError('');
                  }}
                  error={nameError}
                  required
                />

                <Input
                  id="reg-phone"
                  label="휴대폰 번호"
                  placeholder="예: 010-1234-5678"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setPhoneError('');
                  }}
                  error={phoneError}
                  required
                />

                <Input
                  id="reg-birth"
                  label="생년월일 (8자리)"
                  placeholder="예: 1990-01-01"
                  value={birthdate}
                  onChange={(e) => {
                    setBirthdate(e.target.value);
                    setBirthdateError('');
                  }}
                  error={birthdateError}
                  required
                />

                <Input
                  id="reg-email"
                  label="이메일 주소"
                  type="email"
                  placeholder="예: email@foodtruck.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  error={emailError}
                  required
                />

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep(1)}
                    style={{ flex: 1 }}
                  >
                    이전으로
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    style={{ flex: 2 }}
                  >
                    가입 완료 🎉
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ---------------- 3단계: 가입 완료 완료 화면 ---------------- */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
              <h2 style={{
                fontSize: '1.75rem',
                fontWeight: '800',
                marginBottom: '12px',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                회원가입 완료!
              </h2>
              <p style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
                marginBottom: '32px'
              }}>
                축하합니다! 요자리(Yojari) 사장님 회원이 되셨습니다.<br />
                이제 로그인하여 푸드트럭 운영 및 관리 도구를 자유롭게 사용해 보세요.
              </p>

              <Button
                variant="primary"
                onClick={() => router.push('/auth/login')}
                style={{ width: '100%', padding: '14px' }}
              >
                로그인하러 가기 ➔
              </Button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
