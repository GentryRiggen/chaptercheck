import { type Id } from "../_generated/dataModel";
import { type MutationCtx, type QueryCtx } from "../_generated/server";

export const WANT_TO_READ_SHELF_NAME = "Want to Read";

function normalizeShelfName(name: string) {
  return name.trim().toLocaleLowerCase();
}

type ShelfLookupCtx = MutationCtx | QueryCtx;

export async function findWantToReadShelf(ctx: ShelfLookupCtx, userId: Id<"users">) {
  const shelves = await ctx.db
    .query("shelves")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  return (
    shelves
      .filter(
        (shelf) => normalizeShelfName(shelf.name) === normalizeShelfName(WANT_TO_READ_SHELF_NAME)
      )
      .sort((a, b) => a.createdAt - b.createdAt)[0] ?? null
  );
}

export async function getWantToReadShelfBook(
  ctx: ShelfLookupCtx,
  userId: Id<"users">,
  bookId: Id<"books">
) {
  const shelf = await findWantToReadShelf(ctx, userId);
  if (!shelf) return null;

  const shelfBook = await ctx.db
    .query("shelfBooks")
    .withIndex("by_shelf_and_book", (q) => q.eq("shelfId", shelf._id).eq("bookId", bookId))
    .first();

  return {
    shelf,
    shelfBook,
  };
}

export async function ensureWantToReadShelf(ctx: MutationCtx, userId: Id<"users">) {
  const existingShelf = await findWantToReadShelf(ctx, userId);
  if (existingShelf) return existingShelf;

  const now = Date.now();
  const shelfId = await ctx.db.insert("shelves", {
    userId,
    name: WANT_TO_READ_SHELF_NAME,
    description: "",
    isOrdered: false,
    isPublic: false,
    createdAt: now,
    updatedAt: now,
  });

  const createdShelf = await ctx.db.get(shelfId);
  if (!createdShelf) {
    throw new Error("Failed to create Want to Read shelf");
  }

  return createdShelf;
}
