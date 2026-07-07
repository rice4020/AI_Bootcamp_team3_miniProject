"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { checkUsernameDuplicate, registerUser } from '../../../utils/authDb';

export default function RegisterPage() {
  const router = useRouter();
  
  // 가입 진행 단계 (1: 기본 정보, 2: 상세 정보, 3: 가입 완료)
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('owner'); // 기본 점주

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
  
  // 점주 추가 정보
  const [menus, setMenus] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(''); // 대분류용 상태 추가
  const [menuCategoryId, setMenuCategoryId] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [birthdateError, setBirthdateError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [photoError, setPhotoError] = useState('');

  // 커스텀 레이어 팝업(모달) 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    // 메뉴 리스트 가져오기
    fetch('/api/menus')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.menus) {
          setMenus(data.menus);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const validateUsername = (val) => {
    const regex = /^[a-z][a-z0-9_]{3,19}$/;
    if (!regex.test(val)) return "4~20자 영소문자/숫자/_ 만 가능합니다.";
    return "";
  };

  const validatePassword = (val) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
    if (!regex.test(val)) return "8~16자 대소문자+숫자+특수문자 조합이어야 합니다.";
    return "";
  };

  const handleCheckDuplicate = async () => {
    setUsernameError('');
    const err = validateUsername(username);
    if (err) {
      setUsernameError(err);
      return;
    }
    const isDup = await checkUsernameDuplicate(username);
    if (isDup) {
      setUsernameError('이미 사용 중인 아이디입니다.');
    } else {
      setUsernameChecked(true);
    }
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setUsernameError('');
    setPasswordError('');
    setConfirmPasswordError('');
    
    let hasError = false;
    if (!usernameChecked) {
      setUsernameError('아이디 중복확인을 해주세요.');
      hasError = true;
    }
    const pwErr = validatePassword(password);
    if (pwErr) {
      setPasswordError(pwErr);
      hasError = true;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('비밀번호가 일치하지 않습니다.');
      hasError = true;
    }

    if (!hasError) setStep(2);
  };

  // 캔버스 리사이징 함수
  const resizeImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          }, 'image/jpeg', 0.8);
        };
      };
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoError('');
      setPhotoPreview(URL.createObjectURL(file));
      setPhotoFile(file);
    }
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length > 11) val = val.slice(0, 11);
    let formatted = val;
    if (val.length === 11) {
      formatted = val.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    } else if (val.length >= 8) {
      formatted = val.replace(/(\d{3})(\d{3,4})(\d{0,4})/, '$1-$2-$3');
    } else if (val.length >= 4) {
      formatted = val.replace(/(\d{3})(\d{0,4})/, '$1-$2');
    }
    setPhone(formatted);
    setPhoneError('');
  };

  const handleBirthChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length > 8) val = val.slice(0, 8);
    let formatted = val;
    if (val.length >= 7) {
      formatted = val.replace(/(\d{4})(\d{2})(\d{0,2})/, '$1-$2-$3');
    } else if (val.length >= 5) {
      formatted = val.replace(/(\d{4})(\d{0,2})/, '$1-$2');
    }
    setBirthdate(formatted);
    setBirthdateError('');
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setEmailError("이메일 주소 형식 오류 (예: user@example.com)");
    } else {
      setEmailError("");
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setNameError('');
    setPhoneError('');
    setBirthdateError('');
    setEmailError('');

    let hasError = false;
    if (!name.trim()) { setNameError("이름은 필수 항목입니다."); hasError = true; }
    if (!/^\d{3}-\d{3,4}-\d{4}$/.test(phone)) { setPhoneError("형식 오류 (예: 010-1234-5678)"); hasError = true; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) { setBirthdateError("형식 오류 (예: 1990-01-01)"); hasError = true; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError("이메일 주소 형식 오류"); hasError = true; }

    if (hasError) return;

    try {
      let finalPhotoUrl = null;

      if (role === 'owner' && photoFile) {
        // 이미지 리사이징 최적화
        const optimizedFile = await resizeImage(photoFile);
        
        // 실제 AI 검증 API 호출 (/api/verify-food-truck)
        const toBase64 = (file) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });
        
        try {
          const base64Data = await toBase64(optimizedFile);
          
          const verifyRes = await fetch('/api/verify-food-truck', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64Data,
              mimeType: optimizedFile.type,
              fileName: optimizedFile.name
            }),
          });
          const verifyData = await verifyRes.json();
          
          if (!verifyRes.ok) {
            setModalMessage(verifyData.error || '검증 중 서버 오류가 발생했습니다.');
            setIsModalOpen(true);
            return;
          }

          if (!verifyData.isFoodTruck) {
            setModalMessage(verifyData.reason || '실제 푸드트럭이 아니네요. 보유하신 실제 푸드트럭 이미지로 올려주세요');
            setIsModalOpen(true);
            return;
          }
          finalPhotoUrl = verifyData.fileUrl;
        } catch (uploadErr) {
          console.error("AI 검증 모듈 실패", uploadErr);
          alert('사진 업로드 중 서버 에러가 발생했습니다.');
          return;
        }
      }

      const newUser = {
        username,
        password,
        name,
        phone,
        birthdate,
        email,
        role,
        menuCategoryId: role === 'owner' ? menuCategoryId : null,
        photoUrl: finalPhotoUrl
      };

      await registerUser(newUser);
      setStep(3); 
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      <Navbar userType="user" />

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '40px' }}>
          
          {step < 3 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
              <span style={{ width: '32px', height: '6px', borderRadius: '3px', backgroundColor: step === 1 ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }} />
              <span style={{ width: '32px', height: '6px', borderRadius: '3px', backgroundColor: step === 2 ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }} />
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', textAlign: 'center', marginBottom: '8px' }}>정보 입력 (1/2) 🔑</h2>
              <form onSubmit={handleStep1Submit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <label><input type="radio" checked={role === 'owner'} onChange={() => setRole('owner')} /> 점주(기본)</label>
                  <label><input type="radio" checked={role === 'customer'} onChange={() => setRole('customer')} /> 비회원/일반조회</label>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="input-label">아이디 <span style={{ color: 'var(--primary)' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" className="input-field" placeholder="4~20자 영문 소문자/숫자/_" value={username} onChange={(e) => { setUsername(e.target.value); setUsernameChecked(false); setUsernameError(''); }} required style={{ flex: 1 }} />
                    <Button type="button" onClick={handleCheckDuplicate} variant="secondary" style={{ padding: '0 16px', fontSize: '0.85rem' }}>중복확인</Button>
                  </div>
                  {usernameError && <span className="input-error-msg">{usernameError}</span>}
                  {usernameChecked && <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>✓ 사용 가능한 아이디입니다.</span>}
                </div>

                <Input id="reg-pw" label="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={passwordError} required />
                <Input id="reg-pw-confirm" label="비밀번호 확인" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} error={confirmPasswordError} required />

                <Button type="submit" variant="primary">다음 단계로 ➔</Button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', textAlign: 'center', marginBottom: '8px' }}>상세 정보 입력 (2/2) 👤</h2>
              <form onSubmit={handleStep2Submit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <Input id="reg-name" label="이름" value={name} onChange={(e) => { setName(e.target.value); setNameError(''); }} error={nameError} maxLength={10} required />
                <Input id="reg-phone" label="휴대폰 번호" placeholder="010-0000-0000" value={phone} onChange={handlePhoneChange} error={phoneError} maxLength={13} required />
                <Input id="reg-birth" label="생년월일 (8자리)" placeholder="2000-01-01" value={birthdate} onChange={handleBirthChange} error={birthdateError} maxLength={10} required />
                <Input id="reg-email" label="이메일 주소" type="email" value={email} onChange={handleEmailChange} error={emailError} required />

                {role === 'owner' && (
                  <>
                    <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="input-label">취급 메뉴 선택 <span style={{ color: 'var(--primary)' }}>*</span></label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <select className="input-field" value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setMenuCategoryId(''); }} required style={{ flex: 1 }}>
                          <option value="">대분류 선택</option>
                          {[...new Set(menus.map(m => m.category))].map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <select className="input-field" value={menuCategoryId} onChange={e => setMenuCategoryId(e.target.value)} required disabled={!selectedCategory} style={{ flex: 1 }}>
                          <option value="">소분류 선택</option>
                          {menus.filter(m => m.category === selectedCategory).map(m => (
                            <option key={m.id} value={m.id}>{m.subCategory}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="input-label">푸드트럭 사진 (점주 증빙용) <span style={{ color: 'var(--primary)' }}>*</span></label>
                      <input type="file" accept="image/*" onChange={handlePhotoChange} required />
                      {photoPreview && <img src={photoPreview} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px' }} />}
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <Button type="button" variant="secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>이전으로</Button>
                  <Button type="submit" variant="primary" style={{ flex: 2 }}>가입 완료 🎉</Button>
                </div>
              </form>
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '8px' }}>환영합니다!</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>회원가입이 성공적으로 완료되었습니다.</p>
              <Button onClick={() => router.push('/auth/login')} variant="primary" style={{ width: '100%' }}>로그인 하러 가기</Button>
            </div>
          )}
        </div>
      </main>

      {/* 예쁜 레이어 모달 팝업 UI */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-panel" style={{
            backgroundColor: 'var(--surface)', padding: '32px', borderRadius: '20px',
            width: '90%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)', animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🚨</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '12px', color: 'var(--danger)' }}>검증 실패</h3>
            <p style={{ marginBottom: '28px', color: 'var(--text-secondary)', lineHeight: '1.6', wordBreak: 'keep-all' }}>
              {modalMessage}
            </p>
            <Button onClick={() => setIsModalOpen(false)} variant="primary" style={{ width: '100%' }}>확인</Button>
          </div>
        </div>
      )}
    </div>
  );
}
