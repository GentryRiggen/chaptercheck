import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { type Doc, type Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { getBlockedUserIdsForUser } from "../blocks/helpers";
import { isApprovedUser, requireAuth } from "../lib/auth";
import { getOtherParticipantId, requireConversationParticipant } from "./helpers";

/**
 * Get the current user's conversation list.
 * Merges conversations where user is participantA or participantB,
 * excludes soft-deleted and blocked conversations.
 * Returns enriched with other user info and unread count.
 */
export const getConversations = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    const blockedIds = await getBlockedUserIdsForUser(ctx, user._id);

    // Fetch conversations from both indexes
    const [asA, asB] = await Promise.all([
      ctx.db
        .query("conversations")
        .withIndex("by_participantA", (q) => q.eq("participantA", user._id))
        .collect(),
      ctx.db
        .query("conversations")
        .withIndex("by_participantB", (q) => q.eq("participantB", user._id))
        .collect(),
    ]);

    const allConversations = [...asA, ...asB];

    // Filter: must have at least one message, not blocked
    const filtered = allConversations.filter((c) => {
      const otherId = getOtherParticipantId(c, user._id);
      if (blockedIds.has(otherId)) return false;
      if (!c.lastMessageAt) return false;
      return true;
    });

    // Get conversation states for soft-delete filtering + unread counts
    const states = await Promise.all(
      filtered.map((c) =>
        ctx.db
          .query("conversationState")
          .withIndex("by_conversation_and_user", (q) =>
            q.eq("conversationId", c._id).eq("userId", user._id)
          )
          .unique()
      )
    );

    // Build state map
    const stateMap = new Map<string, Doc<"conversationState">>();
    for (const state of states) {
      if (state) {
        stateMap.set(state.conversationId, state);
      }
    }

    // Filter out soft-deleted conversations (unless new messages arrived after deletion)
    const active = filtered.filter((c) => {
      const state = stateMap.get(c._id);
      if (!state) return true;
      if (!state.deletedAt) return true;
      // Show if there are messages after deletion
      return c.lastMessageAt !== undefined && c.lastMessageAt > state.deletedAt;
    });

    // Sort by last message timestamp, newest first
    active.sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));

    // Enrich with other user info and unread count
    const enriched = await Promise.all(
      active.map(async (conversation) => {
        const otherId = getOtherParticipantId(conversation, user._id);
        const otherUser = await ctx.db.get(otherId);
        const state = stateMap.get(conversation._id);

        // Calculate unread count
        let unreadCount = 0;
        if (state?.lastReadMessageId) {
          const lastReadMessage = await ctx.db.get(state.lastReadMessageId);
          if (lastReadMessage) {
            const unreadMessages = await ctx.db
              .query("messages")
              .withIndex("by_conversation", (q) =>
                q.eq("conversationId", conversation._id).gt("createdAt", lastReadMessage.createdAt)
              )
              .collect();
            // Only count messages not sent by the current user
            unreadCount = unreadMessages.filter((m) => m.senderId !== user._id).length;
          }
        } else if (conversation.lastMessageAt) {
          // Never read — count all messages not from self
          const allMessages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
            .collect();
          unreadCount = allMessages.filter((m) => m.senderId !== user._id).length;
        }

        return {
          _id: conversation._id,
          otherUser: otherUser
            ? {
                _id: otherUser._id,
                name: otherUser.name,
                imageUrl: otherUser.imageUrl,
              }
            : null,
          lastMessagePreview: conversation.lastMessagePreview,
          lastMessageType: conversation.lastMessageType,
          lastMessageAt: conversation.lastMessageAt,
          lastMessageSenderId: conversation.lastMessageSenderId,
          unreadCount,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get paginated messages for a conversation (newest first).
 */
export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    await requireConversationParticipant(ctx, args.conversationId, user._id);

    const results = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .paginate(args.paginationOpts);

    return results;
  },
});

/**
 * Get total unread message count across all conversations (for tab badge).
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    const blockedIds = await getBlockedUserIdsForUser(ctx, user._id);

    // Get all conversation states for user
    const states = await ctx.db
      .query("conversationState")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let totalUnread = 0;

    for (const state of states) {
      if (state.deletedAt) continue;

      const conversation = await ctx.db.get(state.conversationId);
      if (!conversation || !conversation.lastMessageAt) continue;

      const otherId = getOtherParticipantId(conversation, user._id);
      if (blockedIds.has(otherId)) continue;

      if (state.lastReadMessageId) {
        const lastReadMessage = await ctx.db.get(state.lastReadMessageId);
        if (lastReadMessage) {
          const unread = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) =>
              q
                .eq("conversationId", state.conversationId)
                .gt("createdAt", lastReadMessage.createdAt)
            )
            .collect();
          totalUnread += unread.filter((m) => m.senderId !== user._id).length;
        }
      } else if (conversation.lastMessageAt) {
        // Never read — count all messages not from self
        const all = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", state.conversationId))
          .collect();
        totalUnread += all.filter((m) => m.senderId !== user._id).length;
      }
    }

    return totalUnread;
  },
});

/**
 * Get a single conversation with other user info.
 */
export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    const conversation = await requireConversationParticipant(ctx, args.conversationId, user._id);
    const otherId = getOtherParticipantId(conversation, user._id);
    const otherUser = await ctx.db.get(otherId);

    return {
      _id: conversation._id,
      otherUser: otherUser
        ? {
            _id: otherUser._id,
            name: otherUser.name,
            imageUrl: otherUser.imageUrl,
          }
        : null,
      createdAt: conversation.createdAt,
    };
  },
});

