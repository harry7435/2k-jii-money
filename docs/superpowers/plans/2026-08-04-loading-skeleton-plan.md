# 로딩 스켈레톤 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `app/home/` 아래 데이터를 페칭하는 6개 페이지(대시보드, 월별 추이, 거래내역, 예산, 자산, 설정)에 로딩 중 스켈레톤 UI를 추가해, 초기 로딩 시 "데이터 없음" 상태가 잘못 보이는 문제를 없앤다.

**Architecture:** 공통 `Skeleton` 프리미티브 컴포넌트 하나(`src/components/Skeleton.tsx`)를 만들고, 각 페이지 전용 스켈레톤 컴포넌트(`src/components/skeletons/*.tsx`)에서 이를 조합해 실제 레이아웃과 크기가 비슷한 회색 블록을 그린다. 각 페이지 컴포넌트는 핵심 쿼리들의 `isLoading`을 OR로 묶어 판단하고, 모든 훅 호출이 끝난 뒤 이 값이 참이면 해당 페이지의 스켈레톤을 렌더링하고 조기 반환(early return)한다.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack React Query v5, Tailwind CSS v4.

## Global Constraints

- 스켈레톤 프리미티브는 단일 컴포넌트만 만든다 (`SkeletonText`/`SkeletonCircle` 등 세분화 헬퍼 금지 — YAGNI).
- 로딩 조건은 각 페이지의 핵심 쿼리 `isLoading`만 OR로 묶는다. `isFetching`은 사용하지 않는다 (캐시된 데이터가 있는 상태의 백그라운드 리페치에서 깜빡임 방지).
- 전월 비교용 쿼리(`prevSummary`, `prevSnapshots`)와 버튼 전용 `isPending`은 로딩 조건에 포함하지 않는다.
- `familyId`가 비어 있어 쿼리가 `enabled: false`인 경우는 고려하지 않는다 (`home/layout.tsx`의 하이드레이션 가드가 이미 처리).
- 스켈레톤 컴포넌트는 조건 분기 없는 순수 프레젠테이션 JSX이므로 자동화 단위 테스트는 작성하지 않는다. 각 태스크 검증은 `cd apps/web && pnpm lint`로 타입/린트만 확인하고, 마지막 태스크에서 `pnpm build:web` + 브라우저 육안 확인을 수행한다.
- 프로젝트에 `clsx`/`cn` 유틸이 없으므로 className은 템플릿 리터럴로 병합한다 (기존 코드 스타일과 동일).

참고 설계 문서: `docs/superpowers/specs/2026-08-04-loading-skeleton-design.md`

---

### Task 1: 공통 Skeleton 프리미티브

**Files:**

- Create: `apps/web/src/components/Skeleton.tsx`

**Interfaces:**

- Produces: `Skeleton({ className?: string }): JSX.Element` — 이후 모든 태스크(2~7)가 이 컴포넌트를 `import { Skeleton } from "@/src/components/Skeleton";`로 가져다 쓴다.

- [ ] **Step 1: Skeleton 컴포넌트 작성**

```tsx
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
  );
}
```

- [ ] **Step 2: 린트 확인**

