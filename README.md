# 2k-jii-money (지이머니)

가족 단위 가계부 웹 앱 — Next.js + Supabase

## 프로젝트 구조

```
2k-jii-money/
├── apps/
│   └── web/             # Next.js 웹 앱
├── packages/
│   └── supabase-types/  # 공유 TypeScript 타입 (Supabase 스키마 기반)
├── supabase/            # schema.sql (단일 진실 공급원) + migrations/
├── package.json         # 루트 (Turborepo + pnpm workspaces)
├── pnpm-workspace.yaml
└── turbo.json
```

## 기술 스택

| 영역     | 기술                                          |
| -------- | --------------------------------------------- |
| 웹       | Next.js 16 (App Router) + TypeScript          |
| 백엔드   | Supabase (PostgreSQL + Auth)                  |
| 상태관리 | Zustand + TanStack React Query                |
| UI       | Tailwind CSS v4 + Material Symbols + recharts |
| 모노레포 | Turborepo + pnpm workspaces                   |

## 주요 기능

- 이메일 회원가입 / 로그인, 초대 링크로 가족 구성원 추가
- 수입/지출/저축 내역 기록 및 월별 조회
- 카테고리별 예산 설정 및 달성률 시각화
- 월별 대시보드 (파이 차트, 일별 지출 추이), 최근 12개월 추이
- 자산 계좌별 월말 잔고 스냅샷
- 카테고리 관리 (3단계 계층, 기본 + 사용자 정의)

## 보안 모델

- 인증: Supabase Auth (이메일 + 비밀번호). `members.user_id`가 `auth.users`와 1:1 연결
- 격리: 모든 테이블에 `family_id = my_family_id()` RLS 정책. `anon` 역할에는 권한 없음
- 가족 생성/참여와 데이터 초기화는 `SECURITY DEFINER` RPC 전담
- 초대는 만료(7일) + 1회 사용 제한이 있는 192비트 토큰

설계 근거는 [docs/superpowers/specs/2026-08-05-web-auth-rls-design.md](docs/superpowers/specs/2026-08-05-web-auth-rls-design.md) 참조.

## 개발 환경 설정

1. [pnpm](https://pnpm.io/installation) 설치
2. Supabase 프로젝트 생성 후 `supabase/schema.sql` 실행
   (기존 프로젝트라면 `supabase/migrations/`를 번호 순서대로 적용)
3. Supabase 대시보드 → Authentication → Providers → Email에서 **Confirm email 비활성화**
   (기본 SMTP는 발송 제한이 엄격해 가입이 막힐 수 있음)
4. 루트에서 의존성 설치:

```bash
pnpm install
```

`apps/web/.env.local` 파일 생성:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

```bash
pnpm dev:web   # http://localhost:3000
```

## 주요 명령어

| 명령어           | 설명                 |
| ---------------- | -------------------- |
| `pnpm dev:web`   | 웹 개발 서버 실행    |
| `pnpm build:web` | 웹 빌드              |
| `pnpm type-gen`  | Supabase 타입 재생성 |

테스트는 `apps/web`에서 실행합니다.

| 명령어          | 설명              |
| --------------- | ----------------- |
| `pnpm test`     | watch 모드        |
| `pnpm test:run` | 1회 실행 (검증용) |
