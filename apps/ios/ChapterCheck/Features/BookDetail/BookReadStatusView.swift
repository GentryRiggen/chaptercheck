import SwiftUI

/// Displays the current read status for a book and provides actions to change it.
///
/// - If the book is marked as read, shows a green "Read" badge, any existing star rating,
///   and a "Review" button to open the review sheet.
/// - If the book is not yet read, shows a "Mark as Read" primary button.
/// - A confirmation dialog guards the "Unmark as Read" action, warning that
///   any existing rating and review will be cleared.
struct BookReadStatusView: View {
    let userData: BookUserData?
    let isLoading: Bool
    let onMarkAsRead: () -> Void
    let onOpenReview: () -> Void

    @State private var isUnmarkConfirmationPresented = false

    private var isRead: Bool {
        userData?.isRead == true
    }

    var body: some View {
        HStack(spacing: 12) {
            if isRead {
                readBadge
                Spacer()
                reviewButton
            } else {
                Spacer()
                markAsReadButton
            }
        }
        .padding(.horizontal)
        .confirmationDialog(
            "Unmark as Read?",
            isPresented: $isUnmarkConfirmationPresented,
            titleVisibility: .visible
        ) {
            Button("Unmark as Read", role: .destructive) {
                Haptics.medium()
                onMarkAsRead()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will clear your rating and review for this book.")
        }
    }

    // MARK: - Read Badge

    private var readBadge: some View {
        HStack(spacing: 6) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
            Text("Read")
                .fontWeight(.medium)

            if let rating = userData?.ratingInt {
                RatingView(rating: Double(rating), size: 13)
                    .padding(.leading, 2)
            }
        }
        .font(.subheadline)
        .onTapGesture {
            isUnmarkConfirmationPresented = true
        }
        .accessibilityLabel(accessibilityReadLabel)
        .accessibilityHint("Double-tap to unmark as read")
        .accessibilityAddTraits(.isButton)
    }

    private var accessibilityReadLabel: String {
        if let rating = userData?.ratingInt {
            return "Marked as read, rated \(rating) out of 3 stars"
        }
        return "Marked as read"
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

    // MARK: - Mark as Read Button

    private var markAsReadButton: some View {
        Button {
            Haptics.medium()
            onMarkAsRead()
        } label: {
            Label("Mark as Read", systemImage: "checkmark.circle")
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
        }
        .buttonStyle(.bordered)
        .disabled(isLoading)
    }
}
