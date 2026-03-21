import PulseUI
import SwiftUI
import UIKit

// MARK: - Shake Detection

extension UIWindow {
    override open func motionEnded(_ motion: UIEvent.EventSubtype, with event: UIEvent?) {
        super.motionEnded(motion, with: event)
        if motion == .motionShake {
            NotificationCenter.default.post(name: .deviceDidShake, object: nil)
        }
    }
}

extension Notification.Name {
    static let deviceDidShake = Notification.Name("deviceDidShake")
}

// MARK: - View Modifier

private struct ShakeToShowLogsModifier: ViewModifier {
    @State private var isShowingLogs = false
    @State private var lastShake = Date.distantPast

    func body(content: Content) -> some View {
        content
            .onReceive(NotificationCenter.default.publisher(for: .deviceDidShake)) { _ in
                let now = Date()
                guard now.timeIntervalSince(lastShake) > 1 else { return }
                lastShake = now
                isShowingLogs = true
            }
            .sheet(isPresented: $isShowingLogs) {
                NavigationStack {
                    ConsoleView()
                        .navigationTitle("Logs")
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) {
                                Button("Done") { isShowingLogs = false }
                            }
                        }
                }
            }
    }
}

extension View {
    func shakeToShowLogs() -> some View {
        modifier(ShakeToShowLogsModifier())
    }
}
