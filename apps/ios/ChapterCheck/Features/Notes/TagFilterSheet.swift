import SwiftUI

struct TagFilterSheet: View {
    let tags: [MemoryTag]
    @Binding var selectedTagIds: Set<String>

    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""

    private var filteredTags: [MemoryTag] {
        if searchText.isEmpty { return tags }
        let query = searchText.lowercased()
        return tags.filter { $0.name.lowercased().contains(query) }
    }

    var body: some View {
        NavigationStack {
            List {
                if !selectedTagIds.isEmpty {
                    Button("Clear All") {
                        selectedTagIds = []
                    }
                    .foregroundStyle(.red)
                }

                ForEach(filteredTags) { tag in
                    Button {
                        if selectedTagIds.contains(tag._id) {
                            selectedTagIds.remove(tag._id)
                        } else {
                            selectedTagIds.insert(tag._id)
                        }
                    } label: {
                        HStack(spacing: 10) {
                            Circle()
                                .fill(tag.displayColor)
                                .frame(width: 10, height: 10)

                            Text(tag.name)
                                .foregroundStyle(.primary)

                            Spacer()

                            if selectedTagIds.contains(tag._id) {
                                Image(systemName: "checkmark")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(.tint)
                            }
                        }
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search tags...")
            .navigationTitle("Filter by Tags")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}