Run: `cd apps/web && pnpm lint`
Expected: 에러 없음 (경고 0건, 새 파일이라 기존 경고 수 변화 없어야 함)

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/components/Skeleton.tsx
git commit -m "feat: 공통 Skeleton 프리미티브 컴포넌트 추가"
```

---

### Task 2: 대시보드 스켈레톤

**Files:**

- Create: `apps/web/src/components/skeletons/DashboardSkeleton.tsx`
- Modify: `apps/web/app/home/dashboard/page.tsx`

**Interfaces:**

- Consumes: `Skeleton` (Task 1)
- Produces: `DashboardSkeleton(): JSX.Element` — 이 태스크 내부에서만 사용, 다른 태스크는 참조하지 않음.

- [ ] **Step 1: DashboardSkeleton 작성**

```tsx
import { Skeleton } from "@/src/components/Skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-14 w-full rounded-2xl" />

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>

      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>

      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>

      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>

      <Skeleton className="h-44 rounded-2xl" />
    </div>
  );
}
```

- [ ] **Step 2: dashboard/page.tsx에 import 추가**

`apps/web/app/home/dashboard/page.tsx` 상단 import 블록 마지막에 추가:

```tsx
import { DashboardSkeleton } from "@/src/components/skeletons/DashboardSkeleton";
```

- [ ] **Step 3: 쿼리에 isLoading 별칭 추가**

`apps/web/app/home/dashboard/page.tsx`에서 아래 3개 쿼리를 다음과 같이 수정 (기존 `transactions`/`categories`/`summary` 쿼리, `prevSummary` 쿼리는 그대로 둔다):

```tsx
const { data: transactions = [], isLoading: txLoading } = useQuery({
  queryKey: ["transactions", familyId, yearMonth],
  queryFn: () => getTransactions(familyId, yearMonth),
  enabled: !!familyId,
});

const { data: categories = [], isLoading: catLoading } = useQuery({
  queryKey: ["categories", familyId],
  queryFn: () => getCategories(familyId),
  enabled: !!familyId,
});

const { data: summary, isLoading: summaryLoading } = useQuery({
  queryKey: ["summary", familyId, yearMonth],
  queryFn: () => getMonthlySummary(familyId, yearMonth),
  enabled: !!familyId,
});
```

- [ ] **Step 4: isLoading 판단 및 조기 반환 추가**

`prevSummary` 쿼리 선언 바로 다음, `// 중분류별 지출 (파이 차트)` 주석 앞에 삽입:

```tsx
const isLoading = txLoading || catLoading || summaryLoading;

if (isLoading) {
  return (
    <div className="flex flex-col h-full">
      <MonthSelector yearMonth={yearMonth} onChange={setYearMonth} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <DashboardSkeleton />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 린트 확인**

Run: `cd apps/web && pnpm lint`
Expected: 에러 없음

- [ ] **Step 6: 개발 서버에서 육안 확인**

Run: `cd apps/web && pnpm dev` (이미 실행 중이 아니면)
브라우저에서 `/home/dashboard` 진입 시 새로고침 직후 스켈레톤이 잠깐 보였다가 실제 데이터로 바뀌는지 확인 (개발자도구 Network 탭에서 Slow 3G로 스로틀링하면 더 잘 보임).

- [ ] **Step 7: 커밋**

```bash
git add apps/web/src/components/skeletons/DashboardSkeleton.tsx apps/web/app/home/dashboard/page.tsx
git commit -m "feat: 대시보드 페이지에 로딩 스켈레톤 추가"
```

---

### Task 3: 월별 추이 스켈레톤

**Files:**

- Create: `apps/web/src/components/skeletons/TrendSkeleton.tsx`
- Modify: `apps/web/app/home/dashboard/trend/page.tsx`

**Interfaces:**

- Consumes: `Skeleton` (Task 1)
- Produces: `TrendSkeleton(): JSX.Element` — 이 태스크 내부에서만 사용.

**참고:** 이 페이지는 이미 `isLoading: txLoading`을 구조 분해하고 있지만 `!hasData && !txLoading` 삼항식 때문에 로딩 중(`txLoading === true`, `transactions === []`)에는 "데이터 있음" 분기를 타서 빈 차트가 순간적으로 그려지는 기존 버그가 있다. 이번 작업으로 함께 고친다.

- [ ] **Step 1: TrendSkeleton 작성**

```tsx
import { Skeleton } from "@/src/components/Skeleton";

