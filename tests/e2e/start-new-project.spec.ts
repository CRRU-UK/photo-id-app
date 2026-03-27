import { expect, test } from "./electron.fixture";

test.describe("Start New Project", () => {
  test("navigates from index to project page after selecting a folder", async ({ page }) => {
    // Verify the index page loaded
    await expect(page.getByRole("heading", { name: "Photo ID" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start New Project" })).toBeVisible();

    // Click "Start New Project", the mocked dialog returns the temp directory with test images
    await page.getByRole("button", { name: "Start New Project" }).click();

    // Wait for navigation to the project page (thumbnail generation may take a few seconds)
    await expect(page.locator(".project")).toBeVisible({ timeout: 30_000 });

    // Verify the sidebar rendered (confirms the project loaded successfully)
    await expect(page.locator(".sidebar")).toBeVisible();
  });
});
