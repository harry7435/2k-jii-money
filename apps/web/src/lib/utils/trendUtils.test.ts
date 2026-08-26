import { describe, it, expect } from "vitest";
import type { Category, Transaction } from "@2k-jii-money/supabase-types";
import {
  buildMonthList,
  aggregateMonthlyTotals,
  summarizeMiddleCategories,
  aggregateMonthlyBySelectedCategories,
  aggregateMonthlyEvaluation,
  buildMonthRange,
  aggregateMonthlySavings,
} from "./trendUtils";

const REF = new Date(2026, 3, 15); // 2026-04-15 (month is 0-based)

function makeCategory(overrides: Partial<Category>): Category {
  return {
    id: "cat-default",
    family_id: "fam-1",
    name: "기본",
    icon: "category",
    color: "#000000",
    is_default: false,
    level: 3,
    parent_id: null,
    is_fixed: false,
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: "tx-default",
    family_id: "fam-1",
    member_id: "mem-1",
    category_id: "cat-default",
    type: "expense",
    amount: 0,
    memo: null,
    date: "2026-04-01",
    time: null,
    payment_source_id: null,
    evaluation: null,
    created_at: "2026-04-01T00:00:00Z",
    ...overrides,
  } as Transaction;
}

describe("buildMonthList", () => {
  it("returns 12 months ascending with reference month last", () => {
    const list = buildMonthList(12, REF);
    expect(list).toHaveLength(12);
    expect(list[11]).toBe("2026-04");
    expect(list[0]).toBe("2025-05");
  });

  it("crosses year boundary correctly", () => {
    const ref = new Date(2026, 0, 10); // 2026-01
    const list = buildMonthList(12, ref);
    expect(list[0]).toBe("2025-02");
    expect(list[11]).toBe("2026-01");
  });

  it("supports months=1", () => {
    const list = buildMonthList(1, REF);
    expect(list).toEqual(["2026-04"]);
  });
});

describe("aggregateMonthlyTotals", () => {
  const monthList = buildMonthList(12, REF);

  it("returns zero-filled rows for empty input", () => {
    const result = aggregateMonthlyTotals([], monthList);
    expect(result).toHaveLength(12);
    for (const row of result) {
      expect(row.income).toBe(0);
      expect(row.expense).toBe(0);
      expect(row.savings).toBe(0);
    }
  });

  it("sums by type within the same month", () => {
    const txs = [
      makeTransaction({
        id: "1",
        type: "income",
        amount: 1000,
        date: "2026-04-05",
      }),
      makeTransaction({
        id: "2",
        type: "expense",
        amount: 300,
        date: "2026-04-10",
      }),
      makeTransaction({
        id: "3",
        type: "expense",
        amount: 200,
        date: "2026-04-20",
      }),
      makeTransaction({
        id: "4",
        type: "savings",
        amount: 500,
        date: "2026-04-25",
      }),
    ];
    const result = aggregateMonthlyTotals(txs, monthList);
    const apr = result[11];
    expect(apr.month).toBe("2026-04");
    expect(apr.income).toBe(1000);
    expect(apr.expense).toBe(500);
    expect(apr.savings).toBe(500);
  });

  it("nets savings deposits and withdrawals as positive savings", () => {
    const txs = [
      makeTransaction({
        id: "1",
        type: "savings",
        amount: 100000,
        date: "2026-04-05",
      }),
      makeTransaction({
        id: "2",
        type: "savings",
        amount: -30000,
        date: "2026-04-20",
      }),
    ];
    const result = aggregateMonthlyTotals(txs, monthList);
    expect(result[11].savings).toBe(70000);
  });

  it("yields negative savings when withdrawals exceed deposits", () => {
    const txs = [
      makeTransaction({
        id: "1",
        type: "savings",
        amount: -50000,
        date: "2026-04-05",
      }),
    ];
    const result = aggregateMonthlyTotals(txs, monthList);
    expect(result[11].savings).toBe(-50000);
  });

  it("isolates totals across months and ignores out-of-window transactions", () => {
    const txs = [
      makeTransaction({
        id: "1",
        type: "income",
        amount: 100,
        date: "2025-05-01",
      }),
      makeTransaction({
        id: "2",
        type: "expense",
        amount: 50,
        date: "2026-04-01",
      }),
      makeTransaction({
        id: "3",
        type: "income",
        amount: 999,
        date: "2024-12-01",
      }),
    ];
    const result = aggregateMonthlyTotals(txs, monthList);
    expect(result[0].income).toBe(100); // 2025-05
    expect(result[11].expense).toBe(50); // 2026-04
    const totalIncome = result.reduce((s, r) => s + r.income, 0);
    expect(totalIncome).toBe(100); // 2024-12 거래 무시됨
  });
});

