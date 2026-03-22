import ConvexMobile
import Foundation

/// Repository for submitting user reports to the Convex backend.
///
/// Reports are one-shot fire-and-forget mutations — there is no reactive
/// subscription for report state, so no Combine publisher is needed here.
@MainActor
final class ReportRepository {

    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    // MARK: - Mutations

    /// Submit a report about another user.
    ///
    /// - Parameters:
    ///   - reportedUserId: Convex `_id` of the user being reported.
    ///   - reason: Short machine-readable reason key (e.g. `"spam"`).
    ///   - reasonText: Optional free-text elaboration provided by the reporter.
    func reportUser(
        reportedUserId: String,
        reason: String,
        reasonText: String?
    ) async throws {
        var args: [String: ConvexEncodable?] = [
            "reportedUserId": reportedUserId,
            "reason": reason,
        ]
        if let reasonText, !reasonText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            args["reasonText"] = reasonText
        }
        try await convex.mutation("reports/mutations:reportUser", with: args)
    }
}
