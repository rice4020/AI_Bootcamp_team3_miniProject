# Neon Database 테이블 구조 정의서

Neon Database(`DATABASE_URL`) 상에 존재하는 모든 테이블의 컬럼명, 데이터 타입, Null 여부 및 기본값 설정 현황을 정리한 명세서입니다.

---

## 1. 회원 및 푸드트럭 핵심 관리 테이블 (Prisma/기존)

### 👤 User 테이블
시스템에 등록된 전체 사용자(일반 회원, 사장님, 관리자 등)의 계정 정보를 저장합니다.

| 컬럼명 | 데이터 타입 | 제약 조건 / 설명 |
| :--- | :--- | :--- |
| **id** | `text` | **Primary Key** |
| **username** | `text` | **NOT NULL** (로그인 ID) |
| **password** | `text` | **NOT NULL** (암호화 비밀번호) |
| **name** | `text` | **NOT NULL** (이름) |
| **phone** | `text` | `NULL 허용` (연락처) |
| **email** | `text` | **NOT NULL** (이메일) |
| **role** | `USER-DEFINED` | **NOT NULL**, 기본값: `'USER'::"Role"` (회원 역할 구분) |
| **createdAt** | `timestamp without time zone` | **NOT NULL**, 기본값: `CURRENT_TIMESTAMP` |
| **updatedAt** | `timestamp without time zone` | **NOT NULL** (최근 수정일) |

### 🚚 FoodTruck 테이블
사장님 회원이 소유하고 관리하는 푸드트럭의 기본 프로필 및 위치, 실시간 상태 정보입니다.

| 컬럼명 | 데이터 타입 | 제약 조건 / 설명 |
| :--- | :--- | :--- |
| **id** | `text` | **Primary Key** |
| **userId** | `text` | **NOT NULL** (소유자 User ID) |
| **name** | `text` | **NOT NULL** (푸드트럭 상호명) |
| **menu** | `text` | `NULL 허용` (판매 메뉴 요약) |
| **priceInfo** | `text` | `NULL 허용` (가격 정보) |
| **stock** | `integer` | `NULL 허용` (재고 수량) |
| **status** | `USER-DEFINED` | **NOT NULL**, 기본값: `'CLOSED'::"TruckStatus"` (영업중🟢, 준비중🟡, 소진🔴 등) |
| **latitude** | `double precision` | `NULL 허용` (실시간 영업 위도) |
| **longitude** | `double precision` | `NULL 허용` (실시간 영업 경도) |
| **notice** | `text` | `NULL 허용` (긴급 공지/안내 사항) |
| **createdAt** | `timestamp without time zone` | **NOT NULL**, 기본값: `CURRENT_TIMESTAMP` |
| **updatedAt** | `timestamp without time zone` | **NOT NULL** |

---

## 2. SNS 홍보 관리 테이블

### 📱 sns_announcements 테이블
사장님 유저가 AI 에이전트를 통해 생성하고 편집 및 수정한 인스타그램용 홍보 피드 히스토리입니다.

| 컬럼명 | 데이터 타입 | 제약 조건 / 설명 |
| :--- | :--- | :--- |
| **id** | `integer` | **Primary Key** (자동 증가) |
| **owner_id** | `character varying(50)` | **NOT NULL** (사장님 회원 ID) |
| **location** | `character varying(255)` | **NOT NULL** (영업 중인 지리 주소) |
| **menu** | `character varying(255)` | **NOT NULL** (판매 메뉴 정보) |
| **prompt_style** | `character varying(50)` | **NOT NULL** (감성형, 유쾌형, 정보전달형 스타일) |
| **generated_content** | `text` | **NOT NULL** (AI가 최초 생성한 문구) |
| **edited_content** | `text` | **NOT NULL** (사장님이 textarea에서 최종 수정한 문구) |
| **created_at** | `timestamp with time zone` | `NULL 허용`, 기본값: `CURRENT_TIMESTAMP` |

---

## 3. 관리자(Admin) 통계 및 모니터링 테이블

### 📊 users 테이블 (임시/테스트용)
대시보드 통계 검증을 위한 경량 회원 관리 테이블입니다.

| 컬럼명 | 데이터 타입 | 제약 조건 / 설명 |
| :--- | :--- | :--- |
| **id** | `integer` | **Primary Key** (자동 증가) |
| **username** | `character varying(50)` | **NOT NULL** |
| **role** | `character varying(20)` | **NOT NULL** (`customer`, `owner`, `admin`) |
| **is_active** | `boolean` | `NULL 허용`, 기본값: `true` (계정 활성화 상태) |
| **created_at** | `timestamp with time zone` | `NULL 허용`, 기본값: `CURRENT_TIMESTAMP` |

