import { v } from "convex/values";

import { type Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

export const getFollowStatus = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const isFollowing = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", user._id).eq("followingId", args.userId)
      )
      .unique();

    const followersCount = (
      await ctx.db
        .query("follows")
        .withIndex("by_following", (q) => q.eq("followingId", args.userId))
        .collect()
    ).length;

    const followingCount = (
      await ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
        .collect()
    ).length;

    return {
      isFollowing: isFollowing !== null,
      followersCount,
      followingCount,
    };
  },
});

export const getMyFollowing = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);
    return await getFollowingForUser(ctx, user._id);
  },
});

export const getMyFollowers = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);
    return await getFollowersForUser(ctx, user._id);
  },
});

export const getUserFollowing = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await getFollowingForUser(ctx, args.userId);
  },
});

export const getUserFollowers = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await getFollowersForUser(ctx, args.userId);
  },
});

// Shared helpers

async function getFollowingForUser(ctx: { db: any }, userId: Id<"users">) {
  const follows = await ctx.db
    .query("follows")
    .withIndex("by_follower", (q: any) => q.eq("followerId", userId))
    .collect();

  follows.sort((a: any, b: any) => b.createdAt - a.createdAt);

  const users = await Promise.all(
    follows.map(async (follow: any) => {
      const followedUser = await ctx.db.get(follow.followingId);
      if (!followedUser) return null;
      return {
        _id: followedUser._id,
        name: followedUser.name,
        imageUrl: followedUser.imageUrl,
      };
    })
  );

  return users.filter((u: any) => u !== null);
}

async function getFollowersForUser(ctx: { db: any }, userId: Id<"users">) {
  const follows = await ctx.db
    .query("follows")
    .withIndex("by_following", (q: any) => q.eq("followingId", userId))
    .collect();

  follows.sort((a: any, b: any) => b.createdAt - a.createdAt);

  const users = await Promise.all(
    follows.map(async (follow: any) => {
      const followerUser = await ctx.db.get(follow.followerId);
      if (!followerUser) return null;
      return {
        _id: followerUser._id,
        name: followerUser.name,
        imageUrl: followerUser.imageUrl,
      };
    })
  );

  return users.filter((u: any) => u !== null);
}

// Activity feed types
type ActivityItem = {
  _id: string;
  type: "review" | "shelf_add" | "public_note";
  timestamp: number;
  user: { _id: string; name?: string; imageUrl?: string };
  book: { _id: string; title: string; coverImageR2Key?: string };
  rating?: number;
  reviewText?: string;
  shelfId?: string;
  shelfName?: string;
  noteText?: string;
  entryType?: string;
  sourceText?: string;
};

type PaginatedActivityResult = {
  items: ActivityItem[];
  nextCursor: number | null;
  hasMore: boolean;
};

type UserInfo = { _id: string; name?: string; imageUrl?: string };
type BookInfo = { _id: string; title: string; coverImageR2Key?: string };

