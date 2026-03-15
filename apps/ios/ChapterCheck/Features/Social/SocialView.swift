import SwiftUI

struct SocialView: View {
    @State private var viewModel = SocialViewModel()
    private let networkMonitor = NetworkMonitor.shared

    var body: some View {
        Group {
            if viewModel.isLoading {
                SocialSkeletonView()
            } else if let error = viewModel.error {
                errorView(error)
            } else {
                socialContent
            }
        }
        .navigationTitle("Social")
        .searchable(text: $viewModel.searchText, prompt: "Search by book, person, or content")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink(value: AppDestination.userSearch) {
                    Image(systemName: "person.badge.plus")
                }
                .disabled(viewModel.isOffline)
            }
        }
        .onAppear { viewModel.subscribe() }
        .onDisappear { viewModel.unsubscribe() }
        .onChange(of: networkMonitor.isConnected) { wasConnected, isConnected in
            if !wasConnected && isConnected && viewModel.isShowingOfflineData {
                viewModel.recoverFromOffline()
            }
        }
    }

    private var socialContent: some View {
        ScrollView {
            VStack(spacing: 16) {
                if viewModel.isOffline {
                    offlineBanner
                }

                // Segmented picker
                Picker("Feed", selection: $viewModel.selectedTab) {
                    ForEach(SocialTab.allCases) { tab in
                        Text(tab.rawValue).tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                // Activity type filter chips
                filterChips

                // Tab content
                switch viewModel.selectedTab {
                case .following:
                    followingContent
                case .discover:
                    discoverContent
                }

                Spacer().frame(height: 80)
            }
            .padding(.top)
        }
        .refreshable { await viewModel.refresh() }
    }

    // MARK: - Following Tab

    @ViewBuilder
    private var followingContent: some View {
        if !viewModel.hasFollowing {
            // No friends yet — steer toward discovery
            VStack(spacing: 16) {
                ContentUnavailableView(
                    "Find Friends",
                    systemImage: "person.badge.plus",
                    description: Text("Follow readers to see their activity here.")
                )

                NavigationLink(value: AppDestination.userSearch) {
                    Text("Search for People")
                        .font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 24)
                        .padding(.vertical, 10)
                        .background(Capsule().fill(Color.accentColor))
                        .foregroundStyle(.white)
                }
                .buttonStyle(.plain)

                Button {
                    viewModel.selectedTab = .discover
                } label: {
                    Text("Browse Discover")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.top, 40)
        } else if viewModel.activityFeed.isEmpty {
            Text("No recent activity from people you follow.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .padding(.horizontal)
                .padding(.top, 40)
        } else if viewModel.filteredActivityFeed.isEmpty {
            noMatchingActivity
        } else {
            feedList(items: viewModel.filteredActivityFeed)
        }
    }

    // MARK: - Discover Tab

    @ViewBuilder
    private var discoverContent: some View {
        if viewModel.communityActivity.isEmpty {
            Text("No community activity yet.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .padding(.horizontal)
                .padding(.top, 40)
        } else if viewModel.filteredCommunityActivity.isEmpty {
            noMatchingActivity
        } else {
            feedList(items: viewModel.filteredCommunityActivity)
        }
    }

    // MARK: - No Results

    private var noMatchingActivity: some View {
        ContentUnavailableView(
            "No Matching Activity",
            systemImage: "magnifyingglass",
            description: Text("Try a different search term or filter.")
        )
        .padding(.top, 20)
    }

    // MARK: - Shared Feed List

    private func feedList(items: [ActivityItem]) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                ActivityItemRow(item: item)
                    .padding(.horizontal)

                if index < items.count - 1 {
                    Divider()
                        .padding(.horizontal)
                }
            }
        }
    }

    // MARK: - Filter Chips

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(ActivityTypeFilter.allCases) { filter in
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            viewModel.typeFilter = filter
                        }
                    } label: {
                        Label(filter.rawValue, systemImage: filter.systemImage)
                            .font(.caption.weight(.medium))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background {
                                Capsule().fill(
                                    viewModel.typeFilter == filter
                                        ? Color.accentColor.opacity(0.15)
                                        : Color(.tertiarySystemFill)
                                )
                            }
                            .foregroundStyle(
                                viewModel.typeFilter == filter
                                    ? Color.accentColor
                                    : .secondary
                            )
                    }
                    .buttonStyle(.plain)
                }

                if viewModel.hasActiveFilters {
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            viewModel.clearFilters()
                        }
                    } label: {
                        Label("Clear", systemImage: "xmark")
                            .font(.caption.weight(.medium))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Capsule().fill(Color(.tertiarySystemFill)))
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
        }
    }

    // MARK: - States

    private func errorView(_ message: String) -> some View {
        ContentUnavailableView(
            "Something Went Wrong",
            systemImage: "exclamationmark.triangle",
            description: Text(message)
        )
    }

    private var offlineBanner: some View {
        HStack(spacing: 8) {
            Image(systemName: "wifi.slash")
            Text("You're offline. Showing cached data.")
        }
        .font(.caption)
        .foregroundStyle(.secondary)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color(.secondarySystemBackground))
    }
}
