"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Button from '../../../components/Button';

export default function AdminMembersPage() {
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [memberList, setMemberList] = useState([]);

  // 1. 관리자 세션 체크 및 회원 로드
  useEffect(() => {
    const adminSession = localStorage.getItem('roadfood_admin_session');
    if (!adminSession) {
      alert("관리자 권한이 필요한 서비스입니다.");
      router.push('/admin');
      return;
    }
    setIsAdmin(true);

    // DB에서 회원 목록 로드
    fetch('/api/admin/members')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const mappedUsers = data.users.map(u => ({
            ...u,
            isSuspended: !u.isActive,
            birthdate: new Date(u.createdAt).toISOString().split('T')[0] // 임시로 가입일을 표시
          }));
          setMemberList(mappedUsers);
        }
      })
      .catch(err => console.error("Failed to load members", err));
  }, []);

  // 2. 계정 정지 / 활성화 토글 기능 (Soft Suspend)
  const handleToggleSuspend = async (username) => {
    const member = memberList.find(m => m.username === username);
    if (!member) return;

    const nextState = !member.isSuspended;
    
    try {
      const response = await fetch('/api/admin/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, isSuspended: nextState })
      });
      const result = await response.json();
      
      if (result.success) {
        alert(`[${member.name}] 님의 계정이 ${nextState ? '일시 정지' : '정상 활성화'} 처리되었습니다.`);
        setMemberList(prev => prev.map(m => m.username === username ? { ...m, isSuspended: nextState } : m));
      } else {
        alert(`❌ 처리 실패: ${result.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('서버 통신 실패');
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
        <Navbar userType="admin" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>관리자 권한을 인증 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      {/* 관리자 전용 헤더 */}
      <Navbar userType="admin" />

      <main style={{ flex: 1, padding: '40px 24px', display: 'flex', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '1000px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '8px' }}>
              👥 회원 관리 및 계정 권한 제어
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              가입된 사장님 회원의 개인 정보 및 계정 활성 상태를 관리하고, 규정 위반 시 일시정지 처리를 수행합니다.
            </p>
          </div>

          {/* 회원 테이블 */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)'
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-primary)' }}>이름 (아이디)</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-primary)' }}>연락처</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-primary)' }}>이메일</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-primary)' }}>가입일</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-primary)', textAlign: 'center' }}>상태</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-primary)', textAlign: 'right' }}>조치</th>
                </tr>
              </thead>
              
              <tbody>
                {memberList.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      가입된 사장님 회원이 존재하지 않습니다.
                    </td>
                  </tr>
                ) : (
                  memberList.map((member, idx) => (
                    <tr
                      key={member.username}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'
                      }}
                    >
                      {/* 이름 & 아이디 */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{member.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{member.username}</div>
                      </td>

                      {/* 연락처 */}
                      <td style={{ padding: '16px' }}>{member.phone}</td>

                      {/* 이메일 */}
                      <td style={{ padding: '16px' }}>{member.email}</td>

                      {/* 생년월일 */}
                      <td style={{ padding: '16px' }}>{member.birthdate}</td>

                      {/* 상태 뱃지 */}
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: '#FFF',
                          backgroundColor: member.isSuspended ? 'var(--danger)' : 'var(--success)'
                        }}>
                          {member.isSuspended ? '정지됨' : '정상'}
                        </span>
                      </td>

                      {/* 조치 액션 버튼 */}
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleToggleSuspend(member.username)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            border: '1px solid',
                            borderColor: member.isSuspended ? 'var(--success)' : 'var(--danger)',
                            background: member.isSuspended ? 'rgba(0, 184, 148, 0.1)' : 'rgba(214, 48, 49, 0.1)',
                            color: member.isSuspended ? 'var(--success)' : 'var(--danger)',
                            transition: 'all 0.2s',
                          }}
                        >
                          {member.isSuspended ? '정지 해제' : '계정 정지'}
                        </button>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
}
