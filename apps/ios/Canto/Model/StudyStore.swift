import Foundation
import Observation

/// Everything the app shows: the last snapshot from your computer, cached on
/// the phone, plus the phone's own flashcard schedule.
@Observable
final class StudyStore {
    enum SyncState: Equatable {
        case idle
        case syncing
        case synced(Date)
        case failed(String)
    }

    static let defaultAddress = "http://127.0.0.1:8787"

    private(set) var snapshot: StudySnapshot = .empty
    private(set) var cards: [Int: CardState] = [:]
    private(set) var pending: [StudyReview] = []
    /// Every flashcard answer on this phone, kept for the Progress tab. `pending` empties as it syncs; this doesn't.
    private(set) var history: [StudyReview] = []
    /// Words typed in on this phone that haven't come back in a snapshot yet.
    private(set) var added: [AddedWord] = []
    private(set) var sync: SyncState = .idle
    private(set) var lastSyncedAt: Date?

    var backendKind: BackendKind {
        didSet { UserDefaults.standard.set(backendKind.rawValue, forKey: "backend") }
    }
    /// The helper on your computer.
    var address: String {
        didSet { UserDefaults.standard.set(address, forKey: "serverURL") }
    }
    var convexURL: String {
        didSet { UserDefaults.standard.set(convexURL, forKey: "convexURL") }
    }
    var convexToken: String {
        didSet { UserDefaults.standard.set(convexToken, forKey: "convexToken") }
    }

    private let dir: URL

    init(directory: URL? = nil) {
        dir = directory ?? URL.applicationSupportDirectory.appending(path: "Study", directoryHint: .isDirectory)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let defaults = UserDefaults.standard
        backendKind = defaults.string(forKey: "backend").flatMap(BackendKind.init) ?? .computer
        address = defaults.string(forKey: "serverURL") ?? Self.defaultAddress
        convexURL = defaults.string(forKey: "convexURL") ?? ""
        convexToken = defaults.string(forKey: "convexToken") ?? ""
        snapshot = load("snapshot.json") ?? .empty
        cards = load("cards.json") ?? [:]
        pending = load("pending.json") ?? []
        history = load("history.json") ?? []
        added = load("added.json") ?? []
        lastSyncedAt = load("synced.json")
    }

    // MARK: Reading

    var hasWords: Bool { !allWords.isEmpty }

    /// The snapshot's words plus the ones added here that it doesn't have yet.
    private var allWords: [StudyWord] {
        guard !added.isEmpty else { return snapshot.words }
        let have = Set(snapshot.words.map(\.colloquial))
        return snapshot.words + added.filter { !have.contains($0.word.colloquial) }.map(\.studyWord)
    }

    /// Videos with saved words, most recently studied first.
    var videos: [StudyVideo] {
        let latest = Dictionary(grouping: snapshot.words.flatMap(\.sources), by: \.videoId).mapValues { $0.map(\.createdAt).max() ?? 0 }
        return snapshot.videos.filter { latest[$0.id] != nil }.sorted { (latest[$0.id] ?? 0) > (latest[$1.id] ?? 0) }
    }

    /// All words, newest saved first.
    var words: [StudyWord] { allWords.sorted { $0.createdAt > $1.createdAt } }

    func words(in video: StudyVideo) -> [StudyWord] {
        snapshot.words
            .filter { $0.sources.contains { $0.videoId == video.id } }
            .sorted { ($0.sources.first { $0.videoId == video.id }?.startMs ?? 0) < ($1.sources.first { $0.videoId == video.id }?.startMs ?? 0) }
    }

    func video(_ id: String) -> StudyVideo? { snapshot.videos.first { $0.id == id } }

    func word(_ id: Int) -> StudyWord? { allWords.first { $0.id == id } }

    func isSaved(_ colloquial: String) -> Bool {
        let c = colloquial.trimmingCharacters(in: .whitespacesAndNewlines)
        return allWords.contains { $0.colloquial == c }
    }

