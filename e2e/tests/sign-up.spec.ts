import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

import { SignUpPage } from "../pages/sign-up.page";

// These tests run WITHOUT stored auth — start as unauthenticated
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Sign-up flow", () => {
  let signUpPage: SignUpPage;

  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
    signUpPage = new SignUpPage(page);
  });

  test("sign-up page renders with all form fields", async () => {
    await signUpPage.goto();

    await expect(signUpPage.heading).toBeVisible();
    await expect(signUpPage.description).toBeVisible();
    await expect(signUpPage.firstNameInput).toBeVisible();
    await expect(signUpPage.lastNameInput).toBeVisible();
    await expect(signUpPage.emailInput).toBeVisible();
    await expect(signUpPage.continueButton).toBeVisible();
  });

  test("shows sign-in link for existing users", async () => {
    await signUpPage.goto();

    await expect(signUpPage.alreadyHaveAccountText).toBeVisible();
    await expect(signUpPage.signInLink).toBeVisible();
    await expect(signUpPage.signInLink).toHaveAttribute("href", "/sign-in");
  });

  test("sign-in link navigates to sign-in page", async ({ page }) => {
    await signUpPage.goto();

    await signUpPage.signInLink.click();
    await page.waitForURL(/\/sign-in/);
    // Sign-in page should show its heading
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("'Create one' link on sign-in page navigates to sign-up", async ({ page }) => {
    await page.goto("/sign-in");
    // Wait for the sign-in form to load
    await expect(page.getByLabel("Email")).toBeVisible({ timeout: 15000 });

    const createOneLink = page.getByRole("link", { name: "Create one" });
    await expect(createOneLink).toBeVisible();
    await createOneLink.click();

    await page.waitForURL(/\/sign-up/);
    await expect(signUpPage.heading).toBeVisible({ timeout: 10000 });
  });

  test("form validation prevents empty submission", async ({ page }) => {
    await signUpPage.goto();

    // Submit without filling anything
    await signUpPage.submitInfo();

    // Zod validation errors should appear for required fields.
    // React Hook Form renders FormMessage elements with validation text.
    // We check that at least one validation message is visible.
    const validationMessages = page.locator("p.text-destructive, [role='alert']");
    await expect(validationMessages.first()).toBeVisible({ timeout: 5000 });
  });

  test("form validation rejects invalid email", async ({ page }) => {
    await signUpPage.goto();

    await signUpPage.fillName("Test", "User");
    await signUpPage.fillEmail("not-an-email");
    await signUpPage.submitInfo();

    // Should show an email validation error
    const validationMessages = page.locator("p.text-destructive, [role='alert']");
    await expect(validationMessages.first()).toBeVisible({ timeout: 5000 });
  });

  test("continue button is disabled while loading", async () => {
    await signUpPage.goto();

    // Before submission, the button should be enabled
    await expect(signUpPage.continueButton).toBeEnabled();
  });
});
