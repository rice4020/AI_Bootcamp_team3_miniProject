"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import Modal from '../../../components/Modal';
import { loginUser, findUserId, findUserPassword, initDb } from '../../../utils/authDb';

export default function LoginPage() {
  const router = useRouter();

  // 로그인 폼 State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // 모달 제어 State
  const [modalType, setModalType] = useState(null); // 'findId' | 'findPw' | null
  const [findResult, setFindResult] = useState(''); // 결과 문구 보관

  // 아이디 찾기 폼 State
  const [idName, setIdName] = useState('');
  const [idPhone, setIdPhone] = useState('');
  const [idBirth, setIdBirth] = useState('');
  const [idError, setIdError] = useState('');

  // 비밀번호 찾기 폼 State
  const [pwUsername, setPwUsername] = useState('');
  const [pwName, setPwName] = useState('');
  const [pwPhone, setPwPhone] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    initDb(); // 초기 더미 DB 데이터 세팅
  }, []);

  // 1. 로그인 요청
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoginError('');

    try {
      const user = loginUser(username, password);
      // 비밀번호 강제변경 대상 여부 체크
      if (user.needPasswordChange) {
        alert("임시 비밀번호로 로그인하셨습니다. 안전을 위해 비밀번호 변경 페이지로 이동합니다.");
        router.push('/auth/change-password');
      } else {
        router.push('/owner');
      }
    } catch (err) {
      setLoginError(err.message);
    }
  };

  // 2. 아이디 찾기 요청
  const handleFindId = (e) => {
    e.preventDefault();
    setIdError('');
    setFindResult('');

    try {
      const foundId = findUserId(idName, idPhone, idBirth);
      setFindResult(`조회 성공! 가입하신 아이디는 [ ${foundId} ] 입니다.`);
    } catch (err) {
      setIdError(err.message);
    }
  };

  // 3. 비밀번호 찾기 요청
  const handleFindPw = (e) => {
    e.preventDefault();
    setPwError('');
    setFindResult('');

    try {
      const tempPw = findUserPassword(pwUsername, pwName, pwPhone);
      setFindResult(
        `임시 비밀번호가 발급되었습니다. 
        임시 비밀번호: [ ${tempPw} ] 
        (해당 임시 비밀번호로 로그인 시 즉시 새 비밀번호로 변경해야 합니다.)`
      );
    } catch (err) {
      setPwError(err.message);
    }
  };

  // 모달 닫기 초기화
  const closeModal = () => {
    setModalType(null);
    setFindResult('');
    setIdError('');
    setPwError('');
    // 폼 초기화
    setIdName('');
    setIdPhone('');
    setIdBirth('');
    setPwUsername('');
    setPwName('');
    setPwPhone('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      <Navbar userType="user" />

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '40px' }}>
          
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '800',
            textAlign: 'center',
            marginBottom: '8px',
            background: 'linear-gradient(135deg, #FFF 0%, var(--text-secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            사장님 로그인 🚚
          </h2>
          <p style={{
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            marginBottom: '32px'
          }}>
            요자리(Yojari) 사장님 전용 페이지입니다.
          </p>

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Input
              id="login-username"
              label="아이디"
              placeholder="아이디를 입력해 주세요."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <Input
              id="login-password"
              label="비밀번호"
              type="password"
              placeholder="비밀번호를 입력해 주세요."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {loginError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center' }}>
                ⚠️ {loginError}
              </div>
            )}

            <Button type="submit" variant="primary" style={{ marginTop: '10px' }}>
              로그인
            </Button>
          </form>

          {/* 링크 및 편의기능 찾기 단추 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setModalType('findId')} style={{ hover: { color: '#FFF' } }}>
                아이디 찾기
              </button>
              <span style={{ color: 'var(--border-light)' }}>|</span>
              <button onClick={() => setModalType('findPw')}>
                비밀번호 찾기
              </button>
            </div>
            
            <Link href="/auth/register" style={{ color: 'var(--primary)', fontWeight: '600' }}>
              무료 회원가입
            </Link>
          </div>

          <div style={{
            marginTop: '20px',
            background: 'var(--surface-light)',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.4',
            border: '1px solid var(--border)'
          }}>
            💡 <strong>테스트 가이드 계정</strong><br />
            - 아이디: <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>owner123</code><br />
            - 비밀번호: <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>password123!</code>
          </div>

        </div>
      </main>

      {/* 1. 아이디 찾기 모달 */}
      <Modal
        isOpen={modalType === 'findId'}
        onClose={closeModal}
        title="아이디 찾기 🔍"
      >
        {!findResult ? (
          <form onSubmit={handleFindId} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              id="find-id-name"
              label="이름"
              placeholder="예: 홍길동"
              value={idName}
              onChange={(e) => setIdName(e.target.value)}
              required
            />
            <Input
              id="find-id-phone"
              label="휴대폰 번호"
              placeholder="예: 010-1234-5678"
              value={idPhone}
              onChange={(e) => setIdPhone(e.target.value)}
              required
            />
            <Input
              id="find-id-birth"
              label="생년월일 (8자리)"
              placeholder="예: 1990-01-01"
              value={idBirth}
              onChange={(e) => setIdBirth(e.target.value)}
              required
            />
            {idError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
                ⚠️ {idError}
              </div>
            )}
            <Button type="submit" variant="primary">조회하기</Button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '24px', whiteSpace: 'pre-line' }}>
              {findResult}
            </p>
            <Button onClick={closeModal} variant="secondary">확인</Button>
          </div>
        )}
      </Modal>

      {/* 2. 비밀번호 찾기 모달 */}
      <Modal
        isOpen={modalType === 'findPw'}
        onClose={closeModal}
        title="비밀번호 찾기 🔑"
      >
        {!findResult ? (
          <form onSubmit={handleFindPw} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              id="find-pw-username"
              label="아이디"
              placeholder="가입하신 아이디"
              value={pwUsername}
              onChange={(e) => setPwUsername(e.target.value)}
              required
            />
            <Input
              id="find-pw-name"
              label="이름"
              placeholder="예: 홍길동"
              value={pwName}
              onChange={(e) => setPwName(e.target.value)}
              required
            />
            <Input
              id="find-pw-phone"
              label="휴대폰 번호"
              placeholder="예: 010-1234-5678"
              value={pwPhone}
              onChange={(e) => setPwPhone(e.target.value)}
              required
            />
            {pwError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
                ⚠️ {pwError}
              </div>
            )}
            <Button type="submit" variant="primary">임시 비밀번호 발급</Button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '24px', whiteSpace: 'pre-line', lineHeight: '1.6' }}>
              {findResult}
            </p>
            <Button onClick={closeModal} variant="secondary">로그인하러 가기</Button>
          </div>
        )}
      </Modal>

    </div>
  );
}
