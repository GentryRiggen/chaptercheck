import Combine
import ConvexMobile
import SwiftUI

/// Root view for the Profile tab.
///
/// Subscribes to the current user to obtain the user ID, then renders the
/// existing `ProfileView`. A settings gear toolbar button opens `SettingsView`.
struct ProfileTabView: View {
    @State private var currentUser: UserWithPermissions?
    @State private var cancellable: AnyCancellable?
    @State private var isSettingsPresented = false
    @State private var isEditProfilePresented = false
    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(DownloadManager.self) private var downloadManager
    @Environment(ThemeManager.self) private var themeManager

    private let userRepository = UserRepository()

    var body: some View {
        Group {
            if let user = currentUser {
                ProfileView(userId: user._id)
            } else {
                ProgressView("Loading profile…")
            }
        }
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button {
                    isEditProfilePresented = true
                } label: {
                    Image(systemName: "pencil")
                }
                .accessibilityLabel("Edit Profile")

                Button {
                    isSettingsPresented = true
                } label: {
                    Image(systemName: "gearshape")
                }
                .accessibilityLabel("Settings")
            }
        }
        .sheet(isPresented: $isEditProfilePresented) {
            NavigationStack {
                EditProfileView()
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Done") { isEditProfilePresented = false }
                        }
                    }
            }
            .preferredColorScheme(themeManager.preferredColorScheme)
        }
        .sheet(isPresented: $isSettingsPresented) {
            SettingsView()
                .environment(audioPlayer)
                .environment(downloadManager)
                .preferredColorScheme(themeManager.preferredColorScheme)
        }
        .onAppear { subscribe() }
        .onDisappear {
            cancellable?.cancel()
            cancellable = nil
        }
    }

    private func subscribe() {
        guard cancellable == nil,
              let publisher = userRepository.subscribeToCurrentUser() else { return }

        cancellable = publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { user in
                    currentUser = user
                }
            )
    }
}
