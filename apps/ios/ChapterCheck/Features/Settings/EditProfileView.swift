import ClerkKit
import PhotosUI
import SwiftUI

/// Form for editing the current user's profile photo, first name, and last name.
///
/// Pre-fills from `Clerk.shared.user` on appear. Photo changes are uploaded
/// immediately via Clerk; name changes require tapping Save.
struct EditProfileView: View {
    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.dismiss) private var dismiss

    @State private var firstName = ""
    @State private var lastName = ""
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var didSave = false

    // Photo state
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var previewImage: Image?
    @State private var isUploadingPhoto = false
    @State private var showPhotoOptions = false
    @State private var showCamera = false

    // MARK: - Validation

    private var firstNameTrimmed: String { firstName.trimmingCharacters(in: .whitespaces) }
    private var lastNameTrimmed: String { lastName.trimmingCharacters(in: .whitespaces) }

    private var firstNameError: String? {
        if firstNameTrimmed.isEmpty { return "First name is required." }
        if firstNameTrimmed.count > 100 { return "First name must be 100 characters or fewer." }
        return nil
    }

    private var lastNameError: String? {
        if lastNameTrimmed.count > 100 { return "Last name must be 100 characters or fewer." }
        return nil
    }

    private var canSave: Bool {
        !isSaving && firstNameError == nil && lastNameError == nil
    }

    // MARK: - Body

    var body: some View {
        Form {
            // Profile photo section
            Section {
                HStack {
                    Spacer()
                    photoView
                        .onTapGesture { showPhotoOptions = true }
                    Spacer()
                }
                .listRowBackground(Color.clear)
            }

            Section {
                TextField("First Name", text: $firstName)
                    .textContentType(.givenName)
                    .autocorrectionDisabled()

                if let error = firstNameError, !firstName.isEmpty {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                }

                TextField("Last Name", text: $lastName)
                    .textContentType(.familyName)
                    .autocorrectionDisabled()

                if let error = lastNameError, !lastName.isEmpty {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            } header: {
                Text("Name")
            } footer: {
                Text("Your name is displayed on your public profile.")
            }

            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                        .font(.callout)
                }
            }

            Section {
                Button {
                    save()
                } label: {
                    HStack {
                        Spacer()
                        if isSaving {
                            ProgressView()
                                .tint(.white)
                        } else if didSave {
                            Label("Saved", systemImage: "checkmark")
                        } else {
                            Text("Save Changes")
                        }
                        Spacer()
                    }
                }
                .disabled(!canSave)
            }
        }
        .navigationTitle("Edit Profile")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { prefill() }
        .onChange(of: selectedPhoto) { _, item in
            guard let item else { return }
            loadAndUploadPhoto(item)
        }
        .confirmationDialog("Profile Photo", isPresented: $showPhotoOptions) {
            PhotosPicker(selection: $selectedPhoto, matching: .images) {
                Text("Choose from Library")
            }

            Button("Take Photo") {
                showCamera = true
            }

            if Clerk.shared.user?.hasImage == true {
                Button("Remove Photo", role: .destructive) {
                    removePhoto()
                }
            }
        }
        .fullScreenCover(isPresented: $showCamera) {
            CameraImagePicker { imageData in
                uploadImageData(imageData)
            }
            .ignoresSafeArea()
        }
    }

    // MARK: - Photo View

    @ViewBuilder
    private var photoView: some View {
        ZStack(alignment: .bottom) {
            Group {
                if let previewImage {
                    previewImage
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } else if let imageUrl = Clerk.shared.user?.imageUrl,
                          Clerk.shared.user?.hasImage == true,
                          let url = URL(string: imageUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        default:
                            avatarPlaceholder
                        }
                    }
                } else {
                    avatarPlaceholder
                }
            }
            .frame(width: 90, height: 90)
            .clipShape(Circle())

            if isUploadingPhoto {
                Circle()
                    .fill(.ultraThinMaterial)
                    .frame(width: 90, height: 90)
                    .overlay {
                        ProgressView()
                    }
            }

            // Camera badge
            Image(systemName: "camera.fill")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.white)
                .padding(6)
                .background(.tint, in: Circle())
                .offset(x: 30, y: 2)
        }
        .padding(.vertical, 8)
        .accessibilityLabel("Profile photo, tap to change")
        .accessibilityAddTraits(.isButton)
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(themeManager.accentGradient)
            .frame(width: 90, height: 90)
            .overlay {
                Image(systemName: "person.fill")
                    .font(.title)
                    .foregroundStyle(.white)
            }
    }

    // MARK: - Actions

    private func prefill() {
        guard let user = Clerk.shared.user else { return }
        firstName = user.firstName ?? ""
        lastName = user.lastName ?? ""
    }

    private func save() {
        guard canSave, let user = Clerk.shared.user else { return }
        errorMessage = nil
        isSaving = true

        Task {
            do {
                try await user.update(
                    .init(firstName: firstNameTrimmed, lastName: lastNameTrimmed)
                )
                didSave = true
                isSaving = false
                try await Task.sleep(for: .milliseconds(600))
                dismiss()
            } catch {
                isSaving = false
                errorMessage = error.localizedDescription
            }
        }
    }

    private func loadAndUploadPhoto(_ item: PhotosPickerItem) {
        Task {
            guard let data = try? await item.loadTransferable(type: Data.self) else {
                errorMessage = "Could not load the selected image."
                return
            }
            uploadImageData(data)
        }
    }

    private func uploadImageData(_ data: Data) {
        guard let user = Clerk.shared.user else { return }
        isUploadingPhoto = true
        errorMessage = nil

        if let uiImage = UIImage(data: data) {
            previewImage = Image(uiImage: uiImage)
        }

        Task {
            do {
                let jpegData = compressToJPEG(data)
                try await user.setProfileImage(imageData: jpegData)
                Haptics.selection()
                isUploadingPhoto = false
            } catch {
                isUploadingPhoto = false
                previewImage = nil
                errorMessage = error.localizedDescription
            }
        }
    }

    private func removePhoto() {
        guard let user = Clerk.shared.user else { return }
        isUploadingPhoto = true
        errorMessage = nil
        previewImage = nil

        Task {
            do {
                try await user.deleteProfileImage()
                Haptics.selection()
                isUploadingPhoto = false
            } catch {
                isUploadingPhoto = false
                errorMessage = error.localizedDescription
            }
        }
    }

    /// Compress image data to JPEG, resizing if needed.
    private func compressToJPEG(_ data: Data) -> Data {
        guard let uiImage = UIImage(data: data) else { return data }

        let maxDimension: CGFloat = 800
        let size = uiImage.size

        if size.width > maxDimension || size.height > maxDimension {
            let scale = maxDimension / max(size.width, size.height)
            let newSize = CGSize(width: size.width * scale, height: size.height * scale)
            let renderer = UIGraphicsImageRenderer(size: newSize)
            let resized = renderer.image { _ in
                uiImage.draw(in: CGRect(origin: .zero, size: newSize))
            }
            return resized.jpegData(compressionQuality: 0.85) ?? data
        }

        return uiImage.jpegData(compressionQuality: 0.85) ?? data
    }
}

// MARK: - Camera Image Picker

/// UIImagePickerController wrapper for taking a photo with the camera.
private struct CameraImagePicker: UIViewControllerRepresentable {
    let onCapture: (Data) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.allowsEditing = true
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onCapture: onCapture, dismiss: dismiss)
    }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let onCapture: (Data) -> Void
        let dismiss: DismissAction

        init(onCapture: @escaping (Data) -> Void, dismiss: DismissAction) {
            self.onCapture = onCapture
            self.dismiss = dismiss
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            let image = (info[.editedImage] as? UIImage) ?? (info[.originalImage] as? UIImage)
            if let data = image?.jpegData(compressionQuality: 0.9) {
                onCapture(data)
            }
            dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            dismiss()
        }
    }
}
