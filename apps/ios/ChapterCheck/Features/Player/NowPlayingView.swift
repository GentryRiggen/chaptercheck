import SwiftUI

/// Full-screen now playing sheet with large artwork and transport controls.
///
/// Podcast-app-style layout: category label + title at top, large centered artwork,
/// seek bar → transport → toolbar anchored at bottom.
struct NowPlayingView: View {
    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(DownloadManager.self) private var downloadManager
    @Environment(\.dismiss) private var dismiss
    @Environment(\.navigateToDestination) private var navigateToDestination

    @State private var isPartSelectorPresented = false
    @State private var isAudioSettingsPresented = false
    @State private var isSleepTimerPresented = false
    @State private var showSavedIndicator = false
    @State private var isPlayingAnimated = false

    // Carousel state
    @State private var selectedCarouselPage = 0
    @State private var isReviewSheetPresented = false
    @State private var detailsViewModel = NowPlayingDetailsViewModel()

    // Download banner state
    @State private var showDownloadPrompt = false
    @State private var downloadPromptBook: BookWithDetails?
    @State private var downloadPromptAudioFiles: [AudioFile] = []
    @State private var downloadPromptDismissTask: Task<Void, Never>?
    @State private var isAutoDownloadNoticeVisible = false
    @State private var autoDownloadNoticeTitle: String = ""
    @State private var autoDownloadNoticeDismissTask: Task<Void, Never>?
    @State private var lastHandledEventId: UUID?

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

            // Download banners
            if isAutoDownloadNoticeVisible {
                AutoDownloadNoticeBanner(bookTitle: autoDownloadNoticeTitle)
                    .padding(.horizontal, 16)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }

            if showDownloadPrompt, let book = downloadPromptBook {
                DownloadPromptBanner(
                    bookTitle: book.title,
                    onDownload: {
                        downloadManager.downloadBook(
                            book: book,
                            audioFiles: downloadPromptAudioFiles
                        )
                        dismissDownloadPrompt()
                    },
                    onDismiss: { dismissDownloadPrompt() }
                )
                .padding(.horizontal, 16)
                .transition(.move(edge: .top).combined(with: .opacity))
            }

            // Top: category label + title + part info
            topSection
                .padding(.horizontal, 24)
                .padding(.top, 20)

            Spacer(minLength: 0)

            // Swipeable carousel: cover art ↔ book details
            NowPlayingCarouselView(
                book: audioPlayer.currentBook,
                isPlaying: isPlayingAnimated,
                artworkSize: artworkSize,
                viewModel: detailsViewModel,
                selectedPage: $selectedCarouselPage,
                onNavigate: { destination in
                    navigateToDestination(destination)
                },
                onOpenReview: {
                    isReviewSheetPresented = true
                }
            )
            .frame(height: artworkSize)

            // Page indicator dots
            if audioPlayer.currentBook != nil {
                HStack(spacing: 6) {
                    ForEach(0..<2, id: \.self) { index in
                        Circle()
                            .fill(index == selectedCarouselPage ? Color.primary : Color.secondary.opacity(0.4))
                            .frame(width: 6, height: 6)
                    }
                }
                .padding(.top, 12)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Page \(selectedCarouselPage + 1) of 2")
            }

            Spacer(minLength: 0)

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
            // Handle streaming event that fired before this sheet was presented
            handleStreamingEvent()
            // Subscribe details ViewModel to current book
            if let bookId = audioPlayer.currentBook?._id {
                detailsViewModel.subscribe(bookId: bookId)
            }
        }
        .onDisappear {
            detailsViewModel.unsubscribe()
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
        .onChange(of: audioPlayer.streamingEventId) {
            handleStreamingEvent()
        }
        .onChange(of: audioPlayer.currentBook?._id) { oldId, newId in
            guard newId != oldId else { return }
            detailsViewModel.unsubscribe()
            withAnimation(.easeInOut(duration: 0.3)) {
                selectedCarouselPage = 0
            }
            if let newId {
                detailsViewModel.subscribe(bookId: newId)
            }
        }
        .sheet(isPresented: $isReviewSheetPresented) {
            if let book = audioPlayer.currentBook {
                BookReviewSheet(
                    bookId: book._id,
                    existingUserData: detailsViewModel.userData,
                    allGenres: detailsViewModel.allGenres,
                    existingGenreVoteIds: detailsViewModel.myGenreVoteIds,
                    onSave: { formData in
                        isReviewSheetPresented = false
                        Task {
                            await detailsViewModel.saveReview(bookId: book._id, formData: formData)
                        }
                    },
                    onCancel: {
                        isReviewSheetPresented = false
                    }
                )
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

    // MARK: - Download Banner Helpers

    private func handleStreamingEvent() {
        guard let eventId = audioPlayer.streamingEventId,
              eventId != lastHandledEventId,
              let book = audioPlayer.streamingEventBook else { return }

        lastHandledEventId = eventId

        // Skip if already downloaded or downloading
        if downloadManager.isBookDownloaded(book._id) || downloadManager.isBookDownloading(book._id) { return }

        // Check network preference — skip on cellular if Wi-Fi only
        if audioPlayer.downloadNetwork == "wifi" && NetworkMonitor.shared.isExpensive { return }

        let files = audioPlayer.streamingEventAudioFiles

        if audioPlayer.autoDownloadOnPlay {
            // Auto-download notice (3s)
            autoDownloadNoticeTitle = book.title
            autoDownloadNoticeDismissTask?.cancel()
            withAnimation(.spring(duration: 0.3)) {
                isAutoDownloadNoticeVisible = true
            }
            autoDownloadNoticeDismissTask = Task {
                try? await Task.sleep(for: .seconds(3))
                guard !Task.isCancelled else { return }
                await MainActor.run {
                    withAnimation(.spring(duration: 0.3)) {
                        isAutoDownloadNoticeVisible = false
                    }
                }
            }
        } else {
            // Download prompt (5s auto-dismiss)
            downloadPromptBook = book
            downloadPromptAudioFiles = files
            downloadPromptDismissTask?.cancel()
            withAnimation(.spring(duration: 0.3)) {
                showDownloadPrompt = true
            }
            downloadPromptDismissTask = Task {
                try? await Task.sleep(for: .seconds(5))
                guard !Task.isCancelled else { return }
                await MainActor.run { dismissDownloadPrompt() }
            }
        }
    }

    private func dismissDownloadPrompt() {
        downloadPromptDismissTask?.cancel()
        downloadPromptDismissTask = nil
        withAnimation(.spring(duration: 0.3)) {
            showDownloadPrompt = false
        }
    }

    // MARK: - Bottom Toolbar

    private var bottomToolbar: some View {
        ZStack {
            // Center group: audio settings + sleep timer — screen-centered
            HStack(spacing: 12) {
                // Audio settings
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

                // Sleep timer
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
            }

            // Dismiss button — pinned leading
            HStack {
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

                Spacer()
            }
        }
    }

}
