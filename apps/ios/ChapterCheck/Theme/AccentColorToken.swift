import SwiftUI

/// A curated accent color option for theming.
struct AccentColorToken: Identifiable, Sendable {
    let id: String
    let displayName: String
    let color: Color
    /// A complementary color for gradient use (lighter or adjacent hue).
    let gradientCompanion: Color

    // MARK: - Blue family

    static let sky = AccentColorToken(
        id: "sky", displayName: "Sky",
        color: Color(.sRGB, red: 0.35, green: 0.68, blue: 0.95),
        gradientCompanion: Color(.sRGB, red: 0.60, green: 0.85, blue: 1.0))
    static let blue = AccentColorToken(
        id: "blue", displayName: "Blue",
        color: .blue,
        gradientCompanion: .cyan)
    static let navy = AccentColorToken(
        id: "navy", displayName: "Navy",
        color: Color(.sRGB, red: 0.15, green: 0.25, blue: 0.60),
        gradientCompanion: .blue)

    // MARK: - Indigo family

    static let periwinkle = AccentColorToken(
        id: "periwinkle", displayName: "Periwinkle",
        color: Color(.sRGB, red: 0.56, green: 0.52, blue: 0.95),
        gradientCompanion: Color(.sRGB, red: 0.72, green: 0.68, blue: 1.0))
    static let indigo = AccentColorToken(
        id: "indigo", displayName: "Indigo",
        color: .indigo,
        gradientCompanion: .blue)
    static let midnight = AccentColorToken(
        id: "midnight", displayName: "Midnight",
        color: Color(.sRGB, red: 0.22, green: 0.18, blue: 0.50),
        gradientCompanion: .indigo)

    // MARK: - Purple family

    static let lavender = AccentColorToken(
        id: "lavender", displayName: "Lavender",
        color: Color(.sRGB, red: 0.72, green: 0.55, blue: 0.95),
        gradientCompanion: Color(.sRGB, red: 0.85, green: 0.72, blue: 1.0))
    static let purple = AccentColorToken(
        id: "purple", displayName: "Purple",
        color: .purple,
        gradientCompanion: .indigo)
    static let plum = AccentColorToken(
        id: "plum", displayName: "Plum",
        color: Color(.sRGB, red: 0.48, green: 0.15, blue: 0.52),
        gradientCompanion: .purple)

    // MARK: - Pink family

    static let rose = AccentColorToken(
        id: "rose", displayName: "Rose",
        color: Color(.sRGB, red: 1.0, green: 0.50, blue: 0.60),
        gradientCompanion: Color(.sRGB, red: 1.0, green: 0.72, blue: 0.78))
    static let pink = AccentColorToken(
        id: "pink", displayName: "Pink",
        color: .pink,
        gradientCompanion: .purple)
    static let magenta = AccentColorToken(
        id: "magenta", displayName: "Magenta",
        color: Color(.sRGB, red: 0.85, green: 0.12, blue: 0.52),
        gradientCompanion: .pink)

    // MARK: - Red family

    static let coral = AccentColorToken(
        id: "coral", displayName: "Coral",
        color: Color(.sRGB, red: 1.0, green: 0.45, blue: 0.38),
        gradientCompanion: Color(.sRGB, red: 1.0, green: 0.65, blue: 0.55))
    static let red = AccentColorToken(
        id: "red", displayName: "Red",
        color: .red,
        gradientCompanion: .pink)
    static let crimson = AccentColorToken(
        id: "crimson", displayName: "Crimson",
        color: Color(.sRGB, red: 0.70, green: 0.08, blue: 0.15),
        gradientCompanion: .red)

    // MARK: - Orange family

    static let peach = AccentColorToken(
        id: "peach", displayName: "Peach",
        color: Color(.sRGB, red: 1.0, green: 0.65, blue: 0.45),
        gradientCompanion: Color(.sRGB, red: 1.0, green: 0.80, blue: 0.65))
    static let orange = AccentColorToken(
        id: "orange", displayName: "Orange",
        color: .orange,
        gradientCompanion: .red)
    static let tangerine = AccentColorToken(
        id: "tangerine", displayName: "Tangerine",
        color: Color(.sRGB, red: 0.92, green: 0.42, blue: 0.08),
        gradientCompanion: .orange)

    // MARK: - Yellow family

