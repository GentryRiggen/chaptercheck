import Combine
import ConvexMobile
import Foundation

/// View model for the series detail screen.
///
/// Subscribes to the series document and its books (with authors, sorted by order).
@Observable
@MainActor
final class SeriesDetailViewModel {

    // MARK: - Public State

    var series: Series?
    var books: [BookWithDetails] = []

    var isLoading = true
    var error: String?

    // MARK: - Dependencies

    private let seriesRepository = SeriesRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()
    private var currentSeriesId: String?
    private var loadedSections: Set<String> = []

    // MARK: - Lifecycle

    func subscribe(seriesId: String) {
        currentSeriesId = seriesId
        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty, let seriesId = currentSeriesId else { return }
                subscribeToSeries(seriesId: seriesId)
                subscribeToBooks(seriesId: seriesId)
            },
            onUnauthenticated: { [weak self] in
                self?.cancellables.removeAll()
                self?.loadedSections.removeAll()
            }
        )
    }

    func unsubscribe() {
        authObserver.cancel()
        cancellables.removeAll()
    }

    // MARK: - Private

    private func subscribeToSeries(seriesId: String) {
        seriesRepository.subscribeToSeries(id: seriesId)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.error = error.localizedDescription
                        self?.authObserver.needsResubscription()
                    }
                },
                receiveValue: { [weak self] series in
                    self?.series = series
                    self?.markLoaded("series")
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToBooks(seriesId: String) {
        seriesRepository.subscribeToBooksInSeries(seriesId: seriesId)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.error = error.localizedDescription
                        self?.authObserver.needsResubscription()
                    }
                },
                receiveValue: { [weak self] books in
                    self?.books = books
                    self?.markLoaded("books")
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
