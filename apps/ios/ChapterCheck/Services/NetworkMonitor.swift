import Foundation
import Network
import os

extension Notification.Name {
    static let networkRestored = Notification.Name("networkRestored")
}

/// Singleton that monitors network connectivity via `NWPathMonitor`.
///
/// Publishes `isConnected` for SwiftUI observation and posts
/// `.networkRestored` when transitioning from offline to online.
@Observable
@MainActor
final class NetworkMonitor {

    static let shared = NetworkMonitor()

    private(set) var isConnected: Bool = true
    private(set) var isExpensive: Bool = false

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "com.chaptercheck.networkMonitor")
    private let logger = Logger(subsystem: "com.chaptercheck", category: "NetworkMonitor")

    private init() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor [weak self] in
                guard let self else { return }
                let wasConnected = self.isConnected
                let nowConnected = path.status == .satisfied

                self.isConnected = nowConnected
                self.isExpensive = path.isExpensive

                if !wasConnected && nowConnected {
                    self.logger.info("Network restored")
                    NotificationCenter.default.post(name: .networkRestored, object: nil)
                } else if wasConnected && !nowConnected {
                    self.logger.info("Network lost")
                }
            }
        }
        monitor.start(queue: queue)
    }
}
