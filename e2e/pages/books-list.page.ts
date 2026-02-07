import { type Page } from "@playwright/test";

import { waitForConvexData, waitForSearchResults } from "../helpers/convex-wait";

export class BooksListPage {
  constructor(private page: Page) {}

  get searchInput() {
    return this.page.getByPlaceholder("Search books...");
  }

  get sortTrigger() {
    return this.page.getByRole("combobox");
  }

  get addBookButton() {
    return this.page.getByRole("button", { name: /Add Book/ });
  }

  get pageHeading() {
    return this.page.getByRole("heading", { name: "Books", exact: true });
  }

  get emptyState() {
    return this.page.getByText(/No books found|No books match/);
  }

  get loadMoreButton() {
    return this.page.getByRole("button", { name: "Load more" });
  }

  /** Get visible book links (filters out hidden mobile/desktop duplicates) */
  get bookLinks() {
    return this.page.locator('a[href^="/books/"]').locator("visible=true");
  }

  async goto() {
    // Navigate to /books with retry. The GenreFilterPopover fires a
    // Convex query that can fail before Clerk→Convex auth syncs,
    // causing a Next.js error overlay. The dev server can also abort
    // navigations during recompilation (net::ERR_ABORTED). Retry
    // until the page loads clean.
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        if (attempt === 0) {
          await this.page.goto("/books");
        } else {
          await this.dismissErrorOverlay();
          await this.page.waitForTimeout(1000);
          await this.page.reload();
        }

        await this.pageHeading.waitFor({ timeout: 5000 });
        await waitForConvexData(this.page);
        // Wait a beat for any late-arriving error overlay (GenreFilterPopover)
        await this.page.waitForTimeout(500);
        await this.dismissErrorOverlay();
        // Verify book links are actually clickable (no overlay blocking)
        const bookCount = await this.bookLinks.count();
        if (bookCount > 0) return;
        // If no books visible, overlay may have reappeared — retry
      } catch {
        // Navigation failed or heading not found — retry
      }
    }

    // Final attempt — let it throw if it still fails
    await this.dismissErrorOverlay();
    await this.page.reload();
    await this.pageHeading.waitFor({ timeout: 10000 });
    await waitForConvexData(this.page);
    await this.page.waitForTimeout(500);
    await this.dismissErrorOverlay();
  }

  /** Dismiss Next.js dev error overlay if present */
  private async dismissErrorOverlay() {
    await this.page.evaluate(() => {
      document.querySelectorAll("nextjs-portal").forEach((el) => el.remove());
    });
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await waitForSearchResults(this.page);
  }

  async clearSearch() {
    await this.searchInput.clear();
    await waitForSearchResults(this.page);
  }

  async selectSort(option: string) {
    await this.sortTrigger.click();
    await this.page.getByRole("option", { name: option }).click();
    await waitForConvexData(this.page);
  }

  async getBookCount() {
    return this.bookLinks.count();
  }

  async getFirstBookTitle() {
    return this.bookLinks.first().locator("h2").textContent();
  }

  async clickFirstBook() {
    await this.bookLinks.first().click();
    await this.page.waitForURL(/\/books\/.+/);
  }
}
