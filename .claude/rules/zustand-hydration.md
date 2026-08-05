# Zustand 전역 상태

## 개요

- `useFamilyStore`: 로그인한 사용자의 `family`, `member`를 담는 **메모리 전용** store
- 인증은 Supabase Auth(이메일 + 비밀번호). `members.user_id`가 `auth.users`와 1:1로 연결된다
- 라우트 가드는 `apps/web/proxy.ts`(Next.js 16에서 middleware를 대체한 규약)가 서버에서 처리한다

## persist를 쓰지 않는 이유

예전에는 `persist` 미들웨어로 localStorage에 저장했고, 그 탓에 hydration 타이밍 문제와 `useHasHydrated()` 훅이 필요했다.

지금은 **진실의 원천이 서버**(Auth 세션 쿠키 + `members.user_id`)다. localStorage에 남기면:

- 로그아웃해도 이전 가족 정보가 남는다
- 계정을 바꿔도 이전 가족이 그대로 보인다

그래서 `persist`를 제거했고 `useHasHydrated()`도 함께 사라졌다.

## 값을 채우는 곳

`app/home/layout.tsx`가 마운트 시 `getCurrentMembership()`을 한 번 호출해 store를 채운다.

```ts
const { data: membership } = useQuery({
  queryKey: ["membership"],
  queryFn: getCurrentMembership,
  staleTime: Infinity,
});

useEffect(() => {
  if (membership) {
    setFamily(membership.family);
    setMember(membership.member);
  }
}, [membership, setFamily, setMember]);

if (!family) return null;
```

## 규칙

- 미로그인·무소속 상태는 `proxy.ts`가 이미 걸러내므로 페이지에서 리다이렉트를 중복으로 넣지 않는다
- 로그아웃 시 `clear()`와 React Query 캐시 비우기(`qc.clear()`)를 함께 호출한다 — 안 하면 다음 계정에서 이전 가족 데이터가 잠깐 보인다
- 하위 페이지는 `useFamilyStore((s) => s.family)`를 그대로 읽으면 된다
