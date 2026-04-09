import { describe, it, expect } from "vitest";
import { detectProductFromHost, isValidProduct } from "@/lib/product";

describe("detectProductFromHost", () => {
  it("recruit.hr1.jp → recruiting", () => {
    expect(detectProductFromHost("recruit.hr1.jp")).toBe("recruiting");
  });

  it("work.hr1.jp → working", () => {
    expect(detectProductFromHost("work.hr1.jp")).toBe("working");
  });

  it("client.hr1.jp → client", () => {
    expect(detectProductFromHost("client.hr1.jp")).toBe("client");
  });

  it("ポート付きでも正しく検出する", () => {
    expect(detectProductFromHost("recruit.hr1.jp:443")).toBe("recruiting");
  });

  it("不明なホストはworkingにフォールバック", () => {
    expect(detectProductFromHost("unknown.example.com")).toBe("working");
    expect(detectProductFromHost("localhost")).toBe("working");
  });
});

describe("isValidProduct", () => {
  it("有効なプロダクトでtrueを返す", () => {
    expect(isValidProduct("recruiting")).toBe(true);
    expect(isValidProduct("working")).toBe(true);
    expect(isValidProduct("client")).toBe(true);
  });

  it("無効な値でfalseを返す", () => {
    expect(isValidProduct("invalid")).toBe(false);
    expect(isValidProduct("")).toBe(false);
  });
});
