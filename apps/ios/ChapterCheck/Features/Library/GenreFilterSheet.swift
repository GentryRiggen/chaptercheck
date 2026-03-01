import Combine
import SwiftUI

/// A sheet for selecting genres to filter the library.
///
/// Displays all available genres in a searchable list with checkmark accessories.
/// Selection is reflected immediately via a `@Binding`, so the parent view model
/// can react to changes as the user taps items — no explicit "apply" action is needed.
struct GenreFilterSheet: View {
    @Binding var selectedGenreIds: Set<String>

    @State private var allGenres: [Genre] = []
    @State private var isLoading = true
    @State private var error: String?
    @State private var searchText = ""
    @State private var cancellables = Set<AnyCancellable>()
    @Environment(\.dismiss) private var dismiss

    private let genreRepository = GenreRepository()

    private var filteredGenres: [Genre] {
        if searchText.isEmpty { return allGenres }
        return allGenres.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    LoadingView()
                } else if let error {
                    ErrorView(message: error) {
                        subscribeToGenres()
                    }
                } else if allGenres.isEmpty {
                    EmptyStateView(
                        icon: "tag",
                        title: "No Genres",
                        subtitle: "No genres available."
                    )
                } else {
                    genreList
                }
            }
            .navigationTitle("Filter by Genre")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $searchText, prompt: "Search genres...")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if !selectedGenreIds.isEmpty {
                        Button("Clear All") {
                            selectedGenreIds.removeAll()
                        }
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .onAppear { subscribeToGenres() }
        .onDisappear { cancellables.removeAll() }
    }

    // MARK: - Genre List

    private var genreList: some View {
        List(filteredGenres) { genre in
            Button {
                toggleGenre(genre._id)
            } label: {
                HStack {
                    Text(genre.name)
                        .foregroundStyle(.primary)
                    Spacer()
                    if selectedGenreIds.contains(genre._id) {
                        Image(systemName: "checkmark")
                            .foregroundStyle(.tint)
                            .fontWeight(.semibold)
                    }
                }
            }
        }
    }

    // MARK: - Actions

    private func toggleGenre(_ id: String) {
        Haptics.light()
        if selectedGenreIds.contains(id) {
            selectedGenreIds.remove(id)
        } else {
            selectedGenreIds.insert(id)
        }
    }

    // MARK: - Subscription

    private func subscribeToGenres() {
        cancellables.removeAll()
        isLoading = true
        error = nil

        genreRepository.subscribeToAllGenres()?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let err) = completion {
                        error = err.localizedDescription
                        isLoading = false
                    }
                },
                receiveValue: { [self] genres in
                    allGenres = genres
                    isLoading = false
                }
            )
            .store(in: &cancellables)
    }
}
