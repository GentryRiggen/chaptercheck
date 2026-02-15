import { expect, test } from "../fixtures/base";

test.describe("Smoke tests", () => {
  test("authenticated user sees dashboard", async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await expect(dashboardPage.recentlyAddedHeading).toBeVisible();
  });

  test("nav bar has Books and Authors links", async ({ page, nav }) => {
    await page.goto("/");
    await expect(nav.booksLink).toBeVisible();
    await expect(nav.authorsLink).toBeVisible();
  });
});
