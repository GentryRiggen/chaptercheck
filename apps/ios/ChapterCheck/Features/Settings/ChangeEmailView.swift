import ClerkKit
import SwiftUI

/// Two-step flow for changing the current user's primary email address.
///
/// Step 1 — Enter a new email address and send a verification code.
/// Step 2 — Enter the code, verify, promote to primary, and remove the old address.
struct ChangeEmailView: View {
    @Environment(\.dismiss) private var dismiss

    // MARK: - State

    @State private var step: Step = .enterEmail
    @State private var newEmail = ""
    @State private var verificationCode = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    /// The newly created (unverified) email address object, retained between steps.
    @State private var pendingEmailAddress: EmailAddress?

    // MARK: - Step

    private enum Step {
        case enterEmail
        case enterCode
    }

    // MARK: - Computed

    private var currentEmail: String {
        Clerk.shared.user?.emailAddresses
            .first(where: { $0.id == Clerk.shared.user?.primaryEmailAddressId })?
            .emailAddress ?? ""
    }

    private var newEmailTrimmed: String {
        newEmail.trimmingCharacters(in: .whitespaces)
    }

    private var isValidEmail: Bool {
        let parts = newEmailTrimmed.split(separator: "@")
        return parts.count == 2
            && !parts[0].isEmpty
            && parts[1].contains(".")
            && !parts[1].hasPrefix(".")
            && !parts[1].hasSuffix(".")
    }

    // MARK: - Body

    var body: some View {
        Form {
            currentEmailSection

            switch step {
            case .enterEmail:
                enterEmailSection
            case .enterCode:
                enterCodeSection
            }

            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                        .font(.callout)
                }
            }
        }
        .navigationTitle("Change Email")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Sections

    private var currentEmailSection: some View {
        Section {
            HStack {
                Text("Current Email")
                    .foregroundStyle(.secondary)
                Spacer()
                Text(currentEmail)
                    .foregroundStyle(.primary)
            }
        }
    }

    private var enterEmailSection: some View {
        Group {
            Section {
                TextField("New Email Address", text: $newEmail)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            } header: {
                Text("New Email")
            } footer: {
                Text("A verification code will be sent to this address.")
            }

            Section {
                Button {
                    sendCode()
                } label: {
                    HStack {
                        Spacer()
                        if isLoading {
                            ProgressView()
                        } else {
                            Text("Send Code")
                        }
                        Spacer()
                    }
                }
                .disabled(isLoading || !isValidEmail)
            }
        }
    }

    private var enterCodeSection: some View {
        Group {
            Section {
                TextField("6-Digit Code", text: $verificationCode)
                    .keyboardType(.numberPad)
                    .textContentType(.oneTimeCode)
                    .font(.title3.monospacedDigit())
            } header: {
                Text("Verification Code")
            } footer: {
                Text("Enter the code sent to \(newEmailTrimmed).")
            }

            Section {
                Button {
                    verify()
                } label: {
                    HStack {
                        Spacer()
                        if isLoading {
                            ProgressView()
                        } else {
                            Text("Verify")
                        }
                        Spacer()
                    }
                }
                .disabled(isLoading || verificationCode.count < 6)

                Button("Use a different email") {
                    reset()
                }
                .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Actions

    private func sendCode() {
        guard isValidEmail else { return }
        errorMessage = nil
        isLoading = true

        Task {
            do {
                guard let user = Clerk.shared.user else {
                    errorMessage = "No authenticated user found."
                    isLoading = false
                    return
                }
                let emailAddress = try await user.createEmailAddress(newEmailTrimmed)
                pendingEmailAddress = emailAddress
                try await emailAddress.sendCode()
                isLoading = false
                step = .enterCode
            } catch {
                isLoading = false
                errorMessage = error.localizedDescription
            }
        }
    }

    private func verify() {
        guard let emailAddress = pendingEmailAddress else { return }
        guard verificationCode.count >= 6 else { return }
        errorMessage = nil
        isLoading = true

        Task {
            do {
                // Verify the code
                try await emailAddress.verifyCode(verificationCode)

                // Promote to primary
                try await Clerk.shared.user?.update(
                    .init(primaryEmailAddressId: emailAddress.id)
                )

                // Attempt to remove old addresses; silently ignore failures
                // (OAuth-linked addresses cannot be deleted)
                let oldAddresses = Clerk.shared.user?.emailAddresses
                    .filter { $0.id != emailAddress.id } ?? []
                for old in oldAddresses {
                    try? await old.destroy()
                }

                isLoading = false
                dismiss()
            } catch {
                isLoading = false
                errorMessage = error.localizedDescription
            }
        }
    }

    private func reset() {
        step = .enterEmail
        verificationCode = ""
        pendingEmailAddress = nil
        errorMessage = nil
    }
}
