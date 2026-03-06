import Foundation

/// Decoded response from `storageAccounts/queries:getStorageStats`.
struct StorageStats: Decodable {
    let totalBytesUsed: Double
    let fileCount: Double
    let hasStorageAccount: Bool
}
