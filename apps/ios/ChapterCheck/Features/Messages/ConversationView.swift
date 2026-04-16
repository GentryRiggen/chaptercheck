import AVKit
import PhotosUI
import SwiftUI

/// Chat conversation view with message bubbles, text input, and real-time updates.
struct ConversationView: View {

    let otherUserId: String

    @State private var viewModel: ConversationViewModel
    @State private var messageText = ""
    @State private var scrollToBottom = false
    @State private var showAttachmentMenu = false
    @State private var showCamera = false
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var mediaPreview: MediaPreviewItem?
    @State private var captionText = ""
    @State private var isUploading = false
    @State private var uploadProgress: Double = 0
    @Environment(CurrentUserProvider.self) private var currentUserProvider
    @Environment(ThemeManager.self) private var themeManager

    private let networkMonitor = NetworkMonitor.shared
    private let mediaUploader = MessageMediaUploader()

    init(otherUserId: String) {
        self.otherUserId = otherUserId
        _viewModel = State(initialValue: ConversationViewModel(otherUserId: otherUserId))
    }

    private var currentUserId: String { currentUserProvider.currentUser?._id ?? "" }
    private var canSend: Bool { currentUserProvider.currentUser?.permissions.canSendMessages ?? false }

    var body: some View {
        VStack(spacing: 0) {
            // Messages
            messagesContent

            // Input bar or "coming soon" banner
            if canSend {
                inputBar
            } else {
                comingSoonBanner
            }
        }
        .navigationTitle(viewModel.conversationDetail?.otherUser?.displayName ?? "Conversation")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.subscribe()
            Task { await viewModel.markRead() }
        }
        .onDisappear {
            viewModel.unsubscribe()
        }
        .onChange(of: viewModel.messages.count) { _, _ in
            Task { await viewModel.markRead() }
        }
    }

    // MARK: - Messages Content

    private var messagesContent: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 8) {
                    // Load more button
                    if viewModel.hasMore {
                        Button {
                            Task { await viewModel.loadMore() }
                        } label: {
                            if viewModel.isLoadingMore {
                                ProgressView()
                            } else {
                                Text("Load earlier messages")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.top, 8)
                    }

                    // Messages with date separators
                    ForEach(Array(viewModel.messages.enumerated()), id: \.element.id) { index, message in
                        // Check if deleted this session (ephemeral tombstone)
                        if viewModel.deletedMessageIds.contains(message._id) {
                            // Ephemeral tombstone
                            HStack {
                                Spacer()
                                Text("Message deleted")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .italic()
                                Spacer()
                            }
                            .padding(.vertical, 4)
                        } else {
                            // Date separator
                            if shouldShowDateSeparator(at: index) {
                                DateSeparator(date: message.date)
                                    .padding(.vertical, 8)
                            }

                            // Message bubble
                            VStack(spacing: 2) {
                                MessageBubble(
                                    message: message,
                                    isFromCurrentUser: message.senderId == currentUserId,
                                    isLastReadByOther: isLastReadByOther(message),
                                    currentUserId: currentUserId,
                                    onEdit: { newText in
                                        Task { await viewModel.editMessage(messageId: message._id, text: newText) }
                                    },
                                    onDelete: {
                                        Task { await viewModel.deleteMessage(messageId: message._id) }
                                    },
                                    onReact: { emoji in
                                        Task { await viewModel.toggleReaction(messageId: message._id, emoji: emoji) }
                                    },
                                    onCopy: {
                                        if let text = message.text {
                                            UIPasteboard.general.string = text
                                        }
                                    }
                                )

                                // Per-message timestamp
                                if shouldShowTimestamp(at: index) {
                                    HStack {
                                        if message.senderId == currentUserId { Spacer() }
                                        MessageTimestamp(date: message.date)
                                        if message.senderId != currentUserId { Spacer() }
                                    }
                                }
                            }
                            .id(message._id)
                        }
                    }
                }
                .padding(.horizontal, 12)
                .padding(.top, 8)
                .padding(.bottom, 8)
            }
            .onChange(of: viewModel.messages.count) { oldCount, newCount in
                // Scroll to bottom when new messages arrive
                if newCount > oldCount, let lastId = viewModel.messages.last?._id {
                    withAnimation {
                        proxy.scrollTo(lastId, anchor: .bottom)
                    }
                }
            }
            .onAppear {
                // Initial scroll to bottom
                if let lastId = viewModel.messages.last?._id {
                    proxy.scrollTo(lastId, anchor: .bottom)
                }
            }
        }
    }

    // MARK: - Input Bar

    private var inputBar: some View {
        VStack(spacing: 0) {
            // Upload progress
            if isUploading {
                HStack {
                    ProgressView(value: uploadProgress)
                    Text("Sending…")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 4)
            }

            // Offline indicator
            if !networkMonitor.isConnected {
                HStack {
                    Image(systemName: "wifi.slash")
                        .font(.caption2)
                    Text("No connection")
                        .font(.caption2)
                }
                .foregroundStyle(.secondary)
                .padding(.vertical, 4)
            }

            HStack(spacing: 8) {
                // Attachment button
                Menu {
                    PhotosPicker(
                        selection: $selectedPhotoItem,
                        matching: .any(of: [.images, .videos])
                    ) {
                        Label("Photo Library", systemImage: "photo.on.rectangle")
                    }

                    Button {
                        showCamera = true
                    } label: {
                        Label("Camera", systemImage: "camera")
                    }
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 28))
                        .foregroundStyle(Color.accentColor)
                }
                .disabled(!networkMonitor.isConnected || isUploading)

                TextField("Message", text: $messageText, axis: .vertical)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color(.systemGray6), in: RoundedRectangle(cornerRadius: 20))
                    .lineLimit(1...5)

                Button {
                    let text = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !text.isEmpty else { return }
                    messageText = ""
                    Task { await viewModel.sendTextMessage(text) }
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 28))
                        .foregroundStyle(sendButtonColor)
                }
                .disabled(messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !networkMonitor.isConnected || isUploading)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
        }
        .background(.bar)
        .onChange(of: selectedPhotoItem) { _, newItem in
            guard let newItem else { return }
            Task { await handleSelectedMedia(newItem) }
            selectedPhotoItem = nil
        }
        .fullScreenCover(isPresented: $showCamera) {
            MessageCameraPicker { image in
                mediaPreview = .photo(image)
            } onVideoCapture: { url in
                mediaPreview = .video(url)
            }
        }
        .sheet(item: $mediaPreview) { preview in
            MediaPreviewSheet(
                preview: preview,
                caption: $captionText,
                isUploading: isUploading,
                onSend: {
                    Task { await sendMedia(preview) }
                }
            )
        }
    }

    private var sendButtonColor: Color {
        let canSendMessage = !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && networkMonitor.isConnected
        return canSendMessage ? .accentColor : Color(.systemGray4)
    }

    // MARK: - Media Handling

    private func handleSelectedMedia(_ item: PhotosPickerItem) async {
        if let data = try? await item.loadTransferable(type: Data.self),
           let image = UIImage(data: data) {
            mediaPreview = .photo(image)
        } else if let movie = try? await item.loadTransferable(type: VideoTransferable.self) {
            mediaPreview = .video(movie.url)
        }
    }

    private func sendMedia(_ preview: MediaPreviewItem) async {
        var conversationId = viewModel.conversationId
        if conversationId == nil {
            conversationId = try? await ensureConversation()
        }
        guard let conversationId else { return }

        isUploading = true
        uploadProgress = 0
        let caption = captionText.trimmingCharacters(in: .whitespacesAndNewlines)
        captionText = ""

        do {
            switch preview {
            case .photo(let image):
                let result = try await mediaUploader.uploadPhoto(
                    image: image,
                    conversationId: conversationId,
                    onProgress: { progress in uploadProgress = progress }
                )
                let _: SendMessageResult = try await MessagingRepository().sendPhotoMessage(
                    recipientId: otherUserId,
                    mediaR2Key: result.r2Key,
                    mediaWidth: result.width,
                    mediaHeight: result.height,
                    mediaSizeBytes: Double(result.sizeBytes),
                    caption: caption.isEmpty ? nil : caption
                )

            case .video(let url):
                let result = try await mediaUploader.uploadVideo(
                    url: url,
                    conversationId: conversationId,
                    onProgress: { progress in uploadProgress = progress }
                )
                let _: SendMessageResult = try await MessagingRepository().sendVideoMessage(
                    recipientId: otherUserId,
                    mediaR2Key: result.videoR2Key,
                    thumbnailR2Key: result.thumbnailR2Key,
                    mediaWidth: result.width,
                    mediaHeight: result.height,
                    mediaSizeBytes: Double(result.sizeBytes),
                    mediaDurationSeconds: result.durationSeconds,
                    caption: caption.isEmpty ? nil : caption
                )
            }
        } catch {
            viewModel.error = error.localizedDescription
        }

        isUploading = false
        mediaPreview = nil
    }

    private func ensureConversation() async throws -> String {
        let result: SendMessageResult = try await MessagingRepository().sendTextMessage(
            recipientId: otherUserId,
            text: ""
        )
        if let id = result.conversationId {
            return id
        }
        throw MediaError.uploadFailed
    }

    // MARK: - Coming Soon Banner

    private var comingSoonBanner: some View {
        HStack {
            Image(systemName: "bubble.left.and.bubble.right")
                .foregroundStyle(.secondary)
            Text("Messaging coming soon for your account")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color(.systemGray6))
    }

    // MARK: - Helpers

    /// Show a date separator if this message is on a different day than the previous one.
    private func shouldShowDateSeparator(at index: Int) -> Bool {
        guard index > 0 else { return true }
        let current = viewModel.messages[index].date
        let previous = viewModel.messages[index - 1].date
        return !Calendar.current.isDate(current, inSameDayAs: previous)
    }

    /// Show timestamp if it's the last message, or if there's a significant time gap.
    private func shouldShowTimestamp(at index: Int) -> Bool {
        let messages = viewModel.messages
        // Always show on last message
        if index == messages.count - 1 { return true }
        // Show if next message is from a different sender
        if messages[index].senderId != messages[index + 1].senderId { return true }
        // Show if gap > 5 minutes
        let gap = messages[index + 1].createdAt - messages[index].createdAt
        return gap > 5 * 60 * 1000 // 5 minutes in ms
    }

    /// Check if this message is the last one read by the other participant.
    private func isLastReadByOther(_ message: Message) -> Bool {
        guard message.senderId == currentUserId else { return false }
        return viewModel.readState?.otherLastReadMessageId == message._id
    }
}

