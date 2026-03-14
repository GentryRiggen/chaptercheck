import SwiftUI

struct YourMemoryView: View {
    let userData: BookUserData?
    let readingStatus: ReadingStatus?
    let onSaveSummary: (String) async -> Void
    let onOpenReviewSheet: () -> Void

    @State private var isEditingSummary = false
    @State private var summaryDraft = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Your Memory")
                .font(.headline)

            // Personal summary
            summarySection

            // Your rating
            if let rating = userData?.ratingInt {
                HStack(spacing: 8) {
                    Text("Your rating")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    RatingView(rating: Double(rating), size: 14)
                }
            } else {
                Text("Not rated")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            // Your review snippet
            if let reviewText = userData?.reviewText, !reviewText.isEmpty {
                Button {
                    onOpenReviewSheet()
                } label: {
                    Text(reviewText)
                        .font(.subheadline)
                        .foregroundStyle(.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.plain)
            } else if readingStatus == .finished {
                Button {
                    onOpenReviewSheet()
                } label: {
                    Label("Write a Review", systemImage: "square.and.pencil")
                        .font(.subheadline)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal)
    }

    @ViewBuilder
    private var summarySection: some View {
        if isEditingSummary {
            VStack(alignment: .leading, spacing: 8) {
                TextEditor(text: $summaryDraft)
                    .frame(minHeight: 60, maxHeight: 120)
                    .padding(8)
                    .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color(.separator), lineWidth: 0.5)
                    )

                HStack {
                    Button("Cancel") {
                        isEditingSummary = false
                    }
                    .buttonStyle(.bordered)

                    Button("Save") {
                        isEditingSummary = false
                        let text = summaryDraft
                        Task { await onSaveSummary(text) }
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
        } else {
            HStack(alignment: .top) {
                if let summary = userData?.personalSummary, !summary.isEmpty {
                    Text(summary)
                        .font(.subheadline)
                        .foregroundStyle(.primary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    Text("Add a personal summary...")
                        .font(.subheadline)
                        .foregroundStyle(.tertiary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button {
                    summaryDraft = userData?.personalSummary ?? ""
                    isEditingSummary = true
                } label: {
                    Image(systemName: "pencil")
                        .font(.subheadline)
                }
                .buttonStyle(.plain)
            }
        }
    }
}
