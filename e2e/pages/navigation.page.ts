import { type Page } from "@playwright/test";

export class NavigationPage {
  constructor(private page: Page) {}

  /** Desktop nav links (hidden on mobile, visible sm+) */
  get booksLink() {
    return this.page.getByRole("link", { name: "Books", exact: true }).first();
  }

  get authorsLink() {
    return this.page.getByRole("link", { name: "Authors", exact: true }).first();
  }

  get homeLink() {
    return this.page.getByRole("link", { name: "ChapterCheck" });
  }

  get signInButton() {
    return this.page.getByRole("link", { name: "Sign In" });
  }

  /** Mobile menu trigger (visible only on small screens) */
  get mobileMenuButton() {
    return this.page.getByRole("button", { name: "Open menu" });
  }

  async goToBooks() {
    await this.booksLink.click();
    await this.page.waitForURL("/books");
  }

  async goToAuthors() {
    await this.authorsLink.click();
    await this.page.waitForURL("/authors");
  }

  async goHome() {
    await this.homeLink.click();
    await this.page.waitForURL("/");
  }

  /** Open the mobile hamburger menu and click a nav link */
  async mobileGoTo(linkName: "Home" | "Books" | "Authors") {
    await this.mobileMenuButton.click();
    await this.page.getByRole("dialog").getByRole("link", { name: linkName }).click();
  }
}
