# 스타일 및 UI 규칙

## Tailwind CSS

- Tailwind CSS v4 사용 (v3 문법과 다름 — `@apply` 등 주의)
- 모바일 우선 레이아웃: `max-w-md mx-auto`로 고정 너비
- 주 색상: teal-400 (활성 탭, 강조)

## 아이콘

- Material Symbols Outlined (CDN): `<span className="material-symbols-outlined">아이콘명</span>`
- lucide-react: 보조 아이콘용

## 모달

- 모달은 별도 컴포넌트로 분리 (`src/components/`)
- `isOpen: boolean`, `onClose: () => void` props로 제어

### 바텀시트 패턴 (AddTransactionModal)

- 구조: `flex flex-col max-h-[90vh]` → `flex-1 overflow-y-auto`(폼) + 별도 하단 고정 div(저장 버튼)
- 외부 스크롤 방지: `useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])`

### 오버레이/팝업 화면 중앙 배치

- `createPortal(..., document.body)` 사용 → 부모 overflow/z-index 우회
- 배경: `fixed inset-0 z-100 flex items-center justify-center bg-black/40`
- 컨테이너: `w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden`

### DateTimePicker (`src/components/DateTimePicker.tsx`)

- Props: `date: string` (yyyy-MM-dd), `time: string` (HH:mm | ''), `onDateChange`, `onTimeChange`
- 트리거 버튼 + createPortal 팝업(날짜 캘린더 / 시간 다이얼) 조합
- date-fns로 달력 직접 구현 (react-day-picker 미사용)
- 팝업 내부는 상단 칩(`날짜` / `시간`)으로 뷰 전환 — `view: 'date' | 'time'` 상태
  - 날짜 칩: 선택된 날짜(`M월 d일 (EEE)`) 또는 "날짜 선택"
  - 시간 칩: 선택된 시간(`HH:mm`) 또는 "--:--"
- 네이티브 `<input type="time">` 사용 금지 — 브라우저별 3열 휠 UI가 일관되지 않아 `ClockDial`로 대체됨
- 날짜만 선택하고 시간을 비워둔 상태를 그대로 유지 — 과거처럼 날짜 선택 시 빈 시간을 `00:00`으로 자동 채우지 않음

### ClockDial (`src/components/ClockDial.tsx`, `src/lib/utils/timeUtils.ts`)

시간 선택용 12칸 시계 다이얼 + 키보드 직접 입력 콤보. 값은 항상 `HH:mm`(24시) 문자열.

- **2단계 구성**: 시 다이얼 → 분 다이얼(5분 단위, 0·5·10…55). 별도 모드 토글 버튼 없이, 상단 시각 입력칸(시 또는 분)에 포커스가 가는 것 자체가 단계 전환
- **상단 입력칸이 곧 텍스트 입력**: 다이얼로 고르는 대신 키보드로 직접 타이핑 가능. 다이얼은 5분 단위 스냅이지만 타이핑은 1분 단위까지 허용 (`type()` / `setHour24` / `setMinute`)
- **표시 형식은 화면 설정과 무관하게 항상 24시** — `uiPrefsStore.timeFormat`(12h/24h 토글)은 거래 목록 등 다른 화면에는 영향을 주지만, 이 피커 내부 표시는 고정 24시. 다이얼 자체는 12시간 슬롯(1~12) + 오전/오후 토글로 동작하고, `to24h`/`from24h`로 24시 문자열과 상호 변환
- **5분 배수가 아닌 값의 시각화**: 예) `13:53`처럼 다이얼 눈금에 정확히 맞지 않는 값은 바늘이 실제 각도를 그대로 가리키고, 라벨이 있는 칸이 아니면 작은 점(반지름 6)으로 표시. 라벨 위에 정확히 걸릴 때만 큰 원(반지름 `MARKER_RADIUS`)으로 숫자를 덮음 — 큰 마커는 "스냅된 값"처럼 보이기 때문에 구분함
- **순수 함수는 `timeUtils.ts`로 분리**: `to24h`, `from24h`, `setHour`, `setHour24`, `setMinute`, `dialPoint`, `hourAtSlot`, `minuteAtSlot` — DOM 의존 없이 단위 테스트(`timeUtils.test.ts`)로 커버. 다이얼/입력 관련 로직을 건드릴 때는 여기부터 확인

