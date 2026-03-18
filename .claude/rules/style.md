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
