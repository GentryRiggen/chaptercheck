import SwiftUI

/// Displays a user's public profile including stats, shelves, and reading history.
///
/// When viewing the current user's own profile (`isOwnProfile == true`), all
/// sections are shown. For other users, private data is hidden server-side
/// and the view shows an appropriate empty state when the profile is private.
struct ProfileView: View {

    let userId: String

    @State private var viewModel = ProfileViewModel()
    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.pushDestination) private var pushDestination

    var body: some View {
        Group {
            if viewModel.isLoading {
                loadingView
            } else if let error = viewModel.error, viewModel.profile == nil {
                ErrorView(message: error) {
                    viewModel.unsubscribe()
                    viewModel.subscribe(userId: userId)
                }
            } else if let profile = viewModel.profile {
                profileContent(profile)
            } else {
                notFoundView
            }
        }
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { viewModel.subscribe(userId: userId) }
        .onDisappear { viewModel.unsubscribe() }
    }

    // MARK: - Content

    @ViewBuilder
    private func profileContent(_ profile: UserProfile) -> some View {
        List {
            // Header
            Section {
                profileHeader(profile)
            }

            // Private profile gate
            if profile.isProfilePrivate && !profile.isOwnProfile {
                Section {
                    ContentUnavailableView(
                        "Private Profile",
                        systemImage: "lock.circle",
                        description: Text("This user's reading activity is private.")
                    )
                    .padding(.vertical, 20)
                }
            } else {
                // Stats
                if let stats = profile.stats {
                    statsSection(stats)
                }

                // Shelves
                if !viewModel.shelves.isEmpty {
                    Section {
                        ScrollView(.horizontal, showsIndicators: false) {
                            LazyHStack(spacing: 14) {
                                ForEach(viewModel.shelves) { shelf in
                                    NavigationLink(value: AppDestination.shelf(id: shelf._id)) {
                                        profileShelfCard(shelf)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, 16)
                        }
                        .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 8, trailing: 0))
                    } header: {
                        Text("Shelves")
                    }
                }

                // Reviews (show up to 3)
                if !viewModel.reviews.isEmpty {
                    Section {
                        ForEach(viewModel.reviews.prefix(3)) { review in
                            if let book = review.book {
                                NavigationLink(value: AppDestination.book(id: book._id)) {
                                    profileReviewRow(review, book: book)
                                }
                            }
                        }

                        if viewModel.reviews.count > 3 {
                            NavigationLink(value: AppDestination.allUserReviews(userId: userId)) {
                                Text("Show All")
                                    .font(.subheadline)
                                    .foregroundStyle(Color.accentColor)
                            }
                        }
                    } header: {
                        Text("Reviews")
                    }
                }

                // Reading history (show up to 3)
                if !viewModel.readBooks.isEmpty {
                    Section {
                        ForEach(viewModel.readBooks.prefix(3)) { book in
                            LibraryBookCard(book: book)
                        }

                        if viewModel.readBooks.count > 3 {
                            NavigationLink(value: AppDestination.allReadingHistory(userId: userId)) {
                                Text("Show All")
                                    .font(.subheadline)
                                    .foregroundStyle(Color.accentColor)
                            }
                        }
                    } header: {
                        Text("Reading History")
                    }
                }

                // Empty state when there's no content
                if viewModel.readBooks.isEmpty && viewModel.shelves.isEmpty && viewModel.reviews.isEmpty && profile.stats == nil {
                    Section {
                        ContentUnavailableView(
                            "No Activity Yet",
                            systemImage: "books.vertical",
                            description: Text("This user hasn't added any books or shelves.")
                        )
                        .padding(.vertical, 20)
                    }
                }
            }

        }
        .refreshable { await viewModel.refresh() }
        .safeAreaInset(edge: .bottom) {
            Spacer().frame(height: 80)
        }
    }

    // MARK: - Sub-views

    private func profileHeader(_ profile: UserProfile) -> some View {
        VStack(spacing: 10) {
            if let imageUrl = profile.imageUrl, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    default:
                        avatarPlaceholder
                    }
                }
                .frame(width: 70, height: 70)
                .clipShape(Circle())
            } else {
                avatarPlaceholder
            }

            Text(profile.displayName)
                .font(.title3)
                .fontWeight(.semibold)

            if !profile.isOwnProfile {
                FollowButton(userId: userId)
            }

            if profile.isProfilePrivate {
                Label("Private Profile", systemImage: "lock")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }

    private func statsSection(_ stats: UserProfileStats) -> some View {
        Section {
            VStack(spacing: 0) {
                HStack(spacing: 0) {
                    Button {
                        pushDestination(.allReadingHistory(userId: userId))
                    } label: {
                        statCell(value: stats.booksReadInt, label: "Books Read", navigates: true)
                    }
                    .buttonStyle(.plain)
                    Divider()
                    Button {
                        pushDestination(.allUserReviews(userId: userId))
                    } label: {
                        statCell(value: stats.reviewsWrittenInt, label: "Reviews", navigates: true)
                    }
                    .buttonStyle(.plain)
                    Divider()
                    statCell(value: stats.shelvesCountInt, label: "Shelves")
                }
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)

                Divider()

                HStack(spacing: 0) {
                    Button {
                        pushDestination(.followers(userId: userId))
                    } label: {
                        statCell(value: viewModel.followersCount, label: "Followers", navigates: true)
                    }
                    .buttonStyle(.plain)
                    Divider()
                    Button {
                        pushDestination(.following(userId: userId))
                    } label: {
                        statCell(value: viewModel.followingCount, label: "Following", navigates: true)
                    }
                    .buttonStyle(.plain)
                }
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
            }
        }
    }

    private func statCell(value: Int, label: String, navigates: Bool = false) -> some View {
        VStack(spacing: 6) {
            Text("\(value)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(navigates ? Color.accentColor : .primary)
            HStack(spacing: 3) {
                Text(label)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if navigates {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func profileShelfCard(_ shelf: Shelf) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            StackedCoversView(previewBooks: shelf.previewBooks, size: 80)

            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(shelf.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    if !shelf.isPublic {
                        Image(systemName: "lock.fill")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .accessibilityLabel("Private shelf")
                    }
                }

                Text("\(shelf.bookCountInt) \(shelf.bookCountInt == 1 ? "book" : "books")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: 140)
    }

    private func profileReviewRow(_ review: UserReview, book: UserReviewBook) -> some View {
        HStack(alignment: .top, spacing: 10) {
            BookCoverView(r2Key: book.coverImageR2Key, size: 50)

            VStack(alignment: .leading, spacing: 4) {
                Text(book.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)

                if !book.authors.isEmpty {
                    Text(book.authors.map(\.name).joined(separator: ", "))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                HStack(spacing: 6) {
                    if let rating = review.rating {
                        RatingView(rating: rating, size: 10)
                    }

                    if review.isReviewPrivate {
                        Label("Private", systemImage: "eye.slash")
                            .font(.caption2)
                            .foregroundStyle(.orange)
                    }

                    if let reviewedAt = review.reviewedAt {
                        Text(TimeFormatting.formatRelativeDate(reviewedAt))
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }

                if let text = review.reviewText, !text.isEmpty {
                    Text(text)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                }
            }
        }
        .padding(.vertical, 2)
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(themeManager.accentGradient)
            .frame(width: 70, height: 70)
            .overlay {
                Image(systemName: "person.fill")
                    .font(.title2)
                    .foregroundStyle(.white)
            }
    }

    // MARK: - Loading / Error States

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
            Text("Loading profile...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var notFoundView: some View {
        ContentUnavailableView(
            "Profile Not Found",
            systemImage: "person.crop.circle.badge.questionmark",
            description: Text("This profile doesn't exist or is unavailable.")
        )
    }
}
