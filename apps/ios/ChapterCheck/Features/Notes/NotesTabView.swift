import SwiftUI

/// Placeholder for the Notes tab — will contain cross-book note browsing.
struct NotesTabView: View {
    var body: some View {
        ContentUnavailableView(
            "Notes",
            systemImage: "note.text",
            description: Text("Coming soon")
        )
        .navigationTitle("Notes")
    }
}
