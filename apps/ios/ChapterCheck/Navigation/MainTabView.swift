import ClerkKit
import SwiftUI

/// Primary tab-based navigation after authentication.
///
/// Owns the `AudioPlayerManager` as `@State` and injects it into the
/// environment so all child views can access playback state. A persistent
/// `MiniPlayerView` overlay is shown above the tab bar when audio is loaded.
struct MainTabView: View {
    @State private var selectedTab: Tab = .home
    @State private var audioPlayer = AudioPlayerManager()
    @State private var isNowPlayingPresented = false

    var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $selectedTab) {
                homeTab
                libraryTab
                settingsTab
            }

            // Mini player overlay above the tab bar
            if audioPlayer.hasContent {
                VStack(spacing: 0) {
                    MiniPlayerView(isNowPlayingPresented: $isNowPlayingPresented)
                        .padding(.horizontal, 8)
                        .padding(.bottom, 2)
                }
                // Position above the tab bar (approximately 49pt)
                .padding(.bottom, 49)
            }
        }
        .environment(audioPlayer)
        .sheet(isPresented: $isNowPlayingPresented) {
            NowPlayingView()
                .environment(audioPlayer)
        }
    }

    // MARK: - Tabs

    private var homeTab: some View {
        NavigationStack {
            HomeView()
                .navigationDestination(for: AppDestination.self) { destination in
                    destinationView(for: destination)
                }
        }
        .tabItem {
            Label("Home", systemImage: "house")
        }
        .tag(Tab.home)
    }

    private var libraryTab: some View {
        NavigationStack {
            LibraryView()
                .navigationDestination(for: AppDestination.self) { destination in
                    destinationView(for: destination)
                }
        }
        .tabItem {
            Label("Library", systemImage: "books.vertical")
        }
        .tag(Tab.library)
    }

    private var settingsTab: some View {
        NavigationStack {
            SettingsView()
        }
        .tabItem {
            Label("Settings", systemImage: "gearshape")
        }
        .tag(Tab.settings)
    }

    // MARK: - Navigation Destination

    @ViewBuilder
    private func destinationView(for destination: AppDestination) -> some View {
        switch destination {
        case .book(let id):
            BookDetailView(bookId: id)
        case .author(let id):
            AuthorDetailView(authorId: id)
        case .series(let id):
            SeriesDetailView(seriesId: id)
        }
    }
}

// MARK: - Tab Enum

extension MainTabView {
    enum Tab: Hashable {
        case home
        case library
        case settings
    }
}

// MARK: - Settings View

/// Simple settings screen with account info and sign out.
private struct SettingsView: View {
    @ObservedObject private var convexService = ConvexService.shared

    var body: some View {
        List {
            Section {
                if let user = Clerk.shared.user {
                    LabeledContent(
                        "Email",
                        value: user.emailAddresses.first?.emailAddress ?? "Unknown"
                    )
                    let fullName = [user.firstName, user.lastName]
                        .compactMap { $0 }
                        .joined(separator: " ")
                    if !fullName.isEmpty {
                        LabeledContent("Name", value: fullName)
                    }
                }
            } header: {
                Text("Account")
            }

            Section {
                Button("Sign Out", role: .destructive) {
                    Task {
                        await convexService.logout()
                    }
                }
            }
        }
        .navigationTitle("Settings")
    }
}

#Preview {
    MainTabView()
}
