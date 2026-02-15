import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".clerk", "user.json");

setup("authenticate", async ({ page }) => {
  await clerkSetup({
    dotenv: { path: path.resolve(__dirname, "..", ".env.local") },
  });

  await page.goto("/");

  await clerk.signIn({
    page,
    signInParams: {
      strategy: "email_code",
      identifier: process.env.E2E_CLERK_USER_EMAIL!,
    },
  });

  // Verify we're authenticated — dashboard should show
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Recently Added" })).toBeVisible({
    timeout: 15000,
  });

  // Save signed-in state for all test projects
  await page.context().storageState({ path: authFile });
});
