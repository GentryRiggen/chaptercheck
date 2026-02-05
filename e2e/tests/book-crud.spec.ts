import { expect, test } from "../fixtures/base";
import { waitForConvexData } from "../helpers/convex-wait";

test.describe("Book CRUD", () => {
  const testBookTitle = `E2E Test Book ${Date.now()}`;
  const updatedSubtitle = "Updated by E2E test";

  test("create, edit, and delete a book", async ({ page, booksListPage }) => {
    await booksListPage.goto();

    // Skip if user doesn't have editor role (Add Book button won't appear)
    const addButton = booksListPage.addBookButton;
    const isEditor = (await addButton.count()) > 0;
    test.skip(!isEditor, "Test user does not have editor role — set role in Convex dashboard");

    // --- Create ---
    await addButton.click();

    // Wait for dialog to appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Add New Book")).toBeVisible();

    // Fill in the title field
    await dialog.getByPlaceholder("Book title").fill(testBookTitle);
    // Dismiss any autocomplete suggestions by clicking elsewhere in the form
    await dialog.getByText("Title *").click();

    // Select an author (required field)
    await dialog.getByText("Select authors...").click();
    // Pick the first available author from the dropdown
    await page.getByRole("option").first().click();

    // Submit the form
    await dialog.getByRole("button", { name: "Create Book" }).click();

    // Should navigate to the new book's detail page
    await page.waitForURL(/\/books\/.+/, { timeout: 15000 });
    await expect(page.locator("h1")).toContainText(testBookTitle);

    // --- Edit ---
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const editDialog = page.getByRole("dialog");
    await expect(editDialog).toBeVisible();

    // Update the subtitle
    await editDialog.getByPlaceholder("Subtitle (optional)").fill(updatedSubtitle);
    await editDialog.getByRole("button", { name: "Save Changes" }).click();

    // Wait for dialog to close and data to update
    await expect(editDialog).toBeHidden({ timeout: 10000 });
    await waitForConvexData(page);
    await expect(page.getByText(updatedSubtitle)).toBeVisible();

    // --- Delete ---
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    const deleteDialog = page.getByRole("dialog");
    await expect(deleteDialog).toBeVisible();
    await expect(deleteDialog.getByRole("heading", { name: "Delete Book" })).toBeVisible();

    await deleteDialog.getByRole("button", { name: "Delete Book" }).click();

    // Should redirect back to books list
    await page.waitForURL("/books", { timeout: 15000 });
  });
});
