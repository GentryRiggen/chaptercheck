import { type Id } from "../_generated/dataModel";
import { type QueryCtx } from "../_generated/server";

/**
 * Get all user IDs that should be filtered out for a given user due to blocks.
 * Returns IDs of users that the given user has blocked OR that have blocked the given user.
 * This is used by other query files to filter out blocked users from results.
 */
export async function getBlockedUserIdsForUser(
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<Set<string>> {
  const [blockedByMe, blockedMe] = await Promise.all([
    ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerId", userId))
      .collect(),
    ctx.db
      .query("blocks")
      .withIndex("by_blocked", (q) => q.eq("blockedUserId", userId))
      .collect(),
  ]);

  const blockedIds = new Set<string>();
  for (const block of blockedByMe) {
    blockedIds.add(block.blockedUserId);
  }
  for (const block of blockedMe) {
    blockedIds.add(block.blockerId);
  }

  return blockedIds;
}
