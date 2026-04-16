import AVKit
import SwiftUI

/// A single message bubble in the conversation view.
struct MessageBubble: View {

    let message: Message
    let isFromCurrentUser: Bool
    let isLastReadByOther: Bool
    let currentUserId: String
    let onEdit: (String) -> Void
    let onDelete: () -> Void
    let onReact: (String) -> Void
    let onCopy: () -> Void

    @State private var showEditSheet = false
    @State private var showReactionPicker = false
    @State private var editText = ""
    @State private var mediaUrl: URL?
    @State private var showFullScreenImage = false
    @State private var showVideoPlayer = false

    @Environment(ThemeManager.self) private var themeManager

    var body: some View {
        VStack(alignment: isFromCurrentUser ? .trailing : .leading, spacing: 2) {
            // Bubble
            HStack {
                if isFromCurrentUser { Spacer(minLength: 60) }

                VStack(alignment: isFromCurrentUser ? .trailing : .leading, spacing: 4) {
                    // Media content
                    if message.isPhoto, let _ = message.mediaR2Key {
                        photoContent
                    } else if message.isVideo, let _ = message.thumbnailR2Key {
                        videoThumbnailContent
                    }

                    // Text content or caption
                    if let text = message.text, !text.isEmpty {
                        Text(text)
                            .font(.body)
                            .foregroundStyle(isFromCurrentUser ? .white : .primary)
                    }

                    // Edited indicator
                    if message.isEdited {
                        Text("edited")
                            .font(.caption2)
                            .foregroundStyle(isFromCurrentUser ? .white.opacity(0.7) : .secondary)
                    }
                }
                .padding(message.isPhoto || message.isVideo ? 4 : 0)
                .padding(.horizontal, message.isText ? 14 : 0)
                .padding(.vertical, message.isText ? 10 : 0)
                .background(bubbleBackground)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .contextMenu { contextMenuItems }

                if !isFromCurrentUser { Spacer(minLength: 60) }
            }

            // Reactions
            if let reactions = message.reactions, !reactions.isEmpty {
                reactionsView(reactions)
            }

            // Read receipt
            if isFromCurrentUser && isLastReadByOther {
                Text("Read")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .padding(.trailing, 4)
            }
        }
        .sheet(isPresented: $showEditSheet) {
            editMessageSheet
        }
        .sheet(isPresented: $showReactionPicker) {
            ReactionPicker { emoji in
                showReactionPicker = false
                onReact(emoji)
            }
            .presentationDetents([.height(80)])
            .presentationDragIndicator(.visible)
        }
    }

    // MARK: - Photo Content

