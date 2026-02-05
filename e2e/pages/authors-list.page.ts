import { type Page } from "@playwright/test";

import { waitForConvexData, waitForSearchResults } from "../helpers/convex-wait";

export class AuthorsListPage {
  constructor(private page: Page) {}

  get searchInput() {
    return this.page.getByPlaceholder("Search...");
  }

  get sortTrigger() {
    return this.page.getByRole("combobox");
  }

  get addAuthorButton() {
    return this.page.getByRole("button", { name: /Add Author/ });
  }

  get pageHeading() {
    return this.page.getByRole("heading", { name: "Authors", exact: true });
  }

  get emptyState() {
    return this.page.getByText(/No authors found/);
  }

  get loadMoreButton() {
    return this.page.getByRole("button", { name: "Load more" });
  }

  /** Get visible author links (filters out hidden mobile/desktop duplicates) */
  get authorLinks() {
    return this.page.locator('a[href^="/authors/"]').locator("visible=true");
  }

  async goto() {
    await this.page.goto("/authors");
    await waitForConvexData(this.page);
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

  async getAuthorCount() {
    return this.authorLinks.count();
  }

  async getFirstAuthorName() {
    return this.authorLinks.first().locator("h2").textContent();
  }

  async clickFirstAuthor() {
    await this.authorLinks.first().click();
    await this.page.waitForURL(/\/authors\/.+/);
  }
}
