import { describe, it, expect } from "vitest";
import { validators, validateForm } from "@/lib/validation";

describe("validators.required", () => {
  it("空文字列でエラーを返す", () => {
    expect(validators.required("名前")("")).toBe("名前は必須です");
  });

  it("値があればnullを返す", () => {
    expect(validators.required("名前")("田中")).toBeNull();
  });
});

describe("validators.email", () => {
  it("正しい形式ならnullを返す", () => {
    expect(validators.email()("test@example.com")).toBeNull();
  });

  it("不正な形式ならエラーを返す", () => {
    expect(validators.email()("invalid")).toBe("メールアドレスの形式が正しくありません");
  });
});

describe("validateForm", () => {
  const rules = {
    name: [validators.required("名前")],
    email: [validators.required("メール"), validators.email()],
  };

  it("全て有効ならnullを返す", () => {
    expect(validateForm(rules, { name: "田中", email: "a@b.com" })).toBeNull();
  });

  it("無効な値があればエラーオブジェクトを返す", () => {
    const errors = validateForm(rules, { name: "", email: "bad" });
    expect(errors).toEqual({
      name: "名前は必須です",
      email: "メールアドレスの形式が正しくありません",
    });
  });
});
