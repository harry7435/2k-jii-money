import { describe, it, expect } from "vitest";
import {
  to24h,
  from24h,
  setHour,
  setHour24,
  setMinute,
  dialPoint,
} from "./timeUtils";

describe("to24h", () => {
  it("maps 12 AM to midnight", () => {
    expect(to24h(12, "AM")).toBe(0);
  });

  it("maps 12 PM to noon", () => {
    expect(to24h(12, "PM")).toBe(12);
  });

  it("keeps AM hours as-is", () => {
    expect(to24h(1, "AM")).toBe(1);
    expect(to24h(11, "AM")).toBe(11);
  });

  it("adds 12 to PM hours", () => {
    expect(to24h(1, "PM")).toBe(13);
    expect(to24h(11, "PM")).toBe(23);
  });
});

describe("from24h", () => {
  it("reads midnight as 12 AM", () => {
    expect(from24h("00:30")).toEqual({ hour12: 12, minute: 30, period: "AM" });
  });

  it("reads noon as 12 PM", () => {
    expect(from24h("12:30")).toEqual({ hour12: 12, minute: 30, period: "PM" });
  });

  it("reads afternoon hours as PM", () => {
    expect(from24h("13:10")).toEqual({ hour12: 1, minute: 10, period: "PM" });
  });

  it("reads morning hours as AM", () => {
    expect(from24h("09:05")).toEqual({ hour12: 9, minute: 5, period: "AM" });
  });

  it("falls back to 00:00 on empty input", () => {
    expect(from24h("")).toEqual({ hour12: 12, minute: 0, period: "AM" });
  });

  it("falls back to 00:00 on malformed input", () => {
    expect(from24h("abc")).toEqual({ hour12: 12, minute: 0, period: "AM" });
  });

  it("falls back to 00:00 on out-of-range input", () => {
    expect(from24h("25:99")).toEqual({ hour12: 12, minute: 0, period: "AM" });
  });
});

describe("setHour", () => {
  it("preserves the minute", () => {
    expect(setHour("13:10", 12, "AM")).toBe("00:10");
    expect(setHour("13:10", 12, "PM")).toBe("12:10");
  });

  it("writes PM hours in 24h form", () => {
    expect(setHour("09:45", 11, "PM")).toBe("23:45");
  });

  it("starts from 00:00 when the value is empty", () => {
    expect(setHour("", 3, "AM")).toBe("03:00");
  });
});

describe("setHour24", () => {
  it("preserves the minute", () => {
    expect(setHour24("13:10", 0)).toBe("00:10");
    expect(setHour24("13:10", 23)).toBe("23:10");
  });

  it("pads a single-digit hour", () => {
    expect(setHour24("13:10", 7)).toBe("07:10");
  });

  it("starts from 00:00 when the value is empty", () => {
    expect(setHour24("", 13)).toBe("13:00");
  });
});

describe("setMinute", () => {
  it("preserves the hour", () => {
    expect(setMinute("13:10", 25)).toBe("13:25");
  });

  it("pads a zero minute", () => {
    expect(setMinute("13:10", 0)).toBe("13:00");
  });

  it("starts from 00:00 when the value is empty", () => {
    expect(setMinute("", 25)).toBe("00:25");
  });
});

describe("dialPoint", () => {
  it("puts index 0 at the top", () => {
    const { x, y } = dialPoint(0, 70);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(-70);
  });

  it("advances clockwise", () => {
    const right = dialPoint(3, 70);
    expect(right.x).toBeCloseTo(70);
    expect(right.y).toBeCloseTo(0);

    const bottom = dialPoint(6, 70);
    expect(bottom.x).toBeCloseTo(0);
    expect(bottom.y).toBeCloseTo(70);

    const left = dialPoint(9, 70);
    expect(left.x).toBeCloseTo(-70);
    expect(left.y).toBeCloseTo(0);
  });
});
