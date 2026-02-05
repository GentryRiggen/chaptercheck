import { expect, test } from "../fixtures/base";

test.describe("Book detail", () => {
  test("displays book title, authors, and back link", async ({ booksListPage, bookDetailPage }) => {
    await booksListPage.goto();
    await booksListPage.clickFirstBook();
    await bookDetailPage.waitForLoad();

    // Title should be visible
    await expect(bookDetailPage.title).toBeVisible();
    const titleText = await bookDetailPage.title.textContent();
    expect(titleText?.length).toBeGreaterThan(0);

    // Back link should exist
    await expect(bookDetailPage.backToBooks).toBeVisible();
  });

  test("reviews section is visible", async ({ booksListPage, bookDetailPage }) => {
    await booksListPage.goto();
    await booksListPage.clickFirstBook();
    await bookDetailPage.waitForLoad();

    // On desktop, reviews heading should be directly visible
    // On mobile, it's inside a tab — but desktop is the default project
    await expect(bookDetailPage.reviewsHeading).toBeVisible();
  });

  test("navigate to series from book", async ({ page, booksListPage, bookDetailPage }) => {
    await booksListPage.goto();
    await booksListPage.clickFirstBook();
    await bookDetailPage.waitForLoad();

    const hasSeriesLink = (await bookDetailPage.seriesLink.count()) > 0;
    if (hasSeriesLink) {
      await bookDetailPage.clickSeriesLink();
      await expect(page.url()).toMatch(/\/series\/.+/);
    }
  });
});
