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

}

#Preview {
    NavigationStack {
        HomeView()
    }
}
