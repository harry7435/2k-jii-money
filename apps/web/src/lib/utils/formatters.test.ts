import { describe, it, expect } from "vitest";
import {
  calcDelta,
  prevMonth,
  formatUpdatedAt,
  deltaState,
} from "./formatters";

describe("calcDelta", () => {
  it("returns positive diff and pct on increase", () => {
    expect(calcDelta(1_200_000, 1_000_000)).toEqual({ diff: 200_000, pct: 20 });
  });

  it("returns negative diff and pct on decrease", () => {
    expect(calcDelta(900_000, 1_000_000)).toEqual({ diff: -100_000, pct: -10 });
  });

  it("returns null pct when prev is 0", () => {
    expect(calcDelta(500_000, 0)).toEqual({ diff: 500_000, pct: null });
  });

  it("returns zero diff when unchanged", () => {
    expect(calcDelta(1_000_000, 1_000_000)).toEqual({ diff: 0, pct: 0 });
  });

  it("uses absolute prev for pct when prev is negative (저축 인출 월)", () => {
    expect(calcDelta(100_000, -100_000)).toEqual({ diff: 200_000, pct: 200 });
  });
});

describe("prevMonth", () => {
  it("returns the previous month", () => {
    expect(prevMonth("2026-06")).toBe("2026-05");
  });

  it("crosses year boundaries", () => {
    expect(prevMonth("2026-01")).toBe("2025-12");
  });
});

describe("formatUpdatedAt", () => {
  // 로컬 타임존 의존을 피하려고 로컬 Date에서 ISO 문자열을 만든다
  const iso = (y: number, m: number, d: number) =>
    new Date(y, m - 1, d, 15, 0).toISOString();

  it("omits the year when updated in the reference year", () => {
    expect(formatUpdatedAt(iso(2026, 8, 24), new Date(2026, 7, 26))).toBe(
      "8월 24일",
    );
  });

  it("includes the year when updated in an earlier year", () => {
    expect(formatUpdatedAt(iso(2025, 11, 3), new Date(2026, 7, 26))).toBe(
      "2025년 11월 3일",
    );
  });

  it("returns null for a missing timestamp", () => {
    expect(formatUpdatedAt(null)).toBeNull();
  });
});

describe("deltaState", () => {
  it("reports 'changed' when both months have a value and they differ", () => {
    expect(deltaState(1_200_000, 1_000_000)).toBe("changed");
    expect(deltaState(900_000, 1_000_000)).toBe("changed");
  });

  it("reports 'same' when the value is unchanged", () => {
    expect(deltaState(1_000_000, 1_000_000)).toBe("same");
  });

  it("reports 'new' when there was no previous value but there is one now", () => {
    expect(deltaState(500_000, 0)).toBe("new");
  });

  it("reports 'none' when both months are empty", () => {
    expect(deltaState(0, 0)).toBe("none");
  });

  it("treats a negative previous balance as comparable, not new", () => {
    expect(deltaState(100_000, -100_000)).toBe("changed");
  });
});
