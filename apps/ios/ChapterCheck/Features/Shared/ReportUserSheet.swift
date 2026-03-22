import SwiftUI

// MARK: - Report Reason

enum ReportReason: String, CaseIterable, Identifiable {
    case spam = "spam"
    case inappropriateContent = "inappropriate_content"
    case harassment = "harassment"
    case impersonation = "impersonation"
    case other = "other"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .spam: return "Spam"
        case .inappropriateContent: return "Inappropriate content"
        case .harassment: return "Harassment"
        case .impersonation: return "Impersonation"
        case .other: return "Other"
        }
    }
}

// MARK: - ReportUserSheet

/// Sheet for reporting a user. Presents a reason picker and an optional
/// free-text field, then calls `reports/mutations:reportUser` on submission.
struct ReportUserSheet: View {

    let userId: String
    let userName: String?

    @Environment(\.dismiss) private var dismiss
    @Environment(\.showToast) private var showToast

    @State private var selectedReason: ReportReason?
    @State private var additionalDetails = ""
    @State private var isSubmitting = false

    private let reportRepository = ReportRepository()
    private let maxDetailCharacters = 500

    private var trimmedDetails: String {
        additionalDetails.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var canSubmit: Bool {
        selectedReason != nil && !isSubmitting
    }

    var body: some View {
        NavigationStack {
            Form {
                // Context
                Section {
                    reportingContextRow
                }

                // Reason picker
                Section {
                    ForEach(ReportReason.allCases) { reason in
                        Button {
                            withAnimation(.easeInOut(duration: 0.15)) {
                                selectedReason = reason
                            }
                        } label: {
                            HStack {
                                Text(reason.displayName)
                                    .foregroundStyle(.primary)
                                Spacer()
                                if selectedReason == reason {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(Color.accentColor)
                                        .fontWeight(.semibold)
                                }
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                } header: {
                    Text("Reason")
                }

                // Optional details
                Section {
                    ZStack(alignment: .topLeading) {
                        if additionalDetails.isEmpty {
                            Text("Additional details (optional)")
                                .foregroundStyle(.tertiary)
                                .padding(.top, 8)
                                .padding(.leading, 4)
                                .allowsHitTesting(false)
                        }
                        TextEditor(text: $additionalDetails)
                            .frame(minHeight: 80)
                            .onChange(of: additionalDetails) { _, newValue in
                                if newValue.count > maxDetailCharacters {
                                    additionalDetails = String(newValue.prefix(maxDetailCharacters))
                                }
                            }
                    }

                    HStack {
                        Spacer()
                        Text("\(additionalDetails.count)/\(maxDetailCharacters)")
                            .font(.caption2)
                            .foregroundStyle(
                                additionalDetails.count >= maxDetailCharacters ? .orange : .secondary
                            )
                            .monospacedDigit()
                    }
                } header: {
                    Text("Details")
                } footer: {
                    Text("Your report is confidential. We review all reports and take action when our community guidelines are violated.")
                }
            }
            .navigationTitle("Report User")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .disabled(isSubmitting)
                }

                ToolbarItem(placement: .confirmationAction) {
                    if isSubmitting {
                        ProgressView()
                    } else {
                        Button("Submit") {
                            Task { await submitReport() }
                        }
                        .disabled(!canSubmit)
                        .fontWeight(.semibold)
                    }
                }
            }
        }
    }

    // MARK: - Subviews

    private var reportingContextRow: some View {
        HStack(spacing: 12) {
            Image(systemName: "flag.circle.fill")
                .font(.title2)
                .foregroundStyle(Color.accentColor)

            VStack(alignment: .leading, spacing: 2) {
                Text("Reporting \(userName ?? "this user")")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)
                Text("Select the reason that best describes the issue.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Submit

    private func submitReport() async {
        guard let reason = selectedReason else { return }

        isSubmitting = true
        do {
            try await reportRepository.reportUser(
                reportedUserId: userId,
                reason: reason.rawValue,
                reasonText: trimmedDetails.isEmpty ? nil : trimmedDetails
            )
            dismiss()
            showToast.success("Report submitted. Thank you for helping keep ChapterCheck safe.")
        } catch {
            isSubmitting = false
            showToast.error("Failed to submit report. Please try again.")
        }
    }
}
