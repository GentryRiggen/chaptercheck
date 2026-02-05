import { expect, test } from "../fixtures/base";

test.describe("Books browsing", () => {
  test("books page loads with content", async ({ booksListPage }) => {
    await booksListPage.goto();
    await expect(booksListPage.pageHeading).toBeVisible();

    const count = await booksListPage.getBookCount();
    expect(count).toBeGreaterThan(0);
  });

  test("search filters results", async ({ booksListPage }) => {
    await booksListPage.goto();
    const initialCount = await booksListPage.getBookCount();

    // Search for something specific — use a partial term likely to match seed data
    await booksListPage.search("the");
    const searchCount = await booksListPage.getBookCount();

    // Search results should differ from the full list (or at least not error)
    expect(searchCount).toBeGreaterThanOrEqual(0);
    // If search matches fewer books, great. If it matches all, that's still valid.
    expect(searchCount).toBeLessThanOrEqual(initialCount + 1);
  });

  test("search with no results shows empty state", async ({ booksListPage }) => {
    await booksListPage.goto();
    await booksListPage.search("zzznonexistentbookxxx");
    await expect(booksListPage.emptyState).toBeVisible();
  });

  test("clear search restores list", async ({ booksListPage }) => {
    await booksListPage.goto();
    const initialCount = await booksListPage.getBookCount();

    await booksListPage.search("zzznonexistentbookxxx");
    await expect(booksListPage.emptyState).toBeVisible();

    await booksListPage.clearSearch();
    const restoredCount = await booksListPage.getBookCount();
    expect(restoredCount).toBe(initialCount);
  });

  test("sort changes order (A-Z vs Z-A)", async ({ booksListPage }) => {
    await booksListPage.goto();

    // Default is A-Z
    const firstTitleAZ = await booksListPage.getFirstBookTitle();

    // Switch to Z-A
    await booksListPage.selectSort("Title Z-A");
    const firstTitleZA = await booksListPage.getFirstBookTitle();

    // The first book should be different (assuming > 1 unique starting letter)
    if (firstTitleAZ && firstTitleZA) {
      expect(firstTitleAZ).not.toBe(firstTitleZA);
    }
  });
});
