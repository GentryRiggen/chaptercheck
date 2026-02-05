import { type Page } from "@playwright/test";

import { waitForConvexData } from "../helpers/convex-wait";

export class DashboardPage {
  constructor(private page: Page) {}

  get recentBooksHeading() {
    return this.page.getByRole("heading", { name: "Recent Books" });
  }

  get recentAuthorsHeading() {
    return this.page.getByRole("heading", { name: "Recent Authors" });
  }

  get viewAllBooksLink() {
    return this.recentBooksHeading.locator("..").getByRole("link", { name: /View all/ });
  }

  get viewAllAuthorsLink() {
    return this.recentAuthorsHeading.locator("..").getByRole("link", { name: /View all/ });
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
    await this.viewAllBooksLink.click();
    await this.page.waitForURL("/books");
  }

  async goToAllAuthors() {
    await this.viewAllAuthorsLink.click();
    await this.page.waitForURL("/authors");
  }
}
