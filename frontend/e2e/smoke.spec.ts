import { expect, test } from "@playwright/test";

test("marketing shell renders", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Train with intent.");
  await expect(page.getByRole("link", { name: /member login/i }).first()).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText("FORGE Strength Club");
  await expect(page.getByText("Phase 0", { exact: false }).first()).toBeVisible();
});
