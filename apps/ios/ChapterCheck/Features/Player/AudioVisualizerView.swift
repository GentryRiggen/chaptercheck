import SwiftUI

/// Animated equalizer-style bars that dance when audio is playing.
///
/// Each bar animates at a different speed and phase, creating an organic
/// waveform effect. Bars shrink to a resting height when paused.
struct AudioVisualizerView: View {
    let isPlaying: Bool
    var barCount: Int = 9
    var barWidth: CGFloat = 3.5
    var spacing: CGFloat = 3
    var maxHeight: CGFloat = 16
    var minHeight: CGFloat = 3

    /// Each bar gets its own animated height.
    @State private var barHeights: [CGFloat] = []

    /// Async task driving the animation loop.
    @State private var animationTask: Task<Void, Never>?

    /// Targets each bar is interpolating toward.
    @State private var targets: [CGFloat] = []

    private static let frameInterval: UInt64 = 1_000_000_000 / 30 // ~30fps

    var body: some View {
        HStack(alignment: .bottom, spacing: spacing) {
            ForEach(0..<barCount, id: \.self) { index in
                RoundedRectangle(cornerRadius: barWidth / 2)
                    .fill(.tint.opacity(isPlaying ? 0.8 : 0.3))
                    .frame(width: barWidth, height: barHeights.indices.contains(index) ? barHeights[index] : minHeight)
            }
        }
        .frame(height: maxHeight)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Audio visualizer")
        .onAppear {
            barHeights = Array(repeating: minHeight, count: barCount)
            targets = Array(repeating: minHeight, count: barCount)
            if isPlaying {
                startAnimating()
            }
        }
        .onDisappear {
            stopAnimating()
        }
        .onChange(of: isPlaying) { _, playing in
            if playing {
                startAnimating()
            } else {
                stopAnimating()
                withAnimation(.easeOut(duration: 0.4)) {
                    barHeights = Array(repeating: minHeight, count: barCount)
                }
            }
        }
    }

    private func startAnimating() {
        stopAnimating()
        targets = (0..<barCount).map { _ in randomHeight() }
        animationTask = Task { @MainActor in
            while !Task.isCancelled {
                updateBars()
                try? await Task.sleep(nanoseconds: Self.frameInterval)
            }
        }
    }

    private func stopAnimating() {
        animationTask?.cancel()
        animationTask = nil
    }

    private func updateBars() {
        guard barHeights.count == barCount, targets.count == barCount else { return }

        // Different lerp speeds per bar for organic variety (one per default barCount)
        let speeds: [CGFloat] = [0.12, 0.15, 0.10, 0.14, 0.11, 0.13, 0.09, 0.16, 0.12]

        var newHeights = barHeights
        for i in 0..<barCount {
            let speed = speeds[i % speeds.count]
            let diff = targets[i] - newHeights[i]
            newHeights[i] += diff * speed

            if abs(diff) < 0.5 {
                targets[i] = randomHeight()
            }
        }

        withAnimation(.linear(duration: Double(Self.frameInterval) / 1_000_000_000)) {
            barHeights = newHeights
        }
    }

    private func randomHeight() -> CGFloat {
        CGFloat.random(in: minHeight...maxHeight)
    }
}
