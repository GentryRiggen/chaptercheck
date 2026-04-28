import SwiftUI

/// Sign-out confirmation presented as a sheet from `SettingsView`.
///
/// Modal `.alert` and `.confirmationDialog` presented from sheet-hosted Forms
/// hit a SwiftUI bug on iOS 26 where the destructive button's action closure
/// silently never fires. A sheet-presented Form sidesteps the bug while
/// keeping the modal feel.
struct SignOutConfirmationView: View {
    let onSignOut: () -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Sign out of ChapterCheck?")
                            .font(.headline)
                        Text("Downloaded audiobooks will be removed from this device. You'll need to re-download them after signing back in.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 8)
                }

                Section {
                    Button(role: .destructive) {
                        onSignOut()
                        dismiss()
                    } label: {
                        HStack {
                            Spacer()
                            Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Sign Out")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}
