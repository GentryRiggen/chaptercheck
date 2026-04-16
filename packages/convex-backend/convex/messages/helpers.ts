import { type Doc, type Id } from "../_generated/dataModel";
import { type MutationCtx, type QueryCtx } from "../_generated/server";
import { isApprovedUser } from "../lib/auth";

/**
 * Check if a user can send messages (has both admin flag + user opt-in + approved).
 */
export function canUserSendMessages(user: Doc<"users">): boolean {
  return (
    isApprovedUser(user) && (user.messagingEnabled ?? false) && (user.allowDirectMessages ?? false)
  );
}

/**
 * Check if the recipient has blocked the sender (one-directional check).
 * Used for silent failure: sender's message appears sent but never arrives.
 */
export async function isBlockedBySilent(
  ctx: QueryCtx,
  senderId: Id<"users">,
  recipientId: Id<"users">
): Promise<boolean> {
  const block = await ctx.db
    .query("blocks")
    .withIndex("by_blocker_and_blocked", (q) =>
      q.eq("blockerId", recipientId).eq("blockedUserId", senderId)
    )
    .unique();
  return block !== null;
}

/**
 * Get or create a 1:1 conversation between two users.
 * Participant IDs are sorted lexicographically to ensure uniqueness.
 * Creates conversationState records for both participants if the conversation is new.
 */
export async function getOrCreateConversation(
  ctx: MutationCtx,
  userAId: Id<"users">,
  userBId: Id<"users">
): Promise<Id<"conversations">> {
  // Sort IDs to ensure canonical ordering
  const [participantA, participantB] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];

  // Look for existing conversation
  const existing = await ctx.db
    .query("conversations")
    .withIndex("by_pair", (q) =>
      q.eq("participantA", participantA).eq("participantB", participantB)
    )
    .unique();

  if (existing) {
    return existing._id;
  }

  // Create new conversation
  const now = Date.now();
  const conversationId = await ctx.db.insert("conversations", {
    participantA,
    participantB,
    createdAt: now,
    updatedAt: now,
  });

  // Create conversationState for both participants
  await Promise.all([
    ctx.db.insert("conversationState", {
      conversationId,
      userId: participantA,
      createdAt: now,
      updatedAt: now,
    }),
    ctx.db.insert("conversationState", {
      conversationId,
      userId: participantB,
      createdAt: now,
      updatedAt: now,
    }),
  ]);

  return conversationId;
}

/**
 * Get the other participant's user ID from a conversation.
 */
export function getOtherParticipantId(
  conversation: Doc<"conversations">,
  currentUserId: Id<"users">
): Id<"users"> {
  return conversation.participantA === currentUserId
    ? conversation.participantB
    : conversation.participantA;
}

/**
 * Validate the current user is a participant in a conversation.
 */
export async function requireConversationParticipant(
  ctx: QueryCtx,
  conversationId: Id<"conversations">,
  userId: Id<"users">
): Promise<Doc<"conversations">> {
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }
  if (conversation.participantA !== userId && conversation.participantB !== userId) {
    throw new Error("Not a participant in this conversation");
  }
  return conversation;
}