    func card(for word: StudyWord) -> CardState { cards[word.id] ?? .seed(from: word) }

    /// Words to study now: reviewed ones that are due, then new ones. Words marked
    /// known in the extension stay out unless you ask for them.
    func dueWords(now: Date = .now, includeKnown: Bool = false, newLimit: Int = 20) -> [StudyWord] {
        let pool = allWords.filter { includeKnown || !$0.isKnown }
        let due = pool.filter { !card(for: $0).isNew && card(for: $0).dueAt <= now.ms }.sorted { card(for: $0).dueAt < card(for: $1).dueAt }
        let fresh = pool.filter { card(for: $0).isNew }.sorted { $0.createdAt < $1.createdAt }.prefix(newLimit)
        return due + fresh
    }

    var dueCount: Int { dueWords().count }

    /// Practice sets found from your words: by progress, by topic and by video.
    func wordSets() -> [WordSet] { WordSets.build(words: allWords, card: card(for:), videos: videos) }

    /// A set's words in practice order: ones you don't know yet first.
    func practiceOrder(_ words: [StudyWord]) -> [StudyWord] { WordSets.practiceOrder(words, card: card(for:)) }

    /// Where your words stand and how your reviews have gone.
    func progress(now: Date = .now) -> ProgressStats {
        ProgressStats(words: allWords, card: card(for:), history: history, now: now)
    }

    /// When the next card comes due, if nothing is due now.
    var nextDue: Date? {
        allWords.filter { !$0.isKnown && !card(for: $0).isNew }.map { card(for: $0).dueAt }.min().map { Date(ms: $0) }
    }

    // MARK: Reviewing

    func record(_ word: StudyWord, correct: Bool, now: Date = .now) {
        cards[word.id] = Scheduler.review(card(for: word), correct: correct, now: now.ms)
        let review = StudyReview(wordId: word.id, colloquial: word.colloquial, correct: correct, at: now.ms)
        pending.append(review)
        history.append(review)
        save(cards, "cards.json")
        save(pending, "pending.json")
        save(history, "history.json")
    }

    // MARK: Adding

    enum AddOutcome: Equatable { case added, alreadySaved, empty }

    /// Saves a word typed in by hand. Only the Cantonese is required; it shows up
    /// right away and goes to the backend on the next sync.
    @discardableResult
    func addWord(colloquial: String, jyutping: String = "", meaning: String = "", now: Date = .now) -> AddOutcome {
        func clean(_ s: String) -> String? {
            let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
            return t.isEmpty ? nil : t
        }
        guard let c = clean(colloquial) else { return .empty }
        if isSaved(c) { return .alreadySaved }
        added.append(AddedWord(word: StudyNewWord(colloquial: c, jyutping: clean(jyutping), meaning: clean(meaning), at: now.ms), sent: false))
        save(added, "added.json")
        return .added
    }

    /// Drops added words the snapshot now has, carrying over any flashcard progress.
    private func settleAdded() {
        let byText = Dictionary(snapshot.words.map { ($0.colloquial, $0.id) }, uniquingKeysWith: { a, _ in a })
        let arrived = added.filter { byText[$0.word.colloquial] != nil }
        guard !arrived.isEmpty else { return }
        for a in arrived {
            let temp = a.studyWord.id
            if let card = cards.removeValue(forKey: temp), let real = byText[a.word.colloquial], cards[real] == nil { cards[real] = card }
        }
        added.removeAll { byText[$0.word.colloquial] != nil }
        save(cards, "cards.json")
        save(added, "added.json")
    }

    // MARK: Syncing

    func refresh() async {
        do {
            await refresh(from: try makeBackend())
        } catch {
            sync = .failed(error.localizedDescription)
        }
    }

