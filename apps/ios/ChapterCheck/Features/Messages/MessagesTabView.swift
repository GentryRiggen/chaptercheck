import SwiftUI

/// Messages tab showing the user's conversation list with gating states.
///
/// States:
/// - Not admin-enabled → "Coming Soon" placeholder
/// - Admin-enabled but not opted in → opt-in CTA
/// - Opted in → conversation list
struct MessagesTabView: View {

    @State private var viewModel = MessagesTabViewModel()
    @Environment(CurrentUserProvider.self) private var currentUserProvider
    @Environment(\.pushDestination) private var pushDestination

    private var currentUser: UserWithPermissions? { currentUserProvider.currentUser }

    /// Whether the admin has enabled messaging for this user.
    private var isAdminEnabled: Bool {
        currentUser?.messagingEnabled ?? false
    }

    /// Whether the user has opted in to messaging.
    private var isOptedIn: Bool {
        currentUser?.allowDirectMessages ?? false
    }

    /// Whether the user can fully use messaging.
    private var isFullyEnabled: Bool {
        isAdminEnabled && isOptedIn
    }

    var body: some View {
        Group {
            if !isAdminEnabled {
                comingSoonView
            } else if !isOptedIn {
                optInView
            } else if viewModel.isLoading {
                ProgressView("Loading messages…")
            } else if let error = viewModel.error, viewModel.conversations.isEmpty {
                ContentUnavailableView(
                    "Something went wrong",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else if viewModel.conversations.isEmpty {
                emptyConversationsView
            } else {
                conversationList
            }
        }
        .navigationTitle("Messages")
        .toolbar {
            if isFullyEnabled {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        pushDestination(.composeMessage)
                    } label: {
                        Image(systemName: "square.and.pencil")
                    }
                    .accessibilityLabel("New Message")
                }
            }
        }
        .onAppear { viewModel.subscribe() }
        .onDisappear { viewModel.unsubscribe() }
    }

    // MARK: - Coming Soon

    private var comingSoonView: some View {
        ContentUnavailableView(
            "Messages Coming Soon",
            systemImage: "bubble.left.and.bubble.right",
            description: Text("Direct messaging will be available soon.")
        )
    }

    // MARK: - Opt-in CTA

    private var optInView: some View {
        VStack(spacing: 20) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("Direct Messages")
                .font(.title2.bold())

            Text("Send photos, videos, and messages directly to other readers.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Button {
                Task { await viewModel.optInToMessaging() }
            } label: {
                Text("Turn On Messages")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .padding(.horizontal, 40)
        }
    }

    // MARK: - Empty State

    private var emptyConversationsView: some View {
        ContentUnavailableView(
            "No Messages Yet",
            systemImage: "bubble.left.and.bubble.right",
            description: Text("Start a conversation by tapping the compose button above, or message someone from their profile.")
        )
    }

    // MARK: - Conversation List

    private var conversationList: some View {
        List {
            ForEach(viewModel.conversations) { conversation in
                NavigationLink(value: AppDestination.conversation(otherUserId: conversation.otherUser?._id ?? "")) {
                    conversationRow(conversation)
                }
            }
            .onDelete(perform: deleteConversations)

            // Bottom padding for mini player
            Color.clear.frame(height: 80)
                .listRowSeparator(.hidden)
                .listRowBackground(Color.clear)
        }
        .listStyle(.plain)
    }

    private func conversationRow(_ conversation: ConversationListItem) -> some View {
        HStack(spacing: 12) {
            // Avatar
            AsyncImage(url: avatarURL(conversation.otherUser?.imageUrl)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                default:
                    Image(systemName: "person.crop.circle.fill")
                        .resizable()
                        .foregroundStyle(.tertiary)
                }
            }
            .frame(width: 48, height: 48)
            .clipShape(Circle())

            // Name + preview
            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(conversation.otherUser?.displayName ?? "Unknown")
                        .font(.headline)
                        .lineLimit(1)

                    Spacer()

                    if let timestamp = conversation.lastMessageAt {
                        Text(formatTimestamp(timestamp))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                HStack {
                    Text(conversation.lastMessagePreview ?? "")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)

                    Spacer()

                    if conversation.unreadCount > 0 {
                        Text("\(conversation.unreadCount)")
                            .font(.caption2.bold())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.accentColor, in: Capsule())
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Helpers

    private func deleteConversations(at offsets: IndexSet) {
        for index in offsets {
            let conversation = viewModel.conversations[index]
            Task { await viewModel.deleteConversation(conversation) }
        }
    }

    private func avatarURL(_ urlString: String?) -> URL? {
        guard let urlString else { return nil }
        return URL(string: urlString)
    }

    private func formatTimestamp(_ timestamp: Double) -> String {
        let date = Date(timeIntervalSince1970: timestamp / 1000)
        let calendar = Calendar.current

        if calendar.isDateInToday(date) {
            let formatter = DateFormatter()
            formatter.dateFormat = "h:mm a"
            return formatter.string(from: date)
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else if calendar.dateComponents([.day], from: date, to: Date()).day ?? 0 < 7 {
            let formatter = DateFormatter()
            formatter.dateFormat = "EEEE"
            return formatter.string(from: date)
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "M/d/yy"
            return formatter.string(from: date)
        }
    }
}
