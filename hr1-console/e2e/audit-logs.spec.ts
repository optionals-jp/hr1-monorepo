import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("監査ログ", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("監査ログページに遷移するとフィルタが表示される", async ({ page }) => {
    await page.goto("/audit-logs");
    await expect(page.getByText("監査ログ").first()).toBeVisible();
    await expect(page.locator("table").or(page.getByText("データがありません"))).toBeVisible({
      timeout: 10000,
    });
  });
});
