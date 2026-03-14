import Combine
import ConvexMobile
import Foundation

/// View model for confirming and creating a book from an OpenLibrary suggestion.
@Observable
@MainActor
final class AddBookConfirmViewModel {

    let suggestion: OpenLibraryBookSuggestion

    var title: String
    var subtitle: String
    var description: String
    var isbn: String
    var publishedYear: String
    var language: String
    var selectedStatus: ReadingStatus = .wantToRead

    var isSaving = false
    var error: String?
    var existingMatch: BookWithDetails?
    var isCheckingDuplicate = true

    private let openLibraryRepository = OpenLibraryRepository()
    private let bookMutationRepository = BookMutationRepository()
    private let bookUserDataRepository = BookUserDataRepository()
    private let bookRepository = BookRepository()
    private var duplicateCheckCancellable: AnyCancellable?

    init(suggestion: OpenLibraryBookSuggestion) {
        self.suggestion = suggestion
        self.title = suggestion.title
        self.subtitle = suggestion.subtitle ?? ""
        self.description = suggestion.description ?? ""
        self.isbn = suggestion.isbn ?? ""
        self.publishedYear = suggestion.publishedYearInt.map { String($0) } ?? ""
        self.language = suggestion.language ?? ""
    }

    /// Check if a book with the same title already exists in the library.
    func checkForDuplicate() {
        duplicateCheckCancellable?.cancel()
        duplicateCheckCancellable = nil

        guard let publisher = bookRepository.subscribeToBookSearch(query: title) else {
            isCheckingDuplicate = false
            return
        }

        duplicateCheckCancellable = publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] _ in
                    self?.isCheckingDuplicate = false
                },
                receiveValue: { [weak self] books in
                    guard let self else { return }
                    // Look for an exact or near-exact title match
                    let normalizedTitle = title.lowercased().trimmingCharacters(in: .whitespaces)
                    existingMatch = books.first { book in
                        book.title.lowercased().trimmingCharacters(in: .whitespaces) == normalizedTitle
                    }
                    isCheckingDuplicate = false
                    duplicateCheckCancellable?.cancel()
                    duplicateCheckCancellable = nil
                }
            )
    }

    /// Create the book, upload cover, set reading status, and return the new book ID.
    func createBook() async -> String? {
        guard !isSaving else { return nil }
        isSaving = true
        error = nil

        do {
            // Upload cover if available
            var coverR2Key: String?
            if let coverUrl = suggestion.coverUrl {
                let sanitizedTitle = title
                    .replacingOccurrences(of: " ", with: "-")
                    .prefix(50)
                coverR2Key = try await openLibraryRepository.uploadImageFromUrl(
                    imageUrl: coverUrl,
                    pathPrefix: "books",
                    fileName: "\(sanitizedTitle).jpg"
                )
            }

            // Create the book
            let yearInt = Int(publishedYear)
            let bookId = try await bookMutationRepository.createBook(
                title: title,
                subtitle: subtitle.isEmpty ? nil : subtitle,
                description: description.isEmpty ? nil : description,
                isbn: isbn.isEmpty ? nil : isbn,
                publishedYear: yearInt,
                coverImageR2Key: coverR2Key,
                language: language.isEmpty ? nil : language
            )

            // Set reading status
            try await bookUserDataRepository.setReadingStatus(
                bookId: bookId,
                status: selectedStatus
            )

            isSaving = false
            return bookId
        } catch {
            self.error = "Failed to create book. Please try again."
            isSaving = false
            return nil
        }
    }
}
