# Zustand 전역 상태

## 개요

- `useFamilyStore`: `family`, `member` 저장 (localStorage persist)
- 인증 없음 — 가족 코드 기반 익명 접근
- `home/layout.tsx`에서 `family` 없으면 `/welcome`으로 리다이렉트

## persist hydration 문제

`persist` 미들웨어는 localStorage에서 **비동기** hydrate한다.
초기 렌더 시 `family`는 항상 `null`이므로, hydration 완료 전에 리다이렉트하면 새로고침 시 로그인이 풀리는 버그가 발생한다.

## 해결: `useHasHydrated()` 훅

`src/lib/store/familyStore.ts`에 `useSyncExternalStore` 기반으로 구현되어 있다.

- SSR: `getServerSnapshot` → `false`
- 클라이언트: `persist.hasHydrated()` + `onFinishHydration` 구독
- `useState+useEffect` 대신 사용 (린트 규칙 `react-hooks/set-state-in-effect` 위반 방지)

## 사용 패턴

```ts
const hydrated = useHasHydrated();
const family = useFamilyStore((s) => s.family);

useEffect(() => {
  if (hydrated && !family) router.replace("/welcome");
}, [hydrated, family, router]);

if (!hydrated || !family) return null;
```

## 규칙

- persist store 값으로 렌더 분기(리다이렉트, 조건부 UI)하는 모든 곳에서 `useHasHydrated()` 필수
- `home/layout.tsx`에 적용 예시가 있음
