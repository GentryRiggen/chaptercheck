import AVKit
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
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.showToast) private var showToast
    @Environment(CurrentUserProvider.self) private var currentUserProvider
    @Environment(GenreProvider.self) private var genreProvider
    @Environment(TagProvider.self) private var tagProvider

    @State private var isPartSelectorPresented = false
    @State private var isAudioSettingsPresented = false
    @State private var isSleepTimerPresented = false
    @State private var isNoteComposerPresented = false
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

    private var isDetailsPageActive: Bool {
        selectedCarouselPage == 1 && audioPlayer.currentBook != nil
    }

    /// Carousel expansion (100pt) is exactly offset by spacing reductions below
    /// so the total VStack height stays constant — expansion goes downward only.
    private var carouselHeight: CGFloat {
        artworkSize + (isDetailsPageActive ? 100 : 0)
    }

    private var topToCarouselSpacing: CGFloat {
        isDetailsPageActive ? 10 : 28 // −18
    }

    private var carouselToSeekSpacing: CGFloat {
        isDetailsPageActive ? 6 : 26 // −20
    }

    private var seekToTransportSpacing: CGFloat {
        isDetailsPageActive ? 8 : 34 // −26
    }

    private var transportToToolbarSpacing: CGFloat {
        isDetailsPageActive ? 6 : 30 // −24
    }

    private var indicatorTopPadding: CGFloat {
        isDetailsPageActive ? 0 : 12 // −12
    }
    // Total spacing reduction: 18+20+26+24+12 = 100 ✓

    private var totalBookDurationSeconds: Double? {
        let summedDuration = audioPlayer.audioFiles.reduce(0.0) { partialResult, file in
            partialResult + file.duration
        }
        if summedDuration > 0 {
            return summedDuration
        }
        if let bookDuration = audioPlayer.currentBook?.duration, bookDuration > 0 {
            return bookDuration
        }
        if audioPlayer.duration > 0 {
            return audioPlayer.duration
        }
        return nil
    }

    private let transportSkipSize: CGFloat = 42
    private let transportPlaySize: CGFloat = 56
    private let transportSkipFrame: CGFloat = 72
    private let transportPlayFrame: CGFloat = 80
    private let transportSpacing: CGFloat = 24

    private var auxiliaryButtonForeground: Color {
        colorScheme == .dark ? Color.white.opacity(0.92) : Color.black.opacity(0.88)
    }

    private var auxiliaryButtonUIColor: UIColor {
        colorScheme == .dark
            ? UIColor.white.withAlphaComponent(0.92)
            : UIColor.black.withAlphaComponent(0.88)
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
                    .padding(.top, 16)
                    .padding(.bottom, 4)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Dismiss player")

            // Top: category label + title + part info
            topSection
                .padding(.horizontal, 24)
                .padding(.top, 20)

            Color.clear
                .frame(height: topToCarouselSpacing)

            // Swipeable carousel: cover art ↔ book details
            NowPlayingCarouselView(
                book: audioPlayer.currentBook,
                isPlaying: isPlayingAnimated,
                artworkSize: artworkSize,
                totalDurationSeconds: totalBookDurationSeconds,
                totalPartCount: audioPlayer.audioFiles.count,
                viewModel: detailsViewModel,
                selectedPage: $selectedCarouselPage,
                onNavigate: { destination in
                    navigateToDestination(destination)
                },
                onOpenReview: {
                    isReviewSheetPresented = true
                }
            )
            .frame(height: carouselHeight, alignment: .top)

            // Page indicator dots
            if audioPlayer.currentBook != nil {
                HStack(spacing: 6) {
                    ForEach(0..<2, id: \.self) { index in
                        Circle()
                            .fill(index == selectedCarouselPage ? Color.primary : Color.secondary.opacity(0.4))
                            .frame(width: 6, height: 6)
                    }
                }
                .padding(.top, indicatorTopPadding)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Page \(selectedCarouselPage + 1) of 2")
            }

            Color.clear
                .frame(height: carouselToSeekSpacing)

            seekBarSection

            // Slider seek undo banner
            sliderSeekUndoSection

            // Transport controls — vertically centered between seek bar and bottom toolbar
            Color.clear
                .frame(height: seekToTransportSpacing)

            transportControls

            Color.clear
                .frame(height: transportToToolbarSpacing)

            // Inline error banner — shown when the player encounters an error
            if let errorMessage = audioPlayer.error {
                playerErrorBanner(errorMessage)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 8)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }

            // Bottom toolbar
            bottomToolbar
                .padding(.horizontal, 24)
                .padding(.bottom, 12)

        }
        .overlay(alignment: .top) {
            downloadBannerOverlay
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
        .animation(.spring(duration: 0.45, bounce: 0.12), value: selectedCarouselPage)
        .onAppear {
            isPlayingAnimated = audioPlayer.isPlaying
            detailsViewModel.showToast = { toast in showToast(toast) }
            // Sync shared provider values into the ViewModel immediately
            detailsViewModel.currentUser = currentUserProvider.currentUser
            detailsViewModel.allGenres = genreProvider.allGenres
            detailsViewModel.noteTags = tagProvider.tags
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
        .onChange(of: currentUserProvider.currentUser?.id) { _, _ in
            detailsViewModel.currentUser = currentUserProvider.currentUser
        }
        .onChange(of: genreProvider.allGenres) { _, genres in
            detailsViewModel.allGenres = genres
        }
        .onChange(of: tagProvider.tags) { _, tags in
            detailsViewModel.noteTags = tags
        }
        .sheet(isPresented: $isReviewSheetPresented) {
            if let book = audioPlayer.currentBook {
                BookReviewSheet(
                    bookId: book._id,
                    existingUserData: detailsViewModel.userData,
                    allGenres: detailsViewModel.allGenres,
                    existingGenreVoteIds: detailsViewModel.myGenreVoteIds,
                    canCreateGenres: detailsViewModel.currentUser?.permissions.canCreateContent == true,
                    genreRepository: detailsViewModel.genreRepository,
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
        .sheet(isPresented: $isNoteComposerPresented) {
            if let context = noteComposerContext {
                BookNoteComposerSheet(
                    context: context,
                    tags: detailsViewModel.noteTags,
                    onSave: { payload in
                        try await detailsViewModel.createNote(
                            bookId: context.bookId,
                            audioFileId: payload.audioFileId,
                            tagIds: payload.tagIds.isEmpty ? nil : payload.tagIds,
                            startSeconds: payload.startSeconds,
                            endSeconds: payload.endSeconds,
                            noteText: payload.noteText
                        )
                        Haptics.success()
                    },
                    onCreateTag: { name in
                        try await detailsViewModel.createTag(name: name)
                    }
                )
            }
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

                if let deviceName = audioPlayer.outputDeviceName {
                    Label(deviceName, systemImage: "airplayaudio")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .padding(.top, 2)
                }
            }

            Spacer()
        }
    }

    // MARK: - Slider Seek Undo

    @ViewBuilder
    private var downloadBannerOverlay: some View {
        if isAutoDownloadNoticeVisible {
            AutoDownloadNoticeBanner(bookTitle: autoDownloadNoticeTitle)
                .padding(.horizontal, 16)
                .padding(.top, 36)
                .transition(.move(edge: .top).combined(with: .opacity))
        } else if showDownloadPrompt, let book = downloadPromptBook {
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
            .padding(.top, 36)
            .transition(.move(edge: .top).combined(with: .opacity))
        }
    }

    private var seekBarSection: some View {
        HStack(alignment: .seekBarTrackCenter, spacing: 12) {
            SeekBarView(onSpeedPillTapped: { isAudioSettingsPresented = true })

            addNoteButton
        }
        .padding(.horizontal, 24)
    }

    private var addNoteButton: some View {
        Button {
            Haptics.light()
            isNoteComposerPresented = true
        } label: {
            Image(systemName: "text.badge.plus")
                .font(.body.weight(.semibold))
                .foregroundStyle(auxiliaryButtonForeground)
                .frame(width: 44, height: 44)
                .background(.ultraThinMaterial, in: Circle())
        }
        .buttonStyle(.plain)
        .contentShape(Circle())
        .alignmentGuide(.seekBarTrackCenter) { dimensions in
            dimensions[VerticalAlignment.center]
        }
        .accessibilityLabel("Add note")
    }

    @ViewBuilder
    private var sliderSeekUndoSection: some View {
        if audioPlayer.sliderSeekUndoPosition != nil {
            SliderSeekUndoBanner()
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .transition(.move(edge: .top).combined(with: .opacity))
                .animation(.spring(duration: 0.3), value: audioPlayer.sliderSeekUndoPosition)
        }
    }

    // MARK: - Transport Controls

    private var transportControls: some View {
        HStack(spacing: transportSpacing) {
            Button {
                Haptics.light()
                audioPlayer.skipBackward()
            } label: {
                Image(systemName: audioPlayer.skipBackwardSymbol)
                    .contentTransition(.symbolEffect(.replace))
                    .font(.system(size: transportSkipSize))
                    .foregroundStyle(.tint)
                    .frame(width: transportSkipFrame, height: transportSkipFrame)
            }
            .buttonStyle(.plain)
            .contentShape(Circle())

            Button {
                Haptics.medium()
                audioPlayer.togglePlayPause()
            } label: {
                if audioPlayer.isLoading {
                    ProgressView()
                        .frame(width: transportPlayFrame, height: transportPlayFrame)
                } else {
                    Image(systemName: audioPlayer.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: transportPlaySize))
                        .foregroundStyle(.tint)
                        .offset(x: audioPlayer.isPlaying ? 0 : 3)
                        .frame(width: transportPlayFrame, height: transportPlayFrame)
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
                    .font(.system(size: transportSkipSize))
                    .foregroundStyle(.tint)
                    .frame(width: transportSkipFrame, height: transportSkipFrame)
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
            // Download prompt (8s auto-dismiss)
            downloadPromptBook = book
            downloadPromptAudioFiles = files
            downloadPromptDismissTask?.cancel()
            withAnimation(.spring(duration: 0.3)) {
                showDownloadPrompt = true
            }
            downloadPromptDismissTask = Task {
                try? await Task.sleep(for: .seconds(8))
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
            // Center group: grouped in a glass capsule
            HStack(spacing: 20) {
                // Audio settings
                Button {
                    Haptics.light()
                    isAudioSettingsPresented = true
                } label: {
                    Image(systemName: "waveform")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(auxiliaryButtonForeground)
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
                .contentShape(Circle())
                .accessibilityLabel("Audio settings")

                // AirPlay route picker
                AirPlayRoutePicker(tintColor: auxiliaryButtonUIColor)
                    .frame(width: 44, height: 44)
                    .accessibilityLabel("Audio output")

                // Sleep timer
                Button {
                    Haptics.light()
                    isSleepTimerPresented = true
                } label: {
                    VStack(spacing: 2) {
                        Image(systemName: audioPlayer.isSleepTimerActive ? "moon.zzz.fill" : "moon.zzz")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(audioPlayer.isSleepTimerActive ? AnyShapeStyle(.tint) : AnyShapeStyle(auxiliaryButtonForeground))
                        if audioPlayer.isSleepTimerActive {
                            Text(audioPlayer.formattedSleepTimer)
                                .font(.system(size: 9, weight: .medium))
                                .monospacedDigit()
                                .foregroundStyle(.tint)
                        }
                    }
                    .frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
                .contentShape(Circle())
                .accessibilityLabel(audioPlayer.isSleepTimerActive ? "Sleep timer \(audioPlayer.formattedSleepTimer) remaining" : "Sleep timer")
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 2)
            .overlay(
                Capsule()
                    .strokeBorder(
                        Color.primary.opacity(0.15),
                        lineWidth: 0.75
                    )
            )

            // Dismiss button — pinned leading
            HStack {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.down")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(auxiliaryButtonForeground)
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
                .contentShape(Circle())
                .overlay(
                    Circle()
                        .strokeBorder(
                            Color.primary.opacity(0.15),
                            lineWidth: 0.75
                        )
                )

                Spacer()
            }
        }
    }

    // MARK: - Player Error Banner

    @ViewBuilder
    private func playerErrorBanner(_ message: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.circle.fill")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.orange)

            Text(message)
                .font(.caption)
                .foregroundStyle(.primary)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)

            Button("Try Again") {
                audioPlayer.retryLastTrack()
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(.orange)
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(.orange.opacity(0.12), in: Capsule())
        .overlay(
            Capsule()
                .strokeBorder(.orange.opacity(0.3), lineWidth: 1)
        )
        .animation(.spring(duration: 0.35), value: audioPlayer.error)
    }

    private var noteComposerContext: BookNoteComposerContext? {
        guard let book = audioPlayer.currentBook,
              let currentAudioFile = audioPlayer.currentAudioFile else { return nil }

        let start = min(audioPlayer.currentPosition, max(audioPlayer.duration - 1, 0))
        let end = min(start + 60, max(audioPlayer.duration, start + 1))

        return BookNoteComposerContext(
            bookId: book._id,
            audioFiles: audioPlayer.audioFiles,
            anchorSeconds: audioPlayer.currentPosition,
            initialAudioFileId: currentAudioFile._id,
            initialStartSeconds: start,
            initialEndSeconds: end,
            existingNote: nil
        )
    }

}

// MARK: - AirPlay Route Picker

private struct AirPlayRoutePicker: UIViewRepresentable {
    let tintColor: UIColor

    func makeUIView(context: Context) -> AVRoutePickerView {
        let picker = AVRoutePickerView()
        picker.tintColor = tintColor
        picker.activeTintColor = .tintColor
        picker.prioritizesVideoDevices = false
        return picker
    }

    func updateUIView(_ uiView: AVRoutePickerView, context: Context) {}
}