describe("summarizeMiddleCategories / aggregateMonthlyBySelectedCategories", () => {
  const monthList = buildMonthList(12, REF);

  // 6개의 중분류 + 각자의 소분류를 만든다
  const categories: Category[] = [
    makeCategory({ id: "m1", level: 2, name: "식비", color: "#f00" }),
    makeCategory({ id: "m2", level: 2, name: "생활", color: "#0f0" }),
    makeCategory({ id: "m3", level: 2, name: "교통", color: "#00f" }),
    makeCategory({ id: "m4", level: 2, name: "문화", color: "#ff0" }),
    makeCategory({ id: "m5", level: 2, name: "의료", color: "#0ff" }),
    makeCategory({ id: "m6", level: 2, name: "기타", color: "#f0f" }),
    makeCategory({ id: "s1", level: 3, parent_id: "m1" }),
    makeCategory({ id: "s2", level: 3, parent_id: "m2" }),
    makeCategory({ id: "s3", level: 3, parent_id: "m3" }),
    makeCategory({ id: "s4", level: 3, parent_id: "m4" }),
    makeCategory({ id: "s5", level: 3, parent_id: "m5" }),
    makeCategory({ id: "s6", level: 3, parent_id: "m6" }),
  ];

  const sixTxs: Transaction[] = [
    makeTransaction({
      id: "a",
      category_id: "s1",
      amount: 600,
      date: "2026-04-01",
    }),
    makeTransaction({
      id: "b",
      category_id: "s2",
      amount: 500,
      date: "2026-04-01",
    }),
    makeTransaction({
      id: "c",
      category_id: "s3",
      amount: 400,
      date: "2026-04-01",
    }),
    makeTransaction({
      id: "d",
      category_id: "s4",
      amount: 300,
      date: "2026-04-01",
    }),
    makeTransaction({
      id: "e",
      category_id: "s5",
      amount: 200,
      date: "2026-04-01",
    }),
    makeTransaction({
      id: "f",
      category_id: "s6",
      amount: 100,
      date: "2026-04-01",
    }),
  ];

  describe("summarizeMiddleCategories", () => {
    it("returns all middle categories sorted by total descending", () => {
      const summary = summarizeMiddleCategories(sixTxs, categories);
      expect(summary.map((s) => s.id)).toEqual([
        "m1",
        "m2",
        "m3",
        "m4",
        "m5",
        "m6",
      ]);
      expect(summary[0]).toMatchObject({
        id: "m1",
        name: "식비",
        color: "#f00",
        total: 600,
      });
    });

    it("excludes categories with zero expense", () => {
      const txs: Transaction[] = [
        makeTransaction({
          id: "a",
          category_id: "s1",
          amount: 100,
          date: "2026-04-01",
        }),
      ];
      const summary = summarizeMiddleCategories(txs, categories);
      expect(summary).toHaveLength(1);
      expect(summary[0].id).toBe("m1");
    });

    it("ignores non-expense transactions and unknown category_ids", () => {
      const txs: Transaction[] = [
        makeTransaction({
          id: "a",
          type: "income",
          category_id: "s1",
          amount: 1000,
          date: "2026-04-01",
        }),
        makeTransaction({
          id: "b",
          category_id: "ghost",
          amount: 999,
          date: "2026-04-01",
        }),
      ];
      expect(summarizeMiddleCategories(txs, categories)).toEqual([]);
    });
  });

  describe("aggregateMonthlyBySelectedCategories", () => {
    it("returns only selected categories ordered by total descending", () => {
      const { series, data } = aggregateMonthlyBySelectedCategories(
        sixTxs,
        categories,
        monthList,
        ["m3", "m1", "m6"], // 입력 순서와 무관하게 누적 합 내림차순
      );
      expect(series.map((s) => s.id)).toEqual(["m1", "m3", "m6"]);

      const apr = data[11];
      expect(apr["m1"]).toBe(600);
      expect(apr["m3"]).toBe(400);
      expect(apr["m6"]).toBe(100);
      expect(apr["m2"]).toBeUndefined(); // 선택 안 됨
    });

    it("returns empty series when selectedIds is empty", () => {
      const { series, data } = aggregateMonthlyBySelectedCategories(
        sixTxs,
        categories,
        monthList,
        [],
      );
      expect(series).toEqual([]);
      expect(Object.keys(data[0])).toEqual(["month"]);
    });

    it("filters out unknown ids from selectedIds", () => {
      const { series } = aggregateMonthlyBySelectedCategories(
        sixTxs,
        categories,
        monthList,
        ["m1", "ghost", "m2"],
      );
      expect(series.map((s) => s.id)).toEqual(["m1", "m2"]);
    });
  });
});