### blur 자동저장 + 취소 버튼 충돌 방지

`onBlur`로 자동저장할 때 취소 버튼 클릭 시 blur가 먼저 발화해 저장이 실행되는 문제:

- 취소 버튼에 `onMouseDown={(e) => e.preventDefault()}` 추가 → blur 억제
- mousedown이 blur보다 먼저 발화하므로 preventDefault로 포커스 이동을 막으면 blur 미발생
- `onClick`은 정상 발화되므로 취소 동작은 그대로 실행됨

```tsx
<button
  onMouseDown={(e) => e.preventDefault()} // textarea blur 방지
  onClick={handleCancel}
>
  취소
</button>
```

적용 예: `src/components/dashboard/MonthlyNoteCard.tsx`

## 페이지 로딩 스켈레톤 패턴

각 최상위 페이지(`app/home/*/page.tsx`)는 핵심 쿼리 로딩 중 실제 레이아웃과 유사한 스켈레톤을 보여준다.

### 공통 프리미티브 (`src/components/Skeleton.tsx`)

```tsx
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
  );
}
```

- 단일 컴포넌트만 존재 (`SkeletonText`/`SkeletonCircle` 등으로 세분화하지 않음 — YAGNI)
- 페이지별 스켈레톤(`DashboardSkeleton`, `TrendSkeleton`, `TransactionsSkeleton`, `BudgetSkeleton`, `AssetsSkeleton`, `SettingsSkeleton`)은 `src/components/skeletons/`에 모아두고, 이 `Skeleton`을 조합해 실제 레이아웃 형태를 흉내낸다
- feature 폴더(`dashboard/`, `trend/`, `assets/`)와 구분해 별도 폴더 유지

### isLoading 조합 규칙

```tsx
const { data, isLoading: fooLoading } = useQuery({ ... });
const { data, isLoading: barLoading } = useQuery({ ... });

const isLoading = fooLoading || barLoading; // 핵심 쿼리만 OR로 결합

if (isLoading) {
  return <PageSkeleton />; // 반드시 모든 훅 호출 이후에 배치
}
```

- **핵심 쿼리**의 `isLoading`만 OR로 묶는다. `isFetching`은 쓰지 않음 — 캐시된 데이터가 있는 상태에서 백그라운드 리페치 시 화면이 깜빡이는 것을 방지하기 위함
- 전월 비교용 쿼리(`prevSummary`, `prevSnapshots` 등 보조 데이터)나 버튼 전용 `isPending`은 로딩 조건에서 제외한다 — 있으면 보여주고 없으면 그 부분만 생략하는 기존 방식 유지
- early return(`if (isLoading) return ...`)은 반드시 그 컴포넌트의 **모든** 훅 호출(`useQuery`/`useMutation`/`useEffect`/`useMemo` 등) 이후에 위치시킨다 — 그렇지 않으면 React Hooks 규칙 위반으로 훅 순서가 깨짐

적용 예: `app/home/dashboard/page.tsx`의 `isLoading = txLoading || catLoading || summaryLoading`, 동일 패턴이 `dashboard/trend`, `transactions`, `budget`, `assets`, `settings` 페이지에도 적용됨

## 거래 목록 UI 규칙

### 날짜 헤더 일별 합계 (`transactions/page.tsx`)

날짜 구분선 우측에 해당 날짜의 수입/지출/저축 합계를 컴팩트하게 표시. 값이 0인 항목은 렌더링하지 않음 (`income > 0`, `expense > 0`, `savings !== 0`).

**거래 타입별 색상 규칙 (전역 적용)**

| 타입                     | 색상                                          |
| ------------------------ | --------------------------------------------- |
| 수입                     | `text-blue-500`                               |
| 지출                     | `text-gray-500` (헤더) / `text-gray-900` (행) |
| 저축 입금                | `text-teal-500`                               |
| 저축 인출 (`amount < 0`) | `text-orange-500`                             |

**레이블 스타일**: `text-[10px] font-semibold` — 금액 앞에 인라인 배치 (`수입` / `지출` / `저축`)
