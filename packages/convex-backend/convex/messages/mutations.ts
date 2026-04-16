import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { requireApprovedMutation, requireAuthMutation } from "../lib/auth";
import {
  canUserSendMessages,
  getOrCreateConversation,
  isBlockedBySilent,
  requireConversationParticipant,
} from "./helpers";

/**
 * Send a message in a conversation.
 * Creates the conversation if it doesn't exist.
 * Silently succeeds (no-op) if recipient has blocked sender.
 */
export const sendMessage = mutation({
  args: {
    recipientId: v.id("users"),
    type: v.union(v.literal("text"), v.literal("photo"), v.literal("video")),
    text: v.optional(v.string()),
    mediaR2Key: v.optional(v.string()),
    thumbnailR2Key: v.optional(v.string()),
    mediaWidth: v.optional(v.number()),
    mediaHeight: v.optional(v.number()),
    mediaSizeBytes: v.optional(v.number()),
    mediaDurationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);

    // Sender must have messaging enabled + opted in + approved
    if (!canUserSendMessages(user)) {
      throw new Error("Messaging not enabled for your account");
    }

    // Validate content
    if (args.type === "text" && (!args.text || args.text.trim().length === 0)) {
      throw new Error("Text message cannot be empty");
    }
    if ((args.type === "photo" || args.type === "video") && !args.mediaR2Key) {
      throw new Error("Media message requires a media file");
    }

    // Silent failure if blocked
    const blocked = await isBlockedBySilent(ctx, user._id, args.recipientId);
    if (blocked) {
      // Return a fake success — sender doesn't know they're blocked
      return { messageId: null, conversationId: null, silentlyBlocked: true };
    }

    const conversationId = await getOrCreateConversation(ctx, user._id, args.recipientId);
    const now = Date.now();

    const messageId = await ctx.db.insert("messages", {
      conversationId,
      senderId: user._id,
      type: args.type,
      text: args.text?.trim(),
      mediaR2Key: args.mediaR2Key,
      thumbnailR2Key: args.thumbnailR2Key,
      mediaWidth: args.mediaWidth,
      mediaHeight: args.mediaHeight,
      mediaSizeBytes: args.mediaSizeBytes,
      mediaDurationSeconds: args.mediaDurationSeconds,
      createdAt: now,
    });

    // Build preview text for conversation list
    let preview: string;
    if (args.type === "photo") {
      preview = args.text?.trim() ? `📷 ${args.text.trim()}` : "📷 Photo";
    } else if (args.type === "video") {
      preview = args.text?.trim() ? `🎥 ${args.text.trim()}` : "🎥 Video";
    } else {
      preview = args.text?.trim() ?? "";
    }
    // Truncate preview
    if (preview.length > 100) {
      preview = preview.substring(0, 97) + "...";
    }

    // Update conversation denormalized fields
    await ctx.db.patch(conversationId, {
      lastMessageId: messageId,
      lastMessageAt: now,
      lastMessagePreview: preview,
      lastMessageSenderId: user._id,
      lastMessageType: args.type,
      updatedAt: now,
    });

    // If recipient had soft-deleted this conversation, clear the deletedAt
    // so it reappears in their list
    const recipientState = await ctx.db
      .query("conversationState")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", conversationId).eq("userId", args.recipientId)
      )
      .unique();

    if (recipientState?.deletedAt) {
      await ctx.db.patch(recipientState._id, {
        deletedAt: undefined,
        updatedAt: now,
      });
    }

    return { messageId, conversationId, silentlyBlocked: false };
  },
});