    static let lemon = AccentColorToken(
        id: "lemon", displayName: "Lemon",
        color: Color(.sRGB, red: 1.0, green: 0.92, blue: 0.30),
        gradientCompanion: Color(.sRGB, red: 1.0, green: 0.96, blue: 0.58))
    static let amber = AccentColorToken(
        id: "amber", displayName: "Amber",
        color: Color(.sRGB, red: 0.96, green: 0.76, blue: 0.0),
        gradientCompanion: .orange)
    static let yellow = AccentColorToken(
        id: "yellow", displayName: "Yellow",
        color: .yellow,
        gradientCompanion: Color(.sRGB, red: 0.96, green: 0.76, blue: 0.0))
    static let gold = AccentColorToken(
        id: "gold", displayName: "Gold",
        color: Color(.sRGB, red: 0.82, green: 0.65, blue: 0.10),
        gradientCompanion: Color(.sRGB, red: 0.96, green: 0.76, blue: 0.0))

    // MARK: - Green family

    static let chartreuse = AccentColorToken(
        id: "chartreuse", displayName: "Chartreuse",
        color: Color(.sRGB, red: 0.58, green: 0.90, blue: 0.15),
        gradientCompanion: .yellow)
    static let lime = AccentColorToken(
        id: "lime", displayName: "Lime",
        color: Color(.sRGB, red: 0.52, green: 0.80, blue: 0.20),
        gradientCompanion: .yellow)
    static let green = AccentColorToken(
        id: "green", displayName: "Green",
        color: .green,
        gradientCompanion: .teal)
    static let emerald = AccentColorToken(
        id: "emerald", displayName: "Emerald",
        color: Color(.sRGB, red: 0.18, green: 0.62, blue: 0.42),
        gradientCompanion: .green)
    static let forest = AccentColorToken(
        id: "forest", displayName: "Forest",
        color: Color(.sRGB, red: 0.12, green: 0.45, blue: 0.28),
        gradientCompanion: Color(.sRGB, red: 0.18, green: 0.62, blue: 0.42))

    // MARK: - Teal / Cyan family

    static let aqua = AccentColorToken(
        id: "aqua", displayName: "Aqua",
        color: Color(.sRGB, red: 0.30, green: 0.82, blue: 0.85),
        gradientCompanion: Color(.sRGB, red: 0.55, green: 0.92, blue: 0.92))
    static let teal = AccentColorToken(
        id: "teal", displayName: "Teal",
        color: .teal,
        gradientCompanion: .cyan)
    static let ocean = AccentColorToken(
        id: "ocean", displayName: "Ocean",
        color: Color(.sRGB, red: 0.10, green: 0.42, blue: 0.55),
        gradientCompanion: .teal)
    static let cyan = AccentColorToken(
        id: "cyan", displayName: "Cyan",
        color: .cyan,
        gradientCompanion: .mint)
    static let electric = AccentColorToken(
        id: "electric", displayName: "Electric",
        color: Color(.sRGB, red: 0.05, green: 0.85, blue: 1.0),
        gradientCompanion: .cyan)

    // MARK: - Mint family

    static let seafoam = AccentColorToken(
        id: "seafoam", displayName: "Seafoam",
        color: Color(.sRGB, red: 0.55, green: 0.92, blue: 0.78),
        gradientCompanion: Color(.sRGB, red: 0.72, green: 0.96, blue: 0.88))
    static let mint = AccentColorToken(
        id: "mint", displayName: "Mint",
        color: .mint,
        gradientCompanion: .green)
    static let jade = AccentColorToken(
        id: "jade", displayName: "Jade",
        color: Color(.sRGB, red: 0.22, green: 0.62, blue: 0.52),
        gradientCompanion: .mint)

    // MARK: - Neutral

    static let brown = AccentColorToken(
        id: "brown", displayName: "Brown",
        color: .brown,
        gradientCompanion: .orange)
    static let graphite = AccentColorToken(
        id: "graphite", displayName: "Graphite",
        color: .gray,
        gradientCompanion: Color(.sRGB, red: 0.55, green: 0.55, blue: 0.60))

    // MARK: - All tokens

    /// All available accent colors, grouped by family.
    static let all: [AccentColorToken] = [
        // Blues
        sky, blue, navy,
        // Indigos
        periwinkle, indigo, midnight,
        // Purples
        lavender, purple, plum,
        // Pinks
        rose, pink, magenta,
        // Reds
        coral, red, crimson,
        // Oranges
        peach, orange, tangerine,
        // Yellows
        lemon, amber, yellow, gold,
        // Greens
        chartreuse, lime, green, emerald, forest,
        // Teals & Cyans
        aqua, teal, ocean, cyan, electric,
        // Mints
        seafoam, mint, jade,
        // Neutrals
        brown, graphite,
    ]

    /// Look up a color by its string ID. Falls back to `.blue`.
    static func color(for id: String) -> Color {
        all.first { $0.id == id }?.color ?? Color.blue
    }

    /// Look up the gradient pair `[companion, primary]` for an accent ID.
    static func gradientColors(for id: String) -> [Color] {
        guard let token = all.first(where: { $0.id == id }) else {
            return [.cyan, Color.blue]
        }
        return [token.gradientCompanion, token.color]
    }
}
