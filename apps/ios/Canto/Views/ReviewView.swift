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
            .background(Palette.paper)
        }
        .fullScreenCover(item: $deck) { FlashcardSession(words: $0.words) }
        .onAppear {
            if UserDefaults.standard.bool(forKey: "autostart"), deck == nil { deck = Deck(words: store.dueWords()) }
        }
    }

    private var start: some View {
        let due = store.dueWords()
        return ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                DeckPreview(words: Array(due.prefix(3)), front: front)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 12)

                VStack(alignment: .leading, spacing: 6) {
                    Text(headline(due))
                        .font(.title2.weight(.semibold))
                        .foregroundStyle(Palette.ink)
                    Text(subhead(due))
                        .font(.subheadline)
                        .foregroundStyle(Palette.muted)
                }

                VStack(alignment: .leading, spacing: 10) {
                    Picker("Card front", selection: $front) {
                        ForEach(CardFront.allCases) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    Text(front.hint)
                        .font(.footnote)
                        .foregroundStyle(Palette.muted)
                }

                VStack(spacing: 12) {
                    if !due.isEmpty {
                        Button {
                            deck = Deck(words: due)
                        } label: {
                            Text("Start review").frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.glassProminent)
                    }
                    Button {
                        deck = Deck(words: store.words.filter { !$0.isKnown }.shuffled())
                    } label: {
                        Text(due.isEmpty ? "Practice all words" : "Practice all words instead").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.glass)
                }
                .controlSize(.extraLarge)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
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
