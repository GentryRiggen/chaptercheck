import ClerkKit
import SwiftUI

/// The main home screen — a listening-first feed with discovery sections.
///
/// Displays a hero card for the most recently listened audiobook, followed by
/// additional continue listening items, discovery sections (top rated, recently added),
/// and quick links to browse the full library and authors.
struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    @Environment(\.showSettings) private var showSettings

    var body: some View {
        Group {
            if viewModel.isLoading {
                LoadingView(message: "Loading your library...")
            } else if let error = viewModel.error {
                ErrorView(message: error) {
                    viewModel.unsubscribe()
                    viewModel.subscribe()
                }
            } else {
                scrollContent
            }
        }
        .navigationTitle("ChapterCheck")
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                NavigationLink(value: AppDestination.search) {
                    Image(systemName: "magnifyingglass")
                }

                Button {
                    showSettings()
                } label: {
                    avatarImage
                }
                .accessibilityLabel("Settings")
            }
        }
        .onAppear {
            viewModel.subscribe()
        }
        .onDisappear {
            viewModel.unsubscribe()
        }
    }

    // MARK: - Avatar

    @ViewBuilder
    private var avatarImage: some View {
        if let user = Clerk.shared.user,
           let url = URL(string: user.imageUrl) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 28, height: 28)
                        .clipShape(Circle())
                default:
                    avatarPlaceholder
                }
            }
        } else {
            avatarPlaceholder
        }
    }

    private var avatarPlaceholder: some View {
        Image(systemName: "person.crop.circle")
            .font(.title3)
    }

    // MARK: - Content

    private var scrollContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Continue Listening (hero card + horizontal scroll)
                if !viewModel.recentlyListening.isEmpty {
                    ContinueListeningSection(items: viewModel.recentlyListening)
                } else {
                    welcomeSection
                }

                if !viewModel.topRatedBooks.isEmpty {
                    BookRowSection(
                        title: "Top Rated",
                        books: viewModel.topRatedBooks,
                        seeAllDestination: .browseLibrary
                    )
                }

                if !viewModel.recentBooks.isEmpty {
                    BookRowSection(
                        title: "Recently Added",
                        books: viewModel.recentBooks,
                        seeAllDestination: .browseLibrary
                    )
                }

                // Browse quick links
                browseSection

                // Bottom spacing for mini player
                Spacer()
                    .frame(height: 80)
            }
            .padding(.top)
        }
    }

    // MARK: - Welcome (empty listening state)

    private var welcomeSection: some View {
        VStack(spacing: 12) {
            Image(systemName: "headphones")
                .font(.system(size: 40))
                .foregroundStyle(.secondary)

            Text("Welcome to ChapterCheck")
                .font(.title3)
                .fontWeight(.semibold)

            Text("Start listening to an audiobook to see your progress here.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            NavigationLink(value: AppDestination.browseLibrary) {
                Text("Browse Library")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(.tint)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
            }
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .padding(.horizontal)
    }

    // MARK: - Browse Quick Links

    private var browseSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Browse")
                .font(.title3)
                .fontWeight(.semibold)
                .padding(.horizontal)
                .padding(.bottom, 8)

            NavigationLink(value: AppDestination.browseLibrary) {
                HStack {
                    Label("All Books", systemImage: "books.vertical")
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .padding(.horizontal)
                .padding(.vertical, 12)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            Divider()
                .padding(.leading, 52)

            NavigationLink(value: AppDestination.browseAuthors) {
                HStack {
                    Label("All Authors", systemImage: "person.2")
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .padding(.horizontal)
                .padding(.vertical, 12)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
    }
}

#Preview {
    NavigationStack {
        HomeView()
    }
}
