// @ts-nocheck
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function AdminLoginPage() {
  const router = useRouter();

  const [adminId, setAdminId] = useState('');
  const [adminPw, setAdminPw] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // MVP 모의 관리자 인증 정보 (admin / admin123)
    if (adminId === 'admin' && adminPw === 'admin123') {
      // 관리자 세션 임시 등록
      localStorage.setItem('roadfood_admin_session', 'true');
      router.push('/admin/dashboard');
    } else {
      setErrorMsg('관리자 아이디 또는 비밀번호가 잘못되었습니다.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      <Navbar userType="user" />

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
          
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            textAlign: 'center',
            marginBottom: '8px',
            background: 'linear-gradient(135deg, #FFF 0%, var(--text-secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            운영 관리자 로그인 🛡️
          </h2>
          <p style={{
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            marginBottom: '28px'
          }}>
            플랫폼 시스템 운영을 위한 관리 계정 로그인 양식입니다.
          </p>

          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Input
              id="admin-id-field"
              label="관리자 ID"
              placeholder="admin"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              required
            />

            <Input
              id="admin-pw-field"
              label="보안 비밀번호"
              type="password"
              placeholder="admin123"
              value={adminPw}
              onChange={(e) => setAdminPw(e.target.value)}
              required
            />

            {errorMsg && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <Button type="submit" variant="primary" style={{ marginTop: '10px' }}>
              보안 인증 로그인 ➔
            </Button>
          </form>

          <div style={{
            marginTop: '20px',
            background: 'var(--surface-light)',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            border: '1px solid var(--border)'
          }}>
            💡 <strong>모의 운영자 정보</strong><br />
            ID: <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>admin</code> / PW: <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>admin123</code>
          </div>

        </div>
      </main>
    </div>
  );
}
