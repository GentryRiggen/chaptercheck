import Foundation

/// Static formatting functions for time values and relative dates.
///
/// All time-based inputs use seconds (as `Double`) to match Convex numeric fields.
enum TimeFormatting {

    // MARK: - Clock-Style Formatting

    /// Formats seconds into a playback-style clock string.
    ///
    /// - Returns: `"1:23:45"` for durations >= 1 hour, `"23:45"` otherwise.
    static func formatTime(_ seconds: Double) -> String {
        let totalSeconds = max(0, Int(seconds))
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        let secs = totalSeconds % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, secs)
        }
        return String(format: "%d:%02d", minutes, secs)
    }

    // MARK: - Human-Readable Duration

    /// Formats seconds into a human-readable duration.
    ///
    /// - Returns: `"2h 30m"`, `"45m"`, or `"< 1m"` for very short durations.
    static func formatDuration(_ seconds: Double) -> String {
        let totalSeconds = max(0, Int(seconds))
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60

        if hours > 0 {
            return minutes > 0 ? "\(hours)h \(minutes)m" : "\(hours)h"
        }
        if minutes > 0 {
            return "\(minutes)m"
        }
        return "< 1m"
    }

    // MARK: - Relative Date

    /// Formats a Unix timestamp (milliseconds) into a relative date string.
    ///
    /// - Returns: `"Just now"`, `"2m ago"`, `"3h ago"`, `"5 days ago"`, etc.
    static func formatRelativeDate(_ timestamp: Double) -> String {
        let date = Date(timeIntervalSince1970: timestamp / 1000)
        let now = Date()
        let interval = now.timeIntervalSince(date)

        if interval < 60 {
            return "Just now"
        }
        if interval < 3600 {
            let minutes = Int(interval / 60)
            return "\(minutes)m ago"
        }
        if interval < 86400 {
            let hours = Int(interval / 3600)
            return hours == 1 ? "1h ago" : "\(hours)h ago"
        }
        if interval < 604_800 {
            let days = Int(interval / 86400)
            return days == 1 ? "1 day ago" : "\(days) days ago"
        }
        if interval < 2_592_000 {
            let weeks = Int(interval / 604_800)
            return weeks == 1 ? "1 week ago" : "\(weeks) weeks ago"
        }
        if interval < 31_536_000 {
            let months = Int(interval / 2_592_000)
            return months == 1 ? "1 month ago" : "\(months) months ago"
        }

        let years = Int(interval / 31_536_000)
        return years == 1 ? "1 year ago" : "\(years) years ago"
    }
}
