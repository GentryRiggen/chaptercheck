import { type Page } from "@playwright/test";

export class SignUpPage {
  constructor(private page: Page) {}

  get heading() {
    return this.page.getByRole("heading", { name: "Create your account" });
  }

  get description() {
    return this.page.getByText("Enter your details to get started");
  }

  get firstNameInput() {
    return this.page.getByLabel("First name");
  }

  get lastNameInput() {
    return this.page.getByLabel("Last name");
  }

  get emailInput() {
    return this.page.getByLabel("Email");
  }

  get continueButton() {
    return this.page.getByRole("button", { name: "Continue" });
  }

  get signInLink() {
    return this.page.getByRole("link", { name: "Sign in" });
  }

  get alreadyHaveAccountText() {
    return this.page.getByText("Already have an account?");
  }

  /** OTP step elements */
  get otpHeading() {
    return this.page.getByRole("heading", { name: "Verify your email" });
  }

  get otpDescription() {
    return this.page.getByText("Enter the code we sent to your email");
  }

  get verificationCodeInput() {
    return this.page.getByLabel("Verification code");
  }

  get verifyButton() {
    return this.page.getByRole("button", { name: "Verify" });
  }

  get useDifferentEmailButton() {
    return this.page.getByRole("button", { name: "Use a different email" });
  }

  /** Error messages */
  get formError() {
    return this.page.locator(".text-destructive");
  }

  /** Field-level validation errors (React Hook Form + Zod) */
  getFieldError(fieldName: string) {
    return this.page
      .getByLabel(fieldName)
      .locator("..")
      .locator("[role='alert'], .text-destructive");
  }

  async goto() {
    await this.page.goto("/sign-up");
  }

  async fillName(firstName: string, lastName: string) {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async submitInfo() {
    await this.continueButton.click();
  }
}
