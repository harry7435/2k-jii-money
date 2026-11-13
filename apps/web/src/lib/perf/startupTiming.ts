// 앱 시작 시간 기록. 설치된 PWA를 오래 안 쓰다 열 때 어디서 시간이 가는지
// 원격 디버깅 없이 기기에서 확인하려고 만든 진단 도구다.
// 숫자와 불리언만 저장한다. 가계부 데이터는 절대 넣지 않는다.

export const STARTUP_TIMINGS_KEY = "startup-timings";
const MAX_RECORDS = 10;
const TARGET_PATH = "/home/transactions";
const MAX_REQUESTS = 20;

/**
 * Supabase 요청 하나의 시간. 쿼리 문자열(필터·ID)은 저장하지 않고 경로만 남긴다.
 * 연결 시간 구분(콜드 커넥션 vs 서버 응답 지연)을 보려고 만든다.
 * connect/dns/wait는 서버가 Timing-Allow-Origin을 보낼 때만 값이 있고, 아니면 null이다.
 */
export type RequestTiming = {
  path: string;
  /** 탐색 시작 기준 요청 시작 ms */
  start: number;
  duration: number;
  protocol: string | null;
  /** 0이면 기존 연결을 재사용했다는 뜻 */
  connect: number | null;
  dns: number | null;
  /** 요청을 보낸 뒤 첫 바이트까지 */
  wait: number | null;
};

export type StartupRecord = {
  /** 기록 시각 (epoch ms) */
  at: number;
  standalone: boolean;
  navType: string;
  /** 문서 요청에 리다이렉트가 끼었는가 */
  redirected: boolean;
  /** 아래 시간은 모두 탐색 시작(time origin) 기준 ms */
  ttfb: number;
  docLoaded: number;
  hydrated: number;
  dataReady: number;
  /** dataReady 전에 시작된 Supabase 요청 수 */
  supabaseRequests: number;
  /** dataReady 전에 토큰 갱신 요청이 있었는가 */
  tokenRefresh: boolean;
  /** dataReady 전 Supabase 요청별 시간 (시작 순, 최대 20건). 예전 기록에는 없다 */
  requests?: RequestTiming[];
};

export type NavigationLike = {
  redirectCount: number;
  responseStart: number;
  responseEnd: number;
  type: string;
};

export type ResourceLike = {
  name: string;
  startTime: number;
  responseEnd: number;
  nextHopProtocol?: string;
  requestStart?: number;
  responseStart?: number;
  connectStart?: number;
  connectEnd?: number;
  domainLookupStart?: number;
  domainLookupEnd?: number;
};

function toRequestTiming(r: ResourceLike): RequestTiming | null {
  let path: string;
  try {
    path = new URL(r.name).pathname;
  } catch {
    return null;
  }
  // 교차 출처 리소스는 Timing-Allow-Origin이 없으면 requestStart 등이 0으로 온다
  const detailed = (r.requestStart ?? 0) > 0;
  return {
    path,
    start: Math.round(r.startTime),
    duration: Math.round(r.responseEnd - r.startTime),
    protocol: r.nextHopProtocol || null,
    connect: detailed
      ? Math.round((r.connectEnd ?? 0) - (r.connectStart ?? 0))
      : null,
    dns: detailed
      ? Math.round((r.domainLookupEnd ?? 0) - (r.domainLookupStart ?? 0))
      : null,
    wait: detailed
      ? Math.round((r.responseStart ?? 0) - (r.requestStart ?? 0))
      : null,
  };
}

