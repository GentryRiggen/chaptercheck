import SwiftUI

/// Shimmer placeholder animation used as a loading skeleton.
///
/// Supports rectangle and circle shapes. The shimmer gradient animates
/// continuously to indicate content is loading.
struct SkeletonView: View {
    enum Shape {
        case rectangle
        case circle
    }

    var shape: Shape = .rectangle
    var width: CGFloat = 100
    var height: CGFloat = 100
    var cornerRadius: CGFloat = 8

    @State private var isAnimating = false

    var body: some View {
        content
            .frame(width: width, height: height)
            .overlay {
                GeometryReader { geometry in
                    LinearGradient(
                        colors: [
                            .clear,
                            .white.opacity(0.15),
                            .clear,
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geometry.size.width * 0.6)
                    .offset(x: isAnimating ? geometry.size.width : -geometry.size.width * 0.6)
                }
                .clipped()
            }
            .onAppear {
                withAnimation(
                    .linear(duration: 1.5)
                    .repeatForever(autoreverses: false)
                ) {
                    isAnimating = true
                }
            }
    }

    @ViewBuilder
    private var content: some View {
        switch shape {
        case .rectangle:
            RoundedRectangle(cornerRadius: cornerRadius)
                .fill(.fill.tertiary)
        case .circle:
            Circle()
                .fill(.fill.tertiary)
        }
    }
}

#Preview {
    VStack(spacing: 16) {
        SkeletonView(shape: .rectangle, width: 120, height: 180)
        SkeletonView(shape: .circle, width: 60, height: 60)
    }
    .padding()
}
