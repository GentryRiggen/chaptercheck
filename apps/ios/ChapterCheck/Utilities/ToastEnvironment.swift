import SwiftUI

// MARK: - Toast Style

/// Visual style variants for toast messages.
enum ToastStyle {
    case error
    case success
    case info

    var systemImage: String {
        switch self {
        case .error: return "exclamationmark.circle.fill"
        case .success: return "checkmark.circle.fill"
        case .info: return "info.circle.fill"
        }
    }

    var color: Color {
        switch self {
        case .error: return .red
        case .success: return .green
        case .info: return .blue
        }
    }
}

// MARK: - Toast Message

/// A single toast message with a stable identity for animation purposes.
struct ToastMessage: Identifiable {
    let id: UUID
    let message: String
    let style: ToastStyle

    init(id: UUID = UUID(), message: String, style: ToastStyle) {
        self.id = id
        self.message = message
        self.style = style
    }
}

// MARK: - Show Toast Action

/// Callable wrapper so `@Environment(\.showToast)` integrates cleanly
/// with SwiftUI's key-path environment API.
struct ShowToastAction {
    private let action: (ToastMessage) -> Void

    init(_ action: @escaping (ToastMessage) -> Void = { _ in }) {
        self.action = action
    }

    func callAsFunction(_ toast: ToastMessage) {
        action(toast)
    }

    // MARK: - Convenience

    func error(_ message: String) {
        action(ToastMessage(message: message, style: .error))
    }

    func success(_ message: String) {
        action(ToastMessage(message: message, style: .success))
    }

    func info(_ message: String) {
        action(ToastMessage(message: message, style: .info))
    }
}

// MARK: - Environment Key

private struct ShowToastKey: EnvironmentKey {
    static let defaultValue = ShowToastAction()
}

extension EnvironmentValues {
    var showToast: ShowToastAction {
        get { self[ShowToastKey.self] }
        set { self[ShowToastKey.self] = newValue }
    }
}
