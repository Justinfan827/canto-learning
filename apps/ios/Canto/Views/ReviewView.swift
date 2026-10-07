import SwiftUI

/// What the front of a flashcard shows.
enum CardFront: String, CaseIterable, Codable, Identifiable {
    case characters, meaning, sound
    var id: Self { self }
    var label: String {
        switch self {
        case .characters: "字"
        case .meaning: "English"
        case .sound: "Sound"
        }
    }
    var hint: String {
        switch self {
        case .characters: "See the word, recall its sound and meaning."
        case .meaning: "See the meaning, recall the Cantonese."
        case .sound: "Hear the word, recall what it means."
        }
    }
}

struct ReviewView: View {
    @Environment(StudyStore.self) private var store
    @AppStorage("cardFront") private var front: CardFront = .characters
    @State private var deck: Deck?

    var body: some View {
        NavigationStack {
            Group {
                if !store.hasWords {
                    ContentUnavailableView("Nothing to review", systemImage: "rectangle.on.rectangle.angled", description: Text("Words you save in Pause & Ask become flashcards here."))
                } else {
                    start
                }
            }
            .navigationTitle("Review")
            .background(Palette.page)
            .navigationBarTitleDisplayMode(.inline)
        }
        .fullScreenCover(item: $deck) { FlashcardSession(words: $0.words) }
        .onAppear {
            if UserDefaults.standard.bool(forKey: "autostart"), deck == nil { deck = Deck(words: store.dueWords()) }
        }
    }

    private var start: some View {
        let due = store.dueWords()
        let sets = store.wordSets()
        return ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                today(due)

                VStack(alignment: .leading, spacing: 10) {
                    Picker("Card front", selection: $front) {
                        ForEach(CardFront.allCases) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    Text(front.hint)
                        .font(.footnote)
                        .foregroundStyle(Palette.muted)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Practice a set")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(Palette.ink)
                    Text("Groups found in the words you've saved. Misses still count toward your schedule.")
                        .font(.footnote)
                        .foregroundStyle(Palette.muted)
                }
                .padding(.bottom, -14)
                SetGroup(title: "For you", sets: sets.filter { $0.kind == .smart } + [everything]) { deck = Deck(words: store.practiceOrder($0.words)) }
                SetGroup(title: "Topics", sets: sets.filter { $0.kind == .topic }) { deck = Deck(words: store.practiceOrder($0.words)) }
                SetGroup(title: "From your videos", sets: sets.filter { $0.kind == .video }) { deck = Deck(words: store.practiceOrder($0.words)) }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
    }

    private var everything: WordSet {
        WordSet(id: "all", kind: .smart, title: "All words", detail: "Everything you've saved", systemImage: "square.stack", words: store.words)
    }

    /// The scheduled review: due words, then new ones. No setup.
    private func today(_ due: [StudyWord]) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            if !due.isEmpty {
                DeckPreview(words: Array(due.prefix(3)), front: front)
                    .frame(maxWidth: .infinity)
            }
            VStack(alignment: .leading, spacing: 6) {
                Text("Today's review".uppercased())
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Palette.jade)
                Text(headline(due))
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(Palette.ink)
                Text(subhead(due))
                    .font(.subheadline)
                    .foregroundStyle(Palette.muted)
            }
            if !due.isEmpty {
                Button {
                    deck = Deck(words: due)
                } label: {
                    Text("Start review").frame(maxWidth: .infinity)
                }
                .buttonStyle(.glassProminent)
                .foregroundStyle(Palette.onAccent)
                .controlSize(.extraLarge)
            }
        }
        .padding(.top, 12)
    }

    private func headline(_ due: [StudyWord]) -> String {
        if due.isEmpty { return "You're done for now" }
        return due.count == 1 ? "1 word to review" : "\(due.count) words to review"
    }

    private func subhead(_ due: [StudyWord]) -> String {
        if due.isEmpty {
            return store.nextDue.map { "The next word comes back \($0.formatted(.relative(presentation: .named)))." } ?? "Save more words to keep going."
        }
        let fresh = due.filter { store.card(for: $0).isNew }.count
        let back = due.count - fresh
        switch (fresh, back) {
        case (0, _): return "All coming back for another look."
        case (_, 0): return fresh == 1 ? "1 new word." : "\(fresh) new words."
        default: return "\(fresh) new, \(back) coming back."
        }
    }
}

