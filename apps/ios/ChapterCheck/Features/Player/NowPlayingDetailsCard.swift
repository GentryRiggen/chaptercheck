import SwiftUI

/// Scrollable book details card shown as the second page of the Now Playing carousel.
///
/// Designed as a compact dashboard: quick actions, key metadata, contributor shortcuts,
/// and the listener's current review/read state.
struct NowPlayingDetailsCard: View {
    let book: BookWithDetails
    let totalDurationSeconds: Double?
    let totalPartCount: Int
    let viewModel: NowPlayingDetailsViewModel
    let onNavigate: (AppDestination) -> Void
    let onOpenReview: () -> Void
    let onShowCover: () -> Void

    private var genreNames: [String] {
        viewModel.allGenres
            .filter { viewModel.myGenreVoteIds.contains($0._id) }
            .map(\.name)
            .sorted()
    }

    private var reviewActionTitle: String {
        if viewModel.isRead {
            return viewModel.hasReview ? "Edit Review" : "Write Review"
        }
        return "Mark as Read"
    }

    private var reviewActionIcon: String {
        if viewModel.isRead {
            return viewModel.hasReview ? "square.and.pencil" : "star.bubble"
        }
        return "checkmark.circle"
    }

    private var resolvedDurationSeconds: Double? {
        if let totalDurationSeconds, totalDurationSeconds > 0 {
            return totalDurationSeconds
        }
        if let bookDuration = book.duration, bookDuration > 0 {
            return bookDuration
        }
        return nil
    }

    private var durationValue: String {
        guard let resolvedDurationSeconds else { return "Unknown" }
        return formatDuration(resolvedDurationSeconds)
    }

