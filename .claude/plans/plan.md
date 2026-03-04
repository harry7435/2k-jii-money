# 부부 가계부 앱 (2k-jii-money)

## Context
부부가 함께 사용하는 가계부 앱. PC(macOS/Windows)와 모바일(iOS/Android) 모두에서 동작하며, 로그인 없이 가족 코드/QR 코드로 기기를 연결하여 데이터를 동기화한다.

## 기술 스택
- **Frontend**: Flutter (단일 코드베이스, 크로스 플랫폼)
- **Backend**: Supabase (PostgreSQL + 실시간 동기화)
- **상태관리**: Riverpod
- **라우팅**: go_router
- **차트**: fl_chart
- **QR**: qr_flutter + mobile_scanner

## 데이터 모델 (Supabase Tables)

```sql
-- 가족 단위
families (
  id UUID PK,
  family_code VARCHAR(6) UNIQUE,  -- 6자리 가족 코드
  created_at TIMESTAMP
)

-- 가족 구성원 (기기 단위)
members (
  id UUID PK,
  family_id UUID FK -> families,
  nickname VARCHAR,  -- "남편", "아내" 등
  created_at TIMESTAMP
)

-- 카테고리
categories (
  id UUID PK,
  family_id UUID FK -> families,
  name VARCHAR,      -- "식비", "교통" 등
  icon VARCHAR,      -- 아이콘 이름
  color VARCHAR,     -- 색상 코드
  is_default BOOLEAN
)

-- 수입/지출 내역
transactions (
  id UUID PK,
  family_id UUID FK -> families,
  member_id UUID FK -> members,
  category_id UUID FK -> categories,
  type VARCHAR,      -- 'income' | 'expense'
  amount INTEGER,    -- 원 단위
  memo TEXT,
  date DATE,
  created_at TIMESTAMP
)

-- 월별 예산
budgets (
  id UUID PK,
  family_id UUID FK -> families,
  category_id UUID FK -> categories,
  year_month VARCHAR, -- "2026-03"
  amount INTEGER,
  created_at TIMESTAMP
)
```

## 앱 구조 (폴더)

```
lib/
├── main.dart
├── app.dart                 # MaterialApp, 라우터 설정
├── config/
│   └── supabase_config.dart
├── models/
│   ├── family.dart
│   ├── member.dart
│   ├── category.dart
│   ├── transaction.dart
│   └── budget.dart
├── providers/
│   ├── family_provider.dart
│   ├── transaction_provider.dart
│   ├── category_provider.dart
│   ├── budget_provider.dart
│   └── member_provider.dart
├── repositories/
│   ├── family_repository.dart
│   ├── transaction_repository.dart
│   ├── category_repository.dart
│   └── budget_repository.dart
├── screens/
│   ├── onboarding/
│   │   ├── welcome_screen.dart      # 가족 생성 or 참여
│   │   ├── create_family_screen.dart
│   │   └── join_family_screen.dart  # 코드/QR 입력
│   ├── home/
│   │   └── home_screen.dart         # 탭 네비게이션
│   ├── transactions/
│   │   ├── transaction_list_screen.dart
│   │   └── add_transaction_screen.dart
│   ├── budget/
│   │   ├── budget_screen.dart
│   │   └── set_budget_screen.dart
│   ├── dashboard/
│   │   └── dashboard_screen.dart    # 차트/통계
│   └── settings/
│       └── settings_screen.dart
├── widgets/
│   ├── transaction_tile.dart
│   ├── category_chip.dart
│   ├── budget_progress_bar.dart
│   ├── monthly_chart.dart
│   └── category_pie_chart.dart
└── utils/
    ├── formatters.dart              # 금액 포맷 등
    └── date_utils.dart
```

## 화면 구성

### 1. 온보딩
- **환영 화면**: "새 가족 만들기" / "기존 가족 참여" 선택
- **가족 생성**: 닉네임 입력 → 6자리 가족 코드 발급 + QR 코드 표시
- **가족 참여**: 가족 코드 입력 또는 QR 스캔 → 닉네임 입력

### 2. 메인 (하단 탭 4개)
- **내역**: 월별 수입/지출 리스트 + 추가 FAB 버튼
- **예산**: 카테고리별 월 예산 설정 및 진행률
- **대시보드**: 월별 요약, 카테고리 파이차트, 전월 비교
- **설정**: 카테고리 관리, 가족 코드 확인, 구성원 관리

### 3. 거래 추가
- 수입/지출 토글
- 금액 입력 (숫자 키패드)
- 카테고리 선택 (그리드)
- 날짜 선택
- 메모 입력
- 누가 썼는지 선택

## 구현 순서

### Step 0: 환경 설정
- [ ] Flutter SDK 설치
- [ ] 프로젝트 생성 (`flutter create`)
- [ ] 의존성 추가 (pubspec.yaml)
- [ ] Supabase 프로젝트 설정 안내

### Step 1: 데이터 레이어
- [ ] 모델 클래스 정의 (models/)
- [ ] Supabase 설정 (config/)
- [ ] Repository 구현 (repositories/)
- [ ] Riverpod Provider 구현 (providers/)

### Step 2: 온보딩 플로우
- [ ] 환영 화면
- [ ] 가족 생성 화면 (코드 생성 + QR 표시)
- [ ] 가족 참여 화면 (코드 입력 + QR 스캔)
- [ ] 로컬에 family_id/member_id 저장 (SharedPreferences)

### Step 3: 거래 관리
- [ ] 거래 목록 화면 (월별 필터)
- [ ] 거래 추가 화면
- [ ] 거래 수정/삭제
- [ ] 실시간 동기화 연결

### Step 4: 예산 관리
- [ ] 예산 설정 화면
- [ ] 카테고리별 예산 진행률 표시
- [ ] 예산 초과 시각적 알림

### Step 5: 대시보드
- [ ] 월별 수입/지출 요약 카드
- [ ] 카테고리별 파이 차트
- [ ] 전월 대비 비교 바 차트
- [ ] 일별 지출 추이 라인 차트

### Step 6: 설정 및 마무리
- [ ] 카테고리 CRUD
- [ ] 가족 코드/QR 확인
- [ ] 구성원 관리
- [ ] 기본 카테고리 시드 데이터

## 주요 패키지 (pubspec.yaml)

```yaml
dependencies:
  flutter_riverpod: ^2.5.0
  go_router: ^14.0.0
  supabase_flutter: ^2.5.0
  fl_chart: ^0.68.0
  qr_flutter: ^4.1.0
  mobile_scanner: ^5.0.0
  shared_preferences: ^2.2.0
  intl: ^0.19.0
  uuid: ^4.4.0
```

## Supabase 설정 (별도 필요)
- Supabase 프로젝트 생성 (supabase.com)
- 위 SQL로 테이블 생성
- RLS 정책 설정 (family_id 기반 접근 제어)
- 실시간 구독 활성화
- API URL과 anon key를 앱에 설정

## 검증 방법
1. `flutter run -d chrome`으로 웹 버전 테스트
2. `flutter run -d macos`로 데스크톱 테스트
3. 두 기기에서 같은 가족 코드로 접속하여 실시간 동기화 확인
4. 거래 추가 → 목록 반영 → 대시보드 차트 업데이트 확인
5. 예산 설정 → 지출 추가 → 진행률 표시 확인
