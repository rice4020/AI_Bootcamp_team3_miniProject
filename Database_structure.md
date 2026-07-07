# Neon Database 통합 테이블 구조 정의서 (ERD 스키마 명세)

본 명세서는 중복 혼재되어 있던 Prisma 레거시 테이블과 테스트용 임시 테이블을 하나로 통합하고, RDB의 무결성(Referential Integrity) 규약과 인덱스 최적화 전략을 반영하여 재설계한 통합 데이터베이스 스키마 명세서입니다.

---

## 🏗️ 데이터베이스 모델링 핵심 개선 사항

1. **테이블 및 네이밍 표준화**: 테이블명은 **PascalCase**, 컬럼명은 **camelCase** 규칙을 적용하여 일관성 있게 구성했습니다. (snake_case 기법 배제)
2. **중복 엔티티 통합**:
   - `User` & `users` ➔ `User` 테이블로 병합
   - `FoodTruck` & `food_trucks` ➔ `FoodTruck` 테이블로 병합
   - `Event` & `events` ➔ `Event` 테이블로 병합
3. **참조 무결성 (Foreign Key Constraints) 수립**:
   - 각 푸드트럭은 반드시 점주(`User`)에게 종속되도록 `ownerId` FK 매핑.
   - SNS 피드 생성이 특정 트럭 도메인에 묶이도록 `truckId` FK 매핑.
4. **인덱싱(Indexing)을 통한 쿼리 최적화**:
   - 실시간 위치 탐색(위·경도 바운더리 쿼리)의 시간 복잡도를 $O(N)$에서 $O(\log N)$으로 단축하기 위해 `latitude`와 `longitude`에 복합 B-Tree 인덱스(Composite Index) 설계 반영.

---

## 1. 계정 및 푸드트럭 마스터 테이블

### 👤 User (회원 테이블)
시스템에 등록된 전체 사용자(일반 소비자, 푸드트럭 점주, 시스템 관리자)의 계정 및 세션 정보를 보관합니다.

| 컬럼명 | 데이터 타입 | 제약 조건 / 설명 |
| :--- | :--- | :--- |
| **id** | `uuid` 또는 `varchar(50)` | **Primary Key** |
| **username** | `varchar(50)` | **NOT NULL, UNIQUE** (로그인 ID) |
| **password** | `varchar(255)` | **NOT NULL** (단방향 해시 암호화 비밀번호) |
| **name** | `varchar(50)` | **NOT NULL** (사용자 실명) |
| **phone** | `varchar(20)` | `NULL 허용` (연락처 정보) |
| **email** | `varchar(100)` | **NOT NULL, UNIQUE** (이메일 주소) |
| **role** | `varchar(20)` | **NOT NULL**, 기본값: `'customer'` (`customer`, `owner`, `admin`) |
| **isActive** | `boolean` | **NOT NULL**, 기본값: `true` (정지 여부 검증 필드) |
| **createdAt** | `timestamp with time zone` | **NOT NULL**, 기본값: `CURRENT_TIMESTAMP` |
| **updatedAt** | `timestamp with time zone` | **NOT NULL**, 기본값: `CURRENT_TIMESTAMP` |

---

### 🚚 FoodTruck (푸드트럭 테이블)
점주 회원(`owner`)이 등록하여 관리하는 푸드트럭의 메타데이터와 실시간 영업 및 재고 정보입니다.

| 컬럼명 | 데이터 타입 | 제약 조건 / 설명 |
| :--- | :--- | :--- |
| **id** | `varchar(50)` 또는 `serial` | **Primary Key** |
| **ownerId** | `varchar(50)` | **NOT NULL, Foreign Key** (참조: `User.id` ON DELETE CASCADE) |
| **truckName** | `varchar(100)` | **NOT NULL** (푸드트럭 상호명) |
| **menu** | `text` | `NULL 허용` (주요 취급 메뉴 설명) |
| **priceInfo** | `text` | `NULL 허용` (가격 구성 요약) |
| **stock** | `integer` | `NULL 허용`, 기본값: `0` (현재 재고 잔여량) |
| **status** | `varchar(20)` | **NOT NULL**, 기본값: `'inactive'` (`active`🟢, `preparing`🟡, `sold_out`🔴, `inactive`⚫) |
| **latitude** | `numeric(10, 6)` | `NULL 허용` (실시간 영업 위도) |
| **longitude** | `numeric(10, 6)` | `NULL 허용` (실시간 영업 경도) |
| **notice** | `text` | `NULL 허용` (실시간 고객 공지 사항) |
| **createdAt** | `timestamp with time zone` | **NOT NULL**, 기본값: `CURRENT_TIMESTAMP` |
| **updatedAt** | `timestamp with time zone` | **NOT NULL**, 기본값: `CURRENT_TIMESTAMP` |

