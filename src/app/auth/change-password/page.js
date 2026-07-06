"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { getCurrentSession, changeUserPassword } from '../../../utils/authDb';

export default function ChangePasswordPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmErrorMsg, setConfirmErrorMsg] = useState('');

  // 1. 임시 비밀번호 세션 차단 검증
  useEffect(() => {
    const userSession = getCurrentSession();
    if (!userSession) {
      alert("로그인이 필요한 서비스입니다.");
      router.push('/auth/login');
      return;
    }
    
    // 이미 일반 비밀번호 변경을 완료한 사장님이라면 사장님 홈으로 추방
    if (!userSession.needPasswordChange) {
      router.push('/owner');
      return;
    }

    setSession(userSession);
  }, []);

  // 2. 비밀번호 표준 규칙 검증 함수
  const validatePassword = (val) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
    if (!regex.test(val)) {
      return "비밀번호는 8~16자의 영문 대/소문자, 숫자, 특수문자(@$!%*?&)를 포함해야 합니다.";
    }
    return "";
  };

  const handlePasswordChangeSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setConfirmErrorMsg('');

    const valErr = validatePassword(newPassword);
    if (valErr) {
      setErrorMsg(valErr);
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmErrorMsg("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    try {
      // 변경 실행
      changeUserPassword(session.username, newPassword);
      alert("비밀번호 변경이 정상 완료되었습니다. 메인 대시보드로 이동합니다. 🎉");
      router.push('/owner');
    } catch (err) {
      alert(err.message);
    }
  };

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
        <Navbar userType="user" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>사용자 세션을 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      <Navbar userType="user" />

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '40px' }}>
          
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            textAlign: 'center',
            marginBottom: '8px',
            background: 'linear-gradient(135deg, #FFF 0%, var(--text-secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            비밀번호 변경 안내 🔒
          </h2>
          <p style={{
            textAlign: 'center',
            color: 'var(--danger)',
            fontSize: '0.8rem',
            fontWeight: '600',
            lineHeight: '1.4',
            marginBottom: '28px'
          }}>
            ⚠️ 현재 회원님은 임시 비밀번호 상태입니다.<br />
            안전한 플랫폼 사용을 위해 새로운 비밀번호 설정이 필수적입니다.
          </p>

          <form onSubmit={handlePasswordChangeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Input
              id="change-pw-input"
              label="새 비밀번호 설정"
              type="password"
              placeholder="8~16자 영문 대소문자+숫자+특수문자 조합"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setErrorMsg('');
              }}
              error={errorMsg}
              required
            />

            <Input
              id="change-pw-confirm"
              label="새 비밀번호 확인"
              type="password"
              placeholder="동일한 비밀번호를 다시 입력해 주세요."
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setConfirmErrorMsg('');
              }}
              error={confirmErrorMsg}
              required
            />

            <Button type="submit" variant="primary" style={{ marginTop: '10px' }}>
              비밀번호 변경 및 강제 해제
            </Button>
          </form>

        </div>
      </main>
    </div>
  );
}
