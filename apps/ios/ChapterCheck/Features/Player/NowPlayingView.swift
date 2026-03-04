import SwiftUI

/// Full-screen now playing sheet with large artwork and transport controls.
///
/// Podcast-app-style layout: category label + title at top, large centered artwork,
/// seek bar → transport → toolbar anchored at bottom.
struct NowPlayingView: View {
    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(\.dismiss) private var dismiss
    @Environment(\.navigateToDestination) private var navigateToDestination

    @State private var isPartSelectorPresented = false
    @State private var isAudioSettingsPresented = false
    @State private var isSleepTimerPresented = false
    @State private var showSavedIndicator = false
    @State private var isPlayingAnimated = false

    /// Artwork fills width minus 48pt padding, capped at 400 for iPad.
    private var artworkSize: CGFloat {
        min(UIScreen.main.bounds.width - 48, 400)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Drag handle — tapping dismisses the sheet
            Button {
                dismiss()
            } label: {
                Capsule()
                    .fill(.tertiary)
                    .frame(width: 36, height: 5)
                    .padding(.top, 8)
                    .padding(.bottom, 4)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Dismiss player")

            // Top: category label + title + part info
            topSection
                .padding(.horizontal, 24)
                .padding(.top, 20)

            Spacer()

            // Cover artwork — scales up when playing, down when paused (iOS Music app effect)
            BookCoverView(r2Key: audioPlayer.currentBook?.coverImageR2Key, size: artworkSize)
                .scaleEffect(isPlayingAnimated ? 1.0 : 0.85)
                .shadow(color: .black.opacity(0.25), radius: isPlayingAnimated ? 20 : 10, y: isPlayingAnimated ? 10 : 5)

            Spacer()

            // Seek bar
            SeekBarView()
                .padding(.horizontal, 24)

            // Transport controls — vertically centered between seek bar and bottom toolbar
            Spacer()
            transportControls
            Spacer()

            // Bottom toolbar
            bottomToolbar
                .padding(.horizontal, 24)
                .padding(.bottom, 12)
        }
        .overlay(alignment: .bottom) {
            HStack(spacing: 4) {
                Image(systemName: "checkmark")
                Text("Saved")
            }
            .font(.caption2)
            .foregroundStyle(.tertiary)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(.ultraThinMaterial, in: Capsule())
            .opacity(showSavedIndicator ? 1 : 0)
            .animation(.easeInOut(duration: 0.3), value: showSavedIndicator)
            .accessibilityLabel("Progress saved")
            .accessibilityHidden(!showSavedIndicator)
            .padding(.bottom, -6)
        }
        .background(.background)
        .onAppear {
            isPlayingAnimated = audioPlayer.isPlaying
        }
        .onChange(of: audioPlayer.isPlaying) {
            withAnimation(.spring(duration: 0.5, bounce: 0.2)) {
                isPlayingAnimated = audioPlayer.isPlaying
            }
        }
        .onChange(of: audioPlayer.lastSavedAt) {
            showSavedIndicator = true
            Task {
                try? await Task.sleep(for: .seconds(2))
                await MainActor.run {
                    showSavedIndicator = false
                }
            }
        }
        .sheet(isPresented: $isPartSelectorPresented) {
            PartSelectorView()
                .environment(audioPlayer)
                .presentationDetents([.medium, .large])
        }
        .sheet(isPresented: $isAudioSettingsPresented) {
            AudioSettingsSheet()
                .environment(audioPlayer)
        }
        .sheet(isPresented: $isSleepTimerPresented) {
            SleepTimerSheet()
                .environment(audioPlayer)
        }
    }

    // MARK: - Top Section

    /// Returns a category label like "THE STORMLIGHT ARCHIVE #2", or the author name as fallback.
    /// Returns nil when neither series nor authors are available.
    private func categoryLabel(for book: BookWithDetails) -> String? {
        if let series = book.series {
            if let order = book.seriesOrder {
                let formatted = order.rounded() == order
                    ? String(format: "%.0f", order)
                    : String(format: "%g", order)
                return "\(series.name) #\(formatted)".uppercased()
            }
            return series.name.uppercased()
        }
        guard let name = book.authors.first?.name else { return nil }
        return name.uppercased()
    }

