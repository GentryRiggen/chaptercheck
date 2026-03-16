import ClerkKit
import Combine
import ConvexMobile
import SwiftUI

/// The main home screen — a listening-first feed with discovery sections.
///
/// Displays a personalized greeting with listening stats, a hero card for the
/// most recently listened audiobook, discovery sections, and quick links to
/// browse the full library and authors.
struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    @State private var isAddBookPresented = false
    @State private var currentUser: UserWithPermissions?
    @State private var userCancellable: AnyCancellable?
    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(DownloadManager.self) private var downloadManager
    @Environment(ThemeManager.self) private var themeManager
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
                viewModel.recoverFromOffline()
            }
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
            VStack(alignment: .leading, spacing: 28) {
                if viewModel.isOffline {
                    OfflineBanner()
                        .padding(.horizontal)
                }

                // Greeting + Stats
                greetingSection

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

                Spacer()
                    .frame(height: 80)
            }
            .padding(.top, 4)
        }
        .refreshable { await viewModel.refresh() }
    }

    // MARK: - Greeting + Stats

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        let timeOfDay: String
        switch hour {
        case 5..<12: timeOfDay = "Good Morning"
        case 12..<17: timeOfDay = "Good Afternoon"
        case 17..<22: timeOfDay = "Good Evening"
        default: timeOfDay = "Good Night"
        }

        if let firstName = currentUser?.name?.components(separatedBy: " ").first,
           !firstName.isEmpty {
            return "\(timeOfDay), \(firstName)"
        }
        return timeOfDay
    }

    private var greetingSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(greeting)
                .font(.title2)
                .fontWeight(.bold)
                .padding(.horizontal)

            if let stats = viewModel.listeningStats,
               stats.totalListeningSeconds > 0 {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        StatCard(
                            icon: "headphones",
                            value: stats.formattedTotalTime,
                            label: "Listened"
                        )

                        StatCard(
                            icon: "book.fill",
                            value: "\(stats.booksInProgressInt)",
                            label: "In Progress"
                        )

                        if stats.booksFinishedInt > 0 {
                            StatCard(
                                icon: "checkmark.circle.fill",
                                value: "\(stats.booksFinishedInt)",
                                label: stats.booksFinishedInt == 1 ? "Finished" : "Finished"
                            )
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
    }

    // MARK: - Welcome (empty listening state)

    private var welcomeSection: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(themeManager.accentColor.opacity(0.12))
                    .frame(width: 80, height: 80)

                Image(systemName: "headphones")
                    .font(.system(size: 32, weight: .medium))
                    .foregroundStyle(themeManager.accentColor)
            }

            VStack(spacing: 6) {
                Text("Welcome to Chapter Check")
                    .font(.title3)
                    .fontWeight(.semibold)

                Text("Start listening to an audiobook to see your progress here.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            NavigationLink(value: AppDestination.browseLibrary()) {
                Text("Browse Library")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(themeManager.accentGradient)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
            }
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .padding(.horizontal)
    }
}

// MARK: - Stat Card

private struct StatCard: View {
    let icon: String
    let value: String
    let label: String
    @Environment(ThemeManager.self) private var themeManager

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(themeManager.accentColor)
                .frame(width: 36, height: 36)
                .background(themeManager.accentColor.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 1) {
                Text(value)
                    .font(.subheadline)
                    .fontWeight(.bold)

                Text(label)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(.fill.quaternary)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

#Preview {
    NavigationStack {
        HomeView()
    }
}
