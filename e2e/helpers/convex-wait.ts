import { type Page } from "@playwright/test";

/**
 * Wait for Convex real-time data to load by checking that the spinner
 * disappears and optionally that specific content appears.
 */
export async function waitForConvexData(
  page: Page,
  options?: { contentSelector?: string; timeout?: number }
) {
  const timeout = options?.timeout ?? 10000;

  // Wait for any loading spinners to disappear
  await page
    .locator(".animate-spin")
    .first()
    .waitFor({ state: "hidden", timeout })
    .catch(() => {
      // Spinner may never have appeared if data loaded fast — that's fine
    });

  // Optionally wait for specific content to appear
  if (options?.contentSelector) {
    await page.locator(options.contentSelector).first().waitFor({ timeout });
  }
}

/**
 * Wait for search results to settle after typing.
 * The app debounces search input by 300ms, so we wait slightly longer.
 */
export async function waitForSearchResults(page: Page, timeout?: number) {
  // Wait for debounce (300ms) + network round-trip
  await page.waitForTimeout(500);
  await waitForConvexData(page, { timeout });
}