describe("aggregateMonthlyEvaluation", () => {
  const monthList = buildMonthList(12, REF);

  const categories: Category[] = [
    // 변동 중분류
    makeCategory({ id: "var", level: 2, name: "식비", is_fixed: false }),
    makeCategory({
      id: "var-sub",
      level: 3,
      parent_id: "var",
      is_fixed: false,
    }),
    // 고정 중분류
    makeCategory({ id: "fix", level: 2, name: "고정비", is_fixed: true }),
    makeCategory({ id: "fix-sub", level: 3, parent_id: "fix", is_fixed: true }),
  ];

  it("excludes fixed expenses and aggregates by evaluation", () => {
    const txs: Transaction[] = [
      makeTransaction({
        id: "1",
        category_id: "var-sub",
        amount: 100,
        evaluation: "consumption",
        date: "2026-04-01",
      }),
      makeTransaction({
        id: "2",
        category_id: "var-sub",
        amount: 50,
        evaluation: "waste",
        date: "2026-04-01",
      }),
      makeTransaction({
        id: "3",
        category_id: "var-sub",
        amount: 70,
        evaluation: "investment",
        date: "2026-04-01",
      }),
      makeTransaction({
        id: "4",
        category_id: "fix-sub",
        amount: 9999,
        evaluation: "consumption",
        date: "2026-04-01",
      }),
    ];
    const result = aggregateMonthlyEvaluation(txs, categories, monthList);
    const apr = result[11];
    expect(apr.consumption).toBe(100); // 고정지출 9999 제외됨
    expect(apr.waste).toBe(50);
    expect(apr.investment).toBe(70);
  });

  it("falls back null evaluation to 'consumption'", () => {
    const txs: Transaction[] = [
      makeTransaction({
        id: "1",
        category_id: "var-sub",
        amount: 200,
        evaluation: null,
        date: "2026-04-01",
      }),
    ];
    const result = aggregateMonthlyEvaluation(txs, categories, monthList);
    expect(result[11].consumption).toBe(200);
    expect(result[11].waste).toBe(0);
  });

  it("ignores non-expense transactions", () => {
    const txs: Transaction[] = [
      makeTransaction({
        id: "1",
        type: "income",
        category_id: "var-sub",
        amount: 100,
        date: "2026-04-01",
      }),
      makeTransaction({
        id: "2",
        type: "savings",
        category_id: "var-sub",
        amount: 50,
        date: "2026-04-01",
      }),
    ];
    const result = aggregateMonthlyEvaluation(txs, categories, monthList);
    for (const row of result) {
      expect(row.consumption + row.waste + row.investment).toBe(0);
    }
  });
});

describe("buildMonthRange", () => {
  it("returns every month from start to end inclusive", () => {
    expect(buildMonthRange("2026-01", "2026-04")).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
    ]);
  });

  it("crosses year boundaries", () => {
    expect(buildMonthRange("2025-11", "2026-02")).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  it("returns a single month when start equals end", () => {
    expect(buildMonthRange("2026-04", "2026-04")).toEqual(["2026-04"]);
  });

  it("returns an empty array when start is after end", () => {
    expect(buildMonthRange("2026-05", "2026-04")).toEqual([]);
  });
});

describe("aggregateMonthlySavings", () => {
  const months = ["2026-02", "2026-03", "2026-04"];

  it("sums savings transactions per month", () => {
    const txs = [
      makeTransaction({ type: "savings", amount: 300_000, date: "2026-03-05" }),
      makeTransaction({ type: "savings", amount: 200_000, date: "2026-03-20" }),
      makeTransaction({ type: "savings", amount: 500_000, date: "2026-04-01" }),
    ];
    expect(aggregateMonthlySavings(txs, months)).toEqual([
      { month: "2026-02", amount: 0 },
      { month: "2026-03", amount: 500_000 },
      { month: "2026-04", amount: 500_000 },
    ]);
  });

  it("nets withdrawals against deposits in the same month", () => {
    const txs = [
      makeTransaction({ type: "savings", amount: 500_000, date: "2026-04-02" }),
      makeTransaction({ type: "savings", amount: -800_000, date: "2026-04-09" }),
    ];
    const result = aggregateMonthlySavings(txs, months);
    expect(result[2]).toEqual({ month: "2026-04", amount: -300_000 });
  });

  it("ignores income and expense transactions", () => {
    const txs = [
      makeTransaction({ type: "income", amount: 900_000, date: "2026-03-01" }),
      makeTransaction({ type: "expense", amount: 100_000, date: "2026-03-02" }),
    ];
    expect(aggregateMonthlySavings(txs, months)).toEqual([
      { month: "2026-02", amount: 0 },
      { month: "2026-03", amount: 0 },
      { month: "2026-04", amount: 0 },
    ]);
  });

  it("ignores transactions outside the month list", () => {
    const txs = [
      makeTransaction({ type: "savings", amount: 700_000, date: "2025-12-15" }),
    ];
    const result = aggregateMonthlySavings(txs, months);
    expect(result.every((r) => r.amount === 0)).toBe(true);
  });
});
