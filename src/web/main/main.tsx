// @ts-nocheck
"use client";

// web/main 폴더 - 소비자(일반 사용자) 메인 화면 컴포넌트 및 데이터 조회 모듈
import React, { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import Navbar from '../../components/Navbar';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { initDb } from '../../utils/authDb';
import { sql, IS_MOCK_MODE } from '../../lib/db';

// ─── 타입 정의 ───────────────────────────────────────────────
export interface ActiveTruck {
  id: number;
  truck_name: string;       // 트럭 상호명
  status: string;           // 영업 상태
  latitude: number | null;  // 위도
  longitude: number | null; // 경도
  updated_at: string;       // 마지막 업데이트 시각
}

const CATEGORIES = [
  { id: 'all', label: '전체 🍴' },
  { id: 'snack', label: '분식 (떡볶이/튀김) 🍢' },
  { id: 'sweet', label: '디저트 (호떡/크레페) 🥞' },
  { id: 'skewer', label: '꼬치 (닭꼬치/염통) 🍢' },
  { id: 'takoyaki', label: '타코야끼 🐙' },
  { id: 'meat', label: '양식 (스테이크/버거) 🥩' },
];

const MOCK_TRUCKS = [
  {
    id: 101,
    name: "한강 꿀닭꼬치",
    category: "skewer",
    lat: 37.5665,
    lng: 126.9780,
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

// ─── 데이터베이스 조회 함수 (기존 CLI 지원용 및 API용) ─────────────────────

export async function getActiveTrucksForWeb(): Promise<ActiveTruck[]> {
  if (IS_MOCK_MODE) return MOCK_TRUCKS.map(t => ({ id: t.id, truck_name: t.name, status: t.status, latitude: t.lat, longitude: t.lng, updated_at: new Date().toISOString() }));
  const rows = await sql`
    SELECT id, truck_name, status, latitude, longitude, updated_at
    FROM food_trucks
    WHERE status = 'active'
    ORDER BY updated_at DESC
  `;
  return rows as ActiveTruck[];
}

export async function searchTrucksByName(keyword: string): Promise<ActiveTruck[]> {
  if (IS_MOCK_MODE) {
    return MOCK_TRUCKS.filter(t => t.name.toLowerCase().includes(keyword.toLowerCase())).map(t => ({ id: t.id, truck_name: t.name, status: t.status, latitude: t.lat, longitude: t.lng, updated_at: new Date().toISOString() }));
  }
  const rows = await sql`
    SELECT id, truck_name, status, latitude, longitude, updated_at
    FROM food_trucks
    WHERE truck_name ILIKE ${'%' + keyword + '%'}
    ORDER BY updated_at DESC
  `;
  return rows as ActiveTruck[];
}

export async function getTruckSummary(): Promise<{ active: number; total: number }> {
  if (IS_MOCK_MODE) {
    return { active: 2, total: 3 };
  }
  const [activeResult, totalResult] = await Promise.all([
    sql`SELECT COUNT(*) AS count FROM food_trucks WHERE status = 'active'`,
    sql`SELECT COUNT(*) AS count FROM food_trucks`,
  ]);
  return {
    active: Number(activeResult[0].count),
    total: Number(totalResult[0].count),
  };
}

// ─── 소비자용 메인 지도 페이지 UI 컴포넌트 ─────────────────────────────────

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
  const naverMapInstanceRef = useRef(null);
  const overlaysRef = useRef([]);

  // 🗺️ Leaflet (오픈스트리트맵) 예비 지도 인스턴스
  const leafletMapInstanceRef = useRef(null);
  const leafletMarkersRef = useRef([]);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);

  // ⭕ 내 위치 반경 필터 상태
  const [searchRadius, setSearchRadius] = useState(null);
  const naverCircleRef = useRef(null);
  const leafletCircleRef = useRef(null);

  // 🌤️ 실시간 날씨 데이터 상태
  const [weatherData, setWeatherData] = useState(null);
  const [selectedSpotWeather, setSelectedSpotWeather] = useState(null);

  // 🔍 [김유환 추가] 주소 및 동네 검색창 상태
  const [searchQuery, setSearchQuery] = useState('');

  const apiKey = process.env.NEXT_PUBLIC_NAVER_MAP_KEY;

  // 🔍 [김유환 추가] 동네/주소 검색 실행 (네이버 Geocoder 서브모듈 호출)
  const handleSearchAddress = () => {
    if (!searchQuery.trim()) {
      alert('검색할 주소를 입력해 주세요!');
      return;
    }

    if (!window.naver || !window.naver.maps || !window.naver.maps.Service) {
      alert('네이버 지도 서비스가 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    window.naver.maps.Service.geocode({
      query: searchQuery
    }, (status, response) => {
      if (status !== window.naver.maps.Service.Status.OK) {
        alert('검색 결과가 없거나 주소 변환에 실패했습니다.');
        return;
      }

      const result = response.v2;
      if (result.addresses.length === 0) {
        alert('해당하는 동네 주소를 찾을 수 없습니다.');
        return;
      }

      const addressItem = result.addresses[0];
      const lat = parseFloat(addressItem.y);
      const lng = parseFloat(addressItem.x);

      setMyLocation({ lat, lng });
      if (naverMapInstanceRef.current) {
        naverMapInstanceRef.current.setCenter(new window.naver.maps.LatLng(lat, lng));
      }
      alert(`📍 지도가 [${addressItem.roadAddress || addressItem.jibunAddress}] (으)로 이동되었습니다.`);
    });
  };

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
      setSelectedSpotWeather(null);
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

  // 0. 네이버 지도 인증 실패 수신
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mapProvider = localStorage.getItem('roadfood_map_provider') || 'naver';
      if (mapProvider === 'osm') {
        setIsMapError(true);
      } else {
        setIsMapError(false);
      }

      window.navermap_authFailure = () => {
        console.warn("⚠️ 네이버 지도 API 인증 실패! 시스템 설정을 자동으로 오픈스트리트맵(OSM)으로 전환합니다.");
        localStorage.setItem('roadfood_map_provider', 'osm');
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
          if (naverMapInstanceRef.current && window.naver && window.naver.maps) {
            naverMapInstanceRef.current.setCenter(new window.naver.maps.LatLng(newPos.lat, newPos.lng));
          }
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

  // 2. 실시간 Neon DB 데이터, 로컬 DB 데이터 및 고정 Mock 데이터를 실시간 병합
  useEffect(() => {
    initDb();
    
    const loadTrucksData = async () => {
      // 2-1. Vercel 환경에서 안전하게 연동될 Neon DB 실시간 트럭 데이터 fetch
      let dbTrucks = [];
      try {
        const res = await fetch('/api/trucks');
        if (res.ok) {
          dbTrucks = await res.json();
        }
      } catch (err) {
        console.error("⚠️ [Consumer Page] Neon DB 실시간 연동 데이터를 가져오는 데 실패했습니다:", err);
      }

      // 2-2. 사장님들이 가입하고 변경한 로컬 브라우저 저장 트럭 데이터
      const storedTrucks = JSON.parse(localStorage.getItem("roadfood_trucks") || "[]");
      const combined = MOCK_TRUCKS.map(t => ({ ...t, isDb: false })); // ◀ 기본 5개 더미는 isDb: false

      // 2-3. Neon DB 연동 데이터를 먼저 병합 (원격 서버 데이터 반영)
      dbTrucks.forEach(dbTruck => {
        const formatted = {
          id: dbTruck.id,
          name: dbTruck.name,
          category: dbTruck.category || 'snack',
          lat: dbTruck.lat,
          lng: dbTruck.lng,
          // 'preparing' 상태가 넘어오면 프론트엔드 호환용인 'prepare'로 매핑
          status: dbTruck.status === 'preparing' ? 'prepare' : dbTruck.status,
          ownerName: dbTruck.ownerName,
          phone: dbTruck.phone || "010-1234-5678",
          intro: dbTruck.intro,
          menu: dbTruck.menu || [],
          stock: dbTruck.stock || 0,
          waitingTeams: dbTruck.waitingTeams || 0,
          isDb: true // ◀ 진짜 Neon DB 데이터
        };

        const existingIdx = combined.findIndex(t => t.ownerName === dbTruck.ownerName);
        if (existingIdx !== -1) {
          combined[existingIdx] = formatted;
        } else {
          combined.push(formatted);
        }
      });

      // 2-4. 로컬 스토리지 데이터 병합 (로컬 오프라인 개발용)
      storedTrucks.forEach(st => {
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
          isDb: false // ◀ 로컬 더미는 isDb: false
        };

        const existingIdx = combined.findIndex(t => t.ownerName === st.ownerUsername);
        if (existingIdx !== -1) {
          combined[existingIdx] = formatted;
        } else {
          combined.push(formatted);
        }
      });

      setTrucksList(combined);
    };

    loadTrucksData();
  }, [isModalOpen]);

  // 🧭 [김유환 추가] 내 주변 반경 내에 실제로 잡히는 트럭들의 카테고리만 상단 필터바에 동적 노출
  useEffect(() => {
    const defaultIds = ['all', 'snack', 'sweet', 'skewer', 'takoyaki', 'meat'];
    const dynamicCats = [
      { id: 'all', label: '전체 🍴' },
      { id: 'snack', label: '분식 (떡볶이/튀김) 🍢' },
      { id: 'sweet', label: '디저트 (호떡/크레페) 🥞' },
      { id: 'skewer', label: '꼬치 (닭꼬치/염통) 🍢' },
      { id: 'takoyaki', label: '타코야끼 🐙' },
      { id: 'meat', label: '양식 (스테이크/버거) 🥩' },
    ];

    // 1) 반경이 지정된 경우, 필터링되어 지도에 표시되는 트럭 리스트 추출
    const activeAndNearbyTrucks = trucksList.filter(t => {
      if (t.status !== 'active' && t.status !== 'prepare') return false;
      if (!searchRadius) return true;
      const distance = getDistance(myLocation.lat, myLocation.lng, t.lat, t.lng);
      return distance <= searchRadius;
    });

    // 2) 걸러진 트럭들만을 대상으로 카테고리 중복 제거 수집
    activeAndNearbyTrucks.forEach(t => {
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
  }, [trucksList, myLocation, searchRadius]);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const filteredTrucks = trucksList.filter(truck => {
    if (selectedCategory !== 'all' && truck.category !== selectedCategory) {
      return false;
    }
    if (searchRadius) {
      const dist = getDistance(myLocation.lat, myLocation.lng, truck.lat, truck.lng);
      return dist <= searchRadius;
    }
    return true;
  });

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
        radius: searchRadius,
        fillColor: '#FF6B35',
        fillOpacity: 0.12,
        strokeColor: '#FF6B35',
        strokeOpacity: 0.6,
        strokeWeight: 2,
        clickable: false
      });
    }
  };

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

  useEffect(() => {
    if (isSdkLoaded && !isMapError && window.naver && window.naver.maps && mapRef.current) {
      try {
        const mapContainer = mapRef.current;
        const mapOptions = {
          center: new window.naver.maps.LatLng(myLocation.lat, myLocation.lng),
          zoom: 14,
          zoomControl: true,
          zoomControlOptions: {
            position: window.naver.maps.Position.RIGHT_CENTER
          }
        };

        const map = new window.naver.maps.Map(mapContainer, mapOptions);
        naverMapInstanceRef.current = map;
        renderNaverMarkers();
        drawNaverRadiusCircle();
      } catch (err) {
        console.error("네이버 지도 초기화 오류:", err);
        localStorage.setItem('roadfood_map_provider', 'osm');
        setIsMapError(true);
      }
    }
  }, [isSdkLoaded, isMapError, selectedCategory, trucksList, searchRadius, myLocation]);

  useEffect(() => {
    if (isMapError && isLeafletLoaded && window.L && mapRef.current) {
      try {
        if (leafletMapInstanceRef.current) {
          leafletMapInstanceRef.current.setView([myLocation.lat, myLocation.lng], 14);
          renderLeafletMarkers();
          drawLeafletRadiusCircle();
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
        renderLeafletMarkers();
        drawLeafletRadiusCircle();
      } catch (err) {
        console.error("Leaflet 지도 초기화 오류:", err);
      }
    }
  }, [isMapError, isLeafletLoaded, selectedCategory, trucksList, searchRadius, myLocation]);

  const renderNaverMarkers = () => {
    if (!window.naver || !window.naver.maps || !naverMapInstanceRef.current) return;

    overlaysRef.current.forEach(marker => marker.setMap(null));
    overlaysRef.current = [];

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

    filteredTrucks.forEach(truck => {
      const color =
        truck.status === 'active' ? '#00B894' :
          truck.status === 'prepare' ? '#FDCB6E' :
            '#D63031';

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

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(truck.lat, truck.lng),
        map: naverMapInstanceRef.current,
        icon: {
          content: markerHtml,
          size: new window.naver.maps.Size(42, 42),
          anchor: new window.naver.maps.Point(21, 21)
        }
      });

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

  const renderLeafletMarkers = () => {
    if (!window.L || !leafletMapInstanceRef.current) return;

    leafletMarkersRef.current.forEach(m => m.remove());
    leafletMarkersRef.current = [];

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

    filteredTrucks.forEach(truck => {
      const color =
        truck.status === 'active' ? '#00B894' :
          truck.status === 'prepare' ? '#FDCB6E' :
            '#D63031';

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
        className: 'custom-osm-marker',
        iconSize: [42, 42],
        iconAnchor: [21, 21]
      });

      const marker = window.L.marker([truck.lat, truck.lng], { icon: customIcon })
        .addTo(leafletMapInstanceRef.current);

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

  const getNaverMapDirectionUrl = (truck: any) => {
    return `https://map.naver.com/v5/directions/-/,,${truck.lat},${truck.lng},${encodeURIComponent(truck.name)},,,/walk?c=15,0,0,0,dh`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', paddingBottom: isMobile ? '64px' : '0' }}>
      {apiKey && !isMapError && (
        <Script
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${apiKey}`}
          strategy="afterInteractive"
          onReady={() => setIsSdkLoaded(true)}
          onError={() => {
            console.error("⚠️ 네이버 지도 SDK 로드 실패! 자동으로 오픈스트리트맵(OSM) 모드로 전환합니다.");
            localStorage.setItem('roadfood_map_provider', 'osm');
            setIsMapError(true);
          }}
        />
      )}

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
            strategy="afterInteractive"
            onReady={() => setIsLeafletLoaded(true)}
          />
        </>
      )}

      <Navbar userType="user" />

      {/* 🔍 [김유환 추가] 동네 / 주소 검색 바 */}
      <div style={{
        padding: '12px 16px',
        background: '#FFFFFF',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        zIndex: 51,
      }}>
        <input
          type="text"
          placeholder="동네 이름 또는 도로명 주소를 입력하세요 (예: 서초동, 여의도)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearchAddress();
          }}
          style={{
            flex: 1,
            padding: '12px 14px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'rgba(0, 0, 0, 0.02)',
            fontSize: '0.9rem',
            outline: 'none'
          }}
        />
        <button
          onClick={handleSearchAddress}
          style={{
            padding: '12px 18px',
            borderRadius: '12px',
            background: 'var(--primary)',
            color: '#FFFFFF',
            border: 'none',
            fontWeight: '600',
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-neon)'
          }}
        >
          🔍 검색
        </button>
      </div>

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

      <div style={{ flex: 1, position: 'relative', background: '#FAFAFC' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

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

        <button
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((pos) => {
                const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setMyLocation(newPos);
                if (naverMapInstanceRef.current && window.naver && window.naver.maps) {
                  naverMapInstanceRef.current.setCenter(new window.naver.maps.LatLng(newPos.lat, newPos.lng));
                }
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

          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
            {selectedTruck.intro && (
              <p style={{ fontSize: '0.82rem', color: '#555', margin: 0, lineHeight: '1.5' }}>
                {selectedTruck.intro}
              </p>
            )}

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

            {selectedTruck.menu && selectedTruck.menu.length > 0 && (
              <div style={{ background: '#F8F9FA', borderRadius: '10px', padding: '10px 12px' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#444', margin: '0 0 6px' }}>🍴 대표 메뉴</p>
                {selectedTruck.menu.slice(0, 3).map((item: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '3px' }}>
                    <span style={{ color: '#555' }}>{item.name}</span>
                    <span style={{ fontWeight: '700', color: '#FF6B35' }}>{item.price.toLocaleString()}원</span>
                  </div>
                ))}
              </div>
            )}

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
                  whiteSpace: 'pre-line',
                  maxHeight: '80px',
                  overflow: 'hidden',
                  WebkitLineClamp: 4,
                }}>
                  {selectedTruck.snsText}
                </p>
              </div>
            )}

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

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

if (typeof require !== 'undefined' && require.main === module) {
  main().catch((err) => {
    console.error('❌ 오류 발생:', err.message);
  });
}
