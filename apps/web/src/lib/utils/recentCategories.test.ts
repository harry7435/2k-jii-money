import { describe, it, expect } from "vitest";
import { pushToMru, getRecentCategoryIds } from "./recentCategories";

describe("pushToMru", () => {
  it("prepends a new id", () => {
    expect(pushToMru(["a", "b"], "c", 8)).toEqual(["c", "a", "b"]);
  });

  it("moves an existing id to the front without duplicating", () => {
    expect(pushToMru(["a", "b", "c"], "b", 8)).toEqual(["b", "a", "c"]);
  });

  it("caps the list at max entries, dropping the oldest", () => {
    expect(pushToMru(["a", "b", "c"], "d", 3)).toEqual(["d", "a", "b"]);
  });

  it("works on an empty list", () => {
    expect(pushToMru([], "a", 8)).toEqual(["a"]);
  });
});

describe("getRecentCategoryIds", () => {
  it("returns an empty array outside the browser (SSR guard)", () => {
    // vitest node 환경에는 window가 없음
    expect(getRecentCategoryIds("fam-1")).toEqual([]);
  });
});
