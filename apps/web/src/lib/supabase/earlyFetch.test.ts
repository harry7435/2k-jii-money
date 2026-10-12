import { describe, expect, it } from "vitest";
import { createEarlyFetch } from "./earlyFetch";

describe("createEarlyFetch", () => {
  it("먼저 보낸 요청의 결과를 돌려준다", async () => {
    const early = createEarlyFetch({ a: Promise.resolve([1, 2]) });
    expect(await early.take("a")).toEqual([1, 2]);
  });

  it("한 번 꺼낸 요청은 다시 꺼내면 null이다", async () => {
    const early = createEarlyFetch({ a: Promise.resolve("x") });
    await early.take("a");
    expect(await early.take("a")).toBeNull();
  });

  it("요청이 실패하면 null로 바뀐다", async () => {
    const early = createEarlyFetch({ a: Promise.reject(new Error("boom")) });
    expect(await early.take("a")).toBeNull();
  });

  it("키마다 따로 꺼낸다", async () => {
    const early = createEarlyFetch({
      a: Promise.resolve(1),
      b: Promise.resolve(2),
    });
    expect(await early.take("a")).toBe(1);
    expect(await early.take("b")).toBe(2);
  });
});
