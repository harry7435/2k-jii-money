import { describe, expect, it } from "vitest";
import type { Category } from "@2k-jii-money/supabase-types";
import { getCategoryIdsWithDescendants } from "./categoryUtils";

function cat(id: string, parentId: string | null): Category {
  return { id, parent_id: parentId } as Category;
}

describe("getCategoryIdsWithDescendants", () => {
  const categories = [
    cat("major", null),
    cat("middle-a", "major"),
    cat("middle-b", "major"),
    cat("sub-a1", "middle-a"),
    cat("sub-a2", "middle-a"),
    cat("sub-b1", "middle-b"),
  ];

  it("하위가 없으면 자기 자신만 돌려준다", () => {
    expect(getCategoryIdsWithDescendants(categories, "sub-a1")).toEqual([
      "sub-a1",
    ]);
  });

  it("중분류는 자신과 소분류를 돌려준다", () => {
    expect(
      getCategoryIdsWithDescendants(categories, "middle-a").sort(),
    ).toEqual(["middle-a", "sub-a1", "sub-a2"]);
  });

  it("여러 단계 아래까지 모두 포함한다", () => {
    expect(getCategoryIdsWithDescendants(categories, "major")).toHaveLength(6);
  });

  it("다른 가지의 카테고리는 포함하지 않는다", () => {
    expect(getCategoryIdsWithDescendants(categories, "middle-a")).not.toContain(
      "sub-b1",
    );
  });
});
