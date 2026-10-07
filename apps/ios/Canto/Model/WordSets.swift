import Foundation

/// A group of saved words to practice, found from the words themselves: how well you
/// know them, what they're about, and which video they came from. Nothing to set up.
nonisolated struct WordSet: Identifiable, Sendable {
    enum Kind: Sendable { case smart, topic, video }

    var id: String
    var kind: Kind
    var title: String
    var detail: String
    var systemImage: String
    var words: [StudyWord]
    /// For video sets, the thumbnail to show.
    var videoID: String? = nil
}

nonisolated enum WordSets {
    /// Topics matched against each word's English meaning, by whole word or word start.
    static let topics: [(id: String, title: String, systemImage: String, keywords: [String])] = [
        ("feelings", "Feelings", "heart", [
            "feel", "emotion", "happy", "sad", "angry", "afraid", "fear", "lonely", "grateful", "thank", "perplex", "bewilder", "at a loss",
            "lost", "embarrass", "humiliat", "lose face", "heartbeat", "heart", "moved", "touched", "worr", "nervous", "excite", "anticipat",
            "look forward", "setback", "failure", "defeat", "pale", "wits' end", "frustrat", "regret", "jealous", "proud",
        ]),
        ("personality", "Personality", "person.crop.circle", [
            "humor", "kind", "reserved", "aloof", "introvert", "extrovert", "sincere", "genuine", "honest", "frivolous", "mischiev", "charm",
            "charisma", "rigorous", "strict", "meticulous", "cruel", "vicious", "fierce", "masculine", "feminine", "shy", "brave", "lazy",
            "stubborn", "gentle", "polite", "rude", "arrogant", "modest", "mature", "cute",
        ]),
        ("relationships", "Dating & friends", "person.2", [
            "friend", "meet", "encounter", "fate", "relationships", "predestined", "party", "gathering", "get together", "get along", "interact", "woo",
            "date", "dating", "romance", "romantic", "boyfriend", "girlfriend", "love", "crush", "flirt", "ambiguous", "marry", "marriage",
            "partner", "affinity", "bully",
        ]),
        ("showbiz", "TV & showbiz", "tv", [
            "program", "show", "film", "movie", "producer", "shooting of films", "dialogue", "screen", "actor", "actress", "perform", "stage",
            "audience", "episode", "director", "script", "vote", "campaign", "comment", "evaluation", "message", "fans", "celebrit", "host",
        ]),
        ("work", "Work & growth", "briefcase", [
            "career", "duty", "responsib", "obligation", "undertaking", "project", "industry", "expertise", "specialty", "special knowledge",
            "senior", "cultivate", "nurture", "foster", "starting point", "origin", "manufactur", "produce", "work", "job", "skill", "boss",
            "colleague", "underestimat", "pursue", "goal",
        ]),
        ("style", "Style & looks", "tshirt", [
            "fashion", "chic", "clothing", "clothes", "outfit", "dress", "costume", "glamor", "beauty", "beautiful", "pretty", "handsome",
            "makeup", "style",
        ]),
    ]

    static func build(words: [StudyWord], card: (StudyWord) -> CardState, videos: [StudyVideo]) -> [WordSet] {
        func mastery(_ w: StudyWord) -> Mastery { Mastery.of(card(w), known: w.isKnown) }
        var sets: [WordSet] = []

        // From your progress.
        let missing = words.filter { card($0).timesMissed > 0 }.sorted { card($0).timesMissed > card($1).timesMissed }
        if !missing.isEmpty {
            sets.append(WordSet(id: "missing", kind: .smart, title: "Keep missing", detail: "Words you've gotten wrong", systemImage: "exclamationmark.circle", words: missing))
        }
        let learning = words.filter { mastery($0) == .learning }
        if !learning.isEmpty {
            sets.append(WordSet(id: "learning", kind: .smart, title: "Still learning", detail: "Seen, not yet sticking", systemImage: "arrow.uturn.left", words: learning))
        }
        let familiar = words.filter { mastery($0) == .familiar }
        if !familiar.isEmpty {
            sets.append(WordSet(id: "familiar", kind: .smart, title: "Nearly there", detail: "A few more and they're mastered", systemImage: "chart.line.uptrend.xyaxis", words: familiar))
        }
        let fresh = words.filter { mastery($0) == .new }
        if !fresh.isEmpty {
            sets.append(WordSet(id: "new", kind: .smart, title: "New words", detail: "Never reviewed", systemImage: "sparkles", words: fresh))
        }

        // What they're about.
        for t in topics {
            let matched = words.filter { w in w.meaning.map { m in t.keywords.contains { matches(m, $0) } } ?? false }
            if matched.count >= 3 {
                sets.append(WordSet(id: "topic-\(t.id)", kind: .topic, title: t.title, detail: preview(matched), systemImage: t.systemImage, words: matched))
            }
        }
        let idioms = words.filter(isIdiom)
        if idioms.count >= 2 {
            sets.append(WordSet(id: "topic-idioms", kind: .topic, title: "Four-character idioms", detail: preview(idioms), systemImage: "character.book.closed", words: idioms))
        }

        // Where they came from.
        for v in videos {
            let ws = words.filter { $0.sources.contains { $0.videoId == v.id } }
            if ws.count >= 2 {
                sets.append(WordSet(id: "video-\(v.id)", kind: .video, title: v.title, detail: v.channel ?? "", systemImage: "play.rectangle", words: ws, videoID: v.id))
            }
        }
        return sets
    }

    /// A practice order for a set: words you don't know yet first, shuffled, then the rest.
    static func practiceOrder(_ words: [StudyWord], card: (StudyWord) -> CardState) -> [StudyWord] {
        let todo = words.filter { Mastery.of(card($0), known: $0.isKnown) != .mastered }.shuffled()
        let done = words.filter { Mastery.of(card($0), known: $0.isKnown) == .mastered }.shuffled()
        return todo + done
    }

    /// Whole word or word start, case-insensitive: "friend" matches "friends", "kind" doesn't match "mankind".
    static func matches(_ text: String, _ keyword: String) -> Bool {
        var from = text.startIndex
        while let r = text.range(of: keyword, options: [.caseInsensitive], range: from..<text.endIndex) {
            if r.lowerBound == text.startIndex || !text[text.index(before: r.lowerBound)].isLetter { return true }
            from = r.upperBound
        }
        return false
    }

    /// 成語-shaped: exactly four Chinese characters.
    static func isIdiom(_ w: StudyWord) -> Bool {
        let chars = Array(w.colloquial)
        return chars.count == 4 && chars.allSatisfy { $0.unicodeScalars.allSatisfy { (0x4E00...0x9FFF).contains($0.value) } }
    }

    private static func preview(_ words: [StudyWord]) -> String {
        words.prefix(4).map(\.colloquial).joined(separator: " ")
    }
}
