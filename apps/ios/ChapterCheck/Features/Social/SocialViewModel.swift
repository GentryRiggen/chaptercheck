import Combine
import ConvexMobile
import Foundation

enum SocialTab: String, CaseIterable, Identifiable {
    case following = "Following"
    case discover = "Discover"
    var id: String { rawValue }
}

enum ActivityTypeFilter: String, CaseIterable, Identifiable {
    case all = "All"
    case review = "Reviews"
    case shelfAdd = "Shelf Adds"
    case publicNote = "Notes"
    var id: String { rawValue }

    var systemImage: String {
        switch self {
        case .all: "list.bullet"
        case .review: "star"
        case .shelfAdd: "bookmark"
        case .publicNote: "text.quote"
        }
    }

    var matchesType: ((ActivityItemType) -> Bool) {
        switch self {
        case .all: { _ in true }
        case .review: { $0 == .review }
        case .shelfAdd: { $0 == .shelfAdd }
        case .publicNote: { $0 == .publicNote }
        }
    }
}

@Observable
@MainActor
final class SocialViewModel {

    // MARK: - State

    var selectedTab: SocialTab = .discover
    var activityFeed: [ActivityItem] = []
    var communityActivity: [ActivityItem] = []
    var following: [FollowedUser] = []
    var isLoading = true
    var error: String?

    // MARK: - Pagination State

    var isLoadingMoreActivity = false
    var hasMoreActivity = false
    var loadMoreActivityError = false
    private var activityNextCursor: Double?

    var isLoadingMoreCommunity = false
    var hasMoreCommunity = false
    var loadMoreCommunityError = false
    private var communityNextCursor: Double?

    /// Items loaded via "Load More" (appended to subscription results)
    private var olderActivityItems: [ActivityItem] = []
    private var olderCommunityItems: [ActivityItem] = []

    // MARK: - Search & Filter

    var searchText = ""
    var typeFilter: ActivityTypeFilter = .all

    var hasActiveFilters: Bool {
        !searchText.trimmingCharacters(in: .whitespaces).isEmpty || typeFilter != .all
    }

    var filteredActivityFeed: [ActivityItem] {
        filterItems(activityFeed + olderActivityItems)
    }

    var filteredCommunityActivity: [ActivityItem] {
        filterItems(communityActivity + olderCommunityItems)
    }

    func clearFilters() {
        searchText = ""
        typeFilter = .all
    }

    private func filterItems(_ items: [ActivityItem]) -> [ActivityItem] {
        var result = items

        if typeFilter != .all {
            result = result.filter { typeFilter.matchesType($0.type) }
        }

        let trimmed = searchText.trimmingCharacters(in: .whitespaces)
        if !trimmed.isEmpty {
            result = result.filter { $0.matchesSearchText(trimmed) }
        }

        return result
    }

    // MARK: - Computed

    var hasFollowing: Bool { !following.isEmpty }

    // MARK: - Dependencies

    private let networkMonitor = NetworkMonitor.shared
    private let logger = AppLogger(category: "SocialViewModel")
    private let socialRepository = SocialRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()

    private var loadedSections: Set<String> = []
    private static let requiredSections: Set<String> = ["following", "communityActivity"]
    private var hasSetInitialTab = false

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

    func refresh() async {
        unsubscribe()
        resetPaginationState()
        isLoading = true
        error = nil
        subscribe()
        while isLoading && !Task.isCancelled {
            try? await Task.sleep(for: .milliseconds(50))
        }
    }

    func recoverFromOffline() {
        guard isShowingOfflineData else { return }
        logger.info("Network restored — switching to live social data")
        tearDownSubscriptions()
        resetPaginationState()
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
        hasSetInitialTab = false
    }

    private func resetPaginationState() {
        olderActivityItems.removeAll()
        olderCommunityItems.removeAll()
        activityNextCursor = nil
        communityNextCursor = nil
        hasMoreActivity = false
        hasMoreCommunity = false
        loadMoreActivityError = false
        loadMoreCommunityError = false
    }

    // MARK: - Load More

    func loadMoreActivityFeed() {
        guard !isLoadingMoreActivity, hasMoreActivity, let cursor = activityNextCursor else { return }
        isLoadingMoreActivity = true
        loadMoreActivityError = false

        Task {
            do {
                let result = try await socialRepository.fetchOlderActivityFeed(beforeTimestamp: cursor)
                let existingIds = Set(activityFeed.map(\.id) + olderActivityItems.map(\.id))
                let newItems = result.items.filter { !existingIds.contains($0.id) }
                olderActivityItems.append(contentsOf: newItems)
                activityNextCursor = result.nextCursor
                hasMoreActivity = result.hasMore
            } catch {
                logger.error("Failed to load more activity: \(error)")
                loadMoreActivityError = true
            }
            isLoadingMoreActivity = false
        }
    }

    func loadMoreCommunityActivity() {
        guard !isLoadingMoreCommunity, hasMoreCommunity, let cursor = communityNextCursor else { return }
        isLoadingMoreCommunity = true
        loadMoreCommunityError = false

        Task {
            do {
                let result = try await socialRepository.fetchOlderCommunityActivity(beforeTimestamp: cursor)
                let existingIds = Set(communityActivity.map(\.id) + olderCommunityItems.map(\.id))
                let newItems = result.items.filter { !existingIds.contains($0.id) }
                olderCommunityItems.append(contentsOf: newItems)
                communityNextCursor = result.nextCursor
                hasMoreCommunity = result.hasMore
            } catch {
                logger.error("Failed to load more community activity: \(error)")
                loadMoreCommunityError = true
            }
            isLoadingMoreCommunity = false
        }
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
                receiveValue: { [weak self] result in
                    self?.logger.info("activityFeed: received \(result.items.count) items")
                    self?.activityFeed = result.items
                    self?.hasMoreActivity = result.hasMore
                    self?.activityNextCursor = result.nextCursor
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
                receiveValue: { [weak self] result in
                    self?.logger.info("communityActivity: received \(result.items.count) items")
                    self?.communityActivity = result.items
                    self?.hasMoreCommunity = result.hasMore
                    self?.communityNextCursor = result.nextCursor
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
            if !hasSetInitialTab {
                hasSetInitialTab = true
                selectedTab = hasFollowing ? .following : .discover
            }
        }
    }

    private func handleSectionError(_ section: String, message: String) {
        if loadedSections.isEmpty {
            error = message
        }
        isLoading = false
    }
}
