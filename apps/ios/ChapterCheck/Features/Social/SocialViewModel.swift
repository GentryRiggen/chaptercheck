import Combine
import ConvexMobile
import Foundation
import os

@Observable
@MainActor
final class SocialViewModel {

    // MARK: - State

    var activityFeed: [ActivityItem] = []
    var communityActivity: [ActivityItem] = []
    var following: [FollowedUser] = []
    var isLoading = true
    var error: String?

    // MARK: - Computed

    var hasFollowing: Bool { !following.isEmpty }

    // MARK: - Dependencies

    private let networkMonitor = NetworkMonitor.shared
    private let logger = Logger(subsystem: "com.chaptercheck", category: "SocialViewModel")
    private let socialRepository = SocialRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()

    private var loadedSections: Set<String> = []
    /// Sections that must load before dismissing the skeleton.
    private static let requiredSections: Set<String> = ["following", "communityActivity"]

    var isOffline: Bool { !networkMonitor.isConnected }
    private(set) var isShowingOfflineData = false

    // MARK: - Subscriptions

    func subscribe() {
        if isOffline {
            logger.info("Offline — no social subscriptions")
            isShowingOfflineData = true
            isLoading = false
            return
        }

        isShowingOfflineData = false
        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty else { return }
                logger.info("Auth ready — subscribing to social data")
                subscribeToMyFollowing()
                subscribeToCommunityActivity()
                subscribeToActivityFeed()
            },
            onUnauthenticated: { [weak self] in
                guard let self else { return }
                logger.info("Auth lost — tearing down social subscriptions")
                tearDownSubscriptions()
            }
        )
    }

    func unsubscribe() {
        authObserver.cancel()
        tearDownSubscriptions()
    }

    func recoverFromOffline() {
        guard isShowingOfflineData else { return }
        logger.info("Network restored — switching to live social data")
        tearDownSubscriptions()
        isShowingOfflineData = false
        isLoading = true

        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty else { return }
                logger.info("Auth ready after offline recovery — subscribing to social data")
                subscribeToMyFollowing()
                subscribeToCommunityActivity()
                subscribeToActivityFeed()
            },
            onUnauthenticated: { [weak self] in
                guard let self else { return }
                tearDownSubscriptions()
            }
        )
        authObserver.needsResubscription()
    }

    private func tearDownSubscriptions() {
        cancellables.removeAll()
        loadedSections.removeAll()
    }

    // MARK: - Private Subscription Setup

    private func subscribeToMyFollowing() {
        guard let publisher = socialRepository.subscribeToMyFollowing() else {
            markLoaded("following")
            return
        }
        publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("following FAILED: \(error)")
                        self?.handleSectionError("following", message: error.localizedDescription)
                    }
                },
                receiveValue: { [weak self] users in
                    self?.logger.info("following: received \(users.count) users")
                    self?.following = users
                    self?.markLoaded("following")
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToActivityFeed() {
        guard let publisher = socialRepository.subscribeToActivityFeed() else {
            markLoaded("activityFeed")
            return
        }
        publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("activityFeed FAILED: \(error)")
                        self?.handleSectionError("activityFeed", message: error.localizedDescription)
                    }
                },
                receiveValue: { [weak self] items in
                    self?.logger.info("activityFeed: received \(items.count) items")
                    self?.activityFeed = items
                    self?.markLoaded("activityFeed")
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToCommunityActivity() {
        guard let publisher = socialRepository.subscribeToCommunityActivity() else {
            markLoaded("communityActivity")
            return
        }
        publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("communityActivity FAILED: \(error)")
                        self?.handleSectionError("communityActivity", message: error.localizedDescription)
                    }
                },
                receiveValue: { [weak self] items in
                    self?.logger.info("communityActivity: received \(items.count) items")
                    self?.communityActivity = items
                    self?.markLoaded("communityActivity")
                }
            )
            .store(in: &cancellables)
    }

    private func markLoaded(_ section: String) {
        loadedSections.insert(section)
        error = nil
        if Self.requiredSections.isSubset(of: loadedSections) {
            isLoading = false
        }
    }

    private func handleSectionError(_ section: String, message: String) {
        if loadedSections.isEmpty {
            error = message
        }
        isLoading = false
    }
}
