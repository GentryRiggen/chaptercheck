import Combine
import ConvexMobile
import Foundation

/// View model for the author detail screen.
///
/// Subscribes to the author document, their books, and their series.
@Observable
@MainActor
final class AuthorDetailViewModel {

    // MARK: - Public State

    var author: Author?
    var books: [AuthorBook] = []
    var series: [AuthorSeries] = []

    var isLoading = true
    var error: String?

    // MARK: - Dependencies

    private let authorRepository = AuthorRepository()
    private var cancellables = Set<AnyCancellable>()
    private var loadedSections: Set<String> = []

    // MARK: - Lifecycle

    func subscribe(authorId: String) {
        guard cancellables.isEmpty else { return }
        subscribeToAuthor(authorId: authorId)
        subscribeToBooks(authorId: authorId)
        subscribeToSeries(authorId: authorId)
    }

    func unsubscribe() {
        cancellables.removeAll()
    }

    // MARK: - Private

    private func subscribeToAuthor(authorId: String) {
        authorRepository.subscribeToAuthor(id: authorId)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.error = error.localizedDescription
                    }
                },
                receiveValue: { [weak self] author in
                    self?.author = author
                    self?.markLoaded("author")
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToBooks(authorId: String) {
        authorRepository.subscribeToAuthorBooks(authorId: authorId)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.error = error.localizedDescription
                    }
                },
                receiveValue: { [weak self] books in
                    self?.books = books
                    self?.markLoaded("books")
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToSeries(authorId: String) {
        authorRepository.subscribeToAuthorSeries(authorId: authorId)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] series in
                    self?.series = series
                }
            )
            .store(in: &cancellables)
    }

    private func markLoaded(_ section: String) {
        loadedSections.insert(section)
        if loadedSections.count >= 2 {
            isLoading = false
        }
    }
}
