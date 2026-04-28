import SwiftUI
import ClerkKit

/// Two-step email + one-time-passcode sign-in screen.
///
/// Step 1: The user enters their email and taps "Send Code".
/// Step 2: The user enters the 6-digit code they received and taps "Verify".
struct SignInView: View {
    /// Binding to the sign-in object, owned by AuthGateView so it survives
    /// transient Clerk state changes that would otherwise destroy this view.
    @Binding var pendingSignIn: SignIn?

    /// Callback invoked when the user taps "Don't have an account? Create one".
    var onShowSignUp: (() -> Void)? = nil

    @State private var email = ""
    @State private var otpCode = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    /// Whether we are in the OTP verification step.
    private var isVerifyingCode: Bool { pendingSignIn != nil }

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // App branding
            VStack(spacing: 8) {
                Image(systemName: "book.closed.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(.tint)

                Text("Chapter Check")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Your audiobook library")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            // Form
            VStack(spacing: 16) {
                if isVerifyingCode {
                    verifyCodeSection
                } else {
                    emailSection
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }
            }
            .padding(.horizontal, 32)

            Spacer()
            Spacer()

            // Sign-up link — only shown on the email entry step
            if !isVerifyingCode, let onShowSignUp {
                VStack(spacing: 12) {
                    Text("Don't have an account?")
                        .font(.footnote)
                        .foregroundStyle(.secondary)

                    Button {
                        onShowSignUp()
                    } label: {
                        Text("Create Account")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 16)
            }
        }
    }

    // MARK: - Subviews

    private var emailSection: some View {
        VStack(spacing: 12) {
            TextField("Email address", text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .padding()
                .background(.fill.quaternary)
                .clipShape(RoundedRectangle(cornerRadius: 10))

            Button(action: handleSendCode) {
                Group {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Send Code")
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
            }
            .buttonStyle(.borderedProminent)
            .disabled(email.isEmpty || isLoading)
        }
    }

    private var verifyCodeSection: some View {
        VStack(spacing: 12) {
            Text("Enter the 6-digit code sent to")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Text(email)
                .font(.subheadline)
                .fontWeight(.medium)

            TextField("000000", text: $otpCode)
                .textContentType(.oneTimeCode)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
                .font(.title2.monospaced())
                .padding()
                .background(.fill.quaternary)
                .clipShape(RoundedRectangle(cornerRadius: 10))

            Button(action: handleVerifyCode) {
                Group {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Verify")
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
            }
            .buttonStyle(.borderedProminent)
            .disabled(otpCode.count != 6 || isLoading)

            Button("Use a different email") {
                resetToEmailStep()
            }
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
    }

    // MARK: - Actions

    private func handleSendCode() {
        guard !email.isEmpty else { return }
        isLoading = true
        errorMessage = nil

        // User is explicitly attempting to authenticate. Clear any stale
        // sign-out flag so AuthGateView can route an existing Clerk session
        // (e.g. from a partial prior signOut) into MainView instead of
        // bouncing the user back here with "already signed in".
        ConvexService.shared.userDidSignIn()

        Task {
            do {
                let result = try await Clerk.shared.auth.signInWithEmailCode(
                    emailAddress: email
                )
                pendingSignIn = result
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }

    private func handleVerifyCode() {
        guard let signIn = pendingSignIn, otpCode.count == 6 else { return }
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let result = try await signIn.verifyCode(otpCode)
                if result.status == .complete {
                    // Auth state change is picked up by AuthGateView via Clerk.shared.session.
                    // Clearing the binding releases the branch guard in AuthGateView.
                    ConvexService.shared.userDidSignIn()
                    self.pendingSignIn = nil
                } else {
                    errorMessage = "Verification incomplete. Please try again."
                }
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }

    private func resetToEmailStep() {
        pendingSignIn = nil
        otpCode = ""
        errorMessage = nil
    }
}

#Preview {
    SignInView(pendingSignIn: .constant(nil))
}
