import SwiftUI

/// The main home screen shown in the Home tab.
///
/// Displays a greeting header with library stats, followed by three sections:
/// Continue Listening, Recently Added, and Top Rated.
struct HomeView: View {
    @State private var viewModel = HomeViewModel()

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
        .navigationTitle("Home")
        .onAppear {
            viewModel.subscribe()
        }
        .onDisappear {
            viewModel.unsubscribe()
        }
    }

    // MARK: - Content

    private var scrollContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                headerSection
                    .padding(.horizontal)

                if !viewModel.recentlyListening.isEmpty {
                    ContinueListeningSection(items: viewModel.recentlyListening)
                }

                if !viewModel.recentBooks.isEmpty {
                    BookRowSection(title: "Recently Added", books: viewModel.recentBooks)
                }

                if !viewModel.topRatedBooks.isEmpty {
                    BookRowSection(title: "Top Rated", books: viewModel.topRatedBooks)
                }

                // Bottom spacing for mini player
                Spacer()
                    .frame(height: 80)
            }
            .padding(.top)
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(greetingText)
                .font(.title2)
                .fontWeight(.bold)

            if let stats = viewModel.stats {
                Text(statsText(stats))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var greetingText: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12:
            return "Good Morning"
        case 12..<17:
            return "Good Afternoon"
        default:
            return "Good Evening"
        }
    }

    private func statsText(_ stats: HomeStats) -> String {
        var parts: [String] = []
        parts.append("\(stats.totalBooksInt) books")

        if stats.totalListeningSeconds > 0 {
            parts.append("\(stats.formattedListeningTime) listened")
        }

        return parts.joined(separator: " \u{2022} ")
    }
}

#Preview {
    NavigationStack {
        HomeView()
    }
}
