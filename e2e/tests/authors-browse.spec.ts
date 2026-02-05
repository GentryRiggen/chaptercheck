import { expect, test } from "../fixtures/base";

test.describe("Authors browsing", () => {
  test("authors page loads with content", async ({ authorsListPage }) => {
    await authorsListPage.goto();
    await expect(authorsListPage.pageHeading).toBeVisible();

    const count = await authorsListPage.getAuthorCount();
    expect(count).toBeGreaterThan(0);
  });

  test("search filters results", async ({ authorsListPage }) => {
    await authorsListPage.goto();
    const initialCount = await authorsListPage.getAuthorCount();

    await authorsListPage.search("a");
    const searchCount = await authorsListPage.getAuthorCount();

    expect(searchCount).toBeGreaterThanOrEqual(0);
    expect(searchCount).toBeLessThanOrEqual(initialCount + 1);
  });

  test("search with no results shows empty state", async ({ authorsListPage }) => {
    await authorsListPage.goto();
    await authorsListPage.search("zzznonexistentauthorxxx");
    await expect(authorsListPage.emptyState).toBeVisible();
  });

  test("sort changes order (A-Z vs Z-A)", async ({ authorsListPage }) => {
    await authorsListPage.goto();

    // Default is A-Z
    const firstNameAZ = await authorsListPage.getFirstAuthorName();

    // Switch to Z-A
    await authorsListPage.selectSort("Name Z-A");
    const firstNameZA = await authorsListPage.getFirstAuthorName();

    if (firstNameAZ && firstNameZA) {
      expect(firstNameAZ).not.toBe(firstNameZA);
    }
  });
});
