import SwiftUI

/// Compact pill overlay that lets users undo an accidental slider seek.
///
/// Appears after a slider seek with a 5-second auto-dismiss timer shown as a
/// depleting circular ring. Users can tap the pill to undo or the X to dismiss.
struct SliderSeekUndoBanner: View {
    @Environment(AudioPlayerManager.self) private var audioPlayer

    var body: some View {
        HStack(spacing: 8) {
            // Countdown ring
            CountdownRing(deadline: audioPlayer.sliderSeekUndoDeadline)
                .frame(width: 20, height: 20)

            // Undo button
            Button {
                Haptics.medium()
                audioPlayer.undoSliderSeek()
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "arrow.uturn.backward")
                        .font(.system(size: 12, weight: .semibold))
                    Text("Undo")
                        .font(.caption.weight(.semibold))
                }
                .foregroundStyle(.tint)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Undo seek")
            .accessibilityHint("Returns to previous position")

            // Dismiss button
            Button {
                audioPlayer.dismissSliderSeekUndo()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(.secondary)
                    .frame(width: 22, height: 22)
                    .background(.fill.tertiary, in: Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Dismiss undo")
        }
        .padding(.leading, 12)
        .padding(.trailing, 8)
        .padding(.vertical, 8)
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
