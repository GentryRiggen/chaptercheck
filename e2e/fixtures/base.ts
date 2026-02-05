import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test as base } from "@playwright/test";

import { AuthorsListPage } from "../pages/authors-list.page";
import { BookDetailPage } from "../pages/book-detail.page";
import { BooksListPage } from "../pages/books-list.page";
import { DashboardPage } from "../pages/dashboard.page";
import { NavigationPage } from "../pages/navigation.page";

type Fixtures = {
  nav: NavigationPage;
  booksListPage: BooksListPage;
  bookDetailPage: BookDetailPage;
  authorsListPage: AuthorsListPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    await setupClerkTestingToken({ page });

    // Warm up Convex auth by loading the dashboard first.
    // This ensures the Clerk → Convex auth sync completes before
    // tests navigate to pages with auth-gated queries.
    await page.goto("/");
    await page.getByRole("heading", { name: "Recent Books" }).waitFor({ timeout: 15000 });

    await use(page);
  },
  nav: async ({ page }, use) => {
    await use(new NavigationPage(page));
  },
  booksListPage: async ({ page }, use) => {
    await use(new BooksListPage(page));
  },
  bookDetailPage: async ({ page }, use) => {
    await use(new BookDetailPage(page));
  },
  authorsListPage: async ({ page }, use) => {
    await use(new AuthorsListPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect } from "@playwright/test";
