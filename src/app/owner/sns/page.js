"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Button from '../../../components/Button';
import { getCurrentSession, getTruckInfo, updateTruckInfo, logoutUser, initDb } from '../../../utils/authDb';

// 🎨 AI 톤앤매너 모의 템플릿 정의 (API Key 없을 때 Fallback으로 작동)
const TONE_TEMPLATES = {
  witty: (truck, loc) => `🤪 [${truck.name}] 오늘 강림!! 
📍 위치: ${loc}

${truck.intro}

오늘 메뉴 라인업 미쳤습니다.. 침샘 자극 주의! 🤤
${truck.menu.map(m => `👉 ${m.name}: ${m.price.toLocaleString()}원`).join('\n')}

남은 재고는 단 ${truck.stock}개! 🚨 
늦게 오면 품절각! 서둘러서 무브무브! 💨

#푸드트럭 #존맛탱 #실시간맛집 #인스타푸드 #JMT #오늘뭐먹지`,

  emotional: (truck, loc) => `🌸 은은한 바람이 부는 오늘, 
[${truck.name}]이 사장님의 일상에 작은 따뜻함을 배달하러 왔습니다.
소중한 하루 끝에 달콤하고 맛있는 위로 한 입 어떨까요? ✨
${truck.menu.map(m => `• ${m.name} (${m.price.toLocaleString()}원)`).join('\n')}

오늘 오늘도 정성 가득 담아 조리해 둘게요. 조심히 오세요. 💛

#푸드트럭 #감성맛집 #감성스타그램 #따뜻한위로 #골목맛집 #힐링푸드`,

  polite: (truck, loc) => `💼 안녕하십니까, [${truck.name}] 대표 사장님입니다.
금일 푸드트럭 운영 및 판매 정보 관련 공지드립니다.
📍 위치: ${loc}

${truck.intro}

금일 준비한 고품질 재료의 판매 단가를 안내해 드립니다.
${truck.menu.map(m => `- ${m.name}: ${m.price.toLocaleString()}원`).join('\n')}

- 금일 잔여 준비량: 약 ${truck.stock}개
항상 청결하고 바른 식재료 사용을 약속드리겠습니다. 감사합니다.

#푸드트럭 #영업공지 #공식계정 #바른먹거리 #청결맛집 #가족간식`
};

