import { expect, test } from "../fixtures/base";
import { waitForConvexData } from "../helpers/convex-wait";

test.describe("Author CRUD", () => {
  const testAuthorName = `E2E Test Author ${Date.now()}`;
  const updatedAuthorName = `${testAuthorName} Updated`;

  test("create, edit, and delete an author", async ({ page, authorsListPage }) => {
    await authorsListPage.goto();

    // Skip if user doesn't have editor role (Add Author button won't appear)
    const addButton = authorsListPage.addAuthorButton;
    const isEditor = (await addButton.count()) > 0;
    test.skip(!isEditor, "Test user does not have editor role — set role in Convex dashboard");

    // --- Create ---
    await addButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Add New Author")).toBeVisible();

    // Fill in the name field
    await dialog.getByPlaceholder("Author name").fill(testAuthorName);
    // Dismiss any autocomplete suggestions
    await dialog.getByText("Name *").click();

    // Submit the form
    await dialog.getByRole("button", { name: "Create Author" }).click();

    // Should navigate to the new author's detail page
    await page.waitForURL(/\/authors\/.+/, { timeout: 15000 });
    await expect(page.locator("h1")).toContainText(testAuthorName);

    // --- Edit ---
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const editDialog = page.getByRole("dialog");
    await expect(editDialog).toBeVisible();

    // Update the name
    const nameInput = editDialog.getByPlaceholder("Author name");
    await nameInput.clear();
    await nameInput.fill(updatedAuthorName);
    // Dismiss suggestions
    await editDialog.getByText("Name *").click();

    await editDialog.getByRole("button", { name: "Save Changes" }).click();

    // Wait for dialog to close and data to update
    await expect(editDialog).toBeHidden({ timeout: 10000 });
    await waitForConvexData(page);
    await expect(page.locator("h1")).toContainText(updatedAuthorName);

    // --- Delete ---
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    const deleteDialog = page.getByRole("dialog");
    await expect(deleteDialog).toBeVisible();
    await expect(deleteDialog.getByRole("heading", { name: "Delete Author" })).toBeVisible();

    await deleteDialog.getByRole("button", { name: "Delete Author" }).click();

    // Should redirect back to authors list
    await page.waitForURL("/authors", { timeout: 15000 });
  });
});