*   **성능 최적화 인덱스**: `CREATE INDEX idx_truck_location ON FoodTruck(latitude, longitude);`
    *   *도입 배경*: 모바일 브라우저 뷰포트 반경 $R$ 내의 실시간 트럭 목록을 스캔할 때 B-Tree 복합 인덱스를 경유하게 하여 검색 성능을 최적화합니다.

---

## 2. AI SNS 홍보 피드 히스토리

### 📱 SnsAnnouncement (SNS 홍보 로그 테이블)
점주가 AI 도구로 생성하고 수정한 인스타그램 및 SNS 홍보 피드 생성 이력입니다.

| 컬럼명 | 데이터 타입 | 제약 조건 / 설명 |
| :--- | :--- | :--- |
| **id** | `serial` | **Primary Key** |
| **truckId** | `varchar(50)` | **NOT NULL, Foreign Key** (참조: `FoodTruck.id` ON DELETE CASCADE) |
| **locationName** | `varchar(255)` | **NOT NULL** (피드 작성 시 지정한 오프라인 위치) |
| **menuInfo** | `varchar(255)` | **NOT NULL** (피드 작성 시 홍보한 주력 메뉴) |
| **promptStyle** | `varchar(50)` | **NOT NULL** (AI 스타일 인자: `감성형`, `유쾌형`, `정보전달형`) |
| **generatedContent** | `text` | **NOT NULL** (LLM 에이전트가 최초 출력한 초안) |
| **editedContent** | `text` | **NOT NULL** (점주가 직접 수정하여 배포한 최종 문구) |
| **createdAt** | `timestamp with time zone` | **NOT NULL**, 기본값: `CURRENT_TIMESTAMP` |

---

## 3. 외부 환경 정보 및 추천 스팟

### 🎡 Event (문화 축제 및 주변 행사 테이블)
플랫폼 총괄 관리자가 제어하는 전국 축제 정보로, 점주들이 인파 유입 경로 분석 및 SNS 홍보 전략 수립에 활용합니다.

| 컬럼명 | 데이터 타입 | 제약 조건 / 설명 |
| :--- | :--- | :--- |
| **id** | `serial` 또는 `varchar(50)` | **Primary Key** |
| **title** | `varchar(150)` | **NOT NULL** (행사명) |
| **location** | `varchar(255)` | **NOT NULL** (개최 주소지) |
| **startDate** | `date` | **NOT NULL** (행사 시작 시각) |
| **endDate** | `date` | **NOT NULL** (행사 종료 시각) |
| **scale** | `varchar(50)` | **NOT NULL** (예상 유입 규모: `대형`, `중형`, `소형`) |
| **latitude** | `numeric(10, 6)` | `NULL 허용` (지도 매핑용 위도) |
| **longitude** | `numeric(10, 6)` | `NULL 허용` (지도 매핑용 경도) |
| **description** | `text` | `NULL 허용` (축제 상세 소개) |
| **createdAt** | `timestamp with time zone` | **NOT NULL**, 기본값: `CURRENT_TIMESTAMP` |

---

### ☀️ WeatherForecast (기상 예측 정보 테이블)
점주들이 날씨로 인한 원자재 수급 리스크를 최소화할 수 있도록 관리 및 제공되는 날씨 정보입니다.

| 컬럼명 | 데이터 타입 | 제약 조건 / 설명 |
| :--- | :--- | :--- |
| **id** | `serial` | **Primary Key** |
| **region** | `varchar(100)` | **NOT NULL** (행정 구역 명칭) |
| **forecastDate** | `date` | **NOT NULL** (예측일) |
| **temperature** | `numeric(4, 1)` | **NOT NULL** (예상 기온 ℃) |
| **skyStatus** | `varchar(50)` | **NOT NULL** (맑음, 흐림, 강우, 강설 등) |
| **rainProbability** | `integer` | **NOT NULL** (강수 확률 %) |
| **updatedAt** | `timestamp with time zone` | **NOT NULL**, 기본값: `CURRENT_TIMESTAMP` |

---

### 📍 Spot (합법 영업 추천 구역 테이블)
정부 또는 지자체가 지정한 푸드트럭 전용 영업 허가 구역 명세입니다.

| 컬럼명 | 데이터 타입 | 제약 조건 / 설명 |
| :--- | :--- | :--- |
| **id** | `varchar(50)` | **Primary Key** |
| **name** | `varchar(150)` | **NOT NULL** (추천 구역 이름) |
| **address** | `varchar(255)` | **NOT NULL** (지번/도로명 주소) |
| **latitude** | `numeric(10, 6)` | **NOT NULL** (위도) |
| **longitude** | `numeric(10, 6)` | **NOT NULL** (경도) |
| **rulesDescription** | `text` | `NULL 허용` (지자체 허가 조건 및 제한 규칙) |
| **createdAt** | `timestamp with time zone` | **NOT NULL**, 기본값: `CURRENT_TIMESTAMP` |
| **updatedAt** | `timestamp with time zone` | **NOT NULL**, 기본값: `CURRENT_TIMESTAMP` |
