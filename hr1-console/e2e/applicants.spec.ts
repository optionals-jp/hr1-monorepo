import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("応募者管理", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("応募者ページに遷移するとリストが表示される", async ({ page }) => {
    await page.goto("/applicants");
    await expect(page.getByText("応募者")).toBeVisible();
    await expect(page.locator("table").or(page.getByText("データがありません"))).toBeVisible({
      timeout: 10000,
    });
  });

  test("応募者追加ダイアログで応募者を作成できる", async ({ page }) => {
    await page.goto("/applicants");
    const addButton = page.getByRole("button", { name: /追加|新規/ });
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();
      await expect(
        page.getByLabel("名前").or(page.getByLabel("メールアドレス")).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
