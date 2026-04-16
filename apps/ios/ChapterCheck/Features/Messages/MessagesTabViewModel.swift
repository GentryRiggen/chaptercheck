import Combine
import ConvexMobile
import Foundation

@Observable
@MainActor
final class MessagesTabViewModel {

    // MARK: - State

    var conversations: [ConversationListItem] = []
    var isLoading = true
    var error: String?

    // MARK: - Dependencies

    private let repository = MessagingRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()
    private let networkMonitor = NetworkMonitor.shared

    var isOffline: Bool { !networkMonitor.isConnected }

    // MARK: - Subscriptions

    func subscribe() {
        if isOffline {
            isLoading = false
            return
        }

        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty else { return }
                subscribeToConversations()
            },
            onUnauthenticated: { [weak self] in
                self?.conversations = []
                self?.cancellables.removeAll()
            }
        )
    }

    func unsubscribe() {
        cancellables.removeAll()
    }

    private func subscribeToConversations() {
        guard let publisher = repository.subscribeToConversations() else { return }

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
                receiveValue: { [weak self] items in
                    self?.conversations = items
                    self?.isLoading = false
                    self?.error = nil
                }
            )
            .store(in: &cancellables)
    }

    // MARK: - Actions

    func deleteConversation(_ conversation: ConversationListItem) async {
        do {
            try await repository.deleteConversationForMe(conversationId: conversation._id)
        } catch {
            self.error = "Failed to delete conversation"
        }
    }

    func optInToMessaging() async {
        do {
            try await repository.optInToMessaging()
        } catch {
            self.error = "Failed to enable messaging"
        }
    }
}
