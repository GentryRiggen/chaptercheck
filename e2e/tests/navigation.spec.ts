import { expect, test } from "../fixtures/base";

test.describe("Navigation", () => {
  test("navigate Dashboard → Books → Authors → Home", async ({ page, nav, dashboardPage }) => {
    await dashboardPage.goto();

    // Dashboard → Books
    await nav.goToBooks();
    await expect(page).toHaveURL("/books");

    // Books → Authors
    await nav.goToAuthors();
    await expect(page).toHaveURL("/authors");

    // Authors → Home
    await nav.goHome();
    await expect(page).toHaveURL("/");
  });

  test("Books list → Book detail → Back", async ({ page, booksListPage, bookDetailPage }) => {
    await booksListPage.goto();
    await booksListPage.clickFirstBook();

    // Verify we're on a book detail page
    await bookDetailPage.waitForLoad();
    await expect(page.url()).toMatch(/\/books\/.+/);

    // Go back to books list
    await bookDetailPage.goBackToBooks();
    await expect(page).toHaveURL("/books");
  });

  test("Book detail → Author detail", async ({ page, booksListPage, bookDetailPage }) => {
    await booksListPage.goto();
    await booksListPage.clickFirstBook();
    await bookDetailPage.waitForLoad();

    // Only run if the book has author links
    const authorCount = await bookDetailPage.authorLinks.count();
    if (authorCount > 0) {
      await bookDetailPage.clickFirstAuthor();
      await expect(page.url()).toMatch(/\/authors\/.+/);
    }
  });

  test("Dashboard View All books link works", async ({ page, dashboardPage }) => {
    await dashboardPage.goto();

    await dashboardPage.goToAllBooks();
    await expect(page).toHaveURL("/books");
  });
});
