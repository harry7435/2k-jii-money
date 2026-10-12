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
const {
  data: membership,
  isPending,
  error,
} = useQuery({
  queryKey: ["membership"],
  queryFn: getCurrentMembership,
  staleTime: 1000 * 60 * 5,
  refetchOnMount: "always",
});

useEffect(() => {
  if (membership) {
    setFamily(membership.family);
    setMember(membership.member);
  }
}, [membership, setFamily, setMember]);
```

`staleTime: Infinity`를 쓰지 않는 이유: 세션에 의존하는 값이라 한 번 `null`이 캐시되면
로그인해도 영구히 `null`로 남는다.

## 로딩 중에 레이아웃을 막지 않는다

예전에는 `isPending`이면 "불러오는 중..." 텍스트 화면을, `!family`면 `null`을 반환해
**앱 전체를 막았다.** 탭바까지 사라져서 실제 소요와 무관하게 훨씬 느리게 느껴졌다.

이 구간은 짧지 않다. `getCurrentMembership()`은 `getSession()` + `members`(+`families` 조인)이고,
`getSession()`은 액세스 토큰이 만료 90초 이내면 **인증 서버로 리프레시 왕복을 먼저 다녀온다**
(`EXPIRY_MARGIN_MS`). 그래서 평소엔 빠른데 한참 뒤 들어오면 갑자기 느려진다.

지금은 셸(탭바 + `children`)을 먼저 그리고, 로딩 표시는 각 페이지의 스켈레톤이 맡는다.

```ts
if (error) return <StatusScreen ... />;
// isPending 중에는 membership이 undefined다. "가족 없음" 판정을 조회가 끝난 뒤로 미룬다.
if (!isPending && !membership) return <StatusScreen 가족없음 ... />;
return <셸>{children}</셸>;
```

## 규칙

- 미로그인 상태는 `proxy.ts`가 걸러내므로 페이지에서 리다이렉트를 중복으로 넣지 않는다
- 무소속(가족 없음) 상태는 경로에 따라 다르다. `/`·`/welcome`·온보딩 경로에서는 `proxy.ts`가 `my_family_id()`로 확인해 보내지만, **`/home/*`에서는 그 RPC를 생략한다** — HTML이 나가기 전의 DB 왕복이라 앱을 열 때와 탭 전환마다 빈 화면이 길어지기 때문. 무소속 사용자가 `/home/*`에 직접 오면 `app/home/layout.tsx`의 "가족 없음" 안내 화면이 받는다
- 로그아웃 시 `clear()`와 React Query 캐시 비우기(`qc.clear()`)를 함께 호출한다 — 안 하면 다음 계정에서 이전 가족 데이터가 잠깐 보인다
- 하위 페이지는 `useFamilyStore((s) => s.family)`를 그대로 읽으면 된다. 단 **`family`가 아직 없는 구간이 화면에 보이므로**, 그 구간을 로딩으로 취급해야 한다 — `.claude/rules/style.md`의 "isLoading 조합 규칙" 참조