// MARK: - Media Preview Item

enum MediaPreviewItem: Identifiable {
    case photo(UIImage)
    case video(URL)

    var id: String {
        switch self {
        case .photo: "photo"
        case .video: "video"
        }
    }
}

// MARK: - Video Transferable

struct VideoTransferable: Transferable {
    let url: URL

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(contentType: .movie) { video in
            SentTransferredFile(video.url)
        } importing: { received in
            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(
                "video_\(UUID().uuidString).\(received.file.pathExtension)"
            )
            try FileManager.default.copyItem(at: received.file, to: tempURL)
            return Self(url: tempURL)
        }
    }
}

// MARK: - Media Preview Sheet

struct MediaPreviewSheet: View {
    let preview: MediaPreviewItem
    @Binding var caption: String
    let isUploading: Bool
    let onSend: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack {
                // Preview
                switch preview {
                case .photo(let image):
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: 400)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .padding()

                case .video(let url):
                    VideoPlayer(player: AVPlayer(url: url))
                        .frame(height: 300)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .padding()
                }

                // Caption
                TextField("Add a caption…", text: $caption, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...3)
                    .padding(.horizontal)

                Spacer()
            }
            .navigationTitle("Send Media")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Send") {
                        onSend()
                        dismiss()
                    }
                    .disabled(isUploading)
                }
            }
        }
    }
}

// MARK: - Camera Picker

/// UIImagePickerController wrapper for capturing photos and videos from the camera.
struct MessageCameraPicker: UIViewControllerRepresentable {
    let onPhotoCapture: (UIImage) -> Void
    let onVideoCapture: (URL) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.mediaTypes = ["public.image", "public.movie"]
        picker.videoMaximumDuration = 30
        picker.videoQuality = .typeHigh
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onPhotoCapture: onPhotoCapture, onVideoCapture: onVideoCapture, dismiss: dismiss)
    }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let onPhotoCapture: (UIImage) -> Void
        let onVideoCapture: (URL) -> Void
        let dismiss: DismissAction

        init(onPhotoCapture: @escaping (UIImage) -> Void, onVideoCapture: @escaping (URL) -> Void, dismiss: DismissAction) {
            self.onPhotoCapture = onPhotoCapture
            self.onVideoCapture = onVideoCapture
            self.dismiss = dismiss
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage {
                onPhotoCapture(image)
            } else if let videoURL = info[.mediaURL] as? URL {
                onVideoCapture(videoURL)
            }
            dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            dismiss()
        }
    }
}
