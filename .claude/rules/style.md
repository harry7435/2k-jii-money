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
- 트리거 버튼 + createPortal 캘린더 조합
- date-fns로 달력 직접 구현 (react-day-picker 미사용)

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