    private var durationDetail: String {
        guard let resolvedDurationSeconds else { return "Using book metadata only" }
        if totalPartCount > 1 {
            return "\(totalPartCount) parts • \(Int(resolvedDurationSeconds / 60)) min total"
        }
        return "\(Int(resolvedDurationSeconds / 60)) min total"
    }

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 16) {
                summaryCard
                contributorsCard
                quickActionsSection
                statsGrid
                if !genreNames.isEmpty {
                    tagsCard
                }
                reviewCard
            }
            .padding(.horizontal, 2)
            .padding(.vertical, 8)
        }
    }

    private var summaryCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(book.title)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .lineLimit(2)

                    if let subtitle = book.subtitle, !subtitle.isEmpty {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }

                    if !book.authors.isEmpty {
                        Text(book.authors.map(\.name).joined(separator: ", "))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                }

                Spacer(minLength: 0)

                Button {
                    onNavigate(.book(id: book._id))
                } label: {
                    Image(systemName: "arrow.up.right")
                        .font(.subheadline.weight(.semibold))
                        .frame(width: 36, height: 36)
                        .background(Color.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Open book")
            }

            flowRow(spacing: 8) {
                statusChip(
                    title: viewModel.isRead ? "Read" : "In Progress",
                    systemImage: viewModel.isRead ? "checkmark.circle.fill" : "headphones",
                    tint: viewModel.isRead ? .green : .cyan
                )

                if let series = book.series {
                    statusChip(
                        title: book.seriesOrder.map { "\(series.name) #\(formatSeriesOrder($0))" } ?? series.name,
                        systemImage: "books.vertical.fill",
                        tint: .orange
                    )
                }

                if let stats = viewModel.ratingStats, let avg = stats.averageRating {
                    statusChip(
                        title: "\(String(format: "%.1f", avg)) avg",
                        systemImage: "star.fill",
                        tint: .yellow
                    )
                }
            }
        }
        .padding(18)
        .background(summaryBackground, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .strokeBorder(Color.white.opacity(0.08))
        )
    }

    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionTitle("Quick Actions")

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                actionCard(
                    title: reviewActionTitle,
                    subtitle: viewModel.hasReview ? "Update your take" : (viewModel.isRead ? "Add your rating" : "Finish this listen"),
                    systemImage: reviewActionIcon,
                    tint: .pink
                ) {
                    if viewModel.isRead {
                        onOpenReview()
                    } else {
                        Task { await viewModel.markAsRead(bookId: book._id) }
                    }
                }

                actionCard(
                    title: "Show Artwork",
                    subtitle: "Return to artwork",
                    systemImage: "photo",
                    tint: .cyan,
                    action: onShowCover
                )

                if let series = book.series {
                    actionCard(
                        title: "Open Series",
                        subtitle: series.name,
                        systemImage: "books.vertical.fill",
                        tint: .orange
                    ) {
                        onNavigate(.series(id: series._id))
                    }
                }
            }
        }
    }

    private var statsGrid: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionTitle("At a Glance")

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                statTile(
                    title: "Average Rating",
                    value: viewModel.ratingStats?.averageRating.map { String(format: "%.1f", $0) } ?? "Unrated",
                    detail: viewModel.ratingStats.map { "\($0.ratingCountInt) ratings" } ?? "No ratings yet",
                    systemImage: "star.fill",
                    tint: .yellow
                )

                statTile(
                    title: "Duration",
                    value: durationValue,
                    detail: durationDetail,
                    systemImage: "clock.fill",
                    tint: .cyan
                )

                statTile(
                    title: "Published",
                    value: book.publishedYear.map { "\(Int($0))" } ?? "Unknown",
                    detail: book.language?.uppercased() ?? "Language unknown",
                    systemImage: "calendar",
                    tint: .green
                )

                statTile(
                    title: "Your Status",
                    value: viewModel.isRead ? (viewModel.hasReview ? "Reviewed" : "Read") : "Listening",
                    detail: viewModel.userData?.ratingInt.map { "\($0) star rating" } ?? "No private rating yet",
                    systemImage: viewModel.isRead ? "checkmark.seal.fill" : "waveform",
                    tint: viewModel.isRead ? .mint : .indigo
                )
            }
        }
    }

    private var tagsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionTitle("Your Tags")

            flowRow(spacing: 8) {
                ForEach(genreNames, id: \.self) { genre in
                    Text(genre)
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 7)
                        .background(Color.accentColor.opacity(0.14), in: Capsule())
                }
            }
        }
        .padding(16)
        .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }

    private var contributorsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionTitle("Contributors")

            ForEach(book.authors) { author in
                Button {
                    onNavigate(.author(id: author._id))
                } label: {
                    HStack(spacing: 12) {
                        BookCoverView(r2Key: author.imageR2Key, size: 38)
                            .clipShape(Circle())

                        VStack(alignment: .leading, spacing: 2) {
                            Text(author.name)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.primary)

                            Text(displayRole(for: author))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        Image(systemName: "arrow.up.right")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.tertiary)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(16)
        .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }

    private var reviewCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                sectionTitle("Your Take")
                Spacer()
                if let rating = viewModel.userData?.ratingInt {
                    RatingView(rating: Double(rating), size: 14)
                }
            }

            if let reviewText = viewModel.userData?.reviewText, !reviewText.isEmpty {
                Text(reviewText)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(4)
            } else if viewModel.isRead {
                Text("You’ve marked this one as read, but you haven’t left a review yet.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                Text("Still listening. Mark it as read when you finish so you can rate and review it.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Button {
                if viewModel.isRead {
                    onOpenReview()
                } else {
                    Task { await viewModel.markAsRead(bookId: book._id) }
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: reviewActionIcon)
                    Text(reviewActionTitle)
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
            }
            .buttonStyle(.borderedProminent)
        }
        .padding(16)
        .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }

    private var summaryBackground: some ShapeStyle {
        LinearGradient(
            colors: [
                Color.cyan.opacity(0.28),
                Color.blue.opacity(0.18),
                Color.white.opacity(0.06),
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private func sectionTitle(_ title: String) -> some View {
        Text(title)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
            .textCase(.uppercase)
            .tracking(0.8)
    }

    private func statusChip(title: String, systemImage: String, tint: Color) -> some View {
        Label(title, systemImage: systemImage)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(tint.opacity(0.18), in: Capsule())
            .foregroundStyle(tint)
    }

    private func statTile(
        title: String,
        value: String,
        detail: String,
        systemImage: String,
        tint: Color
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: systemImage)
                    .foregroundStyle(tint)
                Spacer()
                Text(title)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Text(value)
                .font(.headline.weight(.semibold))
                .lineLimit(1)

            Text(detail)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(2)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private func actionCard(
        title: String,
        subtitle: String,
        systemImage: String,
        tint: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                Image(systemName: systemImage)
                    .font(.headline)
                    .foregroundStyle(tint)

                Spacer(minLength: 0)

                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.leading)
                    .lineLimit(2)

                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.leading)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity, minHeight: 102, alignment: .leading)
            .padding(14)
            .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .strokeBorder(tint.opacity(0.14))
            )
        }
        .buttonStyle(.plain)
    }

    private func displayRole(for author: BookAuthor) -> String {
        guard let role = author.role, !role.isEmpty else {
            return "Contributor"
        }
        return role.capitalized
    }

    private func formatSeriesOrder(_ order: Double) -> String {
        if order == floor(order) {
            return "\(Int(order))"
        }
        return String(format: "%.1f", order)
    }

    private func formatDuration(_ duration: Double) -> String {
        let totalSeconds = Int(duration)
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }
}

private func flowRow<Content: View>(
    spacing: CGFloat = 8,
    @ViewBuilder content: () -> Content
) -> some View {
    FlowLayout(spacing: spacing) {
        content()
    }
}