export function buildStartupRecord(input: {
  navigation: NavigationLike;
  resources: ResourceLike[];
  hydratedAt: number;
  dataReadyAt: number;
  standalone: boolean;
  now: number;
  supabaseUrl: string;
}): StartupRecord {
  const { navigation, resources, hydratedAt, dataReadyAt, supabaseUrl } = input;
  const before = resources.filter((r) => r.startTime < dataReadyAt);
  return {
    at: input.now,
    standalone: input.standalone,
    navType: navigation.type,
    redirected: navigation.redirectCount > 0,
    ttfb: Math.round(navigation.responseStart),
    docLoaded: Math.round(navigation.responseEnd),
    hydrated: Math.round(hydratedAt),
    dataReady: Math.round(dataReadyAt),
    // supabaseUrl이 비면 startsWith("")가 전부 참이 되므로 센 값을 0으로 둔다
    supabaseRequests: supabaseUrl
      ? before.filter((r) => r.name.startsWith(supabaseUrl)).length
      : 0,
    tokenRefresh: before.some((r) => r.name.includes("/auth/v1/token")),
    requests: supabaseUrl
      ? before
          .filter((r) => r.name.startsWith(supabaseUrl))
          .sort((a, b) => a.startTime - b.startTime)
          .map(toRequestTiming)
          .filter((t): t is RequestTiming => t !== null)
          .slice(0, MAX_REQUESTS)
      : [],
  };
}

/**
 * 이 문서가 목표 경로를 직접 연 전체 로드인가.
 * 온보딩 화면(/create-family, /join, /welcome)에서 router.replace로 /home에 들어오면
 * 현재 경로는 목표지만 navigation 기록은 이전 문서의 것이라, 사용자가 화면에 머문 시간이 섞인다.
 * navigationUrl은 리다이렉트를 거친 최종 문서 URL이고 쿼리는 무시한다.
 */
export function isFreshLoadOf(
  navigationUrl: string,
  currentPath: string,
  target: string,
): boolean {
  try {
    return new URL(navigationUrl).pathname === target && currentPath === target;
  } catch {
    return false;
  }
}

export function loadStartupRecords(): StartupRecord[] {
  try {
    const raw = localStorage.getItem(STARTUP_TIMINGS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StartupRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveStartupRecord(record: StartupRecord): void {
  try {
    const next = [record, ...loadStartupRecords()].slice(0, MAX_RECORDS);
    localStorage.setItem(STARTUP_TIMINGS_KEY, JSON.stringify(next));
  } catch {
    // 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 기록을 포기한다
  }
}

export function clearStartupRecords(): void {
  try {
    localStorage.removeItem(STARTUP_TIMINGS_KEY);
  } catch {
    // 무시
  }
}

// 페이지 로드당 한 번만 기록하는 모듈 단위 상태.
// 클라이언트 내비게이션으로는 모듈이 다시 로드되지 않지만, 다른 경로에서 로드된 문서가
// router.replace로 /home에 처음 들어올 수도 있다. 그 경우는 isFreshLoadOf로 걸러낸다.
let hydrated: { at: number; pathname: string } | null = null;
let recorded = false;

/** 홈 셸이 마운트되는 시점. 두 번째 호출부터는 무시한다. */
export function markHydrated(): void {
  if (typeof window === "undefined" || hydrated) return;
  hydrated = { at: performance.now(), pathname: location.pathname };
}

/** 거래 화면의 핵심 데이터가 준비된 시점. 첫 화면이 /home/transactions인 전체 로드만 기록한다. */
export function markDataReady(): void {
  if (typeof window === "undefined" || recorded || !hydrated) return;
  recorded = true;
  if (hydrated.pathname !== TARGET_PATH) return;
  try {
    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming | undefined;
    if (!navigation) return;
    if (!isFreshLoadOf(navigation.name, hydrated.pathname, TARGET_PATH)) return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    saveStartupRecord(
      buildStartupRecord({
        navigation,
        resources: performance.getEntriesByType(
          "resource",
        ) as PerformanceResourceTiming[],
        hydratedAt: hydrated.at,
        dataReadyAt: performance.now(),
        standalone,
        now: Date.now(),
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      }),
    );
  } catch {
    // 진단 도구가 앱을 깨뜨려선 안 된다
  }
}