/// A small fanned stack of the first cards, so the deck reads as a deck.
struct DeckPreview: View {
    var words: [StudyWord]
    var front: CardFront

    var body: some View {
        ZStack {
            ForEach(Array(words.enumerated().reversed()), id: \.element.id) { i, word in
                CardFace {
                    FrontContent(word: word, front: front, compact: true)
                }
                .frame(width: 220, height: 150)
                .rotationEffect(.degrees(Double(i) * 4))
                .offset(x: CGFloat(i) * 10, y: CGFloat(i) * -4)
                .opacity(i == 0 ? 1 : 0.9)
            }
        }
        .frame(height: 190)
        .accessibilityHidden(true)
    }
}

/// One heading's worth of practice sets.
private struct SetGroup: View {
    var title: String
    var sets: [WordSet]
    var start: (WordSet) -> Void

    var body: some View {
        if !sets.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Palette.muted)
                VStack(spacing: 0) {
                    ForEach(Array(sets.enumerated()), id: \.element.id) { i, set in
                        SetRow(set: set) { start(set) }
                            .overlay(alignment: .top) { if i > 0 { Rectangle().fill(Palette.line).frame(height: 1).padding(.leading, 62) } }
                    }
                }
                .background(Palette.surface, in: .rect(cornerRadius: 18))
            }
        }
    }
}

private struct SetRow: View {
    @Environment(StudyStore.self) private var store
    var set: WordSet
    var action: () -> Void

    var body: some View {
        let counts = Dictionary(grouping: set.words) { Mastery.of(store.card(for: $0), known: $0.isKnown) }.mapValues(\.count)
        let toLearn = set.words.count - (counts[.mastered] ?? 0)
        Button(action: action) {
            HStack(spacing: 14) {
                icon
                VStack(alignment: .leading, spacing: 4) {
                    Text(set.title)
                        .font(.body.weight(.medium))
                        .foregroundStyle(Palette.ink)
                        .lineLimit(1)
                    Text(set.kind == .topic ? set.detail : "\(set.words.count == 1 ? "1 word" : "\(set.words.count) words") · \(toLearn == 0 ? "all mastered" : "\(toLearn) to learn")")
                        .font(set.kind == .topic ? Typeface.hanzi(14, relativeTo: .subheadline) : .subheadline)
                        .foregroundStyle(Palette.muted)
                        .lineLimit(1)
                    MasteryBar(counts: counts, total: set.words.count, height: 5)
                        .padding(.top, 2)
                }
                Spacer(minLength: 0)
                if set.kind == .topic {
                    Text("\(set.words.count)")
                        .font(.subheadline.monospacedDigit())
                        .foregroundStyle(Palette.muted)
                }
                Image(systemName: "play.fill")
                    .font(.caption)
                    .foregroundStyle(Palette.jade)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(set.title), \(set.words.count) words, \(toLearn) to learn")
        .accessibilityHint("Starts practice")
    }

    @ViewBuilder private var icon: some View {
        if let id = set.videoID, let url = URL(string: "https://i.ytimg.com/vi/\(id)/mqdefault.jpg") {
            AsyncImage(url: url) { $0.resizable().scaledToFill() } placeholder: { Palette.soft }
                .frame(width: 34, height: 34)
                .clipShape(.rect(cornerRadius: 8))
        } else {
            Image(systemName: set.systemImage)
                .font(.body)
                .foregroundStyle(Palette.jade)
                .frame(width: 34, height: 34)
                .background(Palette.jadeSoft, in: .rect(cornerRadius: 8))
        }
    }
}
