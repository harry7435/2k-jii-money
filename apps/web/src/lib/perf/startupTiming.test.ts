import { beforeEach, describe, expect, it } from "vitest";
import {
  buildStartupRecord,
  isFreshLoadOf,
  loadStartupRecords,
  saveStartupRecord,
  STARTUP_TIMINGS_KEY,
  type StartupRecord,
} from "./startupTiming";

const SB = "https://abc.supabase.co";
const nav = {
  redirectCount: 0,
  responseStart: 120.6,
  responseEnd: 300.4,
  type: "navigate",
};

function build(over: Partial<Parameters<typeof buildStartupRecord>[0]> = {}) {
  return buildStartupRecord({
    navigation: nav,
    resources: [],
    hydratedAt: 1500.5,
    dataReadyAt: 2400.49,
    standalone: true,
    now: 1000,
    supabaseUrl: SB,
    ...over,
  });
}

describe("buildStartupRecord", () => {
  it("시간 값을 정수로 반올림한다", () => {
    const r = build();
    expect(r).toMatchObject({
      ttfb: 121,
      docLoaded: 300,
      hydrated: 1501,
      dataReady: 2400,
      standalone: true,
      navType: "navigate",
      at: 1000,
    });
  });

  it("리다이렉트가 있으면 redirected가 true다", () => {
    expect(build().redirected).toBe(false);
    expect(
      build({ navigation: { ...nav, redirectCount: 1 } }).redirected,
    ).toBe(true);
  });

  it("dataReady 전에 시작한 Supabase 요청만 센다", () => {
    const r = build({
      resources: [
        { name: `${SB}/rest/v1/a`, startTime: 1000, responseEnd: 1200 },
        { name: `${SB}/rest/v1/b`, startTime: 2399, responseEnd: 2500 },
        { name: `${SB}/rest/v1/c`, startTime: 2500, responseEnd: 2600 },
        { name: "https://example.com/x.js", startTime: 500, responseEnd: 900 },
      ],
    });
    expect(r.supabaseRequests).toBe(2);
  });

  it("토큰 갱신 요청을 감지한다", () => {
    const refresh = {
      name: `${SB}/auth/v1/token?grant_type=refresh_token`,
      startTime: 800,
      responseEnd: 1000,
    };
    expect(build({ resources: [refresh] }).tokenRefresh).toBe(true);
    expect(
      build({ resources: [{ ...refresh, startTime: 3000 }] }).tokenRefresh,
    ).toBe(false);
    expect(build().tokenRefresh).toBe(false);
  });
});

describe("요청별 시간", () => {
  const res = (over: Record<string, unknown> = {}) => ({
    name: `${SB}/rest/v1/transactions`,
    startTime: 1000,
    responseEnd: 1200,
    ...over,
  });

  it("쿼리 문자열은 저장하지 않고 경로만 남긴다", () => {
    const r = build({
      resources: [res({ name: `${SB}/rest/v1/transactions?family_id=eq.secret` })],
    });
    expect(r.requests?.[0].path).toBe("/rest/v1/transactions");
    expect(JSON.stringify(r.requests)).not.toContain("secret");
  });

  it("dataReady 전의 Supabase 요청만 담는다", () => {
    const r = build({
      resources: [
        res(),
        res({ startTime: 2500 }),
        res({ name: "https://example.com/x.js" }),
      ],
    });
    expect(r.requests).toHaveLength(1);
  });

  it("시작 순으로 정렬한다", () => {
    const r = build({
      resources: [res({ startTime: 1500 }), res({ startTime: 900 })],
    });
    expect(r.requests?.map((q) => q.start)).toEqual([900, 1500]);
  });

  it("requestStart가 0이면 세부값은 null이다", () => {
    const q = build({ resources: [res({ requestStart: 0 })] }).requests![0];
    expect(q).toMatchObject({ connect: null, dns: null, wait: null });
  });

  it("requestStart가 양수면 세부값을 계산한다", () => {
    const q = build({
      resources: [
        res({
          requestStart: 1100,
          responseStart: 1180.4,
          connectStart: 1010,
          connectEnd: 1090.2,
          domainLookupStart: 1001,
          domainLookupEnd: 1009,
          startTime: 1000.4,
          responseEnd: 1200.2,
        }),
      ],
    }).requests![0];
    expect(q).toMatchObject({
      start: 1000,
      duration: 200,
      connect: 80,
      dns: 8,
      wait: 80,
    });
  });

  it("재사용된 연결은 connect가 0이다", () => {
    const q = build({
      resources: [
        res({ requestStart: 1100, responseStart: 1150, connectStart: 1000, connectEnd: 1000 }),
      ],
    }).requests![0];
    expect(q.connect).toBe(0);
  });

  it("protocol이 빈 문자열이면 null이다", () => {
    const r = build({
      resources: [res({ nextHopProtocol: "" }), res({ nextHopProtocol: "h2" })],
    });
    expect(r.requests?.map((q) => q.protocol)).toEqual([null, "h2"]);
  });

  it("20건까지만 담는다", () => {
    const resources = Array.from({ length: 25 }, (_, i) => res({ startTime: i }));
    expect(build({ resources }).requests).toHaveLength(20);
  });

  it("requests가 없는 예전 기록도 그대로 불러온다", () => {
    const { requests: _omit, ...old } = build();
    void _omit;
    globalThis.localStorage = {
      getItem: () => JSON.stringify([old]),
    } as unknown as Storage;
    const list = loadStartupRecords();
    expect(list).toHaveLength(1);
    expect(list[0].requests).toBeUndefined();
  });
});

describe("저장소 헬퍼", () => {
  const rec = (at: number): StartupRecord => ({ ...build(), at });

  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    } as unknown as Storage;
  });

  it("최신 기록이 앞에 온다", () => {
    saveStartupRecord(rec(1));
    saveStartupRecord(rec(2));
    expect(loadStartupRecords().map((r) => r.at)).toEqual([2, 1]);
  });

  it("최근 10건만 남긴다", () => {
    for (let i = 1; i <= 12; i++) saveStartupRecord(rec(i));
    const list = loadStartupRecords();
    expect(list).toHaveLength(10);
    expect(list[0].at).toBe(12);
    expect(list[9].at).toBe(3);
  });

  it("깨진 JSON이면 빈 배열이다", () => {
    localStorage.setItem(STARTUP_TIMINGS_KEY, "{not json");
    expect(loadStartupRecords()).toEqual([]);
  });

  it("배열이 아닌 값이면 빈 배열이다", () => {
    localStorage.setItem(STARTUP_TIMINGS_KEY, '{"a":1}');
    expect(loadStartupRecords()).toEqual([]);
  });
});

describe("isFreshLoadOf", () => {
  const T = "/home/transactions";
  it("목표 경로를 직접 연 로드면 true", () => {
    expect(isFreshLoadOf(`https://a.com${T}`, T, T)).toBe(true);
  });
  it("다른 문서에서 클라이언트 이동으로 들어오면 false", () => {
    expect(isFreshLoadOf("https://a.com/create-family", T, T)).toBe(false);
  });
  it("쿼리는 무시한다", () => {
    expect(isFreshLoadOf(`https://a.com${T}?x=1`, T, T)).toBe(true);
  });
  it("다른 경로 문서면 false", () => {
    expect(isFreshLoadOf("https://a.com/home/dashboard", T, T)).toBe(false);
  });
  it("URL이 깨져도 던지지 않고 false", () => {
    expect(isFreshLoadOf("not a url", T, T)).toBe(false);
  });
});
