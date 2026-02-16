import SwiftUI

/// Vertical list of audio file parts for a book.
///
/// Each row shows the part number, display name, duration, and a play button.
/// If saved progress exists for that part, shows a "Resume from X:XX" label.
struct AudioFileListView: View {
    let audioFiles: [AudioFile]
    let progress: ListeningProgress?
    let book: BookWithDetails

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Audio Files")
                    .font(.headline)

                Spacer()

                Text("\(audioFiles.count) \(audioFiles.count == 1 ? "part" : "parts")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal)

            ForEach(audioFiles) { file in
                AudioFileRow(
                    audioFile: file,
                    isCurrentPart: progress?.audioFileId == file._id,
                    savedPosition: progress?.audioFileId == file._id ? progress?.positionSeconds : nil,
                    book: book,
                    allFiles: audioFiles
                )
            }
        }
    }
}
