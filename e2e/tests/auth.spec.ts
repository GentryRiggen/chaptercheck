import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

// These tests run WITHOUT stored auth — start as unauthenticated
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test("unauthenticated user sees landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Track Your Reading Journey" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Get Started/ })).toBeVisible();
  });

  test("protected routes redirect to sign-in", async ({ page }) => {
    await page.goto("/books");
    // Clerk middleware should redirect unauthenticated users
    // They should end up on sign-in or see the landing page
    await page.waitForURL(/\/(sign-in|$)/, { timeout: 10000 });
  });

  test("sign-in page is accessible", async ({ page }) => {
    await page.goto("/sign-in");
    // Clerk's sign-in component should render
    await expect(page.getByLabel("Email")).toBeVisible({ timeout: 15000 });
  });
});
