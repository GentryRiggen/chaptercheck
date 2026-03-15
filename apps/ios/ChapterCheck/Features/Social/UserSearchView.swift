import SwiftUI

struct UserSearchView: View {
    @State private var viewModel = UserSearchViewModel()

    var body: some View {
        List {
            if viewModel.isSearchActive {
                searchResultsSection
            } else {
                defaultContent
            }

            Color.clear
                .frame(height: 80)
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
        }
        .listStyle(.plain)
        .navigationTitle("Find People")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $viewModel.searchText, prompt: "Search by name")
        .onChange(of: viewModel.searchText) { _, _ in
            viewModel.onSearchTextChanged()
        }
        .onAppear { viewModel.subscribe() }
        .onDisappear { viewModel.unsubscribe() }
    }

    // MARK: - Default Content (No Search)

    @ViewBuilder
    private var defaultContent: some View {
        if viewModel.isLoadingFollowing {
            Section {
                ForEach(0..<3, id: \.self) { _ in
                    skeletonRow
                }
            }
        } else if viewModel.following.isEmpty {
            Section {
                VStack(spacing: 12) {
                    Image(systemName: "person.2")
                        .font(.system(size: 36))
                        .foregroundStyle(.tertiary)
                    Text("Find readers to follow")
                        .font(.headline)
                    Text("Search by name to discover people and see their reading activity in your feed.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
            }
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
        } else {
            Section {
                ForEach(viewModel.following) { user in
                    UserAvatarRow(user: user)
                }
            } header: {
                Text("Following")
            }
        }
    }

    // MARK: - Search Results

    @ViewBuilder
    private var searchResultsSection: some View {
        if viewModel.isSearching {
            Section {
                ForEach(0..<3, id: \.self) { _ in
                    skeletonRow
                }
            }
        } else if viewModel.searchResults.isEmpty {
            Section {
                ContentUnavailableView.search(text: viewModel.searchText)
            }
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
        } else {
            Section {
                ForEach(viewModel.searchResults) { user in
                    UserAvatarRow(user: user)
                }
            } header: {
                Text("\(viewModel.searchResults.count) results")
            }
        }
    }

    // MARK: - Skeleton

    private var skeletonRow: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Color(.tertiarySystemFill))
                .frame(width: 40, height: 40)
            VStack(alignment: .leading, spacing: 6) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color(.tertiarySystemFill))
                    .frame(width: 140, height: 14)
            }
            Spacer()
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.tertiarySystemFill))
                .frame(width: 80, height: 32)
        }
        .redacted(reason: .placeholder)
    }
}
