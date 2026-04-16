import SwiftUI

/// A horizontal bar of preset emoji reactions with a "more" button for the full emoji keyboard.
struct ReactionPicker: View {

    let onSelect: (String) -> Void

    /// The preset emoji options shown in the quick bar.
    static let presetEmojis = ["👍", "❤️", "😂", "😮", "😢", "🔥", "💯", "🙏"]

    @State private var showEmojiPicker = false

    var body: some View {
        HStack(spacing: 12) {
            ForEach(Self.presetEmojis, id: \.self) { emoji in
                Button {
                    onSelect(emoji)
                } label: {
                    Text(emoji)
                        .font(.title2)
                }
                .buttonStyle(.plain)
            }

            Button {
                showEmojiPicker = true
            } label: {
                Image(systemName: "plus.circle")
                    .font(.title3)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color(.systemGray6), in: Capsule())
        .sheet(isPresented: $showEmojiPicker) {
            EmojiPickerSheet(onSelect: { emoji in
                showEmojiPicker = false
                onSelect(emoji)
            })
        }
    }
}

/// Sheet that presents the system emoji keyboard for full emoji selection.
struct EmojiPickerSheet: View {

    let onSelect: (String) -> Void

    @State private var text = ""
    @FocusState private var isFocused: Bool

    var body: some View {
        NavigationStack {
            VStack {
                Text("Tap an emoji to react")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.top)

                // Hidden text field to trigger emoji keyboard
                TextField("", text: $text)
                    .focused($isFocused)
                    .textInputAutocapitalization(.never)
                    .frame(width: 1, height: 1)
                    .opacity(0)

                Spacer()
            }
            .navigationTitle("Choose Emoji")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        // Dismiss handled by parent
                    }
                }
            }
            .onAppear {
                isFocused = true
            }
            .onChange(of: text) { _, newValue in
                // When user types an emoji, select it and dismiss
                if let lastChar = newValue.last, lastChar.isEmoji {
                    onSelect(String(lastChar))
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Character Extension

private extension Character {
    var isEmoji: Bool {
        guard let scalar = unicodeScalars.first else { return false }
        return scalar.properties.isEmoji && (scalar.value > 0x238C || unicodeScalars.count > 1)
    }
}