export function TrendSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-48 rounded-2xl" />
      <div className="space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
        <Skeleton className="h-40 rounded-2xl" />
      </div>
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}
```

- [ ] **Step 2: trend/page.tsx에 import 추가**

`apps/web/app/home/dashboard/trend/page.tsx` 상단 import 블록 마지막에 추가:

```tsx
import { TrendSkeleton } from "@/src/components/skeletons/TrendSkeleton";
```

- [ ] **Step 3: 조기 반환 추가**

`const hasData = transactions.length > 0;` 다음 줄에 삽입 (기존 `isLoading: txLoading` 구조 분해는 그대로 둔다):

```tsx
if (txLoading) {
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        <Link
          href="/home/dashboard"
          aria-label="뒤로가기"
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </Link>
        <h1 className="text-base font-bold">월별 추이</h1>
        <span className="ml-auto text-xs text-gray-400">최근 12개월</span>
      </header>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <TrendSkeleton />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 기존 삼항식을 hasData 단독 조건으로 단순화**

`{!hasData && !txLoading ? (` → `{!hasData ? (` 로 수정 (이제 이 지점에 도달했다는 것은 `txLoading`이 이미 `false`라는 뜻이므로 `!txLoading` 조건이 불필요해짐).

- [ ] **Step 5: 린트 확인**

Run: `cd apps/web && pnpm lint`
Expected: 에러 없음

- [ ] **Step 6: 개발 서버에서 육안 확인**

`/home/dashboard/trend` 진입 시 로딩 중 스켈레톤 → 실제 차트 전환 확인. 특히 거래 내역이 아예 없는 가족으로 테스트해 "최근 12개월 거래 내역이 없어요" 빈 상태가 로딩 중에 잘못 뜨지 않는지 확인.

- [ ] **Step 7: 커밋**

```bash
git add apps/web/src/components/skeletons/TrendSkeleton.tsx apps/web/app/home/dashboard/trend/page.tsx
git commit -m "feat: 월별 추이 페이지에 로딩 스켈레톤 추가 및 로딩 중 빈 상태 버그 수정"
```

---

### Task 4: 거래내역 스켈레톤

**Files:**

- Create: `apps/web/src/components/skeletons/TransactionsSkeleton.tsx`
- Modify: `apps/web/app/home/transactions/page.tsx`

**Interfaces:**

- Consumes: `Skeleton` (Task 1)
- Produces: `TransactionsSkeleton(): JSX.Element` — 이 태스크 내부에서만 사용.

- [ ] **Step 1: TransactionsSkeleton 작성**

```tsx
import { Skeleton } from "@/src/components/Skeleton";

export function TransactionsSkeleton() {
  return (
    <div className="p-4 space-y-3 md:p-6">
      <Skeleton className="h-16 rounded-2xl" />
      <div className="space-y-3 pt-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-1/3 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
            <Skeleton className="h-4 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: transactions/page.tsx에 import 추가**

`apps/web/app/home/transactions/page.tsx` 상단 import 블록 마지막에 추가:

```tsx
import { TransactionsSkeleton } from "@/src/components/skeletons/TransactionsSkeleton";
```

- [ ] **Step 3: 쿼리에 isLoading 별칭 추가**

`TransactionsPageInner` 내부의 4개 쿼리를 다음과 같이 수정 (`summary` 쿼리는 건드리지 않는다):

```tsx
const { data: transactions = [], isLoading: txLoading } = useQuery({
  queryKey: ["transactions", familyId, yearMonth],
  queryFn: () => getTransactions(familyId, yearMonth),
  enabled: !!familyId,
});

const { data: categories = [], isLoading: catLoading } = useQuery({
  queryKey: ["categories", familyId],
  queryFn: () => getCategories(familyId),
  enabled: !!familyId,
});

const { data: members = [], isLoading: membersLoading } = useQuery({
  queryKey: ["members", familyId],
  queryFn: () => getMembers(familyId),
  enabled: !!familyId,
});

const { data: paymentSources = [], isLoading: paymentSourcesLoading } =
  useQuery({
    queryKey: ["paymentSources", familyId],
    queryFn: () => getPaymentSources(familyId),
    enabled: !!familyId,
  });
```

- [ ] **Step 4: 조기 반환 추가**

`const displaySummary = useMemo(...)` 블록(마지막 훅 호출) 바로 다음, `return (` 문 앞에 삽입:

```tsx
const isLoading =
  txLoading || catLoading || membersLoading || paymentSourcesLoading;

if (isLoading) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 md:px-6">
        <div className="flex-1">
          <MonthSelector yearMonth={yearMonth} onChange={setYearMonth} />
        </div>
        <button
          onClick={toggleTimeFormat}
          className="shrink-0 pb-2 mr-1 text-xs font-medium text-gray-500 hover:text-gray-700"
          title="시간 표시 형식 전환"
        >
          {timeFormat === "24h" ? "24시" : "오전·오후"}
        </button>
      </div>
      <TransactionsSkeleton />
    </div>
  );
}
```

필터 버튼은 로딩 중 화면에서 생략한다 (카테고리가 없는 상태에서 필터링은 의미가 없으므로).

- [ ] **Step 5: 린트 확인**

Run: `cd apps/web && pnpm lint`
Expected: 에러 없음

- [ ] **Step 6: 개발 서버에서 육안 확인**

`/home/transactions` 진입 시 로딩 스켈레톤 → 실제 목록 전환 확인. 월 전환 시(이미 캐시된 월로 이동) 스켈레톤이 다시 뜨지 않고 부드럽게 바뀌는지도 확인.

- [ ] **Step 7: 커밋**

```bash
git add apps/web/src/components/skeletons/TransactionsSkeleton.tsx apps/web/app/home/transactions/page.tsx
git commit -m "feat: 거래내역 페이지에 로딩 스켈레톤 추가"
```

---

### Task 5: 예산 스켈레톤

**Files:**

- Create: `apps/web/src/components/skeletons/BudgetSkeleton.tsx`
- Modify: `apps/web/app/home/budget/page.tsx`

**Interfaces:**

- Consumes: `Skeleton` (Task 1)
- Produces: `BudgetSkeleton(): JSX.Element` — 이 태스크 내부에서만 사용.

- [ ] **Step 1: BudgetSkeleton 작성**

```tsx
import { Skeleton } from "@/src/components/Skeleton";