/**
 * Edit a text message (own messages only, anytime).
 */
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== user._id) throw new Error("Can only edit your own messages");
    if (message.type !== "text") throw new Error("Can only edit text messages");

    const trimmed = args.text.trim();
    if (trimmed.length === 0) throw new Error("Message cannot be empty");

    const now = Date.now();
    await ctx.db.patch(args.messageId, {
      text: trimmed,
      editedAt: now,
    });

    // Update conversation preview if this was the last message
    const conversation = await ctx.db.get(message.conversationId);
    if (conversation?.lastMessageId === args.messageId) {
      let preview = trimmed;
      if (preview.length > 100) {
        preview = preview.substring(0, 97) + "...";
      }
      await ctx.db.patch(message.conversationId, {
        lastMessagePreview: preview,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Delete a message for everyone (own messages only, anytime).
 * Hard-deletes the message row. Client shows ephemeral tombstone in-session only.
 */
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== user._id) throw new Error("Can only delete your own messages");

    const conversationId = message.conversationId;
    await ctx.db.delete(args.messageId);

    // If this was the last message, update the conversation preview
    const conversation = await ctx.db.get(conversationId);
    if (conversation?.lastMessageId === args.messageId) {
      // Find the new last message
      const previousMessage = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .order("desc")
        .first();

      if (previousMessage) {
        let preview: string;
        if (previousMessage.type === "photo") {
          preview = previousMessage.text ? `📷 ${previousMessage.text}` : "📷 Photo";
        } else if (previousMessage.type === "video") {
          preview = previousMessage.text ? `🎥 ${previousMessage.text}` : "🎥 Video";
        } else {
          preview = previousMessage.text ?? "";
        }
        if (preview.length > 100) preview = preview.substring(0, 97) + "...";

        await ctx.db.patch(conversationId, {
          lastMessageId: previousMessage._id,
          lastMessageAt: previousMessage.createdAt,
          lastMessagePreview: preview,
          lastMessageSenderId: previousMessage.senderId,
          lastMessageType: previousMessage.type,
          updatedAt: Date.now(),
        });
      } else {
        // No messages left — clear denormalized fields
        await ctx.db.patch(conversationId, {
          lastMessageId: undefined,
          lastMessageAt: undefined,
          lastMessagePreview: undefined,
          lastMessageSenderId: undefined,
          lastMessageType: undefined,
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});

/**
 * Toggle an emoji reaction on a message.
 * - Same emoji by same user → remove
 * - Different emoji by same user → replace
 * - New user → add
 */
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireApprovedMutation(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Verify user is a participant in this conversation
    await requireConversationParticipant(ctx, message.conversationId, user._id);

    const reactions = message.reactions ?? [];
    const existingIndex = reactions.findIndex((r) => r.userId === user._id);

    let updatedReactions;
    if (existingIndex >= 0) {
      if (reactions[existingIndex].emoji === args.emoji) {
        // Same emoji — remove
        updatedReactions = reactions.filter((_, i) => i !== existingIndex);
      } else {
        // Different emoji — replace
        updatedReactions = reactions.map((r, i) =>
          i === existingIndex ? { userId: user._id, emoji: args.emoji, createdAt: Date.now() } : r
        );
      }
    } else {
      // New reaction
      updatedReactions = [
        ...reactions,
        { userId: user._id, emoji: args.emoji, createdAt: Date.now() },
      ];
    }

    await ctx.db.patch(args.messageId, {
      reactions: updatedReactions,
    });

    return { success: true };
  },
});

/**
 * Mark a conversation as read up to a specific message.
 */
export const markConversationRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);

    await requireConversationParticipant(ctx, args.conversationId, user._id);

    const state = await ctx.db
      .query("conversationState")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", user._id)
      )
      .unique();

    if (!state) throw new Error("Conversation state not found");

    await ctx.db.patch(state._id, {
      lastReadMessageId: args.messageId,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Soft-delete a conversation for the current user.
 * The other participant is unaffected. Messages sent after deletion
 * will clear the deletedAt and make the conversation reappear.
 */
export const deleteConversationForMe = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);

    await requireConversationParticipant(ctx, args.conversationId, user._id);

    const state = await ctx.db
      .query("conversationState")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", user._id)
      )
      .unique();

    if (!state) throw new Error("Conversation state not found");

    await ctx.db.patch(state._id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Opt in to direct messaging (user self-service).
 * Requires admin to have enabled messagingEnabled first.
 */
export const optInToMessaging = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireApprovedMutation(ctx);

    if (!(user.messagingEnabled ?? false)) {
      throw new Error("Messaging is not available for your account yet");
    }

    await ctx.db.patch(user._id, {
      allowDirectMessages: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
