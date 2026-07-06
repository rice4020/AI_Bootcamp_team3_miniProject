"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import Navbar from '../../components/Navbar';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { getCurrentSession, getTruckInfo, updateTruckInfo, logoutUser, initDb } from '../../utils/authDb';

// 🚚 합법 영업 허가 스팟 모의 데이터 (전국푸드트럭허가구역 표준데이터 기반)
// 🚚 합법 영업 허가 스팟 모의 데이터 (전국푸드트럭허가구역 표준데이터 기반 30선 백업)
const MOCK_LEGAL_SPOTS = [
  {
    id: 'spot-1',
    name: "여의도 한강공원 멀티플라자 광장",
    lat: 37.5284,
    lng: 126.9320,
    rules: "합법 점용 허가구역 | 운영시간: 14:00 ~ 22:00 | 소재지: 서울 영등포구 여의동로 330",
  },
  {
    id: 'spot-2',
    name: "홍대 걷고싶은거리 버스킹 광장",
    lat: 37.5562,
    lng: 126.9225,
    rules: "청년창업 지원구역 | 운영시간: 11:00 ~ 21:00 | 소재지: 서울 마포구 어울마당로 115",
  },
  {
    id: 'spot-3',
    name: "강남역 8번출구 대형빌딩 전면공지",
    lat: 37.4982,
    lng: 127.0276,
    rules: "민간 빌딩 전면공지 | 운영시간: 11:00 ~ 14:00 | 소재지: 서울 서초구 서초대로 397",
  },
  {
    id: 'spot-4',
    name: "청계천 광통교 남단 광장",
    lat: 37.5688,
    lng: 126.9802,
    rules: "문화축제 연계구역 | 운영시간: 17:00 ~ 22:00 | 소재지: 서울 중구 남대문로9길 40",
  },
  {
    id: 'spot-5',
    name: "반포 한강공원 세빛섬 달빛광장",
    lat: 37.5113,
    lng: 126.9965,
    rules: "한강공원 공식 지정구역 | 운영시간: 16:00 ~ 23:00 | 소재지: 서울 서초구 신반포로11길 40",
  },
  {
    id: 'spot-6',
    name: "서울숲공원 야외광장 진입로",
    lat: 37.5443,
    lng: 127.0374,
    rules: "공원 점용 허가구역 | 운영시간: 10:00 ~ 20:00 | 소재지: 서울 성동구 동부간선도로 273",
  },
  {
    id: 'spot-7',
    name: "뚝섬 한강공원 수변광장 뒷편",
    lat: 37.5298,
    lng: 127.0700,
    rules: "지자체 공식 푸드구역 | 운영시간: 13:00 ~ 22:00 | 소재지: 서울 광진구 자양동 704",
  },
  {
    id: 'spot-8',
    name: "망원 한강공원 선착장 인근",
    lat: 37.5557,
    lng: 126.8943,
    rules: "망원 수변 특화구역 | 운영시간: 14:00 ~ 21:00 | 소재지: 서울 마포구 마포나루길 467",
  },
  {
    id: 'spot-9',
    name: "이촌 한강공원 인라인스케이트장 옆",
    lat: 37.5180,
    lng: 126.9635,
    rules: "공원 레저 연계 스팟 | 운영시간: 12:00 ~ 20:00 | 소재지: 서울 용산구 이촌로72길 62",
  },
  {
    id: 'spot-10',
    name: "상암 월드컵공원 평화의 광장",
    lat: 37.5684,
    lng: 126.8988,
    rules: "월드컵 경기 연계구역 | 운영시간: 10:00 ~ 21:00 | 소재지: 서울 마포구 월드컵로 291",
  },
  {
    id: 'spot-11',
    name: "어린이대공원 후문 주차 광장",
    lat: 37.5492,
    lng: 127.0818,
    rules: "가족단위 테마 상권 | 운영시간: 09:00 ~ 19:00 | 소재지: 서울 광진구 능동로 216",
  },
  {
    id: 'spot-12',
    name: "북서울꿈의숲 서문 정문진입 광장",
    lat: 37.6206,
    lng: 127.0428,
    rules: "북부 문화 휴양 스팟 | 운영시간: 11:00 ~ 20:00 | 소재지: 서울 강북구 월계로 173",
  },
  {
    id: 'spot-13',
    name: "올림픽공원 평화의 문 광장 야외",
    lat: 37.5173,
    lng: 127.1209,
    rules: "체육행사 연계 합법구역 | 운영시간: 10:00 ~ 22:00 | 소재지: 서울 송파구 올림픽로 424",
  },
  {
    id: 'spot-14',
    name: "신촌 연세로 차없는거리 진입광장",
    lat: 37.5583,
    lng: 126.9366,
    rules: "대학가 청년창업 구역 | 운영시간: 12:00 ~ 22:00 | 소재지: 서울 서대문구 신촌동 15",
  },
  {
    id: 'spot-15',
    name: "동대문 디자인 플라자 (DDP) 남측광장",
    lat: 37.5668,
    lng: 127.0094,
    rules: "동대문 패션특구 축제구역 | 운영시간: 16:00 ~ 23:00 | 소재지: 서울 중구 을지로 281",
  },
  {
    id: 'spot-16',
    name: "마포 문화비축기지 메인 야외광장",
    lat: 37.5702,
    lng: 126.8953,
    rules: "문화비축 예술시장 스팟 | 운영시간: 12:00 ~ 21:00 | 소재지: 서울 마포구 증산로 87",
  },
  {
    id: 'spot-17',
    name: "일산 호수공원 한울광장 수변로",
    lat: 37.6582,
    lng: 126.7645,
    rules: "꽃박람회 관광 활성화 스팟 | 운영시간: 10:00 ~ 21:00 | 소재지: 경기 고양시 일산동구 호수로 595",
  },
  {
    id: 'spot-18',
    name: "수원 화성행궁 앞 대형 광장",
    lat: 37.2828,
    lng: 127.0135,
    rules: "역사문화 축제 연계구역 | 운영시간: 11:00 ~ 22:00 | 소재지: 경기 수원시 팔달구 정조로 825",
  },
  {
    id: 'spot-19',
    name: "송도 센트럴파크 잔디광장 부근",
    lat: 37.3916,
    lng: 126.6385,
    rules: "인천 경제자유구역 지정스팟 | 운영시간: 11:00 ~ 20:00 | 소재지: 인천 연수구 컨벤시아대로 160",
  },
  {
    id: 'spot-20',
    name: "인천 소래포구 해오름공원 야외광장",
    lat: 37.3995,
    lng: 126.7345,
    rules: "어시장 관광 활성화 특구 | 운영시간: 13:00 ~ 22:00 | 소재지: 인천 남동구 아암대로 1562",
  },
  {
    id: 'spot-21',
    name: "성남 분당 율동공원 주차장 옆 진입로",
    lat: 37.3788,
    lng: 127.1478,
    rules: "가족 나들이 특수 상권 | 운영시간: 09:00 ~ 19:00 | 소재지: 경기 성남시 분당구 율동 1",
  },
  {
    id: 'spot-22',
    name: "과천 서울대공원 매표소 인근 광장",
    lat: 37.4278,
    lng: 127.0175,
    rules: "동물원/놀이공원 관광 상권 | 운영시간: 09:00 ~ 18:00 | 소재지: 경기 과천시 대공원광장로 102",
  },
  {
    id: 'spot-23',
    name: "가평 자라섬 서도 진입 잔디광장",
    lat: 37.8205,
    lng: 127.5235,
    rules: "재즈 페스티벌 지정 푸드존 | 운영시간: 11:00 ~ 23:00 | 소재지: 경기 가평군 가평읍 자라섬로 60",
  },
  {
    id: 'spot-24',
    name: "수원 광교호수공원 거울못 주변",
    lat: 37.2845,
    lng: 127.0655,
    rules: "신도시 호수공원 특화구역 | 운영시간: 12:00 ~ 21:00 | 소재지: 경기 수원시 영통구 광교호수로 165",
  },
  {
    id: 'spot-25',
    name: "부천 중앙공원 야외음악당 뒷편",
    lat: 37.5028,
    lng: 126.7648,
    rules: "문화예술 활성화 시범구역 | 운영시간: 10:00 ~ 20:00 | 소재지: 경기 부천시 소향로 162",
  },
  {
    id: 'spot-26',
    name: "시흥 배곧생명공원 전망대 앞",
    lat: 37.3725,
    lng: 126.7215,
    rules: "해안 낙조관람 나들이 상권 | 운영시간: 13:00 ~ 21:00 | 소재지: 경기 시흥시 배곧2로 25",
  },
  {
    id: 'spot-27',
    name: "안산 대부도 방아머리해변 진입로",
    lat: 37.2982,
    lng: 126.5925,
    rules: "관광 유원지 주말 특화 상권 | 운영시간: 10:00 ~ 22:00 | 소재지: 경기 안산시 단원구 대부황금로 112",
  },
  {
    id: 'spot-28',
    name: "파주 임진각 평화누리공원 잔디광장",
    lat: 37.8925,
    lng: 126.7415,
    rules: "안보관광 특수 지정구역 | 운영시간: 09:00 ~ 18:00 | 소재지: 경기 파주시 임진각로 148-40",
  },
  {
    id: 'spot-29',
    name: "남양주 삼패공원 야외분수대 광장",
    lat: 37.5828,
    lng: 127.2045,
    rules: "한강 수변공원 나들이 스팟 | 운영시간: 11:00 ~ 20:00 | 소재지: 경기 남양주시 강변북로 1630",
  },
  {
    id: 'spot-30',
    name: "대학로 마로니에공원 야외무대 주변",
    lat: 37.5815,
    lng: 127.0022,
    rules: "문화예술공연 특화 합법구역 | 운영시간: 12:00 ~ 21:30 | 소재지: 서울 종로구 대학로 104"
  }
];

