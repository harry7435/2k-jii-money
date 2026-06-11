import { describe, it, expect } from "vitest";
import { calcDelta, prevMonth } from "./formatters";

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
