import SwiftUI

/// A sheet for selecting genres to filter the library.
///
/// Displays all available genres in a searchable list with checkmark accessories.
/// Selection is reflected immediately via a `@Binding`, so the parent view model
/// can react to changes as the user taps items — no explicit "apply" action is needed.
///
/// Genres are sourced from the shared `GenreProvider` via `@Environment`, avoiding
/// a duplicate WebSocket subscription.
struct GenreFilterSheet: View {
    @Binding var selectedGenreIds: Set<String>

    @State private var searchText = ""
    @Environment(\.dismiss) private var dismiss
    @Environment(GenreProvider.self) private var genreProvider

    private var filteredGenres: [Genre] {
        if searchText.isEmpty { return genreProvider.allGenres }
        return genreProvider.allGenres.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if genreProvider.allGenres.isEmpty {
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
    }

    // MARK: - Genre List

    private var genreList: some View {
        List(filteredGenres) { genre in
            Button {
                toggleGenre(genre._id)
            } label: {
                HStack {
                    Text(genre.name)
                    Spacer()
                    if selectedGenreIds.contains(genre._id) {
                        Image(systemName: "checkmark")
                            .foregroundStyle(.tint)
                            .fontWeight(.semibold)
                    }
                }
            }
            .buttonStyle(.plain)
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
}
