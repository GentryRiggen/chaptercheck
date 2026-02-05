import { expect, test } from "../fixtures/base";

test.describe("Responsive layout", () => {
  test("mobile hamburger menu is visible", async ({ page, nav }) => {
    await page.goto("/");
    await expect(nav.mobileMenuButton).toBeVisible();

    // Desktop nav links should be hidden on mobile
    await expect(nav.booksLink).toBeHidden();
  });

  test("mobile menu navigation works", async ({ page, nav }) => {
    await page.goto("/");
    await nav.mobileGoTo("Books");
    await expect(page).toHaveURL("/books");
  });

  test("books page shows list layout on mobile", async ({ page }) => {
    await page.goto("/books");

    // Mobile list should be visible (the divide-y container)
    const mobileList = page.locator(".divide-y").first();
    await expect(mobileList).toBeVisible();

    // Desktop grid should be hidden
    const desktopGrid = page.locator(".sm\\:grid").first();
    await expect(desktopGrid).toBeHidden();
  });

  test("book detail uses tabs on mobile", async ({ page, bookDetailPage }) => {
    await page.goto("/books");

    // Click the first book link
    await page.locator('a[href^="/books/"]').first().click();
    await bookDetailPage.waitForLoad();

    // Tabs should be visible on mobile
    await expect(bookDetailPage.reviewsTab).toBeVisible();
    await expect(bookDetailPage.audioTab).toBeVisible();

    // Switch tabs
    await bookDetailPage.audioTab.click();
    await expect(page.getByRole("heading", { name: "Audio" })).toBeVisible();
  });
});
