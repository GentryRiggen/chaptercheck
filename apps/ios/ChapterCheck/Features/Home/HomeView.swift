import ClerkKit
import Combine
import ConvexMobile
import SwiftUI

/// The main home screen — a listening-first feed with discovery sections.
///
/// Displays a hero card for the most recently listened audiobook, followed by
/// additional continue listening items, discovery sections, and quick links to
/// browse the full library and authors.
struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    @State private var isAddBookPresented = false
    @State private var currentUser: UserWithPermissions?
    @State private var userCancellable: AnyCancellable?
    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(DownloadManager.self) private var downloadManager
    private let networkMonitor = NetworkMonitor.shared
    private let userRepository = UserRepository()

    var body: some View {
        Group {
            if viewModel.isLoading {
                HomeSkeletonView()
                    .overlay(alignment: .bottom) {
                        if viewModel.showRetry {
                            Button {
                                viewModel.retry()
                            } label: {
                                Label("Retry", systemImage: "arrow.clockwise")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                            }
                            .buttonStyle(.bordered)
                            .padding(.bottom, 120)
                            .transition(.opacity.combined(with: .move(edge: .bottom)))
                            .accessibilityLabel("Retry loading library")
                        }
                    }
                    .animation(.easeInOut, value: viewModel.showRetry)
            } else if let error = viewModel.error {
                ErrorView(message: error) {
                    viewModel.retry()
                }
            } else {
                scrollContent
            }
        }
        .navigationTitle("Chapter Check")
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                if currentUser?.permissions.canCreateContent == true {
                    Button {
                        isAddBookPresented = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Add book")
                }

                NavigationLink(value: AppDestination.search) {
                    Image(systemName: "magnifyingglass")
                }
                .disabled(viewModel.isOffline)
                .opacity(viewModel.isOffline ? 0.4 : 1)
            }
        }
        .sheet(isPresented: $isAddBookPresented) {
            AddBookView { _ in
                isAddBookPresented = false
            }
        }
        .onAppear {
            viewModel.downloadManager = downloadManager
            viewModel.audioPlayerManager = audioPlayer
            viewModel.subscribe()
            subscribeToUser()
        }
        .onDisappear {
            viewModel.unsubscribe()
            userCancellable?.cancel()
            userCancellable = nil
        }
        .onChange(of: networkMonitor.isConnected) { _, isConnected in
            if isConnected {
                // Back online — if we were showing offline data (launched offline),
                // transition to live subscriptions. Otherwise, existing Convex
                // subscriptions auto-reconnect on their own.
                viewModel.recoverFromOffline()
            }
            // Going offline mid-session: do nothing — stale Convex data stays
            // visible, offline banner appears via viewModel.isOffline, and
            // Convex subscriptions will auto-reconnect when network restores.
        }
    }

    private func subscribeToUser() {
        guard userCancellable == nil,
              let publisher = userRepository.subscribeToCurrentUser() else { return }
        userCancellable = publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { user in currentUser = user }
            )
    }

    // MARK: - Content

    private var scrollContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                if viewModel.isOffline {
                    OfflineBanner()
                        .padding(.horizontal)
                }

                // Continue Listening (hero card + horizontal scroll)
                if !viewModel.recentlyListening.isEmpty {
                    ContinueListeningSection(items: viewModel.recentlyListening)
                } else {
                    welcomeSection
                }

                // My Shelves
                if !viewModel.myShelves.isEmpty {
                    ShelfRowSection(shelves: viewModel.myShelves)
                }

                if !viewModel.topRatedBooks.isEmpty {
                    BookRowSection(
                        title: "Top Rated",
                        books: viewModel.topRatedBooks,
                        seeAllDestination: .browseLibrary(initialSort: .topRated)
                    )
                }

                // Browse quick links
                browseSection

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

            Text("Welcome to Chapter Check")
                .font(.title3)
                .fontWeight(.semibold)

            Text("Start listening to an audiobook to see your progress here.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            NavigationLink(value: AppDestination.browseLibrary()) {
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

            NavigationLink(value: AppDestination.browseLibrary()) {
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
            .disabled(viewModel.isOffline)
            .opacity(viewModel.isOffline ? 0.4 : 1)

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
            .disabled(viewModel.isOffline)
            .opacity(viewModel.isOffline ? 0.4 : 1)

            Divider()
                .padding(.leading, 52)

            NavigationLink(value: AppDestination.browseShelves) {
                HStack {
                    Label("My Bookshelves", systemImage: "tray.full")
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
            .disabled(viewModel.isOffline)
            .opacity(viewModel.isOffline ? 0.4 : 1)
        }
    }
}

#Preview {
    NavigationStack {
        HomeView()
    }
}
