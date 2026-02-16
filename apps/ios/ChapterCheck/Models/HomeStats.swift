import Foundation

/// Aggregate library statistics for the home page.
/// Matches the shape returned by `books:getHomeStats`.
struct HomeStats: Decodable, Sendable {
    let totalBooks: Double
    let totalAuthors: Double
    let totalListeningSeconds: Double
    let booksRead: Double

    var totalBooksInt: Int { Int(totalBooks) }
    var totalAuthorsInt: Int { Int(totalAuthors) }
    var booksReadInt: Int { Int(booksRead) }

    /// Total listening time formatted as "Xh Ym"
    var formattedListeningTime: String {
        let totalSeconds = Int(totalListeningSeconds)
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }
}
