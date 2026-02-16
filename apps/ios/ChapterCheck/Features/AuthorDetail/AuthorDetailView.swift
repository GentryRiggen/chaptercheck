import SwiftUI

/// Author detail screen showing author info, their books, and series.
struct AuthorDetailView: View {
    let authorId: String

    @State private var viewModel = AuthorDetailViewModel()

    var body: some View {
        Group {
            if viewModel.isLoading {
                LoadingView()
            } else if let error = viewModel.error, viewModel.author == nil {
                ErrorView(message: error) {
                    viewModel.unsubscribe()
                    viewModel.subscribe(authorId: authorId)
                }
            } else if let author = viewModel.author {
                authorContent(author)
            } else {
                EmptyStateView(
                    icon: "person",
                    title: "Author Not Found",
                    subtitle: "This author may have been removed."
                )
            }
        }
        .navigationTitle(viewModel.author?.name ?? "Author")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.subscribe(authorId: authorId)
        }
        .onDisappear {
            viewModel.unsubscribe()
        }
    }

    // MARK: - Content

    @ViewBuilder
    private func authorContent(_ author: Author) -> some View {
        ScrollView {
            VStack(spacing: 24) {
                // Author image and name
                authorHeader(author)

                // Bio
                if let bio = author.bio, !bio.isEmpty {
                    bioSection(bio)
                }

                Divider()
                    .padding(.horizontal)

                // Books section
                if !viewModel.books.isEmpty {
                    booksSection
                }

                // Series section
                if !viewModel.series.isEmpty {
                    Divider()
                        .padding(.horizontal)
                    seriesSection
                }

                // Bottom spacing for mini player
                Spacer()
                    .frame(height: 100)
            }
            .padding(.top)
        }
    }

    // MARK: - Header

    private func authorHeader(_ author: Author) -> some View {
        VStack(spacing: 12) {
            if author.imageR2Key != nil {
                AuthorImageView(r2Key: author.imageR2Key, size: 100)
            } else {
                Circle()
                    .fill(.fill.tertiary)
                    .frame(width: 100, height: 100)
                    .overlay {
                        Image(systemName: "person.fill")
                            .font(.system(size: 40))
                            .foregroundStyle(.secondary)
                    }
            }

            Text(author.name)
                .font(.title2)
                .fontWeight(.bold)

            Text("\(viewModel.books.count) \(viewModel.books.count == 1 ? "book" : "books")")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Bio

    private func bioSection(_ bio: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("About")
                .font(.headline)

            Text(bio)
                .font(.body)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal)
    }

    // MARK: - Books

    private var booksSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Books")
                .font(.headline)
                .padding(.horizontal)

            ForEach(viewModel.books) { book in
                NavigationLink(value: AppDestination.book(id: book._id)) {
                    authorBookRow(book)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func authorBookRow(_ book: AuthorBook) -> some View {
        HStack(spacing: 12) {
            BookCoverView(r2Key: book.coverImageR2Key, size: 50)

            VStack(alignment: .leading, spacing: 4) {
                Text(book.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(2)

                HStack(spacing: 8) {
                    if let role = book.role {
                        Text(role)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    if let duration = book.duration {
                        Text(TimeFormatting.formatDuration(duration))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal)
        .padding(.vertical, 4)
    }

    // MARK: - Series

    private var seriesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Series")
                .font(.headline)
                .padding(.horizontal)

            ForEach(viewModel.series) { series in
                NavigationLink(value: AppDestination.series(id: series._id)) {
                    seriesRow(series)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func seriesRow(_ series: AuthorSeries) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(.fill.tertiary)
                    .frame(width: 44, height: 44)

                Image(systemName: "books.vertical")
                    .font(.body)
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(series.name)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text("\(series.bookCountByAuthorInt) \(series.bookCountByAuthorInt == 1 ? "book" : "books")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal)
        .padding(.vertical, 4)
    }
}

// MARK: - Author Image View

/// Async circular image view for author photos.
private struct AuthorImageView: View {
    let r2Key: String?
    var size: CGFloat = 100

    @State private var imageUrl: URL?

    var body: some View {
        Group {
            if let imageUrl {
                AsyncImage(url: imageUrl) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    default:
                        placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .task {
            guard let r2Key else { return }
            imageUrl = await ImageRepository.shared.getImageUrl(r2Key: r2Key)
        }
    }

    private var placeholder: some View {
        Circle()
            .fill(.fill.tertiary)
            .overlay {
                Image(systemName: "person.fill")
                    .font(.system(size: size * 0.4))
                    .foregroundStyle(.secondary)
            }
    }
}
