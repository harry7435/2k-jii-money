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
│       ├── dashboard/page.tsx
│       └── settings/page.tsx
├── src/
│   ├── components/             # 공통 컴포넌트
│   │   ├── AddTransactionModal.tsx
│   │   ├── SetBudgetModal.tsx
│   │   ├── BudgetProgressBar.tsx
│   │   ├── CategoryIcon.tsx
│   │   └── MonthSelector.tsx
│   └── lib/
│       ├── providers.tsx       # QueryClientProvider 래퍼
│       ├── store/
│       │   └── familyStore.ts  # Zustand store (family, member 전역 상태)
│       ├── supabase/
│       │   ├── client.ts       # 브라우저용 Supabase 클라이언트
│       │   ├── server.ts       # 서버용 Supabase 클라이언트
│       │   └── queries.ts      # 모든 DB 쿼리 함수
│       ├── utils/
│       │   └── formatters.ts
│       └── constants/
│           └── categories.ts   # 기본 카테고리 정의
└── package.json
```

## 핵심 패턴 및 규칙

### Supabase 클라이언트
- 클라이언트 컴포넌트: `src/lib/supabase/client.ts`의 `createClient()` 사용
- 서버 컴포넌트/Route Handler: `src/lib/supabase/server.ts`의 `createClient()` 사용
- 현재 타입 호환성 문제로 `(supabase as any)` 캐스팅 사용 중 — 의도된 패턴
- 공유 타입은 `@2k-jii-money/supabase-types` 패키지에서 import

### 전역 상태 (Zustand)
- `useFamilyStore`: `family`, `member` 저장 (localStorage persist)
- 인증 없음 — 가족 코드 기반 익명 접근
- `home/layout.tsx`에서 `family` 없으면 `/welcome`으로 리다이렉트

### 스타일
- Tailwind CSS v4 사용 (v3 문법과 다름 — `@apply` 등 주의)
- 모바일 우선 레이아웃: `max-w-md mx-auto`로 고정 너비
- 주 색상: teal-400 (활성 탭, 강조)
- 아이콘: `<span className="material-symbols-outlined">아이콘명</span>`

### 모달 패턴
- 모달은 별도 컴포넌트로 분리 (`src/components/`)
- `isOpen: boolean`, `onClose: () => void` props로 제어

### 데이터 페칭
- 모든 DB 함수는 `src/lib/supabase/queries.ts`에 집중
- TanStack React Query로 캐싱/로딩 상태 관리
- yearMonth 형식: `"YYYY-MM"` 문자열

## 개발 명령어

```bash
# 웹 앱만 실행 (모노레포 루트에서)
pnpm dev:web

# 웹 앱 디렉토리에서 직접
cd apps/web && pnpm dev
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
