import { useSyncExternalStore } from "react";
import { drill, slide } from "@ssgoi/react/view-transitions";
import { TABS } from "./constants/navigation";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// 탭 순서가 곧 슬라이드 방향이다. 탭바와 어긋나지 않게 TABS에서 그대로 가져온다.
// 여기 없는 이동(예: trend → budget)은 전환 없이 바로 바뀐다.
// from/to는 양방향이라 뒤로가기(trend → dashboard)는 drill이 반대 방향으로 나온다.
const ssgoiConfig = {
  transitions: [
    { ordered: TABS.map((tab) => tab.href), transition: slide() },
    {
      from: "/home/dashboard",
      to: "/home/dashboard/trend",
      transition: drill(),
    },
  ],
};

const noTransitionConfig = { transitions: [] };

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

// ssgoi는 prefers-reduced-motion을 처리하지 않는다. 서버·hydration 때는 false로 보고
// 마운트 뒤에 실제 값을 읽으므로 마크업 불일치가 생기지 않는다.
export function useSsgoiConfig() {
  const reduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
  return reduced ? noTransitionConfig : ssgoiConfig;
}
