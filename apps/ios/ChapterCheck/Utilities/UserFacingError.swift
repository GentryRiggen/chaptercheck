import Foundation

/// Sanitizes raw errors into user-friendly messages suitable for display in the UI.
///
/// Convex errors already carry descriptive messages, so those pass through directly.
/// Network and configuration errors are mapped to cleaner phrasing.
///
/// - Parameters:
///   - error: The raw error to sanitize.
///   - fallback: Used when the error message is technical/internal (e.g., "not configured").
/// - Returns: A user-facing string describing what went wrong.
func userFacingMessage(from error: Error, fallback: String) -> String {
    // URLError cases — common network failures
    if let urlError = error as? URLError {
        switch urlError.code {
        case .notConnectedToInternet, .networkConnectionLost:
            return "Check your internet connection and try again."
        case .timedOut:
            return "The request timed out. Please try again."
        case .cannotFindHost, .cannotConnectToHost, .dnsLookupFailed:
            return "Unable to reach the server. Please try again."
        default:
            break
        }
    }

    let message = error.localizedDescription

    // Suppress internal configuration messages — they're meaningless to users
    let technicalPhrases = ["not configured", "configuration", "internal error", "nil"]
    let lowerMessage = message.lowercased()
    for phrase in technicalPhrases {
        if lowerMessage.contains(phrase) {
            return fallback
        }
    }

    // Convex errors already contain useful, human-readable descriptions
    return message
}
