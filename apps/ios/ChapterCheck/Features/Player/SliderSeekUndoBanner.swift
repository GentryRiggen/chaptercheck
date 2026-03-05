import SwiftUI

/// Banner with a countdown ring that lets users undo an accidental slider seek.
///
/// Appears after a slider seek with a 5-second auto-dismiss timer shown as a
/// depleting circular ring. Users can tap "Go Back" to undo or X to dismiss.
struct SliderSeekUndoBanner: View {
    @Environment(AudioPlayerManager.self) private var audioPlayer

    var body: some View {
        HStack(spacing: 10) {
            // Countdown ring
            CountdownRing(deadline: audioPlayer.sliderSeekUndoDeadline)
                .frame(width: 24, height: 24)

            // Undo button
            Button {
                Haptics.medium()
                audioPlayer.undoSliderSeek()
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "arrow.uturn.backward")
                        .font(.system(size: 14, weight: .semibold))
                    Text("Go Back")
                        .font(.subheadline.weight(.semibold))
                }
                .foregroundStyle(.tint)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Undo seek")
            .accessibilityHint("Returns to previous position")

            Spacer(minLength: 0)

            // Dismiss button
            Button {
                audioPlayer.dismissSliderSeekUndo()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Dismiss undo")
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .glassEffect(.regular.interactive(), in: .capsule)
        .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Countdown Ring

/// A circular ring that depletes from full to empty based on a deadline.
private struct CountdownRing: View {
    let deadline: Date?

    private let totalDuration: TimeInterval = AudioPlayerManager.sliderSeekUndoDuration

    var body: some View {
        TimelineView(.animation) { timeline in
            let remaining = max(0, (deadline ?? .now).timeIntervalSince(timeline.date))
            let fraction = remaining / totalDuration

            Circle()
                .stroke(.quaternary, lineWidth: 2.5)
                .overlay {
                    Circle()
                        .trim(from: 0, to: fraction)
                        .stroke(.tint, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                }
        }
    }
}
