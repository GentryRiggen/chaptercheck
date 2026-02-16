import SwiftUI

/// Sort options for the book library.
///
/// Raw values match the Convex `listBooks` query's `sort` parameter.
enum SortOption: String, CaseIterable, Identifiable {
    case titleAsc = "title_asc"
    case titleDesc = "title_desc"
    case recent = "recent"
    case topRated = "top_rated"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .titleAsc: "A-Z"
        case .titleDesc: "Z-A"
        case .recent: "Recent"
        case .topRated: "Top Rated"
        }
    }

    var icon: String {
        switch self {
        case .titleAsc: "arrow.up"
        case .titleDesc: "arrow.down"
        case .recent: "clock"
        case .topRated: "star.fill"
        }
    }
}

/// Toolbar menu for selecting a sort option.
struct SortPicker: View {
    @Binding var selection: SortOption

    var body: some View {
        Menu {
            ForEach(SortOption.allCases) { option in
                Button {
                    selection = option
                } label: {
                    Label(option.displayName, systemImage: option.icon)
                }
            }
        } label: {
            Label("Sort", systemImage: "arrow.up.arrow.down")
                .labelStyle(.iconOnly)
        }
    }
}
