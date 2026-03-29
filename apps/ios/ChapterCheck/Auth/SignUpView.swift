import ClerkKit
import PhotosUI
import SwiftUI

/// Three-step email sign-up screen.
///
/// Step 1 — Info: The user enters their first name, last name, and email, then taps "Continue".
/// Step 2 — OTP: The user enters the 6-digit code sent to their email, then taps "Verify".
/// Step 3 — Photo (optional): The user may add a profile photo, then taps "Skip" or "Save".
///
/// On completion the Clerk session updates automatically, which `AuthGateView` picks up
/// via `Clerk.shared.session` and transitions to the main app.
struct SignUpView: View {
    /// Binding to the sign-up object, owned by AuthGateView so it survives
    /// transient Clerk state changes that would otherwise destroy this view.
    @Binding var pendingSignUp: SignUp?

    /// Callback invoked when the user taps "Already have an account? Sign in".
    let onShowSignIn: () -> Void

    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var otpCode = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var step: Step = .info

    // Photo state — only used in the optional photo step
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var previewImage: Image?
    @State private var isUploadingPhoto = false
    @State private var showPhotoPicker = false

    private enum Step {
        case info
        case otp
        case photo
    }

    // MARK: - Validation

    private var firstNameTrimmed: String { firstName.trimmingCharacters(in: .whitespaces) }
    private var lastNameTrimmed: String { lastName.trimmingCharacters(in: .whitespaces) }
    private var emailTrimmed: String { email.trimmingCharacters(in: .whitespaces) }

    private var canContinue: Bool {
        !firstNameTrimmed.isEmpty && !lastNameTrimmed.isEmpty && !emailTrimmed.isEmpty && !isLoading
    }

    // MARK: - Body

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

                Text("Create your account")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            // Form
            VStack(spacing: 16) {
                switch step {
                case .info:
                    infoSection
                case .otp:
                    otpSection
                case .photo:
                    photoSection
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }
            }
            .padding(.horizontal, 32)
            .animation(.default, value: step)

            Spacer()
            Spacer()

            // Sign-in link — only shown on the info step
            if step == .info {
                Button("Already have an account? Sign in") {
                    onShowSignIn()
                }
                .font(.footnote)
                .foregroundStyle(.secondary)
                .padding(.bottom, 16)
            }
        }
        .onChange(of: selectedPhoto) { _, item in
            guard let item else { return }
            Task { await loadAndUploadPhoto(item) }
        }
        .photosPicker(isPresented: $showPhotoPicker, selection: $selectedPhoto, matching: .images)
    }

    // MARK: - Step Views

    private var infoSection: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                TextField("First name", text: $firstName)
                    .textContentType(.givenName)
                    .autocorrectionDisabled()
                    .padding()
                    .background(.fill.quaternary)
                    .clipShape(RoundedRectangle(cornerRadius: 10))

                TextField("Last name", text: $lastName)
                    .textContentType(.familyName)
                    .autocorrectionDisabled()
                    .padding()
                    .background(.fill.quaternary)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }

            TextField("Email address", text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .padding()
                .background(.fill.quaternary)
                .clipShape(RoundedRectangle(cornerRadius: 10))

            Button(action: handleContinue) {
                Group {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Continue")
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
            }
            .buttonStyle(.borderedProminent)
            .disabled(!canContinue)
        }
    }

    private var otpSection: some View {
        VStack(spacing: 12) {
            Text("Enter the 6-digit code sent to")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Text(emailTrimmed)
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
                resetToInfoStep()
            }
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
    }

    private var photoSection: some View {
        VStack(spacing: 20) {
            Text("Add a profile photo")
                .font(.headline)

            Text("This is optional — you can always add one later in Settings.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            // Photo preview / placeholder
            ZStack {
                Circle()
                    .fill(.fill.tertiary)
                    .frame(width: 100, height: 100)

                if let previewImage {
                    previewImage
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 100, height: 100)
                        .clipShape(Circle())
                } else {
                    Image(systemName: "person.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(.secondary)
                }

                if isUploadingPhoto {
                    Circle()
                        .fill(.ultraThinMaterial)
                        .frame(width: 100, height: 100)
                        .overlay {
                            ProgressView()
                        }
                }
            }
            .onTapGesture {
                showPhotoPicker = true
            }
            .accessibilityLabel("Profile photo, tap to choose")
            .accessibilityAddTraits(.isButton)

            if previewImage == nil {
                Button("Choose Photo") {
                    showPhotoPicker = true
                }
                .buttonStyle(.bordered)
            }

            Button {
                finishSignUp()
            } label: {
                Text(previewImage != nil ? "Save & Continue" : "Skip")
                    .frame(maxWidth: .infinity)
                    .padding()
            }
            .buttonStyle(.borderedProminent)
            .disabled(isUploadingPhoto)

            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }
        }
    }

    // MARK: - Actions

    private func handleContinue() {
        guard !firstNameTrimmed.isEmpty, !lastNameTrimmed.isEmpty, !emailTrimmed.isEmpty else { return }
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let result = try await Clerk.shared.auth.signUp(
                    emailAddress: emailTrimmed,
                    firstName: firstNameTrimmed,
                    lastName: lastNameTrimmed
                )
                // Send the OTP to the user's email
                let updated = try await result.sendEmailCode()
                pendingSignUp = updated
                step = .otp
            } catch {
                // Use a generic message to avoid enumerating existing accounts
                errorMessage = "We couldn't create your account. Please check your details and try again."
            }
            isLoading = false
        }
    }

    private func handleVerifyCode() {
        guard let signUp = pendingSignUp, otpCode.count == 6 else { return }
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let result = try await signUp.verifyEmailCode(otpCode)
                if result.status == .complete {
                    // Sign-up is complete. Clerk.shared.session will update automatically.
                    // Show the optional photo step before AuthGateView transitions.
                    self.pendingSignUp = result
                    step = .photo
                } else {
                    errorMessage = "Verification incomplete. Please try again."
                }
            } catch {
                errorMessage = "Invalid or expired code. Please try again."
            }
            isLoading = false
        }
    }

    private func loadAndUploadPhoto(_ item: PhotosPickerItem) {
        isUploadingPhoto = true
        errorMessage = nil

        Task {
            guard let data = try? await item.loadTransferable(type: Data.self),
                  let uiImage = UIImage(data: data),
                  let jpegData = uiImage.jpegData(compressionQuality: 0.85) else {
                errorMessage = "Could not load the selected image."
                isUploadingPhoto = false
                return
            }

            previewImage = Image(uiImage: uiImage)

            do {
                try await Clerk.shared.user?.setProfileImage(imageData: jpegData)
            } catch {
                // Non-fatal: photo upload failed but sign-up is complete.
                // Clear the preview so the user knows it didn't save.
                previewImage = nil
                errorMessage = "Couldn't upload photo. You can add one later in Settings."
            }
            isUploadingPhoto = false
        }
    }

    private func finishSignUp() {
        // Clearing the binding releases the branch guard in AuthGateView,
        // allowing it to detect the Clerk session and transition to MainView.
        pendingSignUp = nil
    }

    private func resetToInfoStep() {
        pendingSignUp = nil
        otpCode = ""
        errorMessage = nil
        step = .info
    }
}

#Preview {
    SignUpView(pendingSignUp: .constant(nil), onShowSignIn: {})
}
