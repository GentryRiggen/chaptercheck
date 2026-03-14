import ClerkKit
import Combine
import CropViewController
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
    @State private var isProfilePrivate = false
    @State private var hasInitializedPrivacy = false
    @State private var privacyCancellable: AnyCancellable?

    // Photo state
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var previewImage: Image?
    @State private var isUploadingPhoto = false
    @State private var showPhotoOptions = false
    @State private var showRemovePhotoConfirmation = false
    @State private var showCamera = false
    @State private var showPhotoPicker = false
    @State private var imageToCrop: UIImage?
    @State private var showCropper = false

    // MARK: - Validation

    private var currentEmail: String {
        Clerk.shared.user?.emailAddresses
            .first(where: { $0.id == Clerk.shared.user?.primaryEmailAddressId })?
            .emailAddress ?? ""
    }

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

            // Email section
            Section {
                HStack {
                    Text(currentEmail)
                        .foregroundStyle(.primary)
                    Spacer()
                    NavigationLink("Change") {
                        ChangeEmailView()
                    }
                    .fixedSize()
                }
            } header: {
                Text("Email")
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

            Section {
                Toggle("Private Profile", isOn: $isProfilePrivate)
                    .onChange(of: isProfilePrivate) { _, newValue in
                        guard hasInitializedPrivacy else { return }
                        Task {
                            do {
                                try await UserRepository().updateProfilePrivacy(isPrivate: newValue)
                            } catch {
                                errorMessage = "Failed to update privacy setting."
                                isProfilePrivate = !newValue
                            }
                        }
                    }
            } header: {
                Text("Privacy")
            } footer: {
                Text("When enabled, other users won't see your read books, reviews, or shelves.")
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
        .onAppear {
            prefill()
            prefillPrivacy()
        }
        .onChange(of: selectedPhoto) { _, item in
            guard let item else { return }
            loadImageForCropping(item)
        }
        .confirmationDialog("Profile Photo", isPresented: $showPhotoOptions) {
            Button("Choose from Library") {
                showPhotoPicker = true
            }

            Button("Take Photo") {
                showCamera = true
            }

            if Clerk.shared.user?.hasImage == true {
                Button("Remove Photo", role: .destructive) {
                    showRemovePhotoConfirmation = true
                }
            }
        }
        .confirmationDialog(
            "Remove profile photo?",
            isPresented: $showRemovePhotoConfirmation,
            titleVisibility: .visible
        ) {
            Button("Remove Photo", role: .destructive) {
                removePhoto()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will remove your current profile photo.")
        }
        .photosPicker(isPresented: $showPhotoPicker, selection: $selectedPhoto, matching: .images)
        .fullScreenCover(isPresented: $showCamera) {
            CameraImagePicker { image in
                imageToCrop = image
                showCropper = true
            }
            .ignoresSafeArea()
        }
        .fullScreenCover(isPresented: $showCropper, onDismiss: { imageToCrop = nil }) {
            if let imageToCrop {
                ProfileImageCropper(image: imageToCrop) { croppedImage in
                    uploadCroppedImage(croppedImage)
                }
                .ignoresSafeArea()
            }
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

    private func prefillPrivacy() {
        guard !hasInitializedPrivacy,
              let publisher = UserRepository().subscribeToCurrentUser() else { return }
        privacyCancellable?.cancel()
        privacyCancellable = publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { user in
                    if !hasInitializedPrivacy, let user {
                        isProfilePrivate = user.isProfilePrivate
                        hasInitializedPrivacy = true
                    }
                    privacyCancellable?.cancel()
                    privacyCancellable = nil
                }
            )
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

    private func loadImageForCropping(_ item: PhotosPickerItem) {
        Task {
            guard let data = try? await item.loadTransferable(type: Data.self),
                  let image = UIImage(data: data) else {
                errorMessage = "Could not load the selected image."
                return
            }
            imageToCrop = image
            showCropper = true
        }
    }

    private func uploadCroppedImage(_ image: UIImage) {
        guard let user = Clerk.shared.user else { return }
        isUploadingPhoto = true
        errorMessage = nil
        previewImage = Image(uiImage: image)

        Task {
            do {
                let jpegData = compressToJPEG(image)
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

    /// Compress a UIImage to JPEG, resizing if needed.
    private func compressToJPEG(_ uiImage: UIImage) -> Data {
        let maxDimension: CGFloat = 800
        let size = uiImage.size
        let fallback = uiImage.jpegData(compressionQuality: 0.85) ?? Data()

        if size.width > maxDimension || size.height > maxDimension {
            let scale = maxDimension / max(size.width, size.height)
            let newSize = CGSize(width: size.width * scale, height: size.height * scale)
            let renderer = UIGraphicsImageRenderer(size: newSize)
            let resized = renderer.image { _ in
                uiImage.draw(in: CGRect(origin: .zero, size: newSize))
            }
            return resized.jpegData(compressionQuality: 0.85) ?? fallback
        }

        return fallback
    }
}

// MARK: - Camera Image Picker

/// UIImagePickerController wrapper that returns the raw UIImage (no built-in crop).
private struct CameraImagePicker: UIViewControllerRepresentable {
    let onCapture: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.allowsEditing = false
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onCapture: onCapture, dismiss: dismiss)
    }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let onCapture: (UIImage) -> Void
        let dismiss: DismissAction

        init(onCapture: @escaping (UIImage) -> Void, dismiss: DismissAction) {
            self.onCapture = onCapture
            self.dismiss = dismiss
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage {
                onCapture(image)
            }
            dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            dismiss()
        }
    }
}

// MARK: - Profile Image Cropper

/// Wraps TOCropViewController with a circular crop preset for profile photos.
private struct ProfileImageCropper: UIViewControllerRepresentable {
    let image: UIImage
    let onCropped: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> CropViewController {
        let cropVC = CropViewController(croppingStyle: .circular, image: image)
        cropVC.delegate = context.coordinator
        cropVC.aspectRatioPreset = .presetSquare
        cropVC.aspectRatioLockEnabled = true
        cropVC.resetAspectRatioEnabled = false
        cropVC.aspectRatioPickerButtonHidden = true
        return cropVC
    }

    func updateUIViewController(_ uiViewController: CropViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onCropped: onCropped, dismiss: dismiss)
    }

    final class Coordinator: NSObject, CropViewControllerDelegate {
        let onCropped: (UIImage) -> Void
        let dismiss: DismissAction

        init(onCropped: @escaping (UIImage) -> Void, dismiss: DismissAction) {
            self.onCropped = onCropped
            self.dismiss = dismiss
        }

        func cropViewController(_ cropViewController: CropViewController, didCropToCircularImage image: UIImage, withRect cropRect: CGRect, angle: Int) {
            onCropped(image)
            dismiss()
        }

        func cropViewController(_ cropViewController: CropViewController, didFinishCancelled cancelled: Bool) {
            dismiss()
        }
    }
}
