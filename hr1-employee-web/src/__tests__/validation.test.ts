import { describe, it, expect } from "vitest";
import { validators, validateForm } from "@hr1/shared-ui";

describe("validators.required", () => {
  it("空文字列でエラーを返す", () => {
    expect(validators.required("名前")("")).toBe("名前は必須です");
  });

  it("nullでエラーを返す", () => {
    expect(validators.required("名前")(null)).toBe("名前は必須です");
  });

  it("undefinedでエラーを返す", () => {
    expect(validators.required("名前")(undefined)).toBe("名前は必須です");
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

  it("空文字列ならスキップ（nullを返す）", () => {
    expect(validators.email()("")).toBeNull();
  });
});

describe("validators.maxLength", () => {
  it("制限内ならnullを返す", () => {
    expect(validators.maxLength(5, "名前")("abc")).toBeNull();
  });

  it("制限超過でエラーを返す", () => {
    expect(validators.maxLength(3, "名前")("abcdef")).toBe("名前は3文字以内で入力してください");
  });
});

describe("validators.minLength", () => {
  it("制限以上ならnullを返す", () => {
    expect(validators.minLength(3, "名前")("abcde")).toBeNull();
  });

  it("制限未満でエラーを返す", () => {
    expect(validators.minLength(3, "名前")("ab")).toBe("名前は3文字以上で入力してください");
  });

  it("空文字列ならスキップ（nullを返す）", () => {
    expect(validators.minLength(3, "名前")("")).toBeNull();
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

  it("最初のエラーのみ返す（同一フィールド）", () => {
    const errors = validateForm(rules, { name: "田中", email: "" });
    expect(errors).toEqual({
      email: "メールは必須です",
    });
  });
});