    @ViewBuilder
    private var photoContent: some View {
        if let r2Key = message.mediaR2Key {
            MessageMediaImage(r2Key: r2Key)
                .frame(maxWidth: 240, maxHeight: 320)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .onTapGesture { showFullScreenImage = true }
                .fullScreenCover(isPresented: $showFullScreenImage) {
                    MessageMediaImage(r2Key: r2Key)
                        .ignoresSafeArea()
                        .overlay(alignment: .topTrailing) {
                            Button { showFullScreenImage = false } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.title)
                                    .foregroundStyle(.white)
                                    .padding()
                            }
                        }
                        .background(Color.black)
                }
        }
    }

    // MARK: - Video Thumbnail Content

    @ViewBuilder
    private var videoThumbnailContent: some View {
        if let thumbnailKey = message.thumbnailR2Key {
            ZStack {
                MessageMediaImage(r2Key: thumbnailKey)
                    .frame(maxWidth: 240, maxHeight: 320)
                    .clipShape(RoundedRectangle(cornerRadius: 14))

                Image(systemName: "play.circle.fill")
                    .font(.system(size: 44))
                    .foregroundStyle(.white)
                    .shadow(radius: 4)
            }
            .onTapGesture { showVideoPlayer = true }
            .fullScreenCover(isPresented: $showVideoPlayer) {
                MessageVideoPlayer(r2Key: message.mediaR2Key ?? "")
            }
        }
    }

    // MARK: - Bubble Background

    private var bubbleBackground: some ShapeStyle {
        if isFromCurrentUser {
            return AnyShapeStyle(Color.accentColor)
        } else {
            return AnyShapeStyle(Color(.systemGray5))
        }
    }

    // MARK: - Context Menu

    @ViewBuilder
    private var contextMenuItems: some View {
        if message.isText {
            Button {
                onCopy()
            } label: {
                Label("Copy", systemImage: "doc.on.doc")
            }
        }

        if isFromCurrentUser && message.isText {
            Button {
                editText = message.text ?? ""
                showEditSheet = true
            } label: {
                Label("Edit", systemImage: "pencil")
            }
        }

        if isFromCurrentUser {
            Button(role: .destructive) {
                onDelete()
            } label: {
                Label("Delete for Everyone", systemImage: "trash")
            }
        }

        Button {
            showReactionPicker = true
        } label: {
            Label("Add Reaction", systemImage: "face.smiling")
        }
    }

    // MARK: - Reactions View

    private func reactionsView(_ reactions: [MessageReaction]) -> some View {
        HStack(spacing: 4) {
            ForEach(reactions, id: \.userId) { reaction in
                Text(reaction.emoji)
                    .font(.caption)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color(.systemGray6), in: Capsule())
            }
        }
        .padding(.horizontal, 4)
    }

    // MARK: - Edit Sheet

    private var editMessageSheet: some View {
        NavigationStack {
            VStack {
                TextField("Message", text: $editText, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .padding()
                Spacer()
            }
            .navigationTitle("Edit Message")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showEditSheet = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let trimmed = editText.trimmingCharacters(in: .whitespacesAndNewlines)
                        if !trimmed.isEmpty {
                            onEdit(trimmed)
                        }
                        showEditSheet = false
                    }
                    .disabled(editText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Date Separator

/// A date pill separator between message groups.
struct DateSeparator: View {
    let date: Date

    var body: some View {
        Text(formattedDate)
            .font(.caption)
            .foregroundStyle(.secondary)
            .padding(.horizontal, 12)
            .padding(.vertical, 4)
            .background(Color(.systemGray6), in: Capsule())
    }

    private var formattedDate: String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            return "Today"
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "MMMM d, yyyy"
            return formatter.string(from: date)
        }
    }
}

// MARK: - Message Timestamp

/// Small timestamp below a message.
struct MessageTimestamp: View {
    let date: Date

    var body: some View {
        Text(formattedTime)
            .font(.caption2)
            .foregroundStyle(.tertiary)
    }

    private var formattedTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date)
    }
}

// MARK: - Message Media Image

/// Loads and displays an image from an R2 key via presigned URL.
struct MessageMediaImage: View {
    let r2Key: String

    @State private var imageURL: URL?
    @State private var isLoading = true

    var body: some View {
        Group {
            if let imageURL {
                AsyncImage(url: imageURL) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    case .failure:
                        imagePlaceholder(systemName: "exclamationmark.triangle")
                    default:
                        ProgressView()
                            .frame(width: 200, height: 150)
                    }
                }
            } else if isLoading {
                ProgressView()
                    .frame(width: 200, height: 150)
            } else {
                imagePlaceholder(systemName: "photo")
            }
        }
        .task { await loadURL() }
    }

    private func loadURL() async {
        do {
            let result = try await MessagingRepository().generateMediaUrl(r2Key: r2Key)
            imageURL = URL(string: result.url)
        } catch {
            // Failed to get presigned URL
        }
        isLoading = false
    }

    private func imagePlaceholder(systemName: String) -> some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(Color(.systemGray5))
            .frame(width: 200, height: 150)
            .overlay {
                Image(systemName: systemName)
                    .foregroundStyle(.secondary)
            }
    }
}

// MARK: - Message Video Player

/// Full-screen video player that loads from an R2 key via presigned URL.
struct MessageVideoPlayer: View {
    let r2Key: String

    @State private var videoURL: URL?
    @State private var isLoading = true
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if let videoURL {
                VideoPlayer(player: AVPlayer(url: videoURL))
                    .ignoresSafeArea()
            } else if isLoading {
                ProgressView()
                    .tint(.white)
            } else {
                Text("Could not load video")
                    .foregroundStyle(.white)
            }
        }
        .overlay(alignment: .topTrailing) {
            Button { dismiss() } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.title)
                    .foregroundStyle(.white)
                    .padding()
            }
        }
        .task { await loadURL() }
    }

    private func loadURL() async {
        do {
            let result = try await MessagingRepository().generateMediaUrl(r2Key: r2Key)
            videoURL = URL(string: result.url)
        } catch {
            // Failed to get presigned URL
        }
        isLoading = false
    }
}
