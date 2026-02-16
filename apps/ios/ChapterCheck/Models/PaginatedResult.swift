import Foundation

/// Generic wrapper for Convex paginated query results.
/// `continueCursor` is the opaque cursor to pass for the next page;
/// `isDone` is true when there are no more results to fetch.
struct PaginatedResult<T: Decodable & Sendable>: Decodable, Sendable {
    let page: [T]
    let continueCursor: String
    let isDone: Bool
}