    /// The backend Settings point at.
    func makeBackend() throws -> any StudyBackend {
        switch backendKind {
        case .computer:
            guard let b = HelperBackend(address: address) else { throw BackendError.badURL }
            return b
        case .convex:
            guard let b = ConvexBackend(url: convexURL, token: convexToken) else { throw BackendError.convexNotSetUp }
            return b
        }
    }

    func refresh(from backend: some StudyBackend) async {
        sync = .syncing
        do {
            // Send new words first, so a Convex snapshot already has them.
            let unsent = added.filter { !$0.sent }.map(\.word)
            try await backend.add(words: unsent)
            let sentAt = Set(unsent.map(\.at))
            added = added.map { sentAt.contains($0.word.at) ? AddedWord(word: $0.word, sent: true) : $0 }
            save(added, "added.json")

            let snap = try await backend.fetchSnapshot()
            // An empty export from a fresh browser shouldn't wipe what the phone has.
            if !snap.words.isEmpty || snapshot.words.isEmpty {
                snapshot = snap
                save(snapshot, "snapshot.json")
            }
            settleAdded()
            let sent = pending
            try await backend.upload(reviews: sent)
            pending.removeFirst(min(sent.count, pending.count))
            save(pending, "pending.json")
            let now = Date.now
            lastSyncedAt = now
            save(now, "synced.json")
            sync = .synced(now)
        } catch {
            sync = .failed(describe(error))
        }
    }

    /// Fills the app with sample words from real Cantonese videos, for trying it out.
    func loadSample() {
        guard let url = Bundle.main.url(forResource: "study-sample", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              var snap = try? JSONDecoder().decode(StudySnapshot.self, from: data) else { return }
        // Shift the sample so it reads as saved over the last few days.
        let shift = Date.now.ms - snap.exportedAt
        snap.exportedAt += shift
        snap.videos = snap.videos.map { var v = $0; v.firstSeenAt += shift; return v }
        snap.words = snap.words.map { w in
            var w = w
            w.createdAt += shift; w.updatedAt += shift; w.dueAt += shift
            w.sources = w.sources.map { var s = $0; s.createdAt += shift; return s }
            return w
        }
        snapshot = snap
        save(snapshot, "snapshot.json")
    }

    func resetProgress() {
        cards = [:]
        pending = []
        history = []
        save(cards, "cards.json")
        save(pending, "pending.json")
        save(history, "history.json")
    }

    private func describe(_ error: Error) -> String {
        if let e = error as? URLError {
            switch e.code {
            case .cannotConnectToHost, .cannotFindHost, .timedOut, .networkConnectionLost, .notConnectedToInternet:
                return backendKind == .convex ? "Couldn't reach Convex. Check the deployment URL and your connection." : "Couldn't reach your computer. Start the helper with pnpm transcriber."
            default: break
            }
        }
        return error.localizedDescription
    }

    // MARK: Files

    private func load<T: Decodable>(_ name: String) -> T? {
        guard let data = try? Data(contentsOf: dir.appending(path: name)) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    private func save<T: Encodable>(_ value: T, _ name: String) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        try? data.write(to: dir.appending(path: name), options: .atomic)
    }
}

/// A word added on this phone. `sent` once the backend has it; it stays listed
/// until a snapshot includes it (through the helper, that waits for the extension).
nonisolated struct AddedWord: Codable, Sendable, Hashable {
    var word: StudyNewWord
    var sent: Bool

    /// How it shows until the real one arrives, under a negative id so it can't clash.
    var studyWord: StudyWord {
        StudyWord(
            id: -Int(word.at), colloquial: word.colloquial, formal: nil, jyutping: word.jyutping, meaning: word.meaning, notes: nil,
            status: "learning", timesAsked: 0, timesMissed: 0, intervalDays: 1, ease: 2.5, dueAt: word.at + Scheduler.day,
            createdAt: word.at, updatedAt: word.at, source: "manual", sources: []
        )
    }
}
