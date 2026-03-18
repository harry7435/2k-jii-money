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

상세 규칙은 `.claude/rules/` 참조:
- `supabase.md` — Supabase 클라이언트 사용, 데이터 페칭 패턴
- `zustand-hydration.md` — Zustand 전역 상태, persist hydration 및 `useHasHydrated()` 훅
- `style.md` — Tailwind v4, 아이콘, 모달 패턴

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
