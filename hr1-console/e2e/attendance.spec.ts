import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("勤怠管理", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("勤怠ページに遷移するとエラーなく表示される", async ({ page }) => {
    await page.goto("/attendance");
    await expect(page.getByText("勤怠")).toBeVisible();
    await expect(page.locator("table").or(page.getByText("データがありません"))).toBeVisible({
      timeout: 10000,
    });
  });
});
