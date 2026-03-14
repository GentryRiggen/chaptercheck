import SwiftUI

/// Displays the current reading status for a book and provides a menu to change it.
///
/// Shows the current status as a colored inline badge with icon. Tapping opens a menu
/// with all 5 status options. When status is `finished`, a review button appears.
struct BookReadStatusView: View {
    let userData: BookUserData?
    let isLoading: Bool
    let onStatusChange: (ReadingStatus) -> Void
    let onOpenReview: () -> Void

    private var currentStatus: ReadingStatus? {
        userData?.readingStatus
    }

    var body: some View {
        HStack(spacing: 12) {
            if let status = currentStatus {
                currentStatusMenu(status: status)
                Spacer()
                if status == .finished {
                    reviewButton
                }
            } else {
                addToLibraryMenu
            }
        }
    }

    // MARK: - Current Status (inline badge style)

    private func currentStatusMenu(status: ReadingStatus) -> some View {
        Menu {
            statusMenuItems(current: status)
        } label: {
            HStack(spacing: 6) {
                Image(systemName: status.icon)
                    .foregroundStyle(status.color)
                Text(status.label)
                    .fontWeight(.medium)

                if status == .finished, let rating = userData?.ratingInt {
                    RatingView(rating: Double(rating), size: 13)
                        .padding(.leading, 2)
                }
            }
            .font(.subheadline)
        }
        .disabled(isLoading)
        .accessibilityLabel(accessibilityLabel)
        .accessibilityHint("Double-tap to change status")
        .accessibilityAddTraits(.isButton)
    }

    // MARK: - Add to Library (bordered button style)

    private var addToLibraryMenu: some View {
        Menu {
            statusMenuItems(current: nil)
        } label: {
            Label("Add to Library", systemImage: "plus.circle")
                .padding(.vertical, 6)
                .font(.subheadline)
        }
        .menuStyle(.button)
        .buttonStyle(.bordered)
        .disabled(isLoading)
        .accessibilityLabel("Add to Library. Double-tap to set reading status.")
    }

    // MARK: - Menu Items

    @ViewBuilder
    private func statusMenuItems(current: ReadingStatus?) -> some View {
        ForEach(ReadingStatus.allCases) { status in
            Button {
                guard status != current else { return }
                Haptics.medium()
                onStatusChange(status)
            } label: {
                Label {
                    Text(status.label)
                } icon: {
                    Image(systemName: status == current ? "checkmark" : status.icon)
                }
            }
        }
    }

    private var accessibilityLabel: String {
        if let status = currentStatus {
            if status == .finished, let rating = userData?.ratingInt {
                return "\(status.label), rated \(rating) out of 3 stars"
            }
            return status.label
        }
        return "Add to Library"
    }

    // MARK: - Review Button

    private var reviewButton: some View {
        Button {
            Haptics.medium()
            onOpenReview()
        } label: {
            Label(
                userData?.reviewText != nil || userData?.rating != nil ? "Edit Review" : "Review",
                systemImage: "square.and.pencil"
            )
            .font(.subheadline)
        }
        .buttonStyle(.bordered)
    }
}
