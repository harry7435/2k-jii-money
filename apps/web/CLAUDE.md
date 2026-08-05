# Web App (apps/web) - Claude Instructions

## 프로젝트 개요

가족 공유 가계부 웹 앱. Next.js 16 (App Router) + TypeScript + Supabase + Tailwind CSS v4.

## 기술 스택

- **프레임워크**: Next.js 16.1.6, React 19, TypeScript 5
- **스타일**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **아이콘**: Material Symbols Outlined (CDN), lucide-react
- **백엔드**: Supabase (`@supabase/supabase-js` v2, `@supabase/ssr`)
- **상태관리**: Zustand v5 (persist 미들웨어로 localStorage 저장), TanStack React Query v5
- **차트**: recharts v3
- **유틸리티**: date-fns v4, uuid v13, react-qr-code

## 디렉토리 구조

```
apps/web/
├── app/                        # Next.js App Router 페이지
│   ├── layout.tsx              # 루트 레이아웃 (Geist 폰트, Material Symbols CDN)
│   ├── page.tsx                # / → /welcome 리다이렉트
│   ├── welcome/page.tsx        # 온보딩 시작 화면
│   ├── create-family/page.tsx  # 가족 생성
│   ├── join-family/page.tsx    # 가족 참여 (코드 입력)
│   └── home/
│       ├── layout.tsx          # 하단 탭 네비게이션, 인증 가드
│       ├── page.tsx            # /home → /home/transactions 리다이렉트
│       ├── transactions/page.tsx
│       ├── budget/page.tsx
│       ├── dashboard/
│       │   ├── page.tsx
│       │   └── trend/page.tsx  # 최근 12개월 추이 (라인/스택 바 차트)
│       ├── assets/page.tsx
│       └── settings/page.tsx
├── src/
│   ├── components/             # 공통 컴포넌트
│   │   ├── AddTransactionModal.tsx
│   │   ├── DateTimePicker.tsx
│   │   ├── ClockDial.tsx       # DateTimePicker의 시간 선택 다이얼 (탭 12칸 + 직접 입력)
│   │   ├── SetBudgetModal.tsx
│   │   ├── BudgetProgressBar.tsx
│   │   ├── CategoryIcon.tsx
│   │   ├── MonthSelector.tsx
│   │   ├── Skeleton.tsx        # 로딩 스켈레톤 공통 프리미티브 (animate-pulse div)
│   │   ├── dashboard/          # 대시보드 서브 컴포넌트
│   │   ├── trend/              # 월별 추이 차트 + 카테고리 멀티셀렉트
│   │   ├── assets/             # 자산 현황 컴포넌트
│   │   └── skeletons/          # 페이지별 로딩 스켈레톤 (DashboardSkeleton 등)
│   └── lib/
│       ├── providers.tsx       # QueryClientProvider 래퍼
│       ├── store/
│       │   └── familyStore.ts  # Zustand store (family, member 전역 상태)
│       ├── supabase/
│       │   ├── client.ts       # 브라우저용 Supabase 클라이언트
│       │   ├── server.ts       # 서버용 Supabase 클라이언트
│       │   └── queries.ts      # 모든 DB 쿼리 함수
│       ├── utils/
│       │   ├── formatters.ts
│       │   ├── categoryUtils.ts  # getCategoriesByLevel, getChildCategories, getCategoryPath
│       │   ├── timeUtils.ts      # HH:mm ↔ 12시간제 변환, 다이얼 좌표 계산 (순수 함수)
│       │   └── trendUtils.ts     # 월별 집계 (buildMonthList, aggregateMonthly*)
│       └── constants/
│           └── categories.ts   # DEFAULT_CATEGORY_TREE, DEFAULT_PAYMENT_SOURCES, MAJOR_CATEGORY_TYPE_MAP
├── vitest.config.mts           # Vitest 설정 (확장자 .mts로 ESM 강제)
└── package.json
```

## 핵심 패턴 및 규칙

상세 규칙은 `.claude/rules/` 참조:

- `supabase.md` — Supabase 클라이언트 사용, 데이터 페칭 패턴
- `zustand-hydration.md` — Zustand 전역 상태, persist hydration 및 `useHasHydrated()` 훅
- `style.md` — Tailwind v4, 아이콘, 모달·바텀시트·DateTimePicker 패턴
- `categories.md` — 3단계 카테고리 구조, 유틸 함수, 거래 타입 매핑
- `schema.md` — DB 스키마 특이사항 (time, evaluation, payment_sources 등)

## 개발 명령어

```bash
# 웹 앱만 실행 (모노레포 루트에서)
pnpm dev:web

# 웹 앱 디렉토리에서 직접
cd apps/web && pnpm dev

# 테스트 (apps/web 디렉토리에서)
pnpm test         # watch 모드
pnpm test:run     # 1회 실행 (CI/검증용)
```

## 환경 변수

`apps/web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 주의사항

- `app/` 디렉토리는 App Router 전용 — `'use client'` 지시어 필요 시 명시
- 현재 인증(Auth) 미구현 — Supabase Auth 없이 익명 멤버 ID로 동작
- 타입 에러 발생 시 `as any` 캐스팅보다 타입 단언 방식 선호
