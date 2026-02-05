import { type Page } from "@playwright/test";

import { waitForConvexData } from "../helpers/convex-wait";

export class BookDetailPage {
  constructor(private page: Page) {}

  get title() {
    return this.page.locator("h1");
  }

  get subtitle() {
    // Subtitle is a <p> immediately after the h1
    return this.page.locator("h1 + p");
  }

  get backToBooks() {
    return this.page.getByRole("link", { name: /Back to Books/ });
  }

  get reviewsHeading() {
    return this.page.getByRole("heading", { name: "Reviews" });
  }

  get audioHeading() {
    return this.page.getByRole("heading", { name: "Audio" });
  }

  get descriptionHeading() {
    return this.page.getByText("Description", { exact: true });
  }

  /** Author links within the book detail */
  get authorLinks() {
    return this.page.locator('a[href^="/authors/"]');
  }

  /** Series link (if the book belongs to a series) */
  get seriesLink() {
    return this.page.locator('a[href^="/series/"]');
  }

  /** Edit button (editor role only) */
  get editButton() {
    return this.page.getByRole("button", { name: "Edit", exact: true });
  }

  /** Delete button (editor role only) */
  get deleteButton() {
    return this.page.getByRole("button", { name: "Delete", exact: true });
  }

  /** Mobile tabs */
  get reviewsTab() {
    return this.page.getByRole("tab", { name: "Reviews" });
  }

  get audioTab() {
    return this.page.getByRole("tab", { name: "Audio" });
  }

  async waitForLoad() {
    await this.title.waitFor({ timeout: 10000 });
    await waitForConvexData(this.page);
  }

  async goBackToBooks() {
    await this.backToBooks.click();
    await this.page.waitForURL("/books");
  }

  async clickFirstAuthor() {
    await this.authorLinks.first().click();
    await this.page.waitForURL(/\/authors\/.+/);
  }

  async clickSeriesLink() {
    await this.seriesLink.first().click();
    await this.page.waitForURL(/\/series\/.+/);
  }
}
