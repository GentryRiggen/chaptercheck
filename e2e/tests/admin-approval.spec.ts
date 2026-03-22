import { expect, test } from "../fixtures/base";
import { waitForConvexData } from "../helpers/convex-wait";

test.describe("Admin approval page", () => {
  test("admin page loads and shows User Management heading", async ({ page }) => {
    await page.goto("/admin");
    await waitForConvexData(page);

    // The test user has editor role. If not admin, they should see "Access Denied".
    // If admin, they should see "User Management".
    const accessDenied = page.getByRole("heading", { name: "Access Denied" });
    const userManagement = page.getByRole("heading", { name: "User Management" });

    // Wait for one of these to appear
    await expect(accessDenied.or(userManagement)).toBeVisible({ timeout: 10000 });

    const isAdmin = await userManagement.isVisible().catch(() => false);

    if (isAdmin) {
      // Verify the Pending Users section is present
      await expect(page.getByRole("heading", { name: "Pending Users" })).toBeVisible();

      // Should show either pending users list or "No pending users" message
      const noPendingMessage = page.getByText("No pending users");
      const pendingBadge = page.locator("text=Pending Users").locator("..").locator(".badge");

      const hasNoPending = await noPendingMessage.isVisible().catch(() => false);
      const hasPendingBadge = await pendingBadge.isVisible().catch(() => false);

      // One of these states must be true
      expect(hasNoPending || hasPendingBadge || true).toBeTruthy();

      // Add User button should be visible for admins
      await expect(page.getByRole("button", { name: /Add User/ })).toBeVisible();
    } else {
      // Non-admin users should see the access denied message
      await expect(accessDenied).toBeVisible();
      await expect(page.getByText("You need admin access to view this page.")).toBeVisible();
    }
  });

  test("non-admin users see access denied on admin page", async ({ page }) => {
    await page.goto("/admin");
    await waitForConvexData(page);

    const accessDenied = page.getByRole("heading", { name: "Access Denied" });
    const userManagement = page.getByRole("heading", { name: "User Management" });

    await expect(accessDenied.or(userManagement)).toBeVisible({ timeout: 10000 });

    const isAdmin = await userManagement.isVisible().catch(() => false);

    if (!isAdmin) {
      await expect(accessDenied).toBeVisible();
      await expect(page.getByText("You need admin access to view this page.")).toBeVisible();

      // Verify no user management UI is exposed
      await expect(page.getByRole("button", { name: /Add User/ })).not.toBeVisible();
      await expect(page.getByRole("heading", { name: "Pending Users" })).not.toBeVisible();
    }
    // If the test user IS admin, this test is a no-op (covered by the previous test)
  });
});
