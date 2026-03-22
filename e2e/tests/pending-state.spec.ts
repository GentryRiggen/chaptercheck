import { expect, test } from "../fixtures/base";

test.describe("Approved user state (no pending restrictions)", () => {
  test("approved user does NOT see the pending banner", async ({ page }) => {
    await page.goto("/");

    // The pending banner text should not be visible for approved users
    const pendingBanner = page.getByText("Your account is pending approval");
    await expect(pendingBanner).not.toBeVisible();
  });

  test("shelves UI is accessible for approved users", async ({
    page,
    booksListPage,
    bookDetailPage,
  }) => {
    // Navigate to a book detail page where shelves are used
    await booksListPage.goto();
    await booksListPage.clickFirstBook();
    await bookDetailPage.waitForLoad();

    // The "Add to shelf" button (wrapped in ApprovalGate) should not be disabled.
    // For approved users, ApprovalGate renders children normally (no opacity-50 wrapper).
    // Check that no disabled wrapper (opacity-50) exists around shelf-related buttons.
    const disabledGateWrappers = page.locator(".pointer-events-none.opacity-50");
    const disabledCount = await disabledGateWrappers.count();

    // If there are disabled wrappers, none should contain shelf-related text
    for (let i = 0; i < disabledCount; i++) {
      const text = await disabledGateWrappers.nth(i).textContent();
      expect(text).not.toContain("shelf");
      expect(text).not.toContain("Shelf");
    }
  });

  test("follow buttons are not gated for approved users", async ({ page }) => {
    // Navigate to a people/social page where follow buttons exist
    await page.goto("/people");

    // Wait for content to load
    await page
      .locator(".animate-spin")
      .first()
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {
        // Spinner may never have appeared — fine
      });

    // If there are follow buttons, they should not be wrapped in a disabled gate
    const followButtons = page.getByRole("button", { name: /Follow/ });
    const count = await followButtons.count();

    if (count > 0) {
      // Check the first follow button is not inside a disabled wrapper
      const firstButton = followButtons.first();
      await expect(firstButton).toBeEnabled();
    }
  });

  test("audio player is not restricted for approved users", async ({
    page,
    booksListPage,
    bookDetailPage,
  }) => {
    await booksListPage.goto();
    await booksListPage.clickFirstBook();
    await bookDetailPage.waitForLoad();

    // If there's an audio section, it should not show a "pending approval" tooltip
    const audioHeading = bookDetailPage.audioHeading;
    const hasAudio = await audioHeading.isVisible().catch(() => false);

    if (hasAudio) {
      // The approval gate tooltip text should not be present near audio controls
      const approvalTooltipText = page.getByText("Available after account approval");
      await expect(approvalTooltipText).not.toBeVisible();
    }
  });
});
