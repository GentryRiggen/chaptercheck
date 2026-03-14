import SwiftUI

/// Confirmation screen for permanent account deletion.
///
/// Requires the user to type "DELETE" before the destructive action is enabled.
/// On confirmation: calls the backend to delete all data + Clerk user, clears
/// local downloads, and signs out.
struct DeleteAccountView: View {
    @ObservedObject private var convexService = ConvexService.shared
    @Environment(DownloadManager.self) private var downloadManager
    @Environment(\.dismiss) private var dismiss
    @State private var confirmationText = ""
    @State private var isDeleting = false
    @State private var error: String?

    private let userRepository = UserRepository()

    private var isConfirmed: Bool {
        confirmationText.trimmingCharacters(in: .whitespaces).uppercased() == "DELETE"
    }

    var body: some View {
        Form {
            Section {
                VStack(alignment: .leading, spacing: 12) {
                    Label("This action is permanent", systemImage: "exclamationmark.triangle.fill")
                        .font(.headline)
                        .foregroundStyle(.red)

                    Text("Deleting your account will permanently remove:")
                        .font(.subheadline)

                    VStack(alignment: .leading, spacing: 6) {
                        bulletPoint("All your reading progress and history")
                        bulletPoint("Your reviews and ratings")
                        bulletPoint("Your bookshelves and notes")
                        bulletPoint("Your uploaded audio files")
                        bulletPoint("Your account and profile")
                    }
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                    Text("This cannot be undone.")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.red)
                }
                .padding(.vertical, 4)
            }

            Section {
                TextField("Type DELETE to confirm", text: $confirmationText)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
            } footer: {
                Text("Type DELETE in the field above to enable account deletion.")
            }

            if let error {
                Section {
                    Text(error)
                        .foregroundStyle(.red)
                        .font(.subheadline)
                }
            }

            Section {
                Button(role: .destructive) {
                    Task { await deleteAccount() }
                } label: {
                    HStack {
                        Text("Delete My Account")
                        Spacer()
                        if isDeleting {
                            ProgressView()
                                .controlSize(.small)
                        }
                    }
                }
                .disabled(!isConfirmed || isDeleting)
            }
        }
        .navigationTitle("Delete Account")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func bulletPoint(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text("•")
            Text(text)
        }
    }

    private func deleteAccount() async {
        isDeleting = true
        error = nil

        do {
            try await userRepository.deleteAccount()
            downloadManager.deleteAllDownloads()
            UserDefaults.standard.removeObject(forKey: "hasAuthenticatedBefore")
            await convexService.logout()
        } catch {
            self.error = "Failed to delete account. Please try again."
            isDeleting = false
        }
    }
}
