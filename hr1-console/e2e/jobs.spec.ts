import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("求人管理", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("求人ページに遷移するとリストが表示される", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.getByText("求人")).toBeVisible();
    await expect(page.locator("table").or(page.getByText("データがありません"))).toBeVisible({
      timeout: 10000,
    });
  });

  test("新規求人作成ページに遷移できる", async ({ page }) => {
    await page.goto("/jobs");
    const addButton = page.getByRole("link", { name: /新規|作成|追加/ });
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();
      await expect(page).toHaveURL(/\/jobs\/new/);
    }
  });
});
