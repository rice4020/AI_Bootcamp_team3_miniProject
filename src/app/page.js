"use client";

import React, { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { initDb } from '../utils/authDb';

// 🚚 푸드트럭 카테고리 정의
const CATEGORIES = [
  { id: 'all', label: '전체 🍴' },
  { id: 'snack', label: '분식 (떡볶이/튀김) 🍢' },
  { id: 'sweet', label: '디저트 (호떡/크레페) 🥞' },
  { id: 'skewer', label: '꼬치 (닭꼬치/염통) 🍢' },
  { id: 'takoyaki', label: '타코야끼 🐙' },
  { id: 'meat', label: '양식 (스테이크/버거) 🥩' },
];

// 🚚 기본 예시용 푸드트럭 고정 데이터 (사장님 가입 전 화면을 채워주기 위함)
const MOCK_TRUCKS = [
  {
    id: 101,
    name: "한강 꿀닭꼬치",
    category: "skewer",
    lat: 37.5665,
    lng: 126.9780, // 서울시청 근처
    status: "active",
    ownerName: "김사장",
    phone: "010-1234-5678",
    intro: "바삭하고 촉촉한 닭꼬치 맛집! 특제 데리야끼 소스를 맛보세요.",
    menu: [
      { name: "파닭꼬치", price: 3500 },
      { name: "염통꼬치 (3개)", price: 3000 },
      { name: "치즈닭꼬치", price: 4000 }
    ],
    stock: 45,
    waitingTeams: 3
  },
  {
    id: 102,
    name: "강남역 5번출구 타코야끼",
    category: "takoyaki",
    lat: 37.5685,
    lng: 126.9799,
    status: "active",
    ownerName: "이사장",
    phone: "010-9876-5432",
    intro: "가쓰오부시 듬뿍! 겉바속촉 리얼 문어 타코야끼입니다.",
    menu: [
      { name: "오리지널 타코야끼 (8알)", price: 5000 },
      { name: "매콤 타코야끼 (8알)", price: 5500 },
      { name: "네기(파) 타코야끼 (8알)", price: 6000 }
    ],
    stock: 12,
    waitingTeams: 8
  },
  {
    id: 103,
    name: "청춘 호떡트럭",
    category: "sweet",
    lat: 37.5645,
    lng: 126.9750,
    status: "prepare",
    ownerName: "박사장",
    phone: "010-5555-4444",
    intro: "꿀 가득, 씨앗 듬뿍 들어간 찹쌀 호떡 굽는 중입니다.",
    menu: [
      { name: "찹쌀 씨앗호떡", price: 2000 },
      { name: "치즈 꿀호떡", price: 2500 }
    ],
    stock: 0,
    waitingTeams: 0
  }
];

export default function UserMainPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [myLocation, setMyLocation] = useState({ lat: 37.5665, lng: 126.9780 }); // 서울시청 기본값
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [isMapError, setIsMapError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 📡 실시간 연동 리스트 State
  const [trucksList, setTrucksList] = useState([]);
  const [categoriesList, setCategoriesList] = useState(CATEGORIES);

  const mapRef = useRef(null);
  const naverMapInstanceRef = useRef(null); // 네이버 지도 인스턴스 보관용
  const overlaysRef = useRef([]); // 네이버 마커 오브젝트 보관용

  // 🗺️ Leaflet (오픈스트리트맵) 예비 지도 인스턴스 및 상태
  const leafletMapInstanceRef = useRef(null);
  const leafletMarkersRef = useRef([]);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);

  // ⭕ 내 위치 반경 필터 상태 및 원 인스턴스 Ref
  const [searchRadius, setSearchRadius] = useState(null); // null, 500, 1000, 3000 미터 단위
  const naverCircleRef = useRef(null);
  const leafletCircleRef = useRef(null);

  // 🌤️ 실시간 날씨 데이터 상태
  const [weatherData, setWeatherData] = useState(null); // 내 위치 주변 날씨
  const [selectedSpotWeather, setSelectedSpotWeather] = useState(null); // 선택한 트럭 상세 날씨

  // 💬 방명록 및 예약 연동 State 선언
  const [reviewsList, setReviewsList] = useState([]);
  const [revNickname, setRevNickname] = useState('');
  const [revStars, setRevStars] = useState(5);
  const [revComment, setRevComment] = useState('');
  
  const [catName, setCatName] = useState('');
  const [catPhone, setCatPhone] = useState('');
  const [catDate, setCatDate] = useState('');
  const [catScale, setCatScale] = useState(30);
  const [catAddress, setCatAddress] = useState('');
  const [catDetails, setCatDetails] = useState('');

  // 📡 서버 방명록(리뷰) 목록 수신 함수
  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/reviews');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setReviewsList(json.data);
        }
      }
    } catch (err) {
      console.error("리뷰 수신 에러:", err);
    }
  };

  // 📝 방명록(리뷰) 신규 작성 핸들러
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!revNickname.trim() || !revComment.trim()) {
      alert("닉네임과 한줄평을 입력해 주세요!");
      return;
    }

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: revNickname,
          stars: revStars,
          comment: revComment
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          alert("🎉 방명록 등록이 완료되었습니다!");
          setRevNickname('');
          setRevComment('');
          setRevStars(5);
          fetchReviews();
        }
      }
    } catch (err) {
      alert("방명록 등록 중 에러 발생: " + err.message);
    }
  };

  // 📅 케이터링 예약 신청 제출 핸들러
  const handleCateringSubmit = async (e) => {
    e.preventDefault();
    if (!catName.trim() || !catAddress.trim()) {
      alert("신청자명과 행사 장소 주소는 필수 입력 사항입니다!");
      return;
    }

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catName,
          phone: catPhone,
          date: catDate,
          scale: `${catScale}명`,
          address: catAddress,
          menu: catDetails || '선택 없음'
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          alert("📅 케이터링 예약 신청이 완료되었습니다!\n사장님이 확인 후 기재하신 연락처로 연락드리겠습니다.");
          setCatName('');
          setCatPhone('');
          setCatDate('');
          setCatScale(30);
          setCatAddress('');
          setCatDetails('');
        }
      }
    } catch (err) {
      alert("예약 등록 중 에러 발생: " + err.message);
    }
  };

  // 최초 로드 시 방명록 수신 기동
  useEffect(() => {
    fetchReviews();
  }, []);

  const apiKey = process.env.NEXT_PUBLIC_NAVER_MAP_KEY; // 네이버 지도 Client ID

  // 🌤️ 내 위치 기반 기상청 실시간 날씨 갱신 훅
  useEffect(() => {
    const fetchMyLocationWeather = async () => {
      try {
        const res = await fetch(`/api/weather?lat=${myLocation.lat}&lng=${myLocation.lng}`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.success) {
            setWeatherData(json.data);
          }
        }
      } catch (err) {
        console.warn("내 주변 날씨 로드 실패:", err);
      }
    };
    fetchMyLocationWeather();
  }, [myLocation]);

  // 🌤️ 선택된 푸드트럭 위치 기반 기상청 실시간 날씨 갱신 훅
  useEffect(() => {
    if (selectedTruck) {
      setSelectedSpotWeather(null); // 로딩 리셋
      const fetchSelectedWeather = async () => {
        try {
          const res = await fetch(`/api/weather?lat=${selectedTruck.lat}&lng=${selectedTruck.lng}`);
          if (res.ok) {
            const json = await res.json();
            if (json && json.success) {
              setSelectedSpotWeather(json.data);
            }
          }
        } catch (err) {
          console.warn("선택 트럭 위치 날씨 로드 실패:", err);
        }
      };
      fetchSelectedWeather();
    }
  }, [selectedTruck]);

  // 0. 네이버 지도 인증 실패 수신 및 관리자 기본 지도 설정 로드
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mapProvider = localStorage.getItem('roadfood_map_provider') || 'naver';
      if (mapProvider === 'osm') {
        console.log("ℹ️ [Consumer Map] 관리자가 오픈스트리트맵(OSM) 사용을 설정했습니다.");
        setIsMapError(true);
      } else {
        setIsMapError(false);
      }

      window.navermap_authFailure = () => {
        console.warn("⚠️ 네이버 지도 API 인증 실패! 시스템 설정을 자동으로 오픈스트리트맵(OSM)으로 전환합니다.");
        localStorage.setItem('roadfood_map_provider', 'osm'); // 💡 자가 복구 (Self-Healing)
        setIsMapError(true);
      };
    }
  }, []);

  // 모바일 화면 감지 리스너
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. 내 현재 위치 감지 (Geolocation API)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setMyLocation(newPos);
          // 위치 감지 후 지도 중심을 현재 위치로 이동 (네이버 지도)
          if (naverMapInstanceRef.current && window.naver && window.naver.maps) {
            naverMapInstanceRef.current.setCenter(new window.naver.maps.LatLng(newPos.lat, newPos.lng));
          }
          // 위치 감지 후 지도 중심을 현재 위치로 이동 (오픈스트리트맵 Leaflet)
          if (leafletMapInstanceRef.current && window.L) {
            leafletMapInstanceRef.current.setView([newPos.lat, newPos.lng], 14);
          }
        },
        () => {
          console.warn("위치 획득 실패. 기본 시청 위치로 시작합니다.");
        }
      );
    }
  }, []);

  // 2. 실시간 로컬 DB 데이터와 고정 Mock 데이터를 실시간 병합
  useEffect(() => {
    const fetchServerTrucks = async () => {
      try {
        const res = await fetch('/api/trucks');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const combined = [...MOCK_TRUCKS];
            json.data.forEach(st => {
              const formatted = {
                id: st.id || st.ownerUsername || Math.random(),
                name: st.name,
                category: st.category,
                lat: st.lat,
                lng: st.lng,
                status: st.status,
                ownerName: st.ownerUsername,
                phone: "010-1234-5678",
                intro: st.intro,
                menu: st.menu || [],
                stock: st.stock || 0,
                waitingTeams: st.waitingTeams || 0,
                snsText: st.snsText || ''
              };

              const existingIdx = combined.findIndex(t => t.ownerName === st.ownerUsername);
              if (existingIdx !== -1) {
                combined[existingIdx] = formatted;
              } else {
                combined.push(formatted);
              }
            });
            setTrucksList(combined);

            // 동적 카테고리 중복제거 추출
            const defaultIds = ['all', 'snack', 'sweet', 'skewer', 'takoyaki', 'meat'];
            const dynamicCats = [...CATEGORIES];
            
            combined.forEach(t => {
              if (t.category && !defaultIds.includes(t.category)) {
                const isExist = dynamicCats.some(c => c.id === t.category);
                if (!isExist) {
                  dynamicCats.push({
                    id: t.category,
                    label: `${t.category} 🍴`
                  });
                }
              }
            });
            setCategoriesList(dynamicCats);
          }
        }
      } catch (err) {
        console.error("서버 트럭 목록 조회 실패:", err);
      }
    };
    fetchServerTrucks();
  }, [isModalOpen]);

  // 2.8 📏 두 좌표 간의 거리 계산 (Haversine 공식, 단위: 미터)
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // 지구 반경
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 3. 카테고리 및 내 위치 반경 필터링된 트럭 목록
  const filteredTrucks = trucksList.filter(truck => {
    // 카테고리 일치 여부
    if (selectedCategory !== 'all' && truck.category !== selectedCategory) {
      return false;
    }
    // 반경 거리 제한 일치 여부
    if (searchRadius) {
      const dist = getDistance(myLocation.lat, myLocation.lng, truck.lat, truck.lng);
      return dist <= searchRadius;
    }
    return true;
  });

  // 3.8 ⭕ 네이버 지도 내 위치 기반 반경 원 그리기 헬퍼
  const drawNaverRadiusCircle = () => {
    if (!window.naver || !naverMapInstanceRef.current) return;
    if (naverCircleRef.current) {
      naverCircleRef.current.setMap(null);
      naverCircleRef.current = null;
    }
    if (searchRadius) {
      naverCircleRef.current = new window.naver.maps.Circle({
        map: naverMapInstanceRef.current,
        center: new window.naver.maps.LatLng(myLocation.lat, myLocation.lng),
        radius: searchRadius, // 미터 단위
        fillColor: '#FF6B35',
        fillOpacity: 0.12,
        strokeColor: '#FF6B35',
        strokeOpacity: 0.6,
        strokeWeight: 2,
        clickable: false
      });
    }
  };

  // 3.9 ⭕ Leaflet 지도 내 위치 기반 반경 원 그리기 헬퍼
  const drawLeafletRadiusCircle = () => {
    if (!window.L || !leafletMapInstanceRef.current) return;
    if (leafletCircleRef.current) {
      leafletCircleRef.current.remove();
      leafletCircleRef.current = null;
    }
    if (searchRadius) {
      leafletCircleRef.current = window.L.circle([myLocation.lat, myLocation.lng], {
        radius: searchRadius,
        color: '#FF6B35',
        fillColor: '#FF6B35',
        fillOpacity: 0.12,
        weight: 2,
        interactive: false
      }).addTo(leafletMapInstanceRef.current);
    }
  };

  // 4. 네이버 지도 SDK 초기화
  useEffect(() => {
    if (isSdkLoaded && !isMapError && window.naver && window.naver.maps && mapRef.current) {
      try {
        const mapContainer = mapRef.current;
        const mapOptions = {
          center: new window.naver.maps.LatLng(myLocation.lat, myLocation.lng),
          zoom: 14, // 네이버 맵 줌 레벨 (높을수록 확대, 14가 동네 수준에 적절함)
          zoomControl: true, // 줌 컨트롤러 내장 옵션으로 추가
          zoomControlOptions: {
            position: window.naver.maps.Position.RIGHT_CENTER
          }
        };

        const map = new window.naver.maps.Map(mapContainer, mapOptions);
        naverMapInstanceRef.current = map;
        renderNaverMarkers(); // 마커 그리기 함수 호출
        drawNaverRadiusCircle(); // 반경 원 그리기
      } catch (err) {
        console.error("네이버 지도 초기화 오류 (오픈스트리트맵으로 자동 긴급 복구):", err);
        localStorage.setItem('roadfood_map_provider', 'osm'); // 💡 자가 복구
        setIsMapError(true);
      }
    }
  }, [isSdkLoaded, isMapError, selectedCategory, trucksList, searchRadius, myLocation]);

  // 4.5 오픈스트리트맵 (Leaflet) 예비 지도 초기화
  useEffect(() => {
    if (isMapError && isLeafletLoaded && window.L && mapRef.current) {
      try {
        // 이미 지도가 존재한다면 중심좌표와 줌만 이동
        if (leafletMapInstanceRef.current) {
          leafletMapInstanceRef.current.setView([myLocation.lat, myLocation.lng], 14);
          renderLeafletMarkers();
          drawLeafletRadiusCircle(); // 반경 원 그리기
          return;
        }

        const mapContainer = mapRef.current;
        const map = window.L.map(mapContainer, {
          zoomControl: false // 커스텀 제어를 위해 줌버튼 숨김
        }).setView([myLocation.lat, myLocation.lng], 14);

        // 오픈스트리트맵 타일 데이터 레이어 추가
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // 줌 컨트롤러 우측 중앙에 추가
        window.L.control.zoom({
          position: 'topright'
        }).addTo(map);

        leafletMapInstanceRef.current = map;
        renderLeafletMarkers();
        drawLeafletRadiusCircle(); // 반경 원 그리기
      } catch (err) {
        console.error("Leaflet 지도 초기화 오류:", err);
      }
    }
  }, [isMapError, isLeafletLoaded, selectedCategory, trucksList, searchRadius, myLocation]);

  // 5. 네이버 지도 커스텀 마커 그리기
  const renderNaverMarkers = () => {
    if (!window.naver || !window.naver.maps || !naverMapInstanceRef.current) return;

    // 기존 마커 전체 제거
    overlaysRef.current.forEach(marker => marker.setMap(null));
    overlaysRef.current = [];

    // A. 내 위치 마커 그리기 (파란 펄스 링 형태)
    const myLocationHtml = `
      <div style="
        width: 24px;
        height: 24px;
        background: rgba(9, 132, 227, 0.25);
        border: 2px solid #0984e3;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div class="pulse-marker-blue" style="
          width: 10px;
          height: 10px;
          background: #0984e3;
          border-radius: 50%;
          box-shadow: 0 0 8px #0984e3;
        "></div>
      </div>
    `;

    const myLocMarker = new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(myLocation.lat, myLocation.lng),
      map: naverMapInstanceRef.current,
      icon: {
        content: myLocationHtml,
        size: new window.naver.maps.Size(24, 24),
        anchor: new window.naver.maps.Point(12, 12)
      }
    });
    overlaysRef.current.push(myLocMarker);

    // B. 푸드트럭 마커 그리기
    filteredTrucks.forEach(truck => {
      // 영업 상태에 따른 테두리 색상 결정
      const color =
        truck.status === 'active' ? '#00B894' :   // 영업중: 초록
        truck.status === 'prepare' ? '#FDCB6E' :  // 준비중: 노랑
        '#D63031';                                // 영업종료: 빨강

      // 네이버 지도는 icon.content에 HTML 문자열을 넣어 커스텀 마커를 만듦
      const markerHtml = `
        <div class="${truck.status === 'active' ? 'pulse-marker-success' : ''}" style="
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 3.5px solid ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.25);
          cursor: pointer;
        ">
          <span style="font-size: 1.25rem;">🚚</span>
        </div>
      `;

      // 네이버 마커 생성 (icon.content에 HTML 삽입)
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(truck.lat, truck.lng),
        map: naverMapInstanceRef.current,
        icon: {
          content: markerHtml,
          size: new window.naver.maps.Size(42, 42),
          anchor: new window.naver.maps.Point(21, 21) // 마커 중앙 기준점
        }
      });

      // 마커 클릭 이벤트 → 트럭 상세 팝업 오픈
      const markerEl = marker.getElement();
      if (markerEl) {
        markerEl.style.cursor = 'pointer';
        markerEl.addEventListener('click', () => {
          setSelectedTruck(truck);
        });
      }

      overlaysRef.current.push(marker);
    });
  };

  // 5.5 오픈스트리트맵 (Leaflet) 커스텀 마커 그리기
  const renderLeafletMarkers = () => {
    if (!window.L || !leafletMapInstanceRef.current) return;

    // 기존 마커 전체 제거
    leafletMarkersRef.current.forEach(m => m.remove());
    leafletMarkersRef.current = [];

    // A. 내 위치 마커 그리기
    const myLocationIcon = window.L.divIcon({
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background: rgba(9, 132, 227, 0.25);
          border: 2px solid #0984e3;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div class="pulse-marker-blue" style="
            width: 10px;
            height: 10px;
            background: #0984e3;
            border-radius: 50%;
            box-shadow: 0 0 8px #0984e3;
          "></div>
        </div>
      `,
      className: 'custom-osm-my-location',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const myLocMarker = window.L.marker([myLocation.lat, myLocation.lng], { icon: myLocationIcon })
      .addTo(leafletMapInstanceRef.current);
    leafletMarkersRef.current.push(myLocMarker);

    // B. 푸드트럭 마커 그리기
    filteredTrucks.forEach(truck => {
      const color =
        truck.status === 'active' ? '#00B894' :
        truck.status === 'prepare' ? '#FDCB6E' :
        '#D63031';

      // HTML 커스텀 아이콘
      const customIcon = window.L.divIcon({
        html: `
          <div class="${truck.status === 'active' ? 'pulse-marker-success' : ''}" style="
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: #FFFFFF;
            border: 3.5px solid ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.25);
            cursor: pointer;
          ">
            <span style="font-size: 1.25rem;">🚚</span>
          </div>
        `,
        className: 'custom-osm-marker', // Leaflet 기본 스타일 지우기용 클래스
        iconSize: [42, 42],
        iconAnchor: [21, 21]
      });

      const marker = window.L.marker([truck.lat, truck.lng], { icon: customIcon })
        .addTo(leafletMapInstanceRef.current);

      // 💡 HTML 커스텀 마커 클릭 시 리액트 상태 동기화를 위해 DOM 직접 바인딩 사용
      const markerEl = marker.getElement();
      if (markerEl) {
        markerEl.style.cursor = 'pointer';
        markerEl.addEventListener('click', () => {
          setSelectedTruck(truck);
        });
      }

      leafletMarkersRef.current.push(marker);
    });
  };


  const getNaverMapDirectionUrl = (truck) => {
    return `https://map.naver.com/v5/directions/-/,,${truck.lat},${truck.lng},${encodeURIComponent(truck.name)},,,/walk?c=15,0,0,0,dh`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100vw', overflowY: 'auto', backgroundColor: 'var(--background)', paddingBottom: isMobile ? '64px' : '0' }}>
      {/* 네이버 지도 API SDK 동적 로드 */}
      {apiKey && !isMapError && (
        <Script
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${apiKey}`}
          strategy="lazyOnload"
          onLoad={() => setIsSdkLoaded(true)}
          onError={() => {
            console.error("⚠️ 네이버 지도 SDK 로드 실패! 자동으로 오픈스트리트맵(OSM) 모드로 전환합니다.");
            localStorage.setItem('roadfood_map_provider', 'osm'); // 💡 자가 복구
            setIsMapError(true);
          }}
        />
      )}

      {/* 🗺️ 네이버 장애 시 예비 Leaflet.js 라이브러리 동적 로드 */}
      {isMapError && (
        <>
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
            crossOrigin=""
          />
          <Script
            src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
            crossOrigin=""
            strategy="lazyOnload"
            onLoad={() => setIsLeafletLoaded(true)}
          />
        </>
      )}

      {/* 네비게이션 헤더 */}
      <Navbar userType="user" />

      {/* 카테고리 필터링 가로 바 */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        zIndex: 50,
      }}>
        {categoriesList.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: '600',
              transition: 'all 0.2s',
              border: '1px solid',
              borderColor: selectedCategory === cat.id ? 'var(--primary)' : 'var(--border)',
              background: selectedCategory === cat.id ? 'var(--primary)' : '#FFFFFF',
              color: selectedCategory === cat.id ? '#FFF' : 'var(--text-secondary)',
              boxShadow: selectedCategory === cat.id ? 'var(--shadow-neon)' : 'var(--shadow-sm)'
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 메인 맵 영역 */}
      <div style={{ position: 'relative', height: isMobile ? '50vh' : '65vh', minHeight: '450px', background: '#FAFAFC', borderBottom: '1px solid var(--border)' }}>
        
        {/* 맵 엘리먼트 (네이버/Leaflet 공용 사용) */}
        <div ref={mapRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

        {/* 🌤️ 내 주변 실시간 기상 날씨 칩 */}
        {weatherData && (
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 99,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '8px 14px',
            fontSize: '0.75rem',
            fontWeight: '700',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-main)'
          }}>
            <span style={{ fontSize: '1rem' }}>{weatherData.icon}</span>
            <span>내 주변 날씨: <strong style={{ color: 'var(--primary)' }}>{weatherData.temp}°C</strong> ({weatherData.statusText})</span>
          </div>
        )}

        {/* ⭕ 내 위치 기준 반경 필터 컨트롤 바 */}
        <div style={{
          position: 'absolute',
          bottom: '24px',
          right: '84px',
          zIndex: 99,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '6px',
          display: 'flex',
          gap: '4px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }}>
          {[
            { label: '500m', value: 500 },
            { label: '1km', value: 1000 },
            { label: '3km', value: 3000 }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setSearchRadius(opt.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                background: searchRadius === opt.value ? '#FF6B35' : 'transparent',
                color: searchRadius === opt.value ? '#FFFFFF' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              {opt.label}
            </button>
          ))}
          {searchRadius && (
            <button
              onClick={() => setSearchRadius(null)}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                background: 'rgba(214, 48, 49, 0.1)',
                color: '#D63031',
                transition: 'all 0.2s'
              }}
            >
              ❌ 해제
            </button>
          )}
        </div>

        {/* 예비 지도 로딩 안내 오버레이 */}
        {isMapError && !isLeafletLoaded && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(250, 250, 252, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            gap: '12px',
          }}>
            <span style={{ fontSize: '1.8rem' }}>🔄</span>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              예비 지도(오픈스트리트맵)를 구성하고 있습니다...
            </p>
          </div>
        )}

        {/* 이중화 가동중 알림 태그 */}
        {isMapError && isLeafletLoaded && (
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255, 107, 53, 0.95)',
            color: '#FFFFFF',
            padding: '8px 14px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: '700',
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
            zIndex: 99,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span>🛡️</span>
            <span>예비 오픈스트리트맵(OSM) 모드로 가동 중입니다.</span>
          </div>
        )}

        {/* 내 위치 복귀 컨트롤 위젯 */}
        <button
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((pos) => {
                const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setMyLocation(newPos);
                // 네이버 지도 중심 이동
                if (naverMapInstanceRef.current && window.naver && window.naver.maps) {
                  naverMapInstanceRef.current.setCenter(new window.naver.maps.LatLng(newPos.lat, newPos.lng));
                }
                // Leaflet 지도 중심 이동
                if (leafletMapInstanceRef.current && window.L) {
                  leafletMapInstanceRef.current.setView([newPos.lat, newPos.lng], 14);
                }
              });
            }
          }}
          className="glass-panel-hover"
          style={{
            position: 'absolute',
            bottom: isMobile ? '20px' : '24px',
            right: '24px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 40,
            cursor: 'pointer',
          }}
        >
          📍
        </button>
      </div>

      {/* 트럭 마커 클릭 시 하단 팝업 카드 */}
      {selectedTruck && (
        <div
          style={{
            position: 'fixed',
            bottom: isMobile ? '76px' : '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: isMobile ? 'calc(100vw - 32px)' : '400px',
            background: '#FFFFFF',
            borderRadius: '20px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
            zIndex: 200,
            overflow: 'hidden',
            animation: 'slideUp 0.25s ease',
          }}
        >
          {/* 팝업 헤더: 트럭명 + 상태 배지 + 닫기 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px 10px',
            borderBottom: '1px solid #F0F0F0',
            background: selectedTruck.status === 'active'
              ? 'linear-gradient(135deg, #f0fff8 0%, #ffffff 100%)'
              : '#FAFAFA',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.5rem' }}>🚚</span>
              <div>
                <p style={{ fontWeight: '800', fontSize: '1rem', margin: 0, color: '#1a1a2e' }}>
                  {selectedTruck.name}
                </p>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  color: '#FFF',
                  background:
                    selectedTruck.status === 'active' ? '#00B894' :
                    selectedTruck.status === 'prepare' ? '#FDCB6E' : '#D63031',
                }}>
                  {selectedTruck.status === 'active' ? '영업중 🟢' :
                   selectedTruck.status === 'prepare' ? '준비중 🟡' : '재료소진 🔴'}
                </span>
              </div>
            </div>
            {/* 닫기 버튼 */}
            <button
              onClick={() => setSelectedTruck(null)}
              style={{
                width: '28px', height: '28px',
                borderRadius: '50%',
                border: 'none',
                background: '#F0F0F0',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >×</button>
          </div>

          {/* 팝업 본문 */}
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>

            {/* 상세 소개문구 */}
            {selectedTruck.intro && (
              <p style={{ fontSize: '0.82rem', color: '#555', margin: 0, lineHeight: '1.5' }}>
                {selectedTruck.intro}
              </p>
            )}

            {/* 재고 / 대기 정보 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{
                flex: 1, background: '#F8F9FA', borderRadius: '10px',
                padding: '8px 10px', textAlign: 'center',
              }}>
                <p style={{ fontSize: '0.7rem', color: '#888', margin: '0 0 2px', fontWeight: '600' }}>실시간 재고</p>
                <p style={{
                  fontSize: '1rem', fontWeight: '800', margin: 0,
                  color: selectedTruck.stock > 10 ? '#2d3436' : '#D63031',
                }}>{selectedTruck.stock}개 남음</p>
              </div>
              <div style={{
                flex: 1, background: '#F8F9FA', borderRadius: '10px',
                padding: '8px 10px', textAlign: 'center',
              }}>
                <p style={{ fontSize: '0.7rem', color: '#888', margin: '0 0 2px', fontWeight: '600' }}>현재 대기</p>
                <p style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: '#FF6B35' }}>
                  {selectedTruck.waitingTeams} 팀
                </p>
              </div>
            </div>

            {/* 메뉴 목록 (최대 3개) */}
            {selectedTruck.menu && selectedTruck.menu.length > 0 && (
              <div style={{ background: '#F8F9FA', borderRadius: '10px', padding: '10px 12px' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#444', margin: '0 0 6px' }}>🍴 대표 메뉴</p>
                {selectedTruck.menu.slice(0, 3).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '3px' }}>
                    <span style={{ color: '#555' }}>{item.name}</span>
                    <span style={{ fontWeight: '700', color: '#FF6B35' }}>{item.price.toLocaleString()}원</span>
                  </div>
                ))}
              </div>
            )}

            {/* 팭업 전용: SNS 광고문구 (snsText가 저장된 트럭만 표시) */}
            {selectedTruck.snsText && (
              <div style={{
                background: 'linear-gradient(135deg, #fff5f0 0%, #fff0f8 100%)',
                border: '1px solid #FFD6C0',
                borderRadius: '12px',
                padding: '10px 12px',
              }}>
                <p style={{ fontSize: '0.7rem', fontWeight: '700', color: '#FF6B35', margin: '0 0 6px' }}>
                  📢 사장님 홍보 메시지
                </p>
                <p style={{
                  fontSize: '0.78rem', color: '#555',
                  margin: 0, lineHeight: '1.6',
                  whiteSpace: 'pre-line', // 줄바꾸으 보존
                  maxHeight: '80px',
                  overflow: 'hidden',
                  WebkitLineClamp: 4,
                }}>
                  {selectedTruck.snsText}
                </p>
              </div>
            )}

            {/* 🌤️ 해당 스팟의 실시간 기상청 날씨 */}
            <div style={{
              background: '#F1F2F6',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              color: 'var(--text-main)',
              border: '1px solid var(--border)'
            }}>
              <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>🌤️ 영업지 실시간 날씨</span>
              {selectedSpotWeather ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}>
                  <span style={{ fontSize: '1.1rem' }}>{selectedSpotWeather.icon}</span>
                  <span style={{ color: 'var(--primary)' }}>{selectedSpotWeather.temp}°C</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 'normal' }}>({selectedSpotWeather.statusText})</span>
                </div>
              ) : (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>🔄 조회 중...</span>
              )}
            </div>

            {/* 길찾기 버튼 */}
            <button
              onClick={() => window.open(getNaverMapDirectionUrl(selectedTruck), '_blank')}
              style={{
                width: '100%',
                padding: '11px',
                background: 'linear-gradient(135deg, #FF6B35 0%, #e84393 100%)',
                color: '#FFF',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              🧭 네이버 지도로 길찾기
            </button>
          </div>
        </div>
      )}

      {/* 5. 케이터링 예약 신청 섹션 */}
      <section style={{ padding: '60px 24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '2px' }}>CATERING BOOKING</span>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', marginTop: '8px', color: 'var(--text-primary)' }}>출장 케이터링 예약 문의</h2>
          <div style={{ width: '40px', height: '4px', background: 'var(--primary)', margin: '16px auto 0', borderRadius: '2px' }}></div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '32px' }}>
          {/* 정보 패널 */}
          <div className="glass-panel" style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>행사를 빛내줄 최고의 선택! 🚚</h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
              기업 워크숍, 대학교 축제, 방송 촬영장 서포트, 야외 파티 등 특별한 순간에 저희 푸드트럭이 직접 찾아가 맛있는 미식의 즐거움을 배달해 드립니다.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { step: '01', title: '예약 문의 접수', desc: '우측 신청 양식을 꼼꼼하게 작성해 제출하시면 즉시 예약 대기 상태가 됩니다.' },
                { step: '02', title: '세부 일정 및 예산 조율', desc: '행사 일자, 가격 대, 원하시는 메뉴 수량을 전화 상담으로 친절하게 맞춰 드립니다.' },
                { step: '03', title: '예약 확정 및 현장 조리', desc: '약속된 날짜에 트럭이 1시간 일찍 도착하여 철저하게 즉석 조리를 준비합니다.' }
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary)', background: 'rgba(255, 90, 31, 0.1)', padding: '6px 12px', borderRadius: '12px' }}>
                    {item.step}
                  </span>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{item.title}</h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 신청 폼 패널 */}
          <div className="glass-panel" style={{ flex: 1.2, padding: '32px' }}>
            <form onSubmit={handleCateringSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', gap: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>신청자 / 단체명 <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="text"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="예: 홍길동 (홍길동컴퍼니)"
                    required
                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: '#FAFAFC', fontSize: '0.88rem' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>연락처 <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="tel"
                    value={catPhone}
                    onChange={(e) => setCatPhone(e.target.value)}
                    placeholder="예: 010-1234-5678"
                    required
                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: '#FAFAFC', fontSize: '0.88rem' }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>희망 일자 <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="date"
                    value={catDate}
                    onChange={(e) => setCatDate(e.target.value)}
                    required
                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: '#FAFAFC', fontSize: '0.88rem', color: 'var(--text-primary)' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>예상 인원수 (명) <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="number"
                    value={catScale}
                    onChange={(e) => setCatScale(e.target.value)}
                    min="30"
                    placeholder="최소 30명 이상"
                    required
                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: '#FAFAFC', fontSize: '0.88rem' }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>행사 주소 장소 <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  value={catAddress}
                  onChange={(e) => setCatAddress(e.target.value)}
                  placeholder="예: 서울 마포구 상암산로 76"
                  required
                  style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: '#FAFAFC', fontSize: '0.88rem' }}
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>기타 요청사항</label>
                <textarea
                  value={catDetails}
                  onChange={(e) => setCatDetails(e.target.value)}
                  rows="3"
                  placeholder="선호하시는 대표 메뉴 구성이나 특별 요청을 입력해 주세요."
                  style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: '#FAFAFC', fontSize: '0.88rem', resize: 'none' }}
                />
              </div>
              
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #FF6B35 0%, #e84393 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(255, 107, 53, 0.35)',
                  marginTop: '6px'
                }}
              >
                📝 케이터링 예약 신청서 접수하기
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 6. 칭찬 방명록 & 리뷰 피드 섹션 */}
      <section style={{ background: '#1A1A24', padding: '60px 24px', color: '#FFFFFF', width: '100%' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '2px' }}>CUSTOMER GUESTBOOK</span>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', marginTop: '8px', color: '#FFFFFF' }}>맛있는 소통, 칭찬 방명록</h2>
            <div style={{ width: '40px', height: '4px', background: 'var(--primary)', margin: '16px auto 0', borderRadius: '2px' }}></div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '32px' }}>
            {/* 방명록 등록 폼 */}
            <div style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '32px',
              backdropFilter: 'blur(20px)'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '20px', color: '#FFFFFF' }}>방명록 한 줄 남기기 💬</h3>
              <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', gap: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#B2BEC3' }}>닉네임 <span style={{ color: '#E84393' }}>*</span></label>
                    <input
                      type="text"
                      value={revNickname}
                      onChange={(e) => setRevNickname(e.target.value)}
                      placeholder="예: 핫도그매니아"
                      required
                      style={{ padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#FFF', fontSize: '0.88rem' }}
                    />
                  </div>
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#B2BEC3' }}>평점 별점 <span style={{ color: '#E84393' }}>*</span></label>
                    <div style={{ display: 'flex', gap: '6px', height: '42px', alignItems: 'center' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRevStars(star)}
                          style={{ fontSize: '1.4rem', cursor: 'pointer', transition: 'transform 0.1s' }}
                          onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        >
                          {star <= revStars ? '⭐' : '☆'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#B2BEC3' }}>한 줄 평 <span style={{ color: '#E84393' }}>*</span></label>
                  <input
                    type="text"
                    value={revComment}
                    onChange={(e) => setRevComment(e.target.value)}
                    placeholder="핫도그 너무 맛있고 사장님이 엄청 친절하세요! 대박나세요!"
                    required
                    maxLength={100}
                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#FFF', fontSize: '0.88rem' }}
                  />
                </div>
                
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'var(--primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-neon)',
                    marginTop: '6px'
                  }}
                >
                  🚀 리뷰 올리기
                </button>
              </form>
            </div>
            
            {/* 실시간 방명록 피드 */}
            <div style={{
              flex: 1.5,
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                💬 실시간 방명록 피드 ({reviewsList.length})
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '380px', overflowY: 'auto', paddingRight: '8px' }}>
                {reviewsList.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#B2BEC3', padding: '40px 0', fontSize: '0.9rem' }}>첫 번째로 따뜻한 칭찬 방명록을 작성해 보세요!</p>
                ) : (
                  reviewsList.map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '800', fontSize: '0.9rem', color: '#FFF' }}>{rev.name}</span>
                        <div style={{ display: 'flex', gap: '2px', color: '#FFC048', fontSize: '0.82rem' }}>
                          {'⭐'.repeat(rev.stars)}
                        </div>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: '#DFE6E9', lineHeight: '1.4' }}>{rev.comment}</p>
                      <span style={{ fontSize: '0.72rem', color: '#74B9FF', alignSelf: 'flex-end' }}>{rev.date}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. 푸터 */}
      <footer style={{ background: '#111116', padding: '30px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#8A8A9E', width: '100%' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
          <div>
            <p style={{ fontWeight: '800', fontSize: '1.1rem', color: '#FFF', marginBottom: '4px' }}>🚚 Delicious Road</p>
            <p style={{ fontSize: '0.75rem' }}>&copy; 2026 Delicious Road. All rights reserved.</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '1.2rem' }}>
            <span>📸</span>
            <span>📺</span>
            <span>💬</span>
          </div>
        </div>
      </footer>

      {/* 팝업 슬라이드업 애니메이션 */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
