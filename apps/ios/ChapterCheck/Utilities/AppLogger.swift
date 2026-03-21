import Foundation
import os
import Pulse

/// Drop-in replacement for `os.Logger` that writes to both the system log
/// (visible in Xcode console / Console.app) and Pulse's on-disk `LoggerStore`
/// (browsable in-app via `ConsoleView`).
///
/// Usage — identical to before, just swap the type:
/// ```swift
/// private let logger = AppLogger(category: "AudioPlayer")
/// logger.info("Playback started for \(bookTitle)")
/// ```
struct AppLogger: Sendable {
    private let osLogger: Logger
    private let category: String

    init(category: String) {
        self.osLogger = Logger(subsystem: "com.chaptercheck", category: category)
        self.category = category
    }

    // MARK: - Log Levels

    func debug(_ message: String) {
        osLogger.debug("\(message, privacy: .public)")
        store(.debug, message)
    }

    func info(_ message: String) {
        osLogger.info("\(message, privacy: .public)")
        store(.info, message)
    }

    func notice(_ message: String) {
        osLogger.notice("\(message, privacy: .public)")
        store(.notice, message)
    }

    func warning(_ message: String) {
        osLogger.warning("\(message, privacy: .public)")
        store(.warning, message)
    }

    func error(_ message: String) {
        osLogger.error("\(message, privacy: .public)")
        store(.error, message)
    }

    func fault(_ message: String) {
        osLogger.fault("\(message, privacy: .public)")
        store(.critical, message)
    }

    // MARK: - Pulse Storage

    private func store(_ level: LoggerStore.Level, _ message: String) {
        LoggerStore.shared.storeMessage(
            label: category,
            level: level,
            message: message
        )
    }
}
