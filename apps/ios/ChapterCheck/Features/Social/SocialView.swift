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

    @ViewBuilder
    private var socialContent: some View {
        if viewModel.communityActivity.isEmpty && !viewModel.hasFollowing {
            emptyState
        } else {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    if viewModel.isOffline {
                        offlineBanner
                    }

                    // Following Activity Section
                    if viewModel.hasFollowing {
                        activitySection
                    }

                    // Discover Section
                    discoverSection

                    Spacer().frame(height: 80)
                }
                .padding(.top)
            }
        }
    }

    // MARK: - Activity Section

    private var activitySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Activity")
                .font(.title3.weight(.bold))
                .padding(.horizontal)

            if viewModel.activityFeed.isEmpty {
                Text("No recent activity from people you follow.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)
                    .padding(.vertical, 8)
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(viewModel.activityFeed) { item in
                        ActivityItemRow(item: item)
                            .padding(.horizontal)

                        if item.id != viewModel.activityFeed.last?.id {
                            Divider()
                                .padding(.leading, 56)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Discover Section

    private var discoverSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Discover")
                .font(.title3.weight(.bold))
                .padding(.horizontal)

            if !viewModel.hasFollowing {
                Text("Follow friends to see their activity here.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)
            }

            if viewModel.communityActivity.isEmpty {
                Text("No community activity yet.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)
                    .padding(.vertical, 8)
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(viewModel.communityActivity) { item in
                        ActivityItemRow(item: item)
                            .padding(.horizontal)

                        if item.id != viewModel.communityActivity.last?.id {
                            Divider()
                                .padding(.leading, 56)
                        }
                    }
                }
            }
        }
    }

    // MARK: - States

    private var emptyState: some View {
        ContentUnavailableView(
            "Find Friends",
            systemImage: "person.badge.plus",
            description: Text("Search for friends to follow and see what they're reading.")
        )
    }

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
