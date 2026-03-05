# 2k-jii-money (지이머니)

가족 단위 가계부 앱 — Flutter(모바일) + Next.js(웹) 모노레포

## 프로젝트 구조

```
2k-jii-money/
├── apps/
│   ├── mobile/          # Flutter 모바일 앱 (iOS / Android)
│   └── web/             # Next.js 웹 앱
├── packages/
│   └── supabase-types/  # 공유 TypeScript 타입 (Supabase 스키마 기반)
├── supabase/            # schema.sql (단일 진실 공급원)
├── package.json         # 루트 (Turborepo + pnpm workspaces)
├── pnpm-workspace.yaml
└── turbo.json
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| 모바일 | Flutter |
| 웹 | Next.js 15 (App Router) + TypeScript |
| 백엔드 | Supabase (PostgreSQL) |
| 상태관리 (웹) | Zustand + TanStack React Query |
| UI | Tailwind CSS + Material Symbols + recharts |
| 모노레포 | Turborepo + pnpm workspaces |

## 주요 기능

- 가족 코드로 구성원 초대 및 공유 가계부
- 수입/지출 내역 기록 및 월별 조회
- 카테고리별 예산 설정 및 달성률 시각화
- 월별 대시보드 (파이 차트, 일별 지출 추이)
- 카테고리 관리 (기본 카테고리 + 사용자 정의)

## 개발 환경 설정

### 공통 사전 준비

1. [pnpm](https://pnpm.io/installation) 설치
2. Supabase 프로젝트 생성 후 `supabase/schema.sql` 실행
3. 루트에서 의존성 설치:

```bash
pnpm install
```

### 웹 앱 실행

`apps/web/.env.local` 파일 생성:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

```bash
pnpm dev:web   # http://localhost:3000
```

### 모바일 앱 실행

`apps/mobile/.env.json` 파일 생성:

```json
{
  "SUPABASE_URL": "https://xxxx.supabase.co",
  "SUPABASE_ANON_KEY": "eyJ..."
}
```

```bash
cd apps/mobile
flutter pub get
flutter run --dart-define-from-file=.env.json
```

## 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `pnpm dev:web` | 웹 개발 서버 실행 |
| `pnpm build` | 전체 빌드 |
| `pnpm type-gen` | Supabase 타입 재생성 |
| `cd apps/mobile && flutter run --dart-define-from-file=.env.json` | 모바일 실행 |
