import { type Page } from "@playwright/test";

import { waitForConvexData } from "../helpers/convex-wait";

const dashboardGreetingPattern = /^Good (morning|afternoon|evening), .+/;

export class DashboardPage {
  constructor(private page: Page) {}

  get greetingHeading() {
    return this.page.getByRole("heading", { level: 1, name: dashboardGreetingPattern });
  }

  get browseLibraryLink() {
    return this.page.getByRole("link", { name: /Browse library/i });
  }

  get topRatedViewAllLink() {
    return this.page.getByRole("link", { name: /View all/i }).first();
  }

  /** Landing page elements (unauthenticated) */
  get heroHeading() {
    return this.page.getByRole("heading", { name: "Track Your Reading Journey" });
  }

  get getStartedButton() {
    return this.page.getByRole("link", { name: /Get Started/ });
  }

  async goto() {
    await this.page.goto("/");
    await waitForConvexData(this.page);
  }

  async goToAllBooks() {
    if (await this.browseLibraryLink.isVisible()) {
      await this.browseLibraryLink.click();
    } else {
      await this.topRatedViewAllLink.click();
    }

    await this.page.waitForURL(/\/books/);
  }
}
