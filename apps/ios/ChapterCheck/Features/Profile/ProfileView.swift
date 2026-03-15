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
        HStack(spacing: 14) {
            // Avatar
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
                .frame(width: 56, height: 56)
                .clipShape(Circle())
            } else {
                avatarPlaceholder
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(profile.displayName)
                    .font(.title3)
                    .fontWeight(.semibold)

                if profile.isProfilePrivate {
                    Label("Private", systemImage: "lock")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if let stats = profile.stats {
                    Text(memberSinceAndBooks(profile: profile, stats: stats))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            if !profile.isOwnProfile {
                FollowButton(userId: userId)
            }
        }
        .padding(.vertical, 4)
    }

    private func memberSinceAndBooks(profile: UserProfile, stats: UserProfileStats) -> String {
        let year = Calendar.current.component(.year, from: Date(timeIntervalSince1970: profile.createdAt / 1000))
        let currentYear = Calendar.current.component(.year, from: Date())
        let yearStr = year == currentYear ? "this year" : "since \(year)"
        return "Joined \(yearStr) · \(stats.booksReadInt) books read"
    }

    private func statsSection(_ stats: UserProfileStats) -> some View {
        Section {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    statPill(
                        value: stats.booksReadInt,
                        label: "Books",
                        icon: "book.closed.fill",
                        action: { pushDestination(.allReadingHistory(userId: userId)) }
                    )
                    statPill(
                        value: stats.reviewsWrittenInt,
                        label: "Reviews",
                        icon: "star.fill",
                        action: { pushDestination(.allUserReviews(userId: userId)) }
                    )
                    statPill(
                        value: stats.shelvesCountInt,
                        label: "Shelves",
                        icon: "books.vertical.fill",
                        action: nil
                    )
                    statPill(
                        value: viewModel.followersCount,
                        label: "Followers",
                        icon: "person.2.fill",
                        action: { pushDestination(.followers(userId: userId)) }
                    )
                    statPill(
                        value: viewModel.followingCount,
                        label: "Following",
                        icon: "heart.fill",
                        action: { pushDestination(.following(userId: userId)) }
                    )
                }
                .padding(.horizontal, 16)
            }
            .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
        }
    }

    private func statPill(value: Int, label: String, icon: String, action: (() -> Void)?) -> some View {
        let content = HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(action != nil ? Color.accentColor : .secondary)

            VStack(alignment: .leading, spacing: 1) {
                Text("\(value)")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(.primary)
                Text(label)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color(.tertiarySystemFill), in: RoundedRectangle(cornerRadius: 10))

        return Group {
            if let action {
                Button(action: action) { content }
                    .buttonStyle(.plain)
            } else {
                content
            }
        }
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
            .frame(width: 56, height: 56)
            .overlay {
                Image(systemName: "person.fill")
                    .font(.title3)
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
