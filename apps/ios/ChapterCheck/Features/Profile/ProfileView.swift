import SwiftUI

/// Displays a user's public profile including stats, shelves, and reading history.
///
/// When viewing the current user's own profile (`isOwnProfile == true`), all
/// sections are shown. For other users, private data is hidden server-side
/// and the view shows an appropriate empty state when the profile is private.
struct ProfileView: View {

    let userId: String

    @State private var viewModel = ProfileViewModel()
    @State private var isReportSheetPresented = false
    @State private var isBlockConfirmationPresented = false
    @State private var isUnblockConfirmationPresented = false
    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.pushDestination) private var pushDestination
    @Environment(\.showToast) private var showToast

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
                if viewModel.isBlocked {
                    blockedProfileView(profile)
                } else if viewModel.isBlockedBy {
                    blockedByProfileView(profile)
                } else {
                    profileContent(profile)
                }
            } else {
                notFoundView
            }
        }
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if let profile = viewModel.profile, !profile.isOwnProfile {
                    otherUserMenu(profile: profile)
                }
            }
        }
        .sheet(isPresented: $isReportSheetPresented) {
            ReportUserSheet(
                userId: userId,
                userName: viewModel.profile?.displayName
            )
        }
        .alert(
            "Block \(viewModel.profile?.displayName ?? "this user")?",
            isPresented: $isBlockConfirmationPresented
        ) {
            Button("Block", role: .destructive) {
                Task { await performBlock() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("They won't be able to see your activity and you won't see theirs.")
        }
        .alert(
            "Unblock \(viewModel.profile?.displayName ?? "this user")?",
            isPresented: $isUnblockConfirmationPresented
        ) {
            Button("Unblock", role: .destructive) {
                Task { await performUnblock() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("They will be able to see your activity and you will see theirs again.")
        }
        .onAppear { viewModel.subscribe(userId: userId) }
        .onDisappear { viewModel.unsubscribe() }
    }

    // MARK: - Toolbar Menu

    @ViewBuilder
    private func otherUserMenu(profile: UserProfile) -> some View {
        Menu {
            Button {
                isReportSheetPresented = true
            } label: {
                Label("Report User", systemImage: "flag")
            }

            if viewModel.isBlocked {
                Button {
                    isUnblockConfirmationPresented = true
                } label: {
                    Label("Unblock User", systemImage: "person.crop.circle.badge.checkmark")
                }
            } else {
                Button(role: .destructive) {
                    isBlockConfirmationPresented = true
                } label: {
                    Label("Block User", systemImage: "person.crop.circle.badge.minus")
                }
            }
        } label: {
            Image(systemName: "ellipsis")
                .font(.subheadline.weight(.semibold))
        }
    }

    // MARK: - Blocked Profile Views

    /// Shown when the current user has blocked this profile's owner.
    private func blockedProfileView(_ profile: UserProfile) -> some View {
        VStack(spacing: 20) {
            profileAvatar(profile)
                .padding(.top, 40)

            Text(profile.displayName)
                .font(.title2)
                .fontWeight(.bold)

            Text("You have blocked this user.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Button {
                isUnblockConfirmationPresented = true
            } label: {
                Text("Unblock")
                    .font(.subheadline.weight(.semibold))
                    .padding(.horizontal, 24)
                    .padding(.vertical, 10)
                    .background(Capsule().fill(Color.accentColor))
                    .foregroundStyle(.white)
            }
            .buttonStyle(.plain)

            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    /// Shown when this profile's owner has blocked the current user.
    private func blockedByProfileView(_ profile: UserProfile) -> some View {
        VStack(spacing: 20) {
            profileAvatar(profile)
                .padding(.top, 40)

            Text(profile.displayName)
                .font(.title2)
                .fontWeight(.bold)

            ContentUnavailableView(
                "Profile Unavailable",
                systemImage: "person.crop.circle.badge.xmark",
                description: Text("This profile is not available.")
            )

            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Block / Unblock Actions

    private func performBlock() async {
        do {
            try await viewModel.blockUser()
            showToast.success("\(viewModel.profile?.displayName ?? "User") has been blocked.")
        } catch {
            showToast.error("Failed to block user. Please try again.")
        }
    }

    private func performUnblock() async {
        do {
            try await viewModel.unblockUser()
            showToast.success("\(viewModel.profile?.displayName ?? "User") has been unblocked.")
        } catch {
            showToast.error("Failed to unblock user. Please try again.")
        }
    }

    // MARK: - Content

    @ViewBuilder
    private func profileContent(_ profile: UserProfile) -> some View {
        List {
            // Hero: gradient banner + avatar + name + stats
            Section {
                profileHero(profile)
            }
            .listRowInsets(EdgeInsets())
            .listRowBackground(Color(.secondarySystemGroupedBackground))

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


                        if profile.isOwnProfile {
                            NavigationLink(value: AppDestination.browseShelves) {
                                Text("Show All")
                                    .font(.subheadline)
                                    .foregroundStyle(Color.accentColor)
                            }
                        }
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

                // My Notes (own profile only)
                if profile.isOwnProfile {
                    Section {
                        NavigationLink {
                            NotesTabView()
                        } label: {
                            Label("My Notes", systemImage: "note.text")
                        }
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
        .listSectionSpacing(.compact)
        .refreshable { await viewModel.refresh() }
        .safeAreaInset(edge: .bottom) {
            Spacer().frame(height: 80)
        }
    }

    // MARK: - Sub-views

    // MARK: - Profile Hero

    private func profileHero(_ profile: UserProfile) -> some View {
        VStack(spacing: 0) {
            // Gradient banner with avatar overlapping
            ZStack(alignment: .bottom) {
                // Gradient banner
                themeManager.accentGradient
                    .frame(height: 90)

                // Avatar — overlaps banner and content below
                profileAvatar(profile)
                    .offset(y: 36)
            }

            // Name + subtitle + follow + stats
            VStack(spacing: 12) {
                // Spacer for avatar overhang
                Spacer().frame(height: 28)

                Text(profile.displayName)
                    .font(.title2)
                    .fontWeight(.bold)

                if let stats = profile.stats {
                    Text(memberSummary(profile: profile, stats: stats))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                if profile.isProfilePrivate {
                    Label("Private Profile", systemImage: "lock.fill")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color(.tertiarySystemFill), in: Capsule())
                }

                if !profile.isOwnProfile {
                    HStack(spacing: 12) {
                        FollowButton(userId: userId)

                        if !viewModel.isBlocked && !viewModel.isBlockedBy {
                            NavigationLink(value: AppDestination.conversation(otherUserId: userId)) {
                                Label("Message", systemImage: "bubble.left")
                                    .font(.subheadline.weight(.semibold))
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                                    .background(Color(.systemGray5), in: Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                // Stats row
                Divider()
                    .padding(.horizontal, 20)

                HStack(spacing: 0) {
                    if let stats = profile.stats {
                        statCell(value: stats.booksReadInt, label: "Books") {
                            pushDestination(.allReadingHistory(userId: userId))
                        }
                        statCell(value: stats.reviewsWrittenInt, label: "Reviews") {
                            pushDestination(.allUserReviews(userId: userId))
                        }
                    }
                    statCell(value: viewModel.followersCount, label: "Followers") {
                        pushDestination(.followers(userId: userId))
                    }
                    statCell(value: viewModel.followingCount, label: "Following") {
                        pushDestination(.following(userId: userId))
                    }
                }
                .padding(.horizontal, 8)
            }
            .padding(.bottom, 14)
        }
        .clipped()
    }

    private func profileAvatar(_ profile: UserProfile) -> some View {
        Group {
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
                .frame(width: 72, height: 72)
                .clipShape(Circle())
            } else {
                avatarPlaceholder
            }
        }
        .overlay(Circle().stroke(Color(.systemBackground), lineWidth: 3))
        .shadow(color: .black.opacity(0.1), radius: 4, y: 2)
    }

    private func memberSummary(profile: UserProfile, stats: UserProfileStats) -> String {
        let year = Calendar.current.component(.year, from: Date(timeIntervalSince1970: profile.createdAt / 1000))
        let currentYear = Calendar.current.component(.year, from: Date())
        let yearStr = year == currentYear ? "Joined this year" : "Member since \(year)"
        return "\(yearStr) · \(stats.booksReadInt) books read"
    }

    private func statCell(value: Int, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Text("\(value)")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundStyle(Color.accentColor)
                Text(label)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(value) \(label)")
        .accessibilityHint("View \(label.lowercased())")
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
            .frame(width: 72, height: 72)
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