// 🎡 주변 축제/행사 모의 데이터
const MOCK_EVENTS = [
  {
    id: 'event-1',
    name: "서울 밤도깨비 야시장 (여의도)",
    lat: 37.5265,
    lng: 126.9330,
    desc: "기간: 7.1~7.15 | 예상규모: 일평균 15,000명 | 푸드트럭 모집 완료 스팟",
  },
  {
    id: 'event-2',
    name: "홍대 버스킹 페스티벌",
    lat: 37.5550,
    lng: 126.9210,
    desc: "기간: 7.4~7.6 | 주말 버스킹 행사 연계로 청년 유동인구 200% 증가 예상",
  },
  {
    id: 'event-3',
    name: "광화문 한여름 밤의 푸드 페스타",
    lat: 37.5710,
    lng: 126.9768,
    desc: "기간: 7.5~7.10 | 예상규모: 일평균 8,000명 | 시청/광화문 직장인 특수 상권",
  }
];

// 📡 useSearchParams를 안전하게 사용하기 위한 Suspense 래퍼 컴포넌트
function OwnerMapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 쿼리 파라미터 좌표 읽기 (스팟 추천 페이지로부터 연동)
  const queryLat = searchParams.get('lat');
  const queryLng = searchParams.get('lng');

  const [session, setSession] = useState(null);
  const [truck, setTruck] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // 지도 레이어 토글 상태
  const [showSpots, setShowSpots] = useState(true);
  const [showEvents, setShowEvents] = useState(false);
  const [showWeather, setShowWeather] = useState(false);

  // 모달 관리
  const [selectedItem, setSelectedItem] = useState(null); 
  const [itemType, setItemType] = useState(null); 

  // 지도 관련
  const [myLocation, setMyLocation] = useState({ 
    lat: queryLat ? parseFloat(queryLat) : 37.5665, 
    lng: queryLng ? parseFloat(queryLng) : 126.9780 
  });
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [isMapError, setIsMapError] = useState(false);


  const mapRef = useRef(null);
  const naverMapInstanceRef = useRef(null); // 네이버 지도 인스턴스 보관용
  const overlaysRef = useRef([]); // 네이버 마커 오브젝트들

  // 🗺️ Leaflet (오픈스트리트맵) 예비 지도 인스턴스 및 상태
  const leafletMapInstanceRef = useRef(null);
  const leafletMarkersRef = useRef([]);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);

  // ⭕ 내 위치 반경 필터 상태 및 원 인스턴스 Ref
  const [searchRadius, setSearchRadius] = useState(null); // null, 500, 1000, 3000 미터 단위
  const naverCircleRef = useRef(null);
  const leafletCircleRef = useRef(null);

  // 📡 실시간 허가 구역 스팟 데이터 상태 및 연동
  const [legalSpotsList, setLegalSpotsList] = useState([]);

  const apiKey = process.env.NEXT_PUBLIC_NAVER_MAP_KEY; // 네이버 지도 Client ID

  // 🌤️ 실시간 날씨 데이터 상태 및 갱신 훅
  const [weatherData, setWeatherData] = useState(null); // 내 위치 주변 날씨
  const [selectedSpotWeather, setSelectedSpotWeather] = useState(null); // 선택한 장소(스팟/행사) 날씨

  // 🌤️ 내 위치 날씨 연동 훅
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

  // 🌤️ 선택된 추천 스팟 / 행사 위치 날씨 연동 훅
  useEffect(() => {
    if (selectedItem) {
      setSelectedSpotWeather(null); // 로딩 리셋
      const fetchSelectedWeather = async () => {
        try {
          const res = await fetch(`/api/weather?lat=${selectedItem.lat}&lng=${selectedItem.lng}`);
          if (res.ok) {
            const json = await res.json();
            if (json && json.success) {
              setSelectedSpotWeather(json.data);
            }
          }
        } catch (err) {
          console.warn("선택 장소 날씨 로드 실패:", err);
        }
      };
      fetchSelectedWeather();
    }
  }, [selectedItem]);

  // 0. 네이버 지도 인증 실패 수신 및 관리자 기본 지도 설정 로드
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mapProvider = localStorage.getItem('roadfood_map_provider') || 'naver';
      if (mapProvider === 'osm') {
        console.log("ℹ️ [Owner Map] 관리자가 오픈스트리트맵(OSM) 사용을 설정했습니다.");
        setIsMapError(true);
      } else {
        setIsMapError(false);
      }

      window.navermap_authFailure = () => {
        console.warn("⚠️ 네이버 지도 API 인증 실패! 예비 오픈스트리트맵(Leaflet)으로 전환합니다.");
        setIsMapError(true);
      };
    }
  }, []);

  // 0.5 실시간 공공데이터 푸드트럭 허가구역 API 로드
  useEffect(() => {
    const fetchLegalSpots = async () => {
      try {
        console.log("📡 [Owner Page] 전국푸드트럭허가구역 실시간 API 요청...");
        const res = await fetch('/api/legal-spots');
        const resData = await res.json();
        if (resData.success && resData.data) {
          setLegalSpotsList(resData.data);
          console.log(`✅ [Owner Page] 실시간 허가구역 ${resData.data.length}건 획득`);
        } else {
          setLegalSpotsList(MOCK_LEGAL_SPOTS);
        }
      } catch (err) {
        console.warn("⚠️ 실시간 허가구역 정보 로드 실패, 로컬 백업 데이터를 사용합니다:", err);
        setLegalSpotsList(MOCK_LEGAL_SPOTS);
      }
    };
    fetchLegalSpots();
  }, []);

  // 모바일 크기 감지 리스너
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. 로그인 확인 및 데이터 연동
  useEffect(() => {
    const userSession = getCurrentSession();
    if (!userSession) {
      alert("로그인이 필요합니다.");
      router.push('/auth/login');
      return;
    }

    initDb();
    const users = JSON.parse(localStorage.getItem("roadfood_users") || "[]");
    const dbUser = users.find(u => u.username === userSession.username);
    if (dbUser && dbUser.isSuspended) {
      alert("운영진에 의해 계정이 정지되었습니다. 즉시 로그아웃되며 서비스 접근이 차단됩니다.");
      logoutUser();
      router.push('/auth/login');
      return;
    }
    
    if (userSession.needPasswordChange) {
      router.push('/auth/change-password');
      return;
    }

    setSession(userSession);
    const truckData = getTruckInfo(userSession.username);
    setTruck(truckData);

    // Geolocation 연동 (쿼리 파라미터가 없을 때만 현재 위치 감지)
    if (!queryLat && !queryLng && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setMyLocation(coords);
        // 위치 감지 후 지도 중심을 현재 위치로 이동 (네이버 지도)
        if (naverMapInstanceRef.current && window.naver && window.naver.maps) {
          naverMapInstanceRef.current.setCenter(new window.naver.maps.LatLng(coords.lat, coords.lng));
        }
        // 위치 감지 후 지도 중심을 현재 위치로 이동 (오픈스트리트맵 Leaflet)
        if (leafletMapInstanceRef.current && window.L) {
          leafletMapInstanceRef.current.setView([coords.lat, coords.lng], 14);
        }
      });
    }
  }, [queryLat, queryLng]);

  // 1.8 ⭕ 네이버 지도 내 위치 기반 반경 원 그리기 헬퍼
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

  // 1.9 ⭕ Leaflet 지도 내 위치 기반 반경 원 그리기 헬퍼
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

  // 2. 네이버 지도 초기화 및 레이어 데이터 렌더링
  useEffect(() => {
    if (isSdkLoaded && !isMapError && window.naver && window.naver.maps && mapRef.current) {
      try {
        const mapContainer = mapRef.current;
        const mapOptions = {
          center: new window.naver.maps.LatLng(myLocation.lat, myLocation.lng),
          zoom: 14, // 네이버 맵 줌 레벨
          zoomControl: true,
          zoomControlOptions: {
            position: window.naver.maps.Position.RIGHT_CENTER
          }
        };
        const map = new window.naver.maps.Map(mapContainer, mapOptions);
        naverMapInstanceRef.current = map;
        renderMapLayers(); // 레이어 마커 그리기 호출
        drawNaverRadiusCircle(); // 반경 원 그리기
      } catch (err) {
        console.error("네이버 지도 초기화 실패 (오픈스트리트맵으로 자동 복구):", err);
        localStorage.setItem('roadfood_map_provider', 'osm'); // 💡 자가 복구
        setIsMapError(true);
      }
    }
  }, [isSdkLoaded, isMapError, showSpots, showEvents, showWeather, truck, legalSpotsList, searchRadius, myLocation]);

  // 2.5 오픈스트리트맵 (Leaflet) 예비 지도 초기화 및 레이어 데이터 렌더링
  useEffect(() => {
    if (isMapError && isLeafletLoaded && window.L && mapRef.current) {
      try {
        if (leafletMapInstanceRef.current) {
          leafletMapInstanceRef.current.setView([myLocation.lat, myLocation.lng], 14);
          renderLeafletMapLayers();
          drawLeafletRadiusCircle(); // 반경 원 그리기
          return;
        }

        const mapContainer = mapRef.current;
        const map = window.L.map(mapContainer, {
          zoomControl: false
        }).setView([myLocation.lat, myLocation.lng], 14);

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        window.L.control.zoom({
          position: 'topright'
        }).addTo(map);

        leafletMapInstanceRef.current = map;
        renderLeafletMapLayers();
        drawLeafletRadiusCircle(); // 반경 원 그리기
      } catch (err) {
        console.error("Leaflet 지도 초기화 실패:", err);
      }
    }
  }, [isMapError, isLeafletLoaded, showSpots, showEvents, showWeather, truck, legalSpotsList, searchRadius, myLocation]);


  // 2.9 📏 두 좌표 간의 거리 계산 (Haversine 공식, 단위: 미터)
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

  // 3. 네이버 지도 레이어 마커 그리기 (4개 레이어: 내위치 / 내트럭 / 합법스팟 / 행사)
  const renderMapLayers = () => {
    if (!window.naver || !window.naver.maps || !naverMapInstanceRef.current) return;

    // 기존 마커들 전체 삭제
    overlaysRef.current.forEach(o => o.setMap(null));
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

    // B. 내 트럭 마커 그리기 (주황 🚚 마커)
    if (truck) {
      const isOnline = truck.status === 'active';

      // 네이버 지도는 icon.content에 HTML 문자열을 넣어 커스텀 마커를 만듦
      const myTruckHtml = `
        <div class="${isOnline ? 'pulse-marker-primary' : ''}" style="
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #FF6B35;
          border: 3px solid ${isOnline ? '#00B894' : '#636E72'};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(255,107,53,0.6);
          position: relative;
        ">
          <span style="font-size: 1.3rem;">🚚</span>
          <span style="
            position: absolute;
            bottom: -6px;
            background: #FF6B35;
            color: white;
            font-size: 0.65rem;
            padding: 2px 6px;
            border-radius: 10px;
            font-weight: 700;
            white-space: nowrap;
            border: 1px solid rgba(255,255,255,0.3);
          ">내트럭</span>
        </div>
      `;

      const myMarker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(truck.lat, truck.lng),
        map: naverMapInstanceRef.current,
        icon: {
          content: myTruckHtml,
          size: new window.naver.maps.Size(44, 50),
          anchor: new window.naver.maps.Point(22, 25) // 마커 중앙 기준점
        }
      });
      overlaysRef.current.push(myMarker);
    }

    // C. 합법 스팟 레이어 렌더링 (초록 🏛️ 아이콘)
    if (showSpots) {
      legalSpotsList.forEach(spot => {
        // 반경 필터 적용
        if (searchRadius) {
          const dist = getDistance(myLocation.lat, myLocation.lng, spot.lat, spot.lng);
          if (dist > searchRadius) return; // 반경 바깥이면 제외
        }

        const spotHtml = `
          <div style="
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: #FFFFFF;
            border: 3px solid #00B894;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(0,184,148,0.25);
            cursor: pointer;
          ">
            <span style="font-size: 1.1rem;">🏛️</span>
          </div>
        `;

        const spotMarker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(spot.lat, spot.lng),
          map: naverMapInstanceRef.current,
          icon: {
            content: spotHtml,
            size: new window.naver.maps.Size(36, 36),
            anchor: new window.naver.maps.Point(18, 18)
          }
        });

        const spotEl = spotMarker.getElement();
        if (spotEl) {
          spotEl.style.cursor = 'pointer';
          spotEl.addEventListener('click', () => {
            setSelectedItem(spot);
            setItemType('spot');
          });
        }

        overlaysRef.current.push(spotMarker);
      });
    }

    // D. 주변 행사 정보 레이어 렌더링 (보라 🎆 아이콘)
    if (showEvents) {
      MOCK_EVENTS.forEach(ev => {
        // 반경 필터 적용
        if (searchRadius) {
          const dist = getDistance(myLocation.lat, myLocation.lng, ev.lat, ev.lng);
          if (dist > searchRadius) return; // 반경 바깥이면 제외
        }

        const evHtml = `
          <div style="
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: #FFFFFF;
            border: 3px solid #9B59B6;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(155,89,182,0.25);
            cursor: pointer;
          ">
            <span style="font-size: 1.1rem;">🎆</span>
          </div>
        `;

        const evMarker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(ev.lat, ev.lng),
          map: naverMapInstanceRef.current,
          icon: {
            content: evHtml,
            size: new window.naver.maps.Size(36, 36),
            anchor: new window.naver.maps.Point(18, 18)
          }
        });

        const evEl = evMarker.getElement();
        if (evEl) {
          evEl.style.cursor = 'pointer';
          evEl.addEventListener('click', () => {
            setSelectedItem(ev);
            setItemType('event');
          });
        }

        overlaysRef.current.push(evMarker);
      });
    }
  };

  // 3.5 오픈스트리트맵 (Leaflet) 지도 레이어 마커 그리기
  const renderLeafletMapLayers = () => {
    if (!window.L || !leafletMapInstanceRef.current) return;

    // 기존 마커들 전체 삭제
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

    // B. 내 트럭 마커 그리기
    if (truck) {
      const isOnline = truck.status === 'active';
      const myTruckHtml = `
        <div class="${isOnline ? 'pulse-marker-primary' : ''}" style="
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #FF6B35;
          border: 3px solid ${isOnline ? '#00B894' : '#636E72'};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(255,107,53,0.6);
          position: relative;
        ">
          <span style="font-size: 1.3rem;">🚚</span>
          <span style="
            position: absolute;
            bottom: -6px;
            background: #FF6B35;
            color: white;
            font-size: 0.65rem;
            padding: 2px 6px;
            border-radius: 10px;
            font-weight: 700;
            white-space: nowrap;
            border: 1px solid rgba(255,255,255,0.3);
          ">내트럭</span>
        </div>
      `;

      const customIcon = window.L.divIcon({
        html: myTruckHtml,
        className: 'custom-osm-my-truck-marker',
        iconSize: [44, 50],
        iconAnchor: [22, 25]
      });

      const marker = window.L.marker([truck.lat, truck.lng], { icon: customIcon })
        .addTo(leafletMapInstanceRef.current);
      
      leafletMarkersRef.current.push(marker);
    }

    // C. 합법 스팟 레이어 렌더링 (초록 🏛️ 아이콘)
    if (showSpots) {
      legalSpotsList.forEach(spot => {
        // 반경 필터 적용
        if (searchRadius) {
          const dist = getDistance(myLocation.lat, myLocation.lng, spot.lat, spot.lng);
          if (dist > searchRadius) return;
        }

        const spotHtml = `
          <div style="
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: #FFFFFF;
            border: 3px solid #00B894;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(0,184,148,0.25);
            cursor: pointer;
          ">
            <span style="font-size: 1.1rem;">🏛️</span>
          </div>
        `;

        const customIcon = window.L.divIcon({
          html: spotHtml,
          className: 'custom-osm-spot-marker',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const marker = window.L.marker([spot.lat, spot.lng], { icon: customIcon })
          .addTo(leafletMapInstanceRef.current);

        const markerEl = marker.getElement();
        if (markerEl) {
          markerEl.style.cursor = 'pointer';
          markerEl.addEventListener('click', () => {
            setSelectedItem(spot);
            setItemType('spot');
          });
        }

        leafletMarkersRef.current.push(marker);
      });
    }

    // D. 주변 행사 정보 레이어 렌더링 (보라 🎆 아이콘)
    if (showEvents) {
      MOCK_EVENTS.forEach(ev => {
        // 반경 필터 적용
        if (searchRadius) {
          const dist = getDistance(myLocation.lat, myLocation.lng, ev.lat, ev.lng);
          if (dist > searchRadius) return;
        }

        const evHtml = `
          <div style="
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: #FFFFFF;
            border: 3px solid #9B59B6;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(155,89,182,0.25);
            cursor: pointer;
          ">
            <span style="font-size: 1.1rem;">🎆</span>
          </div>
        `;

        const customIcon = window.L.divIcon({
          html: evHtml,
          className: 'custom-osm-event-marker',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const marker = window.L.marker([ev.lat, ev.lng], { icon: customIcon })
          .addTo(leafletMapInstanceRef.current);

        const markerEl = marker.getElement();
        if (markerEl) {
          markerEl.style.cursor = 'pointer';
          markerEl.addEventListener('click', () => {
            setSelectedItem(ev);
            setItemType('event');
          });
        }

        leafletMarkersRef.current.push(marker);
      });
    }
  };


  // 4. 원터치 영업 개시 및 영업 종료 기능
  const handleToggleSales = () => {
    if (!truck) return;

    const users = JSON.parse(localStorage.getItem("roadfood_users") || "[]");
    const dbUser = users.find(u => u.username === session?.username);
    if (dbUser && dbUser.isSuspended) {
      alert("정지된 계정입니다. 영업 상태를 변경할 수 없습니다.");
      logoutUser();
      router.push('/auth/login');
      return;
    }

    const newStatus = truck.status === 'active' ? 'prepare' : 'active';
    
    if (newStatus === 'active') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const updated = {
              ...truck,
              status: 'active',
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            updateTruckInfo(session.username, updated);
            setTruck(updated);
            alert("📍 현재 위치로 영업이 개시되었습니다! 소비자가 이제 사장님의 트럭을 지도에서 찾을 수 있습니다.");
          },
          () => {
            // 위치 권한 거부 시 지도 중심지로 개시
            let lat = myLocation.lat;
            let lng = myLocation.lng;
            if (naverMapInstanceRef.current && window.naver && window.naver.maps) {
              const center = naverMapInstanceRef.current.getCenter();
              lat = center.lat();
              lng = center.lng();
            } else if (leafletMapInstanceRef.current && window.L) {
              const center = leafletMapInstanceRef.current.getCenter();
              lat = center.lat;
              lng = center.lng;
            }
            
            const updated = {
              ...truck,
              status: 'active',
              lat: lat,
              lng: lng
            };
            updateTruckInfo(session.username, updated);
            setTruck(updated);
            alert("⚠️ 위치 감지에 실패하여 현재 지도 중심점 좌표로 영업을 개시합니다.");
          }
        );
      }
    } else {
      const updated = { ...truck, status: 'prepare' };
      updateTruckInfo(session.username, updated);
      setTruck(updated);
      alert("🔴 영업이 종료되었습니다. 소비자 지도에서 마커가 숨겨집니다.");
    }
  };

  // 5. 합법 스팟 마커 팝업 내에서 '해당 구역 영업 개시' 연동 기능
  const handleSpotStartSales = (spot) => {
    if (!truck) return;

    const users = JSON.parse(localStorage.getItem("roadfood_users") || "[]");
    const dbUser = users.find(u => u.username === session?.username);
    if (dbUser && dbUser.isSuspended) {
      alert("정지된 계정입니다. 해당 위치로 영업을 개시할 수 없습니다.");
      logoutUser();
      router.push('/auth/login');
      return;
    }

    const updated = {
      ...truck,
      status: 'active',
      lat: spot.lat,
      lng: spot.lng
    };
    updateTruckInfo(session.username, updated);
    setTruck(updated);
    setSelectedItem(null);
    setItemType(null);
    alert(`📍 [${spot.name}] 위치로 영업이 즉시 개시되었습니다!`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', backgroundColor: 'var(--background)', paddingBottom: isMobile ? '64px' : '0' }}>
      
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

      {/* 사장님 네비게이션 헤더 */}
      <Navbar userType="owner" truckStatus={truck?.status} />

      {/* 정보 레이어 토글 컨트롤러 바 */}
      <div style={{
        padding: '12px 24px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        zIndex: 50,
        overflowX: 'auto',
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowSpots(!showSpots)}
            className="glass-panel"
            style={{
              padding: '8px 16px',
              fontSize: '0.8rem',
              fontWeight: '600',
              border: '1px solid',
              borderColor: showSpots ? 'var(--success)' : 'var(--border)',
              background: showSpots ? 'rgba(0, 184, 148, 0.1)' : 'rgba(255,255,255,0.02)',
              color: showSpots ? 'var(--success)' : 'var(--text-secondary)',
            }}
          >
            🟢 허가 스팟 구역
          </button>
          
          <button
            onClick={() => setShowEvents(!showEvents)}
            className="glass-panel"
            style={{
              padding: '8px 16px',
              fontSize: '0.8rem',
              fontWeight: '600',
              border: '1px solid',
              borderColor: showEvents ? '#e84393' : 'var(--border)',
              background: showEvents ? 'rgba(232, 67, 147, 0.1)' : 'rgba(255,255,255,0.02)',
              color: showEvents ? '#e84393' : 'var(--text-secondary)',
            }}
          >
            🎡 주변 행사/축제
          </button>

          <button
            onClick={() => {
              if (weatherData) {
                alert(`🌤️ [내 위치 날씨 안내]\n- 현재 기온: ${weatherData.temp}°C\n- 현재 기상상태: ${weatherData.statusText} (${weatherData.icon})\n\n지도의 좌측 상단 기상 칩과 추천 스팟 상세 모달에서도 연동된 실시간 정보를 확인해 보실 수 있습니다.`);
              } else {
                alert("🌤️ 현재 날씨 데이터를 조회하고 있습니다. 잠시 후 다시 클릭해주세요!");
              }
            }}
            className="glass-panel"
            style={{
              padding: '8px 16px',
              fontSize: '0.8rem',
              fontWeight: '600',
              border: '1px solid',
              borderColor: 'var(--primary)',
              background: 'rgba(255, 107, 53, 0.1)',
              color: 'var(--primary)',
            }}
          >
            🌤️ 날씨 요약 안내
          </button>
        </div>

        {truck && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>내 트럭명: <strong>{truck.name}</strong></span>
            <span style={{ color: 'var(--border-light)' }}>|</span>
            <span>영업위치: <strong>{truck.status === 'active' ? '실시간 공개중' : '비공개'}</strong></span>
          </div>
        )}
      </div>

      {/* 지도 및 컨트롤 영역 */}
      <div style={{ flex: 1, position: 'relative' }}>
        
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

        {/* 🔄 실시간 위치 및 정보 동기화 버튼 */}
        <button
          onClick={() => {
            // 1. 최신 트럭 정보 localStorage로부터 갱신
            if (session) {
              const freshTruck = getTruckInfo(session.username);
              setTruck(freshTruck);
            }
            
            // 2. 현재 GPS 위치 감지 후 지도 중심 이동
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
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
                  alert("🔄 실시간 GPS 위치와 트럭 데이터 동기화가 완료되었습니다!");
                },
                (err) => {
                  console.warn("GPS 갱신 실패:", err);
                  alert("⚠️ GPS 신호를 찾을 수 없어 지도 중심점을 동기화하지 못했습니다. (권한 설정을 확인해주세요)");
                }
              );
            } else {
              alert("⚠️ 이 브라우저는 위치 정보(GPS) 조회를 지원하지 않습니다.");
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
          title="실시간 내 위치 동기화"
        >
          🔄
        </button>

        {/* 🟢🔴 영업 제어 원터치 플로팅 위젯 */}
        {truck && (
          <div style={{
            position: 'absolute',
            bottom: isMobile ? '20px' : '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <button
              onClick={handleToggleSales}
              style={{
                width: '180px',
                height: '56px',
                borderRadius: '28px',
                color: '#FFF',
                fontWeight: '700',
                fontSize: '1rem',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: truck.status === 'active' 
                   ? 'linear-gradient(135deg, var(--danger) 0%, #ff7675 100%)'
                   : 'linear-gradient(135deg, var(--success) 0%, #55efc4 100%)',
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.05) translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1) translateY(0)'}
            >
              {truck.status === 'active' ? '🛑 영업 종료하기' : '🟢 영업 시작하기'}
            </button>
            <span className="glass-panel" style={{
              fontSize: '0.75rem',
              padding: '4px 10px',
              color: truck.status === 'active' ? 'var(--success)' : 'var(--text-secondary)'
            }}>
              {truck.status === 'active' ? '소비자 지도에 마커 노출 중' : '비활성 상태 (지도에 안보임)'}
            </span>
          </div>
        )}

      </div>

      {/* 공통 팝업 모달 */}
      <Modal
        isOpen={selectedItem !== null}
        onClose={() => {
          setSelectedItem(null);
          setItemType(null);
        }}
        title={itemType === 'spot' ? '🟢 합법 영업 허가구역 정보' : '🎡 주변 행사/축제 정보'}
      >
        {selectedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {selectedItem.name}
            </h4>

            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              background: 'var(--surface-light)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              {itemType === 'spot' ? selectedItem.rules : selectedItem.desc}
            </p>

            {/* 🌤️ 해당 구역 실시간 기상청 날씨 */}
            <div style={{
              background: 'var(--surface-light)',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.85rem',
              color: 'var(--text-main)',
              border: '1px solid var(--border)'
            }}>
              <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>🌤️ 현지 실시간 날씨</span>
              {selectedSpotWeather ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}>
                  <span style={{ fontSize: '1.15rem' }}>{selectedSpotWeather.icon}</span>
                  <span style={{ color: 'var(--primary)' }}>{selectedSpotWeather.temp}°C</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 'normal' }}>({selectedSpotWeather.statusText})</span>
                </div>
              ) : (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>🔄 날씨 조회 중...</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              {itemType === 'spot' && truck && (
                <Button
                  variant="primary"
                  onClick={() => handleSpotStartSales(selectedItem)}
                  style={{ flex: 1 }}
                >
                  📍 해당 장소로 영업 개시
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedItem(null);
                  setItemType(null);
                }}
                style={itemType === 'spot' ? {} : { flex: 1 }}
              >
                닫기
              </Button>
            </div>

          </div>
        )}
      </Modal>

    </div>
  );
}

// 📡 useSearchParams SSR 대응 래퍼
export default function OwnerMainPage() {
  return (
    <Suspense fallback={<div>지도 로딩 중...</div>}>
      <OwnerMapContent />
    </Suspense>
  );
}
