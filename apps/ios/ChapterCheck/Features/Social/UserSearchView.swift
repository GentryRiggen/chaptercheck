import Combine
import ConvexMobile
import SwiftUI

struct UserSearchView: View {
    @State private var searchText = ""
    @State private var results: [FollowedUser] = []
    @State private var cancellable: AnyCancellable?
    @State private var isSearching = false
    @State private var isAuthenticated = false
    @State private var authObserver = ConvexAuthObserver()
    private let userRepository = UserRepository()

    var body: some View {
        List {
            if results.isEmpty && !searchText.isEmpty && !isSearching {
                ContentUnavailableView.search(text: searchText)
            } else {
                ForEach(results) { user in
                    NavigationLink(value: AppDestination.profile(userId: user._id)) {
                        HStack(spacing: 12) {
                            userAvatar(user)
                            Text(user.name ?? "Anonymous")
                                .font(.body)
                            Spacer()
                            FollowButton(userId: user._id)
                        }
                    }
                }
            }

            Color.clear
                .frame(height: 80)
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
        }
        .navigationTitle("Find People")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $searchText, prompt: "Search by name")
        .onChange(of: searchText) { _, newValue in
            if isAuthenticated {
                performSearch(query: newValue)
            }
        }
        .onAppear {
            authObserver.start(
                onAuthenticated: {
                    isAuthenticated = true
                    if !searchText.isEmpty {
                        performSearch(query: searchText)
                    }
                },
                onUnauthenticated: {
                    isAuthenticated = false
                    cancellable?.cancel()
                    cancellable = nil
                }
            )
        }
        .onDisappear {
            authObserver.cancel()
            cancellable?.cancel()
        }
    }

    private func performSearch(query: String) {
        cancellable?.cancel()

        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            results = []
            isSearching = false
            return
        }

        isSearching = true

        guard let publisher: AnyPublisher<[FollowedUser], ClientError> = userRepository.subscribeToUserSearch(query: trimmed) else {
            isSearching = false
            return
        }

        cancellable = publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in isSearching = false },
                receiveValue: { users in
                    results = users
                    isSearching = false
                }
            )
    }

    private func userAvatar(_ user: FollowedUser) -> some View {
        Group {
            if let imageUrl = user.imageUrl, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        avatarPlaceholder(for: user)
                    }
                }
            } else {
                avatarPlaceholder(for: user)
            }
        }
        .frame(width: 36, height: 36)
        .clipShape(Circle())
    }

    private func avatarPlaceholder(for user: FollowedUser) -> some View {
        Circle()
            .fill(Color(.tertiarySystemFill))
            .overlay {
                Text(String((user.name ?? "?").prefix(1)).uppercased())
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
    }
}
