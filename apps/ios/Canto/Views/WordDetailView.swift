import SwiftUI

struct WordDetailView: View {
    var wordID: Int
    @Environment(StudyStore.self) private var store
    @Environment(Speaker.self) private var speaker

    var body: some View {
        if let word = store.word(wordID) {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    WordHeader(word: word)
                    if word.formalIfDifferent != nil || word.notes != nil {
                        WordNotes(word: word)
                    }
                    let examples = ExampleBank.bundled.examples(for: word.colloquial)
                    if !examples.isEmpty {
                        ExamplesSection(word: word, examples: examples)
                    }
                    if word.isManual && word.sources.isEmpty {
                        Label("Added by hand on \(Date(ms: word.createdAt).formatted(date: .abbreviated, time: .omitted))", systemImage: "square.and.pencil")
                            .font(.subheadline)
                            .foregroundStyle(Palette.muted)
                    }
                    if !word.sources.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text(word.sources.count == 1 ? "Where you saved it" : "Where you saved it, \(word.sources.count) times")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Palette.muted)
                            ForEach(word.sources, id: \.self) { source in
                                SourceCard(word: word, source: source, video: store.video(source.videoId))
                            }
                        }
                    }
                    ReviewFacts(word: word, card: store.card(for: word))
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 40)
            }
            .background(Palette.paper)
            .navigationBarTitleDisplayMode(.inline)
        } else {
            ContentUnavailableView("This word was removed", systemImage: "questionmark.square.dashed")
        }
    }
}

struct WordHeader: View {
    var word: StudyWord
    @Environment(Speaker.self) private var speaker

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .center, spacing: 16) {
                Text(word.colloquial)
                    .font(Typeface.hanzi(64, .medium, relativeTo: .largeTitle))
                    .foregroundStyle(Palette.ink)
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                    .cantonese()
                Spacer()
                SpeakButton(text: word.colloquial, size: 52)
            }
            ToneJyutping(jyutping: word.jyutping, size: 20)
            if let meaning = word.meaning {
                Text(meaning)
                    .font(.title3)
                    .foregroundStyle(Palette.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

struct WordNotes: View {
    var word: StudyWord

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if let formal = word.formalIfDifferent {
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Text("In writing")
                        .font(.subheadline)
                        .foregroundStyle(Palette.muted)
                    Text(formal)
                        .font(Typeface.hanzi(18, relativeTo: .body))
                        .foregroundStyle(Palette.ink)
                }
            }
            if let notes = word.notes {
                Text(notes)
                    .font(.subheadline)
                    .foregroundStyle(Palette.ink.opacity(0.8))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Palette.soft, in: .rect(cornerRadius: 14))
    }
}

/// The caption line a word came from, with the word picked out, and ways to hear or watch it.
struct SourceCard: View {
    var word: StudyWord
    var source: StudySource
    var video: StudyVideo?
    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(highlighted(source.spoken, word.colloquial))
                .font(Typeface.hanzi(20, relativeTo: .title3))
                .lineSpacing(4)
                .cantonese()
            if let jyutping = source.spokenJyutping {
                Text(jyutping)
                    .font(.caption.monospaced())
                    .foregroundStyle(Palette.muted)
            }
            if let english = source.textEnglish {
                Text(english)
                    .font(.subheadline)
                    .foregroundStyle(Palette.muted)
            }
            HStack(spacing: 10) {
                SpeakButton(text: source.spoken, size: 34)
                if let video {
                    Button {
                        if let url = video.watchURL(at: source.startMs) { openURL(url) }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "play.fill").font(.caption2)
                            Text("\(video.title)").lineLimit(1)
                            Text(timestamp(source.startMs)).monospacedDigit().foregroundStyle(Palette.muted)
                        }
                        .font(.footnote)
                        .foregroundStyle(Palette.ink)
                        .padding(.horizontal, 12)
                        .frame(height: 34)
                        .background(Palette.soft, in: .capsule)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Watch at \(timestamp(source.startMs)) in \(video.title)")
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Palette.line))
    }
}

/// Everyday sentences that use the word, each with Jyutping and English, from the bundled set.
struct ExamplesSection: View {
    var word: StudyWord
    var examples: [ExampleSentence]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Examples")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Palette.muted)
            ForEach(examples, id: \.self) { example in
                HStack(alignment: .top, spacing: 12) {
                    SpeakButton(text: example.yue, size: 34)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(highlighted(example.yue, example.yue.contains(word.colloquial) ? word.colloquial : word.traditional, size: 18))
                            .font(Typeface.hanzi(18, relativeTo: .body))
                            .cantonese()
                        Text(example.jyutping)
                            .font(.caption.monospaced())
                            .foregroundStyle(Palette.muted)
                        if !example.english.isEmpty {
                            Text(example.english)
                                .font(.subheadline)
                                .foregroundStyle(Palette.ink.opacity(0.8))
                        }
                    }
                    .fixedSize(horizontal: false, vertical: true)
                }
            }
            let sources = examples.map(\.source).filter { !$0.isEmpty }.reduce(into: [String]()) { if !$0.contains($1) { $0.append($1) } }
            if !sources.isEmpty {
                Text("Examples from \(sources.joined(separator: ", "))")
                    .font(.caption2)
                    .foregroundStyle(Palette.faint)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct ReviewFacts: View {
    var word: StudyWord
    var card: CardState

    var body: some View {
        Text(text)
            .font(.footnote)
            .foregroundStyle(Palette.muted)
    }

    private var text: String {
        if word.isKnown { return "Marked as known in Pause & Ask." }
        if card.isNew { return "Not reviewed yet. It's in your next review." }
        let due = Date(ms: card.dueAt)
        let when = due <= .now ? "now" : due.formatted(.relative(presentation: .named))
        let misses = card.timesMissed == 0 ? "" : card.timesMissed == 1 ? " Missed once." : " Missed \(card.timesMissed) times."
        return "Next review \(when).\(misses)"
    }
}

struct SpeakButton: View {
    var text: String
    var size: CGFloat = 40
    @Environment(Speaker.self) private var speaker

    var body: some View {
        let active = speaker.speaking == text
        Button {
            speaker.say(text)
        } label: {
            Image(systemName: active ? "speaker.wave.2.fill" : "speaker.wave.2")
                .font(.system(size: size * 0.4, weight: .medium))
                .foregroundStyle(Palette.jade)
                .symbolEffect(.variableColor.iterative, isActive: active)
                .frame(width: size, height: size)
                .background(Palette.jadeSoft, in: .circle)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Play")
    }
}

/// The line with the word picked out in jade, at the line's own size.
func highlighted(_ line: String, _ word: String, size: CGFloat = 20) -> AttributedString {
    var s = AttributedString(line)
    s.foregroundColor = Palette.ink
    if let r = s.range(of: word) {
        s[r].foregroundColor = Palette.jade
        s[r].font = Typeface.hanzi(size, .semibold)
    }
    return s
}

func timestamp(_ ms: Double) -> String {
    let t = Int(ms / 1000)
    return String(format: "%d:%02d", t / 60, t % 60)
}
