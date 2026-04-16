import Combine
import ConvexMobile
import Foundation

@Observable
@MainActor
final class ConversationViewModel {

    // MARK: - State

    var messages: [Message] = []
    var conversationDetail: ConversationDetail?
    var readState: ConversationReadState?
    var isLoading = true
    var error: String?
    var conversationId: String?

    // Pagination
    var isLoadingMore = false
    var hasMore = false
    private var nextCursor: String?

    // Ephemeral tombstones (message IDs deleted this session)
    var deletedMessageIds: Set<String> = []

    // MARK: - Dependencies

    private let repository = MessagingRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()
    private let networkMonitor = NetworkMonitor.shared

    let otherUserId: String

    var isOffline: Bool { !networkMonitor.isConnected }

    init(otherUserId: String) {
        self.otherUserId = otherUserId
    }

    // MARK: - Subscriptions

    func subscribe() {
        if isOffline {
            isLoading = false
            return
        }

        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty else { return }
                Task { await self.findAndSubscribe() }
            },
            onUnauthenticated: { [weak self] in
                self?.messages = []
                self?.cancellables.removeAll()
            }
        )
    }

    func unsubscribe() {
        cancellables.removeAll()
    }

    private func findAndSubscribe() async {
        do {
            // Find or detect the conversation ID
            let existingId = try await repository.findConversation(otherUserId: otherUserId)
            if let existingId {
                self.conversationId = existingId
                subscribeToMessages(conversationId: existingId)
                subscribeToConversationDetail(conversationId: existingId)
                subscribeToReadState(conversationId: existingId)
            } else {
                // No conversation yet — will be created on first send
                isLoading = false
            }
        } catch {
            self.error = error.localizedDescription
            isLoading = false
        }
    }

    private func subscribeToMessages(conversationId: String) {
        guard let publisher = repository.subscribeToMessages(conversationId: conversationId) else { return }

        publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.error = error.localizedDescription
                        self?.isLoading = false
                        self?.authObserver.needsResubscription()
                        self?.cancellables.removeAll()
                    }
                },
                receiveValue: { [weak self] result in
                    guard let self else { return }
                    // Messages come newest-first; reverse for display (oldest at top)
                    self.messages = result.page.reversed()
                    self.hasMore = !result.isDone
                    self.nextCursor = result.isDone ? nil : result.continueCursor
                    self.isLoading = false
                    self.error = nil
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToConversationDetail(conversationId: String) {
        guard let publisher = repository.subscribeToConversation(conversationId: conversationId) else { return }

        publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] detail in
                    self?.conversationDetail = detail
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToReadState(conversationId: String) {
        guard let publisher = repository.subscribeToConversationState(conversationId: conversationId) else { return }

        publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] state in
                    self?.readState = state
                }
            )
            .store(in: &cancellables)
    }

    // MARK: - Actions

    func sendTextMessage(_ text: String) async {
        do {
            let result: SendMessageResult = try await repository.sendTextMessage(
                recipientId: otherUserId,
                text: text
            )
            // If conversation was just created, start subscriptions
            if let newConversationId = result.conversationId, conversationId == nil {
                conversationId = newConversationId
                subscribeToMessages(conversationId: newConversationId)
                subscribeToConversationDetail(conversationId: newConversationId)
                subscribeToReadState(conversationId: newConversationId)
            }
        } catch {
            self.error = "Failed to send message"
        }
    }

    func editMessage(messageId: String, text: String) async {
        do {
            try await repository.editMessage(messageId: messageId, text: text)
        } catch {
            self.error = "Failed to edit message"
        }
    }

    func deleteMessage(messageId: String) async {
        // Add to ephemeral tombstones for this session
        deletedMessageIds.insert(messageId)
        do {
            try await repository.deleteMessage(messageId: messageId)
        } catch {
            deletedMessageIds.remove(messageId)
            self.error = "Failed to delete message"
        }
    }

    func toggleReaction(messageId: String, emoji: String) async {
        do {
            try await repository.toggleReaction(messageId: messageId, emoji: emoji)
        } catch {
            self.error = "Failed to react"
        }
    }

    func markRead() async {
        guard let conversationId,
              let lastMessage = messages.last else { return }

        // Skip if already read up to the latest message
        if readState?.myLastReadMessageId == lastMessage._id { return }

        do {
            try await repository.markConversationRead(
                conversationId: conversationId,
                messageId: lastMessage._id
            )
        } catch {
            // Non-critical — don't surface error for read receipts
        }
    }

    func loadMore() async {
        guard let conversationId, let cursor = nextCursor, !isLoadingMore else { return }
        isLoadingMore = true
        do {
            let result = try await repository.loadMoreMessages(
                conversationId: conversationId,
                cursor: cursor
            )
            // Prepend older messages (they come newest-first, so reverse then prepend)
            let olderMessages = result.page.reversed()
            messages.insert(contentsOf: olderMessages, at: 0)
            hasMore = !result.isDone
            nextCursor = result.isDone ? nil : result.continueCursor
        } catch {
            self.error = "Failed to load more messages"
        }
        isLoadingMore = false
    }
}
