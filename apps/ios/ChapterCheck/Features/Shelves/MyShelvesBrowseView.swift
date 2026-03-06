import Combine
import ConvexMobile
import SwiftUI

/// Full browse view for the current user's shelves.
///
/// Shows all shelves in a 2-column grid with a toolbar button to create new shelves.
struct MyShelvesBrowseView: View {
    @State private var viewModel = MyShelvesBrowseViewModel()
    @State private var isCreateShelfPresented = false
    @State private var createdShelfId: String?
    @State private var navigateToShelfId: String?

    var body: some View {
        Group {
            if viewModel.isLoading {
                LoadingView()
            } else if viewModel.shelves.isEmpty {
                emptyState
            } else {
                shelvesGrid
            }
        }
        .navigationTitle("My Bookshelves")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    isCreateShelfPresented = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $isCreateShelfPresented, onDismiss: {
            if let shelfId = createdShelfId {
                createdShelfId = nil
                navigateToShelfId = shelfId
            }
        }) {
            ShelfFormSheet(onCreated: { shelfId in
                createdShelfId = shelfId
            })
        }
        .navigationDestination(item: $navigateToShelfId) { shelfId in
            ShelfDetailView(shelfId: shelfId)
        }
        .onAppear {
            viewModel.subscribe()
        }
        .onDisappear {
            viewModel.unsubscribe()
        }
    }

    private var shelvesGrid: some View {
        ScrollView {
            Text("Organize your audiobooks into custom collections — track what you've read, plan what's next, or curate your favorites to share.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)
                .padding(.top, 4)
                .padding(.bottom, 4)

            LazyVGrid(
                columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)],
                spacing: 16
            ) {
                ForEach(viewModel.shelves) { shelf in
                    NavigationLink(value: AppDestination.shelf(id: shelf._id)) {
                        ShelfCard(shelf: shelf)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
            .padding(.top, 8)

            Spacer()
                .frame(height: 80)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "books.vertical")
                .font(.system(size: 40))
                .foregroundStyle(.secondary)

            Text("No Bookshelves Yet")
                .font(.title3)
                .fontWeight(.semibold)

            Text("Create a bookshelf to organize your audiobooks into custom collections.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button {
                isCreateShelfPresented = true
            } label: {
                Text("Create Bookshelf")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(.tint)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
            }
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .padding(.horizontal)
    }
}

// MARK: - ViewModel

@Observable
@MainActor
final class MyShelvesBrowseViewModel {
    var shelves: [Shelf] = []
    var isLoading = true

    private let repository = ShelfRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()

    func subscribe() {
        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty else { return }
                repository.subscribeToMyShelves()
                    .receive(on: DispatchQueue.main)
                    .sink(
                        receiveCompletion: { [weak self] completion in
                            if case .failure = completion {
                                self?.isLoading = false
                                self?.authObserver.needsResubscription()
                            }
                        },
                        receiveValue: { [weak self] shelves in
                            self?.shelves = shelves
                            self?.isLoading = false
                        }
                    )
                    .store(in: &cancellables)
            },
            onUnauthenticated: { [weak self] in
                self?.cancellables.removeAll()
            }
        )
    }

    func unsubscribe() {
        authObserver.cancel()
        cancellables.removeAll()
    }
}
