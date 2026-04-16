import Foundation

// MARK: - Conversation List Item

/// A conversation in the list, enriched with other user info and unread count.
/// Matches the shape returned by `messages/queries:getConversations`.
struct ConversationListItem: Decodable, Identifiable, Sendable {
    let _id: String
    let otherUser: ConversationUser?
    let lastMessagePreview: String?
    let lastMessageType: String?
    let lastMessageAt: Double?
    let lastMessageSenderId: String?
    let unreadCount: Int

    var id: String { _id }
}

/// Minimal user info included in conversation responses.
struct ConversationUser: Decodable, Sendable {
    let _id: String
    let name: String?
    let imageUrl: String?

    var displayName: String { name ?? "Unknown" }
}

// MARK: - Conversation Detail

/// A single conversation with other user info.
/// Matches the shape returned by `messages/queries:getConversation`.
struct ConversationDetail: Decodable, Sendable {
    let _id: String
    let otherUser: ConversationUser?
    let createdAt: Double
}

// MARK: - Message

/// A single message in a conversation.
/// Matches the shape of items in the `page` array returned by `messages/queries:getMessages`.
struct Message: Decodable, Identifiable, Sendable {
    let _id: String
    let conversationId: String
    let senderId: String
    let type: String // "text", "photo", "video"
    let text: String?
    let editedAt: Double?
    let mediaR2Key: String?
    let thumbnailR2Key: String?
    let mediaWidth: Double?
    let mediaHeight: Double?
    let mediaSizeBytes: Double?
    let mediaDurationSeconds: Double?
    let reactions: [MessageReaction]?
    let createdAt: Double

    var id: String { _id }
    var isEdited: Bool { editedAt != nil }
    var isText: Bool { type == "text" }
    var isPhoto: Bool { type == "photo" }
    var isVideo: Bool { type == "video" }

    var date: Date { Date(timeIntervalSince1970: createdAt / 1000) }
}

/// An emoji reaction on a message.
struct MessageReaction: Decodable, Sendable {
    let userId: String
    let emoji: String
    let createdAt: Double
}

// MARK: - Conversation State

/// Read state for a conversation.
/// Matches the shape returned by `messages/queries:getConversationState`.
struct ConversationReadState: Decodable, Sendable {
    let myLastReadMessageId: String?
    let otherLastReadMessageId: String?
}

// MARK: - Can Message User

/// Result of `messages/queries:canMessageUser`.
struct CanMessageResult: Decodable, Sendable {
    let canMessage: Bool
    let reason: String // "ok", "self", "sender_not_enabled", "blocked"
}

// MARK: - Send Message Result

/// Result of `messages/mutations:sendMessage`.
struct SendMessageResult: Decodable, Sendable {
    let messageId: String?
    let conversationId: String?
    let silentlyBlocked: Bool
}