/**
 * Check if the current user can message a target user.
 * Returns messaging gate status for showing/hiding the "Message" button.
 */
export const canMessageUser = query({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    // Can't message yourself
    if (user._id === args.targetUserId) {
      return { canMessage: false, reason: "self" as const };
    }

    // Check if sender can send messages
    const senderApproved = isApprovedUser(user);
    const senderEnabled = user.messagingEnabled ?? false;
    const senderOptedIn = user.allowDirectMessages ?? false;

    if (!senderApproved || !senderEnabled || !senderOptedIn) {
      return { canMessage: false, reason: "sender_not_enabled" as const };
    }

    // Check if target user is blocked (bidirectional)
    const blockedIds = await getBlockedUserIdsForUser(ctx, user._id);
    if (blockedIds.has(args.targetUserId)) {
      return { canMessage: false, reason: "blocked" as const };
    }

    return { canMessage: true, reason: "ok" as const };
  },
});

/**
 * Get the conversation state for the current user (read position).
 * Used by ConversationView to determine read receipt position.
 */
export const getConversationState = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    await requireConversationParticipant(ctx, args.conversationId, user._id);

    // Get both states (current user + other participant for read receipts)
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    const otherId = getOtherParticipantId(conversation, user._id);

    const [myState, otherState] = await Promise.all([
      ctx.db
        .query("conversationState")
        .withIndex("by_conversation_and_user", (q) =>
          q.eq("conversationId", args.conversationId).eq("userId", user._id)
        )
        .unique(),
      ctx.db
        .query("conversationState")
        .withIndex("by_conversation_and_user", (q) =>
          q.eq("conversationId", args.conversationId).eq("userId", otherId)
        )
        .unique(),
    ]);

    return {
      myLastReadMessageId: myState?.lastReadMessageId ?? null,
      otherLastReadMessageId: otherState?.lastReadMessageId ?? null,
    };
  },
});

/**
 * Find an existing conversation between two users (without creating one).
 * Used to navigate to an existing conversation from profile/social screens.
 */
export const findConversation = query({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const [participantA, participantB] =
      user._id < args.otherUserId ? [user._id, args.otherUserId] : [args.otherUserId, user._id];

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_pair", (q) =>
        q
          .eq("participantA", participantA as Id<"users">)
          .eq("participantB", participantB as Id<"users">)
      )
      .unique();

    return conversation?._id ?? null;
  },
});