    private var topSection: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                if let book = audioPlayer.currentBook {
                    // Category line: series or author
                    if let category = categoryLabel(for: book) {
                        Text(category)
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }

                    Text(book.title)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
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
        HStack(spacing: 24) {
            Button {
                Haptics.light()
                audioPlayer.skipBackward()
            } label: {
                Image(systemName: audioPlayer.skipBackwardSymbol)
                    .contentTransition(.symbolEffect(.replace))
                    .font(.system(size: 42))
                    .foregroundStyle(.tint)
                    .frame(width: 72, height: 72)
            }
            .buttonStyle(.plain)
            .contentShape(Circle())

            Button {
                Haptics.medium()
                audioPlayer.togglePlayPause()
            } label: {
                if audioPlayer.isLoading {
                    ProgressView()
                        .frame(width: 80, height: 80)
                } else {
                    Image(systemName: audioPlayer.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(.tint)
                        .offset(x: audioPlayer.isPlaying ? 0 : 3)
                        .frame(width: 80, height: 80)
                }
            }
            .buttonStyle(.plain)
            .contentShape(Circle())

            Button {
                Haptics.light()
                audioPlayer.skipForward()
            } label: {
                Image(systemName: audioPlayer.skipForwardSymbol)
                    .contentTransition(.symbolEffect(.replace))
                    .font(.system(size: 42))
                    .foregroundStyle(.tint)
                    .frame(width: 72, height: 72)
            }
            .buttonStyle(.plain)
            .contentShape(Circle())
        }
    }

    // MARK: - Bottom Toolbar

    private var bottomToolbar: some View {
        HStack {
            // Dismiss button — leading
            Button {
                dismiss()
            } label: {
                Image(systemName: "chevron.down")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .frame(width: 44, height: 44)
                    .background(.ultraThinMaterial, in: Circle())
            }
            .buttonStyle(.plain)
            .contentShape(Circle())

            // Info button — navigate to book or author
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
                    Image(systemName: "info.circle")
                        .font(.body.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .frame(width: 44, height: 44)
                        .background(.ultraThinMaterial, in: Circle())
                }
                .accessibilityLabel("Book info")
            }

            Spacer()

            // Parts button — center-ish
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
                }
                .buttonStyle(.plain)
                .contentShape(Capsule())
            }

            Spacer()

            // Sleep timer — trailing
            Button {
                Haptics.light()
                isSleepTimerPresented = true
            } label: {
                VStack(spacing: 2) {
                    Image(systemName: audioPlayer.isSleepTimerActive ? "moon.zzz.fill" : "moon.zzz")
                        .font(.body.weight(.semibold))
                        .foregroundStyle(audioPlayer.isSleepTimerActive ? AnyShapeStyle(.tint) : AnyShapeStyle(.secondary))
                    if audioPlayer.isSleepTimerActive {
                        Text(audioPlayer.formattedSleepTimer)
                            .font(.system(size: 9, weight: .medium))
                            .monospacedDigit()
                            .foregroundStyle(.tint)
                    }
                }
                .frame(width: 44, height: 44)
                .background(.ultraThinMaterial, in: Circle())
            }
            .buttonStyle(.plain)
            .contentShape(Circle())
            .accessibilityLabel(audioPlayer.isSleepTimerActive ? "Sleep timer \(audioPlayer.formattedSleepTimer) remaining" : "Sleep timer")

            // Audio settings — trailing
            Button {
                Haptics.light()
                isAudioSettingsPresented = true
            } label: {
                Image(systemName: "waveform")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .frame(width: 44, height: 44)
                    .background(.ultraThinMaterial, in: Circle())
            }
            .buttonStyle(.plain)
            .contentShape(Circle())
            .accessibilityLabel("Audio settings")
        }
    }

}