### 🚚 food_trucks 테이블 (임시/테스트용)
대시보드 집계를 위한 경량 푸드트럭 실시간 현황 테이블입니다.

| 컬럼명 | 데이터 타입 | 제약 조건 / 설명 |
| :--- | :--- | :--- |
| **id** | `integer` | **Primary Key** (자동 증가) |
| **owner_username** | `character varying(50)` | **NOT NULL** |
| **truck_name** | `character varying(100)` | **NOT NULL** |
| **status** | `character varying(20)` | **NOT NULL** (`active`, `preparing`, `sold_out`, `inactive`) |
| **latitude** | `numeric` | `NULL 허용` |
| **longitude** | `numeric` | `NULL 허용` |
| **updated_at** | `timestamp with time zone` | `NULL 허용`, 기본값: `CURRENT_TIMESTAMP` |

---

## 4. 행사 및 날씨 데이터 테이블

### 🎡 events 테이블
관리자가 등록/수정/삭제를 관리하며 사장님들에게 제공할 문화 축제 및 주변 행사 정보입니다.

| 컬럼명 | 데이터 타입 | 제약 조건 / 설명 |
| :--- | :--- | :--- |
| **id** | `integer` | **Primary Key** (자동 증가) |
| **title** | `character varying(150)` | **NOT NULL** (행사명) |
| **location** | `character varying(255)` | **NOT NULL** (행사 개최 장소) |
| **start_date** | `date` | **NOT NULL** (시작일) |
| **end_date** | `date` | **NOT NULL** (종료일) |
| **scale** | `character varying(50)` | **NOT NULL** (행사 인원 규모) |
| **description** | `text` | `NULL 허용` (상세 소개글) |
| **created_at** | `timestamp with time zone` | `NULL 허용`, 기본값: `CURRENT_TIMESTAMP` |

### ☀️ weather_forecasts 테이블
사장님들이 날씨 리스크에 유연하게 대응할 수 있도록 관리자가 통합 수정하는 기상 예보 데이터입니다.

| 컬럼명 | 데이터 타입 | 제약 조건 / 설명 |
| :--- | :--- | :--- |
| **id** | `integer` | **Primary Key** (자동 증가) |
| **region** | `character varying(100)` | **NOT NULL** (대상 행정 구역) |
| **forecast_date** | `date` | **NOT NULL** (예보 대상 날짜) |
| **temperature** | `numeric` | **NOT NULL** (예상 온도) |
| **sky_status** | `character varying(50)` | **NOT NULL** (맑음, 흐림, 비, 눈 등 상태) |
| **rain_probability** | `integer` | **NOT NULL** (강수 확률 %) |
| **updated_at** | `timestamp with time zone` | `NULL 허용`, 기본값: `CURRENT_TIMESTAMP` |

---

## 5. 기타 시스템 테이블

### 📍 Spot 테이블
푸드트럭 영업 허가를 획득한 기지 및 합법 추천 스팟 위치 정보입니다.

| 컬럼명 | 데이터 타입 | 제약 조건 / 설명 |
| :--- | :--- | :--- |
| **id** | `text` | **Primary Key** |
| **name** | `text` | **NOT NULL** |
| **address** | `text` | **NOT NULL** |
| **latitude** | `double precision` | **NOT NULL** |
| **longitude** | `double precision` | **NOT NULL** |
| **description** | `text` | `NULL 허용` |
| **createdAt** | `timestamp without time zone` | **NOT NULL**, 기본값: `CURRENT_TIMESTAMP` |
| **updatedAt** | `timestamp without time zone` | **NOT NULL** |

### 🎪 Event 테이블 (기존)
영업 전략 및 행사 위치 매핑을 위해 기존 설계되어 있던 행사 테이블 구조입니다.

| 컬럼명 | 데이터 타입 | 제약 조건 / 설명 |
| :--- | :--- | :--- |
| **id** | `text` | **Primary Key** |
| **name** | `text` | **NOT NULL** |
| **startDate** | `timestamp without time zone` | **NOT NULL** |
| **endDate** | `timestamp without time zone` | **NOT NULL** |
| **location** | `text` | **NOT NULL** |
| **latitude** | `double precision` | `NULL 허용` |
| **longitude** | `double precision` | `NULL 허용` |
| **status** | `text` | **NOT NULL** |
| **createdAt** | `timestamp without time zone` | **NOT NULL**, 기본값: `CURRENT_TIMESTAMP` |
| **updatedAt** | `timestamp without time zone` | **NOT NULL** |
 