export const getActivityFeed = query({
  args: {
    limit: v.optional(v.number()),
    beforeTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<PaginatedActivityResult> => {
    const { user } = await requireAuth(ctx);
    const limit = args.limit ?? 20;
    const beforeTs = args.beforeTimestamp ?? Number.MAX_SAFE_INTEGER;

    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", user._id))
      .collect();

    const followedUserIds = follows.map((f) => f.followingId);
    if (followedUserIds.length === 0) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    // Batch-fetch followed users
    const followedUsers = await Promise.all(followedUserIds.map((id) => ctx.db.get(id)));
    const userMap = new Map<string, UserInfo>();
    for (const u of followedUsers) {
      if (u) userMap.set(u._id, { _id: u._id, name: u.name, imageUrl: u.imageUrl });
    }

    const allItems: ActivityItem[] = [];
    const bookCache = new Map<string, BookInfo | null>();

    async function getBook(bookId: Id<"books">): Promise<BookInfo | null> {
      const cached = bookCache.get(bookId);
      if (cached !== undefined) return cached;
      const book = await ctx.db.get(bookId);
      const info = book
        ? { _id: book._id, title: book.title, coverImageR2Key: book.coverImageR2Key }
        : null;
      bookCache.set(bookId, info);
      return info;
    }

    // Limit per user to avoid scanning too much data
    const perUserLimit = Math.max(5, Math.ceil((limit * 2) / followedUserIds.length));

    for (const followedUserId of followedUserIds) {
      const userInfo = userMap.get(followedUserId);
      if (!userInfo) continue;

      // Reviews — use by_user_and_reviewedAt index, ordered desc
      const reviews = await ctx.db
        .query("bookUserData")
        .withIndex("by_user_and_reviewedAt", (q) =>
          q.eq("userId", followedUserId).lt("reviewedAt", beforeTs)
        )
        .order("desc")
        .take(perUserLimit);

      for (const review of reviews) {
        if (review.isReviewPrivate || review.isReadPrivate) continue;
        if (review.rating === undefined && !review.reviewText) continue;
        if (!review.reviewedAt) continue;

        const book = await getBook(review.bookId);
        if (!book) continue;

        allItems.push({
          _id: `review_${review._id}`,
          type: "review",
          timestamp: review.reviewedAt,
          user: userInfo,
          book,
          rating: review.rating,
          reviewText: review.reviewText,
        });
      }

      // Public notes — use by_user_and_updatedAt index, ordered desc
      const notes = await ctx.db
        .query("bookNotes")
        .withIndex("by_user_and_updatedAt", (q) =>
          q.eq("userId", followedUserId).lt("updatedAt", beforeTs)
        )
        .order("desc")
        .take(perUserLimit);

      for (const note of notes) {
        if (note.isPublic !== true) continue;

        const book = await getBook(note.bookId);
        if (!book) continue;

        allItems.push({
          _id: `note_${note._id}`,
          type: "public_note",
          timestamp: note.updatedAt,
          user: userInfo,
          book,
          noteText: note.noteText,
          entryType: note.entryType,
          sourceText: note.sourceText,
        });
      }

      // Shelf adds — get user's public shelves, then recent adds per shelf.
      // Fetch extra since we filter by addedAt client-side (index lacks timestamp).
      const shelves = await ctx.db
        .query("shelves")
        .withIndex("by_user", (q) => q.eq("userId", followedUserId))
        .collect();

      for (const shelf of shelves.filter((s) => s.isPublic)) {
        const shelfBooks = await ctx.db
          .query("shelfBooks")
          .withIndex("by_shelf", (q) => q.eq("shelfId", shelf._id))
          .order("desc")
          .take(perUserLimit * 2);

        for (const sb of shelfBooks) {
          if (sb.addedAt >= beforeTs) continue;

          const book = await getBook(sb.bookId);
          if (!book) continue;

          allItems.push({
            _id: `shelf_${sb._id}`,
            type: "shelf_add",
            timestamp: sb.addedAt,
            user: userInfo,
            book,
            shelfId: shelf._id,
            shelfName: shelf.name,
          });
        }
      }
    }

    allItems.sort((a, b) => b.timestamp - a.timestamp);

    const hasMore = allItems.length > limit;
    const items = allItems.slice(0, limit);
    const nextCursor = items.length > 0 ? items[items.length - 1].timestamp : null;

    return { items, nextCursor, hasMore };
  },
});

export const getCommunityActivity = query({
  args: {
    limit: v.optional(v.number()),
    beforeTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<PaginatedActivityResult> => {
    const { user } = await requireAuth(ctx);
    const limit = args.limit ?? 20;
    const beforeTs = args.beforeTimestamp ?? Number.MAX_SAFE_INTEGER;

    // Fetch more than limit to account for filtering (private profiles, self, etc.)
    const fetchLimit = limit * 3;

    const allItems: ActivityItem[] = [];
    const userCache = new Map<string, UserInfo | null>();
    const bookCache = new Map<string, BookInfo | null>();

    async function getUser(userId: Id<"users">): Promise<UserInfo | null> {
      const cached = userCache.get(userId);
      if (cached !== undefined) return cached;
      const u = await ctx.db.get(userId);
      // Exclude private profiles from the discover feed
      const info =
        u && !u.isProfilePrivate ? { _id: u._id, name: u.name, imageUrl: u.imageUrl } : null;
      userCache.set(userId, info);
      return info;
    }

    async function getBook(bookId: Id<"books">): Promise<BookInfo | null> {
      const cached = bookCache.get(bookId);
      if (cached !== undefined) return cached;
      const book = await ctx.db.get(bookId);
      const info = book
        ? { _id: book._id, title: book.title, coverImageR2Key: book.coverImageR2Key }
        : null;
      bookCache.set(bookId, info);
      return info;
    }

    // Public reviews — use by_reviewedAt index, ordered desc
    const recentReviews = await ctx.db
      .query("bookUserData")
      .withIndex("by_reviewedAt", (q) => q.lt("reviewedAt", beforeTs))
      .order("desc")
      .take(fetchLimit);

    for (const review of recentReviews) {
      if (review.userId === user._id) continue;
      if (review.isReviewPrivate || review.isReadPrivate) continue;
      if (review.rating === undefined && !review.reviewText) continue;
      if (!review.reviewedAt) continue;

      const [reviewUser, book] = await Promise.all([
        getUser(review.userId),
        getBook(review.bookId),
      ]);
      if (!reviewUser || !book) continue;

      allItems.push({
        _id: `review_${review._id}`,
        type: "review",
        timestamp: review.reviewedAt,
        user: reviewUser,
        book,
        rating: review.rating,
        reviewText: review.reviewText,
      });
    }

    // Public notes — use by_isPublic_and_updatedAt index
    const recentNotes = await ctx.db
      .query("bookNotes")
      .withIndex("by_isPublic_and_updatedAt", (q) =>
        q.eq("isPublic", true).lt("updatedAt", beforeTs)
      )
      .order("desc")
      .take(fetchLimit);

    for (const note of recentNotes) {
      if (note.userId === user._id) continue;

      const [noteUser, book] = await Promise.all([getUser(note.userId), getBook(note.bookId)]);
      if (!noteUser || !book) continue;

      allItems.push({
        _id: `note_${note._id}`,
        type: "public_note",
        timestamp: note.updatedAt,
        user: noteUser,
        book,
        noteText: note.noteText,
        entryType: note.entryType,
        sourceText: note.sourceText,
      });
    }

    // Recent shelf adds — use by_addedAt index, then check shelf is public
    const recentShelfBooks = await ctx.db
      .query("shelfBooks")
      .withIndex("by_addedAt", (q) => q.lt("addedAt", beforeTs))
      .order("desc")
      .take(fetchLimit);

    const shelfCache = new Map<
      string,
      { isPublic: boolean; name: string; userId: string } | null
    >();

    for (const sb of recentShelfBooks) {
      let shelfInfo = shelfCache.get(sb.shelfId);
      if (shelfInfo === undefined) {
        const shelf = await ctx.db.get(sb.shelfId);
        shelfInfo = shelf
          ? { isPublic: shelf.isPublic ?? false, name: shelf.name, userId: shelf.userId }
          : null;
        shelfCache.set(sb.shelfId, shelfInfo);
      }
      if (!shelfInfo || !shelfInfo.isPublic) continue;
      if (shelfInfo.userId === user._id) continue;

      const [shelfUser, book] = await Promise.all([
        getUser(shelfInfo.userId as Id<"users">),
        getBook(sb.bookId),
      ]);
      if (!shelfUser || !book) continue;

      allItems.push({
        _id: `shelf_${sb._id}`,
        type: "shelf_add",
        timestamp: sb.addedAt,
        user: shelfUser,
        book,
        shelfId: sb.shelfId,
        shelfName: shelfInfo.name,
      });
    }

    allItems.sort((a, b) => b.timestamp - a.timestamp);

    const hasMore = allItems.length > limit;
    const items = allItems.slice(0, limit);
    const nextCursor = items.length > 0 ? items[items.length - 1].timestamp : null;

    return { items, nextCursor, hasMore };
  },
});
