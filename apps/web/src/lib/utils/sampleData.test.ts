import { describe, it, expect } from "vitest";
import {
  buildSampleData,
  createRandom,
  sampleMonths,
  SAMPLE_MONTHS,
  type CategoryPath,
} from "./sampleData";
import {
  DEFAULT_CATEGORY_TREE,
  type CategoryNode,
} from "../constants/categories";
import { DEFAULT_ASSET_ACCOUNTS } from "../constants/assets";

/** 기본 카테고리 트리에서 이름 경로를 따라간다. 지출은 [중분류, 소분류] 형태. */
function resolvePath(path: CategoryPath): CategoryNode | null {
  const roots = DEFAULT_CATEGORY_TREE.flatMap((major) => major.children ?? []);
  let level: CategoryNode[] = roots;
  let found: CategoryNode | null = null;

  for (const name of path) {
    const next = level.find((c) => c.name === name);
    if (!next) return null;
    found = next;
    level = next.children ?? [];
  }
  return found;
}

describe("sampleMonths", () => {
  it("당월 포함 SAMPLE_MONTHS 개월을 오래된 순으로 반환한다", () => {
    const months = sampleMonths(new Date(2026, 7, 5)); // 2026-08-05
    expect(months).toHaveLength(SAMPLE_MONTHS);
    expect(months).toEqual([
      { year: 2026, month: 6 },
      { year: 2026, month: 7 },
      { year: 2026, month: 8 },
    ]);
  });

  it("연말을 넘어갈 때 연도가 바뀐다", () => {
    const months = sampleMonths(new Date(2026, 0, 15)); // 2026-01-15
    expect(months).toEqual([
      { year: 2025, month: 11 },
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
    ]);
  });
});

describe("buildSampleData", () => {
  const today = new Date(2026, 7, 5); // 2026-08-05
  const data = buildSampleData(today, createRandom(1));

  it("모든 거래의 카테고리 경로가 기본 카테고리 트리에 존재한다", () => {
    // 경로에 오타가 나면 삽입 시 조용히 누락되므로 여기서 잡는다.
    const missing = data.transactions
      .map((t) => t.path)
      .filter((p) => resolvePath(p) === null)
      .map((p) => p.join(" > "));
    expect([...new Set(missing)]).toEqual([]);
  });

  it("모든 예산의 카테고리 경로가 존재한다 (전체 예산 제외)", () => {
    const missing = data.budgets
      .filter((b) => b.path !== null)
      .map((b) => b.path as CategoryPath)
      .filter((p) => resolvePath(p) === null)
      .map((p) => p.join(" > "));
    expect([...new Set(missing)]).toEqual([]);
  });

  it("모든 스냅샷 계좌가 기본 자산 계좌에 존재한다", () => {
    const names = new Set(DEFAULT_ASSET_ACCOUNTS.map((a) => a.name));
    const missing = data.snapshots
      .map((s) => s.accountName)
      .filter((n) => !names.has(n));
    expect([...new Set(missing)]).toEqual([]);
  });

  it("미래 날짜 거래를 만들지 않는다", () => {
    const todayStr = "2026-08-05";
    const future = data.transactions.filter((t) => t.date > todayStr);
    expect(future).toEqual([]);
  });

  it("SAMPLE_MONTHS 개월 모두에 거래가 들어간다", () => {
    const months = new Set(data.transactions.map((t) => t.date.slice(0, 7)));
    expect([...months].sort()).toEqual(["2026-06", "2026-07", "2026-08"]);
  });

  it("거래가 날짜 오름차순으로 정렬된다", () => {
    const dates = data.transactions.map((t) => t.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it("금액 부호 규칙을 지킨다", () => {
    for (const t of data.transactions) {
      expect(t.amount).toBeGreaterThan(0);
    }
  });

  it("지출에만 evaluation이 붙는다", () => {
    for (const t of data.transactions) {
      if (t.type === "expense") expect(t.evaluation).not.toBeNull();
      else expect(t.evaluation).toBeNull();
    }
  });

  it("같은 시드면 같은 결과를 만든다", () => {
    const a = buildSampleData(today, createRandom(42));
    const b = buildSampleData(today, createRandom(42));
    expect(a).toEqual(b);
  });

  it("월별로 예산이 빠짐없이 생성된다", () => {
    const byMonth = new Map<string, number>();
    for (const b of data.budgets) {
      byMonth.set(b.yearMonth, (byMonth.get(b.yearMonth) ?? 0) + 1);
    }
    expect([...byMonth.keys()].sort()).toEqual([
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
    expect([...new Set(byMonth.values())]).toHaveLength(1);
  });

  it("당월은 오늘까지만 채워 거래 수가 지난 달보다 적다", () => {
    const count = (ym: string) =>
      data.transactions.filter((t) => t.date.startsWith(ym)).length;
    expect(count("2026-08")).toBeLessThan(count("2026-07"));
  });
});
