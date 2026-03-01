import SwiftUI

/// Full-screen review sheet for rating a book, writing a review, and voting on genres.
///
/// Presented as a large sheet. Uses `@State` for all form fields — no separate ViewModel
/// is needed because this is a self-contained form with no real-time subscriptions.
///
/// Call `onSave` after the user confirms. The caller is responsible for triggering
/// the Convex mutations (via the ViewModel) and dismissing the sheet on success.
struct BookReviewSheet: View {
    let bookId: String
    let existingUserData: BookUserData?
    let allGenres: [Genre]
    let existingGenreVoteIds: [String]
    let onSave: (ReviewFormData) -> Void
    let onCancel: () -> Void

    // MARK: - Form State

    @State private var rating: Int?
    @State private var reviewText: String = ""
    @State private var isReadPrivate: Bool = false
    @State private var isReviewPrivate: Bool = false
    @State private var selectedGenreIds: Set<String> = []

    @State private var isSaving = false

    private static let maxReviewLength = 2000

    private var remainingChars: Int {
        Self.maxReviewLength - reviewText.count
    }

    private var remainingColor: Color {
        if remainingChars < 100 { return .orange }
        if remainingChars < 0 { return .red }
        return .secondary
    }

    var body: some View {
        NavigationStack {
            Form {
                ratingSection
                reviewTextSection
                privacySection
                if !allGenres.isEmpty {
                    genreSection
                }
            }
            .navigationTitle("Your Review")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        onCancel()
                    }
                    .disabled(isSaving)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        save()
                    }
                    .fontWeight(.semibold)
                    .disabled(isSaving || reviewText.count > Self.maxReviewLength)
                }
            }
        }
        .presentationDetents([.large])
        .onAppear {
            populateFromExisting()
        }
        // Sync isReviewPrivate when isReadPrivate becomes true
        .onChange(of: isReadPrivate) { _, newValue in
            if newValue {
                isReviewPrivate = true
            }
        }
    }

    // MARK: - Sections

    private var ratingSection: some View {
        Section {
            HStack {
                Spacer()
                StarRatingInput(rating: $rating)
                    .padding(.vertical, 4)
                Spacer()
            }
        } header: {
            Text("Rating")
        } footer: {
            Text("Tap a star to rate. Tap the same star again to clear.")
                .font(.caption)
        }
    }

    private var reviewTextSection: some View {
        Section {
            TextEditor(text: $reviewText)
                .frame(minHeight: 120)
                .onChange(of: reviewText) { _, newValue in
                    // Clamp at max length to prevent excessive input
                    if newValue.count > Self.maxReviewLength {
                        reviewText = String(newValue.prefix(Self.maxReviewLength))
                    }
                }

            HStack {
                Spacer()
                Text("\(remainingChars) characters remaining")
                    .font(.caption)
                    .foregroundStyle(remainingColor)
            }
        } header: {
            Text("Review")
        }
    }

    private var privacySection: some View {
        Section {
            Toggle("Hide read status", isOn: $isReadPrivate)
            Toggle("Keep review private", isOn: $isReviewPrivate)
                .disabled(isReadPrivate)
        } header: {
            Text("Privacy")
        } footer: {
            Text(isReadPrivate
                 ? "When your read status is hidden, your review is automatically kept private."
                 : "Private reviews are only visible to you.")
        }
    }

    private var genreSection: some View {
        Section {
            ForEach(allGenres) { genre in
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
        } header: {
            Text("Genres")
        } footer: {
            Text("Vote for genres that best describe this book.")
        }
    }

    // MARK: - Actions

    private func toggleGenre(_ genreId: String) {
        Haptics.light()
        if selectedGenreIds.contains(genreId) {
            selectedGenreIds.remove(genreId)
        } else {
            selectedGenreIds.insert(genreId)
        }
    }

    private func save() {
        Haptics.medium()
        isSaving = true
        let formData = ReviewFormData(
            rating: rating,
            reviewText: reviewText.trimmingCharacters(in: .whitespacesAndNewlines),
            isReadPrivate: isReadPrivate,
            isReviewPrivate: isReviewPrivate,
            genreIds: Array(selectedGenreIds)
        )
        onSave(formData)
    }

    // MARK: - Setup

    private func populateFromExisting() {
        rating = existingUserData?.ratingInt
        reviewText = existingUserData?.reviewText ?? ""
        isReadPrivate = existingUserData?.isReadPrivate ?? false
        isReviewPrivate = existingUserData?.isReviewPrivate ?? false
        selectedGenreIds = Set(existingGenreVoteIds)
    }
}

// MARK: - Form Data

/// Value type carrying all user input from `BookReviewSheet` after the user taps Save.
struct ReviewFormData: Sendable {
    let rating: Int?
    let reviewText: String
    let isReadPrivate: Bool
    let isReviewPrivate: Bool
    let genreIds: [String]
}
