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
