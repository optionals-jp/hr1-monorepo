import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("社員管理", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("社員ページに遷移するとリストが表示される", async ({ page }) => {
    await page.goto("/employees");
    await expect(page.getByText("社員")).toBeVisible();
    await expect(page.locator("table").or(page.getByText("データがありません"))).toBeVisible({
      timeout: 10000,
    });
  });
});