export default function SnsManagementPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [truck, setTruck] = useState(null);
  const [locationName, setLocationName] = useState('서울시청 광장 앞');

  // AI 톤앤매너 선택 State
  const [selectedTone, setSelectedTone] = useState('witty');
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // 1. 세션 확인 및 트럭 정보 수신
  useEffect(() => {
    const userSession = getCurrentSession();
    if (!userSession) {
      alert("로그인이 필요합니다.");
      router.push('/auth/login');
      return;
    }

    // 💡 실시간 계정 정지 여부 교차 검증!
    initDb();
    const users = JSON.parse(localStorage.getItem("roadfood_users") || "[]");
    const dbUser = users.find(u => u.username === userSession.username);
    if (dbUser && dbUser.isSuspended) {
      alert("운영진에 의해 계정이 정지되었습니다. 즉시 로그아웃되며 서비스 접근이 차단됩니다.");
      logoutUser();
      router.push('/auth/login');
      return;
    }
    
    // 임시 비밀번호 가드
    if (userSession.needPasswordChange) {
      router.push('/auth/change-password');
      return;
    }

    setSession(userSession);

    const truckData = getTruckInfo(userSession.username);
    if (truckData) {
      setTruck(truckData);
    }
  }, []);

  // 2. AI 문구 생성 처리
  const handleGenerateSnsMessage = async () => {
    if (!truck) return;
    setIsLoading(true);
    setIsCopied(false);

    try {
      // API 라우트에 생성 요청 전송
      const response = await fetch('/api/generate-sns-msg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          truckName: truck.name,
          intro: truck.intro,
          menus: truck.menu,
          locationName: locationName
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // 실제 Claude API Key가 로컬에 없을 때는 톤 선택 기능에 맞춘 Fallback 템플릿 사용
        if (data.isMock) {
          const mockText = TONE_TEMPLATES[selectedTone](truck, locationName);
          setGeneratedText(mockText);
          // 생성된 광고문구를 트럭 데이터에 저장 → 지도 팝업에서 표시
          updateTruckInfo(session.username, { ...truck, snsText: mockText });
        } else {
          // 키가 있어 외부 실제 모델이 돌았다면 결과 텍스트 그대로 적용
          setGeneratedText(data.text);
          // 실제 AI 생성 광고문구도 트럭 데이터에 저장
          updateTruckInfo(session.username, { ...truck, snsText: data.text });
        }
      } else {
        throw new Error(data.error || "문구 생성에 실패했습니다.");
      }
    } catch (err) {
      // 에러 발생 시 완전 로컬 생성 템플릿으로 우회 지원
      console.warn("API 연동 에러로 로컬 템플릿을 실행합니다:", err);
      const localText = TONE_TEMPLATES[selectedTone](truck, locationName);
      setGeneratedText(localText);
      // 에러 우회 시에도 광고문구 저장
      updateTruckInfo(session.username, { ...truck, snsText: localText });
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 클립보드 원터치 복사 기능
  const handleCopyToClipboard = () => {
    if (!generatedText) return;
    
    navigator.clipboard.writeText(generatedText).then(() => {
      setIsCopied(true);
      // 토스트 메시지 알림 2초 후 닫기
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }).catch(err => {
      console.error("복사 오류:", err);
      alert("클립보드 복사에 실패했습니다. 수동으로 드래그하여 복사해 주세요.");
    });
  };

  if (!session || !truck) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
        <Navbar userType="owner" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>트럭 기본 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      {/* 사장님 전용 헤더 */}
      <Navbar userType="owner" truckStatus={truck.status} />

      <main className="mobile-safe-bottom" style={{ flex: 1, padding: '40px 24px', display: 'flex', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '8px' }}>
              📢 SNS 홍보 문구 자동생성 (Claude AI)
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              현재 푸드트럭 영업 장소와 메뉴 정보를 바탕으로, 인스타그램 게시용 홍보 문구를 AI가 즉시 자동 설계합니다.
            </p>
          </div>

          <div className="responsive-grid-2">
            
            {/* 좌측: 조건 폼 입력 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* 장소 기입 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="input-label">오늘 영업 중인 대표 장소</label>
                <input
                  type="text"
                  className="input-field"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="예: 여의도 한강공원 입구 앞"
                />
              </div>

              {/* 🎨 SNS 톤앤매너 선택 필터 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="input-label">피드 톤앤매너 스타일</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    onClick={() => setSelectedTone('witty')}
                    className="glass-panel"
                    style={{
                      padding: '12px',
                      fontSize: '0.85rem',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid',
                      borderColor: selectedTone === 'witty' ? 'var(--primary)' : 'var(--border)',
                      background: selectedTone === 'witty' ? 'rgba(255, 107, 53, 0.1)' : 'rgba(255,255,255,0.01)',
                      color: selectedTone === 'witty' ? 'var(--primary)' : 'var(--text-secondary)'
                    }}
                  >
                    🤪 위트 넘치는 장사꾼 스타일
                  </button>

                  <button
                    onClick={() => setSelectedTone('emotional')}
                    className="glass-panel"
                    style={{
                      padding: '12px',
                      fontSize: '0.85rem',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid',
                      borderColor: selectedTone === 'emotional' ? 'var(--primary)' : 'var(--border)',
                      background: selectedTone === 'emotional' ? 'rgba(255, 107, 53, 0.1)' : 'rgba(255,255,255,0.01)',
                      color: selectedTone === 'emotional' ? 'var(--primary)' : 'var(--text-secondary)'
                    }}
                  >
                    🌸 감성 가득 따뜻한 위로 스타일
                  </button>

                  <button
                    onClick={() => setSelectedTone('polite')}
                    className="glass-panel"
                    style={{
                      padding: '12px',
                      fontSize: '0.85rem',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid',
                      borderColor: selectedTone === 'polite' ? 'var(--primary)' : 'var(--border)',
                      background: selectedTone === 'polite' ? 'rgba(255, 107, 53, 0.1)' : 'rgba(255,255,255,0.01)',
                      color: selectedTone === 'polite' ? 'var(--primary)' : 'var(--text-secondary)'
                    }}
                  >
                    💼 정중하고 신뢰감 가는 공식 스타일
                  </button>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={handleGenerateSnsMessage}
                loading={isLoading}
                style={{ padding: '14px', marginTop: '10px' }}
              >
                🪄 홍보 문구 생성하기
              </Button>
            </div>

            {/* 우측: 텍스트 에디터 & 복사하기 버튼 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="input-label">생성된 공지 본문 내용</span>
                {generatedText && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    (수정 가능 ✍️)
                  </span>
                )}
              </div>

              <textarea
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                placeholder="왼쪽 폼의 조건을 설정한 후 '홍보 문구 생성하기' 버튼을 누르시면, 여기에 AI 작성 결과물이 노출됩니다. 자유롭게 추가 및 다듬을 수 있습니다."
                style={{
                  flex: 1,
                  minHeight: '260px',
                  background: 'rgba(0, 0, 0, 0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '20px',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  lineHeight: '1.6',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'monospace'
                }}
              />

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }}>
                <Button
                  variant="primary"
                  onClick={handleCopyToClipboard}
                  disabled={!generatedText}
                  style={{ flex: 1, padding: '14px' }}
                >
                  📋 클립보드에 전체 복사하기
                </Button>

                {/* 복사 성공 토스트 애니메이션 */}
                {isCopied && (
                  <div style={{
                    position: 'absolute',
                    top: '-48px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--success)',
                    color: '#FFF',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    boxShadow: 'var(--shadow-md)',
                    animation: 'fadeInOut 2s ease'
                  }}>
                    📋 본문 글이 복사되었습니다!
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* 토스트 애니메이션 스타일 */}
      <style jsx global>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, -10px); }
          15% { opacity: 1; transform: translate(-50%, 0); }
          85% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -10px); }
        }
      `}</style>
    </div>
  );
}
