# 화면 전환 애니메이션 (ssgoi) 설계

## 목표

웹 앱에서 화면을 바꿀 때 네이티브 앱처럼 화면이 움직이게 한다. 라이브러리는 [ssgoi](https://github.com/meursyphus/ssgoi)(`@ssgoi/react` 7.4.1)를 쓴다.

### 범위

- **포함**: 하단 탭 사이 이동, 상세 화면에 들어가고 나오는 이동(대시보드 → 월별 추이)
- **제외**: 온보딩 흐름(`/welcome` → `/family-setup` → `/create-family`·`/join` → `/home`)

### 성공 기준

- 탭을 바꾸면 콘텐츠가 탭 순서에 맞는 방향으로 밀려나고, 탭바(모바일 하단 / 데스크톱 사이드바)는 움직이지 않는다
- `/home/dashboard` → `/home/dashboard/trend`는 drill로 들어가고, 뒤로가기(브라우저 뒤로가기 포함)는 반대 방향으로 나온다
- 데스크톱 사이드바 레이아웃에서 전환 중에 화면이 튀지 않는다
- 기존 모달·팝업(`createPortal`)의 표시와 z-index가 그대로다

## 접근 방식

`<Ssgoi>`를 **`app/home/layout.tsx` 안쪽 콘텐츠 영역에만** 둔다.

ssgoi는 나가는 페이지의 DOM을 `position: absolute`로 잠시 다시 붙인다. 그 기준이 되는 셸(`relative z-0 overflow-x-clip`)을 콘텐츠 영역으로 잡으면 두 가지가 해결된다.

- 탭바가 경계 밖에 있어 움직이지 않는다
- 나가는 페이지의 기준점이 사이드바 오른쪽 콘텐츠 영역이 되어 데스크톱에서 위치가 어긋나지 않는다

검토했지만 고르지 않은 안은 루트 레이아웃에 `<Ssgoi>`를 두고 경계를 두 겹(app-shell / main-content)으로 쓰는 방식이다. 온보딩까지 전환을 넣을 때 필요한 구조지만, 지금 범위에서는 루트 셸의 기준점과 사이드바 오프셋 문제만 늘어난다. 나중에 온보딩이 범위에 들어오면 그때 옮긴다.

## 구성

### `src/lib/ssgoiConfig.ts` (신규)

전환 규칙만 담는 모듈이다.

```ts
transitions: [
  { ordered: TAB_HREFS, transition: slide() },
  { from: "/home/dashboard", to: "/home/dashboard/trend", transition: drill() },
];
```

- `TAB_HREFS`는 `layout.tsx`의 `TABS`와 같은 출처에서 가져온다. 탭 순서와 전환 방향이 서로 어긋나지 않게 하기 위해서다. `TABS`를 `src/lib/constants/navigation.ts`로 옮기고 `layout.tsx`와 `ssgoiConfig.ts`가 둘 다 import한다
- 뒤로가기 시 drill이 반대 방향으로 나오지 않으면 `{ on: "/home/dashboard/**", except: "/home/dashboard", transition: drill() }` 형태로 바꾼다. 어느 쪽으로 할지는 실제 동작을 보고 정한다
- 규칙에 없는 이동(예: trend → budget)은 전환 없이 바로 바뀐다. 이 동작은 의도한 것이다

### `app/home/layout.tsx`

```tsx
<div className="flex-1 relative z-0 overflow-x-clip pb-20 md:pb-0 ...">
  <Ssgoi config={ssgoiConfig}>
    <SsgoiRouteBoundary>{children}</SsgoiRouteBoundary>
  </Ssgoi>
</div>
```

- `SsgoiRouteBoundary`는 `@ssgoi/react/nextjs`에서 가져온다
- `error`나 "가족 없음"일 때 나오는 `StatusScreen` 분기는 그대로 둔다

### `apps/web/package.json`

- `@ssgoi/react@^7.4.1`을 추가한다. `@ssgoi/core`는 의존성으로 함께 설치된다

## 위험 요소와 확인할 것

| 항목      | 우려                                                                                                                                                                                                              | 확인 방법 / 대응                                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 스크롤    | 콘텐츠 div에 `overflow-y-auto`가 붙어 있지만 레이아웃이 `min-h-screen`이라 실제 스크롤은 window가 하는 것으로 보인다. ssgoi의 스크롤 복원(`ordered`는 양쪽 다 복원)이 이 구조에서 맞게 동작하는지 확인이 필요하다 | 긴 내역 화면을 스크롤한 상태에서 탭을 오가며 확인한다. 어긋나면 `overflow-y-auto`를 정리하거나 `preserveScroll`로 조정한다 QA 결과: 가정이 틀렸다. ssgoi가 `overflow-y-auto` div를 스크롤 요소로 오인해 탭 전환 시 스크롤이 0으로 튀었다. 셸에서 `overflow-y-auto`를 제거해 해결했다. |
| 스켈레톤  | 탭에 들어가면 스켈레톤이 먼저 보이고 데이터로 바뀐다. 이 교체가 슬라이드 도중에 일어난다                                                                                                                          | 눈으로 보고 어색하면 따로 보고한다. 이번 범위에서 고치지는 않는다                                                          |
| 포털      | 셸에 `z-0`이 붙어 스태킹 컨텍스트가 새로 생긴다                                                                                                                                                                   | 포털은 `body`에 붙으므로 영향이 없어야 한다. 거래 추가 모달, DateTimePicker, 카테고리 삭제 확인창을 열어서 확인한다 QA 결과: 가정이 틀렸다. 포털 없는 모달(AddTransaction, SetBudget, 자산 모달 3종, 설정 QR·멤버)이 `z-0` 셸에 갇혀 탭바(z-40) 아래로 깔렸다. 모두 `createPortal(document.body)`로 감쌌다. |
| 접근성    | `prefers-reduced-motion`                                                                                                                                                                                          | ssgoi가 자체적으로 처리하는지 확인한다. 처리하지 않으면 그 설정에서는 `transitions`를 빈 배열로 둔다                       |
| 고정 탭바 | 모바일 하단 탭바는 `fixed z-40`이다                                                                                                                                                                               | 셸 바깥 형제 요소라 영향이 없어야 한다. 전환 중에 탭바가 가려지지 않는지 확인한다                                          |

## 검증

- `pnpm build`, `pnpm test:run`, `pnpm lint`(apps/web)
- 크롬에서 수동 QA. 모바일 폭(약 390px)과 데스크톱 폭(1280px 이상) 두 가지로 본다
  - 탭을 차례로 이동하고 역순으로도 이동해서 방향을 확인한다
  - 대시보드 → 추이 진입, 화면 안의 이동과 브라우저 뒤로가기로 나오기
  - 스크롤 위치 복원
  - 모달과 팝업 표시
- 전환 규칙은 설정값이라 단위 테스트를 두지 않는다

## 문서화

`.claude/rules/style.md`에 "화면 전환" 절을 추가한다. 적을 내용은 다음과 같다.

- 셸의 위치
- 새 탭을 추가할 때는 `TABS` 한 곳만 고친다
- 상세 화면을 추가할 때는 `ssgoiConfig.ts`에 규칙을 추가한다

`apps/web/CLAUDE.md`의 기술 스택과 디렉토리 구조에도 반영한다.

## 실행 방식

구현은 Claude 팀으로 진행한다.

- **executor**: 구현
- **verifier**: 빌드·테스트와 크롬 QA

작업 규모(파일 4~5개)를 고려해 두 명으로 제한한다. 메모리에 남긴 방침에 따라 별도 구현 계획 문서는 만들지 않는다.
