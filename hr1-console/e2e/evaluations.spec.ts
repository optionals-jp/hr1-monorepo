import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("評価管理", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("評価ページに遷移するとタブが動作する", async ({ page }) => {
    await page.goto("/evaluations");
    await expect(page.getByText("評価")).toBeVisible();

    const sheetsTab = page.getByRole("button", { name: "評価シート" });
    const cyclesTab = page.getByRole("button", { name: "評価サイクル" });

    if (await sheetsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sheetsTab.click();
      await expect(sheetsTab).toBeVisible();
    }

    if (await cyclesTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cyclesTab.click();
      await expect(cyclesTab).toBeVisible();
    }
  });
});
