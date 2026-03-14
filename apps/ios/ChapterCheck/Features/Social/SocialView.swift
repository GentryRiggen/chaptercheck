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
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink(value: AppDestination.userSearch) {
                    Image(systemName: "magnifyingglass")
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
        } else {
            feedList(items: viewModel.activityFeed)
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
        } else {
            feedList(items: viewModel.communityActivity)
        }
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
