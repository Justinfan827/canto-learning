import SwiftUI

struct VideoDetailView: View {
    var video: StudyVideo
    @Environment(StudyStore.self) private var store
    @Environment(ListenSession.self) private var listen
    @Environment(\.openURL) private var openURL
    @State private var studying: [StudyWord]?

    var body: some View {
        let words = store.words(in: video)
        List {
            Section {
                VStack(alignment: .leading, spacing: 12) {
                    Button {
                        if let url = video.watchURL() { openURL(url) }
                    } label: {
                        Thumbnail(video: video, radius: 14)
                            .overlay(alignment: .bottomLeading) {
                                Label("YouTube", systemImage: "play.fill")
                                    .font(.caption.weight(.semibold))
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .glassEffect(.regular, in: .capsule)
                                    .padding(10)
                            }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Watch on YouTube")
                    Text(video.title)
                        .font(Typeface.hanzi(20, .semibold, relativeTo: .title3))
                        .foregroundStyle(Palette.ink)
                    if let channel = video.channel {
                        Text(channel).font(.subheadline).foregroundStyle(Palette.muted)
                    }
                    HStack(spacing: 10) {
                        Button {
                            studying = words
                        } label: {
                            Label("Flashcards", systemImage: "rectangle.on.rectangle.angled")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.glassProminent)
                        Button {
                            listen.start(words)
                        } label: {
                            Label("Listen", systemImage: "headphones")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.glass)
                    }
                    .controlSize(.large)
                    .padding(.top, 4)
                }
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
            }
            Section(words.count == 1 ? "1 saved word" : "\(words.count) saved words") {
                ForEach(words) { word in
                    NavigationLink(value: word) {
                        VideoWordRow(word: word, source: word.sources.first { $0.videoId == video.id })
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationBarTitleDisplayMode(.inline)
        .fullScreenCover(item: Binding(get: { studying.map(Deck.init) }, set: { studying = $0?.words })) { deck in
            FlashcardSession(words: deck.words)
        }
    }
}

struct Deck: Identifiable {
    var words: [StudyWord]
    var id: String { words.map { String($0.id) }.joined(separator: ",") }
}

/// A word with the moment in the video it came from.
struct VideoWordRow: View {
    var word: StudyWord
    var source: StudySource?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            WordRow(word: word)
            if let source {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(timestamp(source.startMs))
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(Palette.faint)
                    Text(highlighted(source.spoken, word.colloquial))
                        .font(Typeface.hanzi(14, relativeTo: .footnote))
                        .lineLimit(1)
                        .opacity(0.75)
                }
            }
        }
    }
}
