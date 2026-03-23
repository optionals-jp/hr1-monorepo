import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("認証", () => {
  test("有効な認証情報でログインするとダッシュボードが表示される", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL("/");
    await expect(page.getByText("ダッシュボード")).toBeVisible();
  });

  test("無効な認証情報でログインするとエラーが表示される", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("invalid@example.com");
    await page.getByLabel("パスワード").fill("wrongpassword");
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page.locator("[class*='red']")).toBeVisible({ timeout: 10000 });
  });

  test("未認証で保護されたページにアクセスするとログインにリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/applicants");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
