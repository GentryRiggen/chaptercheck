import Combine
import ConvexMobile
import Foundation

/// Repository for direct messaging: subscriptions, mutations, and actions.
///
/// All Convex calls delegate to `ConvexService`. Subscriptions return Combine
/// publishers that emit whenever the underlying data changes on the server.
@MainActor
final class MessagingRepository {

    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    // MARK: - Subscriptions

    /// Subscribe to the current user's conversation list (sorted by last message, newest first).
    func subscribeToConversations() -> AnyPublisher<[ConversationListItem], ClientError>? {
        convex.subscribe(to: "messages/queries:getConversations")
    }

    /// Subscribe to paginated messages for a conversation (newest first).
    func subscribeToMessages(
        conversationId: String,
        numItems: Int = 50,
        cursor: String? = nil
    ) -> AnyPublisher<PaginatedResult<Message>, ClientError>? {
        let paginationOpts: [String: ConvexEncodable?] = [
            "numItems": Double(numItems),
            "cursor": cursor,
        ]

        return convex.subscribe(
            to: "messages/queries:getMessages",
            with: [
                "conversationId": conversationId,
                "paginationOpts": paginationOpts,
            ]
        )
    }

    /// Subscribe to the total unread message count (for tab badge).
    func subscribeToUnreadCount() -> AnyPublisher<Int, ClientError>? {
        convex.subscribe(to: "messages/queries:getUnreadCount")
    }

    /// Subscribe to conversation detail (other user info).
    func subscribeToConversation(conversationId: String) -> AnyPublisher<ConversationDetail, ClientError>? {
        convex.subscribe(
            to: "messages/queries:getConversation",
            with: ["conversationId": conversationId]
        )
    }

    /// Subscribe to conversation read state (read receipts).
    func subscribeToConversationState(conversationId: String) -> AnyPublisher<ConversationReadState?, ClientError>? {
        convex.subscribe(
            to: "messages/queries:getConversationState",
            with: ["conversationId": conversationId]
        )
    }

    // MARK: - One-shot Queries

    /// Check if the current user can message a target user.
    func canMessageUser(targetUserId: String) async throws -> CanMessageResult {
        try await convex.query(
            "messages/queries:canMessageUser",
            with: ["targetUserId": targetUserId]
        )
    }

    /// Find an existing conversation with another user (without creating one).
    func findConversation(otherUserId: String) async throws -> String? {
        try await convex.query(
            "messages/queries:findConversation",
            with: ["otherUserId": otherUserId]
        )
    }

    /// Load more messages (pagination).
    func loadMoreMessages(conversationId: String, cursor: String, numItems: Int = 50) async throws -> PaginatedResult<Message> {
        let paginationOpts: [String: ConvexEncodable?] = [
            "numItems": Double(numItems),
            "cursor": cursor,
        ]

        return try await convex.query(
            "messages/queries:getMessages",
            with: [
                "conversationId": conversationId,
                "paginationOpts": paginationOpts,
            ]
        )
    }

    // MARK: - Mutations

    /// Send a text message.
    func sendTextMessage(recipientId: String, text: String) async throws -> SendMessageResult {
        try await convex.mutation(
            "messages/mutations:sendMessage",
            with: [
                "recipientId": recipientId,
                "type": "text",
                "text": text,
            ]
        )
    }

    /// Send a photo message with optional caption.
    func sendPhotoMessage(
        recipientId: String,
        mediaR2Key: String,
        mediaWidth: Double,
        mediaHeight: Double,
        mediaSizeBytes: Double,
        caption: String? = nil
    ) async throws -> SendMessageResult {
        try await convex.mutation(
            "messages/mutations:sendMessage",
            with: [
                "recipientId": recipientId,
                "type": "photo",
                "text": caption,
                "mediaR2Key": mediaR2Key,
                "mediaWidth": mediaWidth,
                "mediaHeight": mediaHeight,
                "mediaSizeBytes": mediaSizeBytes,
            ]
        )
    }

    /// Send a video message with optional caption.
    func sendVideoMessage(
        recipientId: String,
        mediaR2Key: String,
        thumbnailR2Key: String,
        mediaWidth: Double,
        mediaHeight: Double,
        mediaSizeBytes: Double,
        mediaDurationSeconds: Double,
        caption: String? = nil
    ) async throws -> SendMessageResult {
        try await convex.mutation(
            "messages/mutations:sendMessage",
            with: [
                "recipientId": recipientId,
                "type": "video",
                "text": caption,
                "mediaR2Key": mediaR2Key,
                "thumbnailR2Key": thumbnailR2Key,
                "mediaWidth": mediaWidth,
                "mediaHeight": mediaHeight,
                "mediaSizeBytes": mediaSizeBytes,
                "mediaDurationSeconds": mediaDurationSeconds,
            ]
        )
    }

    /// Edit a text message.
    func editMessage(messageId: String, text: String) async throws {
        try await convex.mutation(
            "messages/mutations:editMessage",
            with: ["messageId": messageId, "text": text]
        )
    }

    /// Delete a message for everyone.
    func deleteMessage(messageId: String) async throws {
        try await convex.mutation(
            "messages/mutations:deleteMessage",
            with: ["messageId": messageId]
        )
    }

    /// Toggle an emoji reaction on a message.
    func toggleReaction(messageId: String, emoji: String) async throws {
        try await convex.mutation(
            "messages/mutations:toggleReaction",
            with: ["messageId": messageId, "emoji": emoji]
        )
    }

    /// Mark a conversation as read up to a specific message.
    func markConversationRead(conversationId: String, messageId: String) async throws {
        try await convex.mutation(
            "messages/mutations:markConversationRead",
            with: ["conversationId": conversationId, "messageId": messageId]
        )
    }

    /// Soft-delete a conversation (for current user only).
    func deleteConversationForMe(conversationId: String) async throws {
        try await convex.mutation(
            "messages/mutations:deleteConversationForMe",
            with: ["conversationId": conversationId]
        )
    }

    /// Opt in to direct messaging.
    func optInToMessaging() async throws {
        try await convex.mutation("messages/mutations:optInToMessaging")
    }

    // MARK: - Actions (R2 Media)

    /// Generate a presigned upload URL for message media.
    func generateMediaUploadUrl(
        conversationId: String,
        fileName: String,
        fileSize: Int,
        contentType: String
    ) async throws -> MediaUploadUrl {
        try await convex.action(
            "messages/actions:generateMessageMediaUploadUrl",
            with: [
                "conversationId": conversationId,
                "fileName": fileName,
                "fileSize": Double(fileSize),
                "contentType": contentType,
            ]
        )
    }

    /// Generate a presigned URL for viewing message media.
    func generateMediaUrl(r2Key: String) async throws -> MediaViewUrl {
        try await convex.action(
            "messages/actions:generateMessageMediaUrl",
            with: ["r2Key": r2Key]
        )
    }
}

// MARK: - Action Response Types

struct MediaUploadUrl: Decodable, Sendable {
    let uploadUrl: String
    let r2Key: String
    let r2Bucket: String
}

struct MediaViewUrl: Decodable, Sendable {
    let url: String
}
