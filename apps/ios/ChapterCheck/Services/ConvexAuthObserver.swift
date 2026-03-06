import Combine
import ConvexMobile
import Foundation

/// Reusable helper that gates Convex subscription lifecycle on auth state.
///
/// ViewModels create one instance and call `start(onAuthenticated:onUnauthenticated:)`
/// to begin observing. The `onAuthenticated` callback fires once per auth cycle
/// (not on every token refresh), and `onUnauthenticated` fires only when the
/// session drops to `.unauthenticated` (ignoring transient `.loading` states).
@MainActor
final class ConvexAuthObserver {

    /// Whether the Convex session is currently authenticated.
    var isAuthenticated: Bool {
        if case .authenticated = ConvexService.shared.authState { return true }
        return false
    }

    private var cancellable: AnyCancellable?

    /// Prevents re-firing `onAuthenticated` during token refresh while already subscribed.
    private var hasFired = false

    /// Begin observing auth state changes.
    ///
    /// - Parameters:
    ///   - onAuthenticated: Called once when state becomes `.authenticated` (per auth cycle).
    ///   - onUnauthenticated: Called when state becomes `.unauthenticated`.
    func start(
        onAuthenticated: @escaping () -> Void,
        onUnauthenticated: @escaping () -> Void
    ) {
        guard cancellable == nil else { return }

        cancellable = ConvexService.shared.$authState
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                guard let self else { return }
                switch state {
                case .authenticated:
                    if !hasFired {
                        hasFired = true
                        onAuthenticated()
                    }
                case .unauthenticated:
                    hasFired = false
                    onUnauthenticated()
                case .loading:
                    break // Ignore — avoids churn during token refresh
                }
            }
    }

    /// Reset the fired flag so the next `.authenticated` emission re-triggers
    /// `onAuthenticated`. Call this when a subscription completes with an auth-related
    /// error (e.g. "Not authenticated") — the next token refresh (~50s) will re-fire
    /// the callback. For non-auth errors, calling this is harmless but unnecessary.
    func needsResubscription() {
        hasFired = false
    }

    /// Stop observing auth state.
    func cancel() {
        cancellable?.cancel()
        cancellable = nil
        hasFired = false
    }
}
