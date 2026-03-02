import SwiftUI

/// Full-screen now playing sheet with large artwork and transport controls.
///
/// iOS 26-style layout: left-aligned metadata at top, centered hero artwork
/// filling available space, and controls anchored at the bottom.
struct NowPlayingView: View {
    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(\.dismiss) private var dismiss
    @Environment(\.navigateToDestination) private var navigateToDestination

    @State private var isPartSelectorPresented = false

    var body: some View {
        VStack(spacing: 0) {
            // Top: dismiss + title/author
            topSection
                .padding(.horizontal, 20)
                .padding(.top, 28)

            Spacer()

            // Cover artwork — fills available space
            BookCoverView(r2Key: audioPlayer.currentBook?.coverImageR2Key, size: 320)
                .shadow(color: .black.opacity(0.25), radius: 20, y: 10)

            Spacer()

            // Controls group with even spacing
            VStack(spacing: 28) {
                SeekBarView()
                    .padding(.horizontal, 24)

                transportControls

                bottomToolbar
                    .padding(.horizontal, 24)
            }
            .padding(.bottom, 12)
        }
        .background(.background)
        .sheet(isPresented: $isPartSelectorPresented) {
            PartSelectorView()
                .environment(audioPlayer)
                .presentationDetents([.medium, .large])
        }
    }

    // MARK: - Top Section

    private var topSection: some View {
        HStack(alignment: .top, spacing: 12) {
            // Title + author + part — tappable menu for navigation
            VStack(alignment: .leading, spacing: 2) {
                if let book = audioPlayer.currentBook {
                    Menu {
                        Button {
                            navigateToDestination(.book(id: book._id))
                        } label: {
                            Label("Book Details", systemImage: "book")
                        }

                        ForEach(book.authors, id: \._id) { author in
                            Button {
                                navigateToDestination(.author(id: author._id))
                            } label: {
                                Label(author.name, systemImage: "person")
                            }
                        }
                    } label: {
                        HStack(alignment: .firstTextBaseline, spacing: 5) {
                            Text(book.title)
                                .font(.title2)
                                .fontWeight(.bold)
                                .lineLimit(2)
                                .multilineTextAlignment(.leading)

                            Image(systemName: "chevron.down")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(.tertiary)
                        }
                    }
                    .buttonStyle(.plain)

                    if let authorName = book.authors.first?.name {
                        Text(authorName)
                            .font(.title3)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                } else {
                    Text("Unknown")
                        .font(.headline)
                }

                if let partInfo = audioPlayer.partInfo {
                    Text("Part \(partInfo.current) of \(partInfo.total)")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                } else if let displayName = audioPlayer.currentAudioFile?.displayName,
                          audioPlayer.audioFiles.count > 1 {
                    Text(displayName)
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                }
            }

            Spacer()
        }
    }

    // MARK: - Transport Controls

    private var transportControls: some View {
        HStack(spacing: 40) {
            Button {
                Haptics.light()
                audioPlayer.skipBackward()
            } label: {
                Image(systemName: "gobackward.15")
                    .font(.system(size: 20))
                    .foregroundStyle(.primary)
                    .frame(width: 44, height: 44)
                    .modifier(GlassCircleModifier())
            }

            Button {
                Haptics.medium()
                audioPlayer.togglePlayPause()
            } label: {
                ZStack {
                    Circle()
                        .fill(Color.accentColor.opacity(0.3))
                        .frame(width: 72, height: 72)
                        .overlay(
                            Circle()
                                .fill(.ultraThinMaterial)
                        )
                        .overlay(
                            Circle()
                                .fill(Color.accentColor.opacity(0.25))
                        )
                        .clipShape(Circle())

                    if audioPlayer.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: audioPlayer.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 26))
                            .foregroundStyle(.white)
                            .offset(x: audioPlayer.isPlaying ? 0 : 2)
                    }
                }
            }

            Button {
                Haptics.light()
                audioPlayer.skipForward()
            } label: {
                Image(systemName: "goforward.30")
                    .font(.system(size: 20))
                    .foregroundStyle(.primary)
                    .frame(width: 44, height: 44)
                    .modifier(GlassCircleModifier())
            }
        }
    }

    // MARK: - Bottom Toolbar

    private var bottomToolbar: some View {
        ZStack {
            // Speed control — centered
            SpeedControlView()

            HStack {
                // Dismiss button — leading
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.down")
                        .font(.body.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                        .modifier(GlassCircleModifier())
                }

                Spacer()

                // Parts button — trailing
                if audioPlayer.audioFiles.count > 1 {
                    Button {
                        isPartSelectorPresented = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "list.bullet")
                            Text("Parts")
                                .font(.subheadline)
                        }
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .modifier(GlassCapsuleModifier())
                    }
                }
            }
        }
    }

}

// MARK: - Glass Modifiers

private struct GlassCircleModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(.ultraThinMaterial, in: Circle())
    }
}

private struct GlassCapsuleModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(.ultraThinMaterial, in: Capsule())
    }
}