export function BudgetSkeleton() {
  return (
    <div className="p-4 space-y-3 md:p-6">
      <Skeleton className="h-36 rounded-2xl" />
      <div className="space-y-1 pt-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: budget/page.tsx에 import 추가**

`apps/web/app/home/budget/page.tsx` 상단 import 블록 마지막에 추가:

```tsx
import { BudgetSkeleton } from "@/src/components/skeletons/BudgetSkeleton";
```

- [ ] **Step 3: 쿼리에 isLoading 별칭 추가**

3개 쿼리를 다음과 같이 수정:

```tsx
const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
  queryKey: ["budgets", familyId, yearMonth],
  queryFn: () => getBudgets(familyId, yearMonth),
  enabled: !!familyId,
});

const { data: categories = [], isLoading: catLoading } = useQuery({
  queryKey: ["categories", familyId],
  queryFn: () => getCategories(familyId),
  enabled: !!familyId,
});

const { data: transactions = [], isLoading: txLoading } = useQuery({
  queryKey: ["transactions", familyId, yearMonth],
  queryFn: () => getTransactions(familyId, yearMonth),
  enabled: !!familyId,
});
```

- [ ] **Step 4: 조기 반환 추가**

세 번째 쿼리 다음, `// 총 예산 (category_id = null)` 주석 앞에 삽입:

```tsx
const isLoading = budgetsLoading || catLoading || txLoading;

if (isLoading) {
  return (
    <div className="flex flex-col h-full">
      <MonthSelector yearMonth={yearMonth} onChange={setYearMonth} />
      <BudgetSkeleton />
    </div>
  );
}
```

- [ ] **Step 5: 린트 확인**

Run: `cd apps/web && pnpm lint`
Expected: 에러 없음

- [ ] **Step 6: 개발 서버에서 육안 확인**

`/home/budget` 진입 시 로딩 스켈레톤 → 실제 예산 카드/목록 전환 확인.

- [ ] **Step 7: 커밋**

```bash
git add apps/web/src/components/skeletons/BudgetSkeleton.tsx apps/web/app/home/budget/page.tsx
git commit -m "feat: 예산 페이지에 로딩 스켈레톤 추가"
```

---

### Task 6: 자산 스켈레톤

**Files:**

- Create: `apps/web/src/components/skeletons/AssetsSkeleton.tsx`
- Modify: `apps/web/app/home/assets/page.tsx`

**Interfaces:**

- Consumes: `Skeleton` (Task 1)
- Produces: `AssetsSkeleton(): JSX.Element` — 이 태스크 내부에서만 사용.

- [ ] **Step 1: AssetsSkeleton 작성**

```tsx
import { Skeleton } from "@/src/components/Skeleton";

export function AssetsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-2xl" />
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="bg-white rounded-2xl p-3 space-y-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: assets/page.tsx에 import 추가**

`apps/web/app/home/assets/page.tsx` 상단 import 블록 마지막에 추가:

```tsx
import { AssetsSkeleton } from "@/src/components/skeletons/AssetsSkeleton";
```

- [ ] **Step 3: 쿼리에 isLoading 별칭 추가**

`accounts`, `snapshots`, `history` 3개 쿼리를 다음과 같이 수정 (`isSuccess: accountsLoaded`는 그대로 유지, `prevSnapshots` 쿼리는 건드리지 않는다):

```tsx
const {
  data: accounts = [],
  isSuccess: accountsLoaded,
  isLoading: accountsLoading,
} = useQuery({
  queryKey: ["assetAccounts", familyId],
  queryFn: () => getAssetAccounts(familyId),
  enabled: !!familyId,
});

const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery({
  queryKey: ["assetSnapshots", familyId, yearMonth],
  queryFn: () => getAssetSnapshots(familyId, yearMonth),
  enabled: !!familyId,
});

const { data: history = [], isLoading: historyLoading } = useQuery({
  queryKey: ["assetSnapshotHistory", familyId],
  queryFn: () => getAssetSnapshotHistory(familyId, 12),
  enabled: !!familyId,
});
```

- [ ] **Step 4: 조기 반환 추가**

`copyMutation` 선언(마지막 훅 호출) 바로 다음, `// 스냅샷 맵: account_id → amount` 주석 앞에 삽입:

```tsx
const isLoading = accountsLoading || snapshotsLoading || historyLoading;

if (isLoading) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 space-y-4">
        <MonthSelector yearMonth={yearMonth} onChange={setYearMonth} />
        <AssetsSkeleton />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 린트 확인**

Run: `cd apps/web && pnpm lint`
Expected: 에러 없음

- [ ] **Step 6: 개발 서버에서 육안 확인**

`/home/assets` 진입 시 로딩 스켈레톤 → 실제 자산 카드/계좌 목록 전환 확인. 신규 가족(계좌 자동 생성 로직 `initMutation`이 도는 케이스)에서도 깨지지 않는지 확인.

- [ ] **Step 7: 커밋**

```bash
git add apps/web/src/components/skeletons/AssetsSkeleton.tsx apps/web/app/home/assets/page.tsx
git commit -m "feat: 자산 페이지에 로딩 스켈레톤 추가"
```

---

### Task 7: 설정 스켈레톤

**Files:**

- Create: `apps/web/src/components/skeletons/SettingsSkeleton.tsx`
- Modify: `apps/web/app/home/settings/page.tsx`

**Interfaces:**

- Consumes: `Skeleton` (Task 1)
- Produces: `SettingsSkeleton(): JSX.Element` — 이 태스크 내부에서만 사용.

- [ ] **Step 1: SettingsSkeleton 작성**

```tsx
import { Skeleton } from "@/src/components/Skeleton";

export function SettingsSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-4 px-5 py-6 bg-white border-b border-gray-100">
        <Skeleton className="w-14 h-14 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
      </div>

      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="bg-white mt-2 px-5 py-4 border-b border-gray-100 space-y-3"
        >
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-8 rounded-xl" />
          <Skeleton className="h-8 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: settings/page.tsx에 import 추가**

`apps/web/app/home/settings/page.tsx` 상단 import 블록 마지막에 추가:

```tsx
import { SettingsSkeleton } from "@/src/components/skeletons/SettingsSkeleton";
```

- [ ] **Step 3: 쿼리에 isLoading 별칭 추가**

3개 쿼리를 다음과 같이 수정:

```tsx
const { data: categories = [], isLoading: catLoading } = useQuery({
  queryKey: ["categories", familyId],
  queryFn: () => getCategories(familyId),
  enabled: !!familyId,
});

const { data: members = [], isLoading: membersLoading } = useQuery({
  queryKey: ["members", familyId],
  queryFn: () => getMembers(familyId),
  enabled: !!familyId,
});

const { data: paymentSources = [], isLoading: paymentSourcesLoading } =
  useQuery({
    queryKey: ["paymentSources", familyId],
    queryFn: () => getPaymentSources(familyId),
    enabled: !!familyId,
  });
```

- [ ] **Step 4: 조기 반환 추가**

기존의 `if (!family || !member) return null;` 줄을 다음으로 교체 (이 줄은 이미 모든 훅 호출 이후에 위치해 있음):

```tsx
const isLoading = catLoading || membersLoading || paymentSourcesLoading;

if (!family || !member) return null;
if (isLoading) return <SettingsSkeleton />;
```

- [ ] **Step 5: 린트 확인**

Run: `cd apps/web && pnpm lint`
Expected: 에러 없음

- [ ] **Step 6: 개발 서버에서 육안 확인**

`/home/settings` 진입 시 로딩 스켈레톤 → 실제 프로필/카테고리/거래출처 목록 전환 확인.

- [ ] **Step 7: 커밋**

```bash
git add apps/web/src/components/skeletons/SettingsSkeleton.tsx apps/web/app/home/settings/page.tsx
git commit -m "feat: 설정 페이지에 로딩 스켈레톤 추가"
```

---

### Task 8: 전체 빌드 검증 및 브라우저 회귀 확인

**Files:** 없음 (검증 전용 태스크)

**Interfaces:**

- Consumes: Task 1~7에서 만든 모든 스켈레톤 컴포넌트와 페이지 수정 사항

- [ ] **Step 1: 전체 빌드**

Run: `pnpm build:web` (모노레포 루트에서)
Expected: 타입 에러 없이 빌드 성공

- [ ] **Step 2: 전체 테스트 스위트 실행**

Run: `cd apps/web && pnpm test:run`
Expected: 기존 테스트 전부 PASS (스켈레톤 관련 신규 테스트는 없으므로 실패 건수 변화 없어야 함)

- [ ] **Step 3: 브라우저 회귀 확인**

Run: `cd apps/web && pnpm dev`
Chrome 개발자도구 Network 탭에서 Slow 3G로 스로틀링한 뒤 6개 페이지(대시보드, 월별 추이, 거래내역, 예산, 자산, 설정)를 각각 새로고침하며:

- 로딩 중 스켈레톤이 레이아웃 이동 없이 자연스럽게 보이는지
- 데이터 도착 후 스켈레톤이 실제 콘텐츠로 정상 교체되는지
- 월 전환(이미 캐시된 월) 시 스켈레톤이 불필요하게 다시 뜨지 않는지
- 기존 기능(거래 추가/삭제, 예산 설정, 자산 계좌 추가/수정, 카테고리/거래출처 관리)이 그대로 동작하는지

모두 확인되면 완료.
