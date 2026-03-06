import SwiftUI

/// Full shelf detail screen.
///
/// Shows the shelf header, book list with swipe-to-remove, and drag-to-reorder
/// when the shelf is ordered and owned by the current user.
struct ShelfDetailView: View {
    let shelfId: String

    @State private var viewModel = ShelfDetailViewModel()
    @State private var isEditShelfPresented = false
    @State private var isAddBooksPresented = false
    @State private var isDeleteConfirmationPresented = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Group {
            if viewModel.isLoading {
                LoadingView()
            } else if let error = viewModel.error, viewModel.shelf == nil {
                ErrorView(message: error) {
                    viewModel.unsubscribe()
                    viewModel.subscribe(shelfId: shelfId)
                }
            } else if let shelf = viewModel.shelf {
                shelfContent(shelf)
            } else {
                EmptyStateView(
                    icon: "books.vertical",
                    title: "Shelf Not Found",
                    subtitle: "This shelf may have been removed."
                )
            }
        }
        .navigationTitle(viewModel.shelf?.name ?? "Shelf")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if let shelf = viewModel.shelf, shelf.isOwner {
                ToolbarItem(placement: .topBarTrailing) {
                    ownerMenu(shelf)
                }
                if shelf.isOrdered {
                    ToolbarItem(placement: .topBarLeading) {
                        EditButton()
                    }
                }
            }
        }
        .sheet(isPresented: $isEditShelfPresented) {
            if let shelf = viewModel.shelf {
                ShelfFormSheet(existingShelf: shelf)
            }
        }
        .sheet(isPresented: $isAddBooksPresented) {
            if let shelf = viewModel.shelf {
                AddBooksToShelfSheet(
                    shelfId: shelf._id,
                    existingBookIds: Set(shelf.books.map { $0._id })
                )
            }
        }
        .confirmationDialog(
            "Delete Shelf",
            isPresented: $isDeleteConfirmationPresented,
            titleVisibility: .visible
        ) {
            Button("Delete Shelf", role: .destructive) {
                Task {
                    await viewModel.deleteShelf()
                    dismiss()
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will permanently delete the shelf and cannot be undone.")
        }
        .onAppear {
            viewModel.subscribe(shelfId: shelfId)
        }
        .onDisappear {
            viewModel.unsubscribe()
        }
    }

    // MARK: - Shelf Content

    @ViewBuilder
    private func shelfContent(_ shelf: ShelfDetail) -> some View {
        List {
            // Header section
            Section {
                shelfHeader(shelf)
            }
            .listRowInsets(EdgeInsets())
            .listRowBackground(Color.clear)

            // Books section
            if shelf.books.isEmpty {
                Section {
                    VStack(spacing: 12) {
                        EmptyStateView(
                            icon: "text.book.closed",
                            title: "No Books Yet",
                            subtitle: "Search and add books to this bookshelf."
                        )

                        if shelf.isOwner {
                            Button {
                                isAddBooksPresented = true
                            } label: {
                                HStack(spacing: 6) {
                                    Image(systemName: "plus")
                                    Text("Add Books")
                                }
                                .font(.subheadline)
                                .fontWeight(.medium)
                            }
                            .buttonStyle(.borderedProminent)
                        }
                    }
                    .listRowBackground(Color.clear)
                }
            } else {
                Section {
                    bookForEach(shelf)
                } header: {
                    Text("Books")
                }
            }

            Color.clear
                .frame(height: 80)
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
        }
    }

    // MARK: - Book ForEach

    @ViewBuilder
    private func bookForEach(_ shelf: ShelfDetail) -> some View {
        if shelf.isOwner && shelf.isOrdered {
            ForEach(shelf.books) { book in
                bookRow(book, isOwner: shelf.isOwner)
            }
            .onMove { source, destination in
                viewModel.reorderBooks(from: source, to: destination)
            }
        } else {
            ForEach(shelf.books) { book in
                bookRow(book, isOwner: shelf.isOwner)
            }
        }
    }

    @ViewBuilder
    private func bookRow(_ book: ShelfBook, isOwner: Bool) -> some View {
        NavigationLink(value: AppDestination.book(id: book._id)) {
            ShelfBookRow(book: book)
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            if isOwner {
                Button(role: .destructive) {
                    Task {
                        await viewModel.removeBook(bookId: book._id)
                    }
                } label: {
                    Label("Remove", systemImage: "minus.circle")
                }
            }
        }
    }

    // MARK: - Shelf Header

    private func shelfHeader(_ shelf: ShelfDetail) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(shelf.name)
                    .font(.title2)
                    .fontWeight(.bold)

                Spacer()

                if !shelf.isPublic {
                    Image(systemName: "lock.fill")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            if let description = shelf.description, !description.isEmpty {
                Text(description)
                    .font(.body)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 12) {
                if let owner = shelf.owner, !shelf.isOwner {
                    Label(owner.displayName, systemImage: "person.circle")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Label(
                    "\(shelf.books.count) \(shelf.books.count == 1 ? "book" : "books")",
                    systemImage: "book.closed"
                )
                .font(.caption)
                .foregroundStyle(.secondary)

                if shelf.isOrdered {
                    Label("Ordered", systemImage: "list.number")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Owner Menu

    private func ownerMenu(_ shelf: ShelfDetail) -> some View {
        Menu {
            Button {
                isAddBooksPresented = true
            } label: {
                Label("Add Books", systemImage: "plus")
            }

            Button {
                isEditShelfPresented = true
            } label: {
                Label("Edit Shelf", systemImage: "pencil")
            }

            Button(role: .destructive) {
                isDeleteConfirmationPresented = true
            } label: {
                Label("Delete Shelf", systemImage: "trash")
            }
        } label: {
            Image(systemName: "ellipsis.circle")
        }
    }
}

// MARK: - Shelf Book Row

/// A single book row within the shelf detail list.
private struct ShelfBookRow: View {
    let book: ShelfBook

    var body: some View {
        HStack(spacing: 12) {
            BookCoverView(r2Key: book.coverImageR2Key, size: 50)

            VStack(alignment: .leading, spacing: 2) {
                Text(book.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(2)

                if let authorName = primaryAuthorName {
                    Text(authorName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                if let series = book.series {
                    seriesLabel(series)
                }
            }

            Spacer(minLength: 0)
        }
        .padding(.vertical, 4)
    }

    private var primaryAuthorName: String? {
        let authors = book.authors.filter { $0.role?.lowercased() != "narrator" }
        return authors.first?.name ?? book.authors.first?.name
    }

    private func seriesLabel(_ series: SeriesSummary) -> some View {
        HStack(spacing: 2) {
            Text(series.name)
            if let order = book.seriesOrder {
                Text("#\(formatOrder(order))")
            }
        }
        .font(.caption2)
        .foregroundStyle(.tertiary)
        .lineLimit(1)
    }

    private func formatOrder(_ order: Double) -> String {
        order.truncatingRemainder(dividingBy: 1) == 0
            ? String(Int(order))
            : String(order)
    }
}
