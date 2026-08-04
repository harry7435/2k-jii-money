# 로딩 스켈레톤 UI 설계

## 배경

가계부 앱의 모든 페이지(대시보드, 월별 추이, 거래내역, 예산, 자산, 설정)는 `useQuery`로 데이터를 불러오지만, 로딩 중에도 `data: ... = []` 기본값 때문에 "데이터 없음" 상태가 그대로 보인다. 스피너나 스켈레톤 등 로딩 UI가 프로젝트 전체에 하나도 없다.

## 범위

`app/home/` 아래 데이터 페칭이 있는 6개 페이지 전체:

- `dashboard/page.tsx`
- `dashboard/trend/page.tsx`
- `transactions/page.tsx`
- `budget/page.tsx`
- `assets/page.tsx`
- `settings/page.tsx`

`MonthlyNoteCard`처럼 페이지와 독립적으로 자체 `useQuery`를 쓰는 하위 컴포넌트는 범위 밖 (필요 시 별도 설계).

## 공통 Skeleton 프리미티브

`src/components/Skeleton.tsx`에 단일 컴포넌트만 추가한다.

```tsx
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
  );
}
```

- `className`으로 폭/높이/모양(원형 `rounded-full` 포함)을 지정해 막대·원·텍스트 라인을 모두 표현
- 프로젝트에 `clsx`/`cn` 유틸이 없으므로 템플릿 리터럴로 병합 (기존 코드 스타일과 동일)
- 별도 `SkeletonText`/`SkeletonCircle` 등 세분화 헬퍼는 만들지 않는다 (YAGNI)

## 로딩 조건 판단 규칙

각 페이지는 **핵심 콘텐츠 렌더링에 필요한 필수 쿼리들의 `isLoading`을 OR로 묶어** 판단한다.

```ts
const isLoading = txLoading || catLoading || summaryLoading;
if (isLoading) return <PageSkeleton />;
```

- `isLoading`만 사용하고 `isFetching`은 쓰지 않는다 — 이미 캐시된 데이터가 있는 상태에서 월 전환 등으로 백그라운드 리페치가 일어날 때 화면이 깜빡이는 것을 방지하기 위함
- 부가적인 쿼리(전월 비교용 `prevSummary`, 삭제/추가 버튼용 `isPending` 등)는 로딩 조건에 포함하지 않는다 — 있으면 보여주고 없으면 그 부분만 생략하는 기존 방식 유지
- `familyId`가 비어 있어 쿼리가 `enabled: false`인 경우는 고려하지 않는다 — `home/layout.tsx`의 하이드레이션 가드(`useHasHydrated()`)가 이 페이지에 도달하기 전에 이미 처리하기 때문

## 페이지별 스켈레톤

MonthSelector, 헤더, FAB 등 데이터에 의존하지 않는 뼈대는 그대로 두고, 데이터로 채워지는 영역만 스켈레톤으로 교체한다. 각 스켈레톤 컴포넌트는 `src/components/skeletons/`에 모아 둔다 (기존 `dashboard/`, `transactions/` 등 폴더는 실제 하위 컴포넌트용이라 스켈레톤을 섞지 않는다).

| 페이지    | 로딩 기준 쿼리                                    | 스켈레톤 컴포넌트      | 모양                                                                                                         |
| --------- | ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| 대시보드  | transactions, categories, summary                 | `DashboardSkeleton`    | 요약 3분할 카드, 수입/저축 2열 카드, 지출 2열 카드(파이차트 자리 포함), 고정/변동 2열 카드, 일별 바차트 자리 |
| 월별 추이 | transactions (`txLoading`, 이미 존재)             | `TrendSkeleton`        | 총계 차트 자리(큰 블록), 카테고리 선택 칩 자리(알약 모양 여러 개), 평가 차트 자리                            |
| 거래내역  | transactions, categories, members, paymentSources | `TransactionsSkeleton` | 상단 4분할 요약 카드, 리스트 행 5개(원형 아이콘 + 텍스트 2줄 + 금액 블록)                                    |
| 예산      | budgets, categories, transactions                 | `BudgetSkeleton`       | 상단 teal 3분할 카드, 카테고리별 진행바 행 여러 개                                                           |
| 자산      | accounts, snapshots, history                      | `AssetsSkeleton`       | 상단 그라데이션 3분할 요약 카드, 타입별 그룹 리스트 행 여러 개                                               |
| 설정      | categories, members, paymentSources               | `SettingsSkeleton`     | 섹션별(카테고리/결제수단/멤버) 블록 — 제목 자리 + 리스트 행 2~3개                                            |

각 스켈레톤은 실제 카드/리스트 행과 동일한 크기·간격(rounded-2xl, padding 등)을 사용해 레이아웃 이동(layout shift) 없이 실제 콘텐츠로 자연스럽게 전환되도록 한다.

## 테스트 방침

스켈레톤 컴포넌트는 조건 분기 없는 순수 프레젠테이션 JSX이므로 별도 단위 테스트는 작성하지 않는다. 각 페이지의 `isLoading` OR 조합 로직도 단순해 코드 리뷰로 충분하다. 구현 후 `pnpm dev:web`으로 실행해 네트워크 스로틀링(느린 3G) 상태에서 6개 페이지 진입 시 스켈레톤 → 실제 데이터 전환이 자연스러운지 육안으로 확인한다.
