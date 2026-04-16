import Combine
import ConvexMobile
import SwiftUI

/// New message compose view — search for a user to start or open a conversation.
struct ComposeMessageView: View {

    @State private var searchText = ""
    @State private var searchResults: [FollowedUser] = []
    @State private var isSearching = false
    @State private var searchTask: Task<Void, Never>?
    @Environment(\.dismiss) private var dismiss

    private let userRepository = UserRepository()

    var body: some View {
        List {
            if isSearching {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .listRowSeparator(.hidden)
            } else if !searchText.isEmpty && searchResults.isEmpty {
                ContentUnavailableView.search(text: searchText)
                    .listRowSeparator(.hidden)
            } else if searchText.isEmpty {
                ContentUnavailableView(
                    "Search for a User",
                    systemImage: "magnifyingglass",
                    description: Text("Type a name to find someone to message.")
                )
                .listRowSeparator(.hidden)
            } else {
                ForEach(searchResults) { user in
                    NavigationLink(value: AppDestination.conversation(otherUserId: user._id)) {
                        HStack(spacing: 12) {
                            userAvatar(user)
                            Text(user.name ?? "Anonymous")
                                .font(.body)
                        }
                    }
                }
            }
        }
        .listStyle(.plain)
        .navigationTitle("New Message")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $searchText, prompt: "Search by name")
        .onChange(of: searchText) { _, newValue in
            onSearchTextChanged(newValue)
        }
    }

    // MARK: - Search

    private func onSearchTextChanged(_ query: String) {
        searchTask?.cancel()

        let trimmed = query.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else {
            searchResults = []
            isSearching = false
            return
        }

        isSearching = true
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }

            do {
                let results: [FollowedUser] = try await ConvexService.shared.query(
                    "users/queries:searchUsers",
                    with: ["query": trimmed]
                )
                guard !Task.isCancelled else { return }
                searchResults = results
            } catch {
                guard !Task.isCancelled else { return }
                searchResults = []
            }
            isSearching = false
        }
    }

    // MARK: - Avatar

    private func userAvatar(_ user: FollowedUser) -> some View {
        ZStack {
            Circle()
                .fill(Color(.tertiarySystemFill))
                .overlay {
                    Text(String((user.name ?? "?").prefix(1)).uppercased())
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                }

            if let imageUrl = user.imageUrl, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    if case .success(let image) = phase {
                        image.resizable().aspectRatio(contentMode: .fill)
                    }
                }
            }
        }
        .frame(width: 40, height: 40)
        .clipShape(Circle())
    }
}
