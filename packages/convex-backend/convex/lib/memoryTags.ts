import { type MutationCtx } from "../_generated/server";
import { type Id } from "../_generated/dataModel";

export function normalizeTagName(name: string) {
  return name.trim().toLocaleLowerCase();
}

export async function getOrCreateMemoryTag(
  ctx: MutationCtx,
  userId: Id<"users">,
  name: string
): Promise<Id<"memoryTags">> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Tag name is required");
  }

  const normalizedName = normalizeTagName(trimmed);
  const existing = await ctx.db
    .query("memoryTags")
    .withIndex("by_user_and_normalizedName", (q) =>
      q.eq("userId", userId).eq("normalizedName", normalizedName)
    )
    .unique();

  if (existing) {
    if (existing.name !== trimmed) {
      await ctx.db.patch(existing._id, { name: trimmed, updatedAt: Date.now() });
    }
    return existing._id;
  }

  const now = Date.now();
  return await ctx.db.insert("memoryTags", {
    userId,
    name: trimmed,
    normalizedName,
    createdAt: now,
    updatedAt: now,
  });
}
