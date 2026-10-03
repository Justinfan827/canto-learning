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
    private(set) var sync: SyncState = .idle
    private(set) var lastSyncedAt: Date?

    var address: String {
        didSet { UserDefaults.standard.set(address, forKey: "serverURL") }
    }

    private let dir: URL

    init(directory: URL? = nil) {
        dir = directory ?? URL.applicationSupportDirectory.appending(path: "Study", directoryHint: .isDirectory)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        address = UserDefaults.standard.string(forKey: "serverURL") ?? Self.defaultAddress
        snapshot = load("snapshot.json") ?? .empty
        cards = load("cards.json") ?? [:]
        pending = load("pending.json") ?? []
        lastSyncedAt = load("synced.json")
    }

    // MARK: Reading

    var hasWords: Bool { !snapshot.words.isEmpty }

    /// Videos with saved words, most recently studied first.
    var videos: [StudyVideo] {
        let latest = Dictionary(grouping: snapshot.words.flatMap(\.sources), by: \.videoId).mapValues { $0.map(\.createdAt).max() ?? 0 }
        return snapshot.videos.filter { latest[$0.id] != nil }.sorted { (latest[$0.id] ?? 0) > (latest[$1.id] ?? 0) }
    }

    /// All words, newest saved first.
    var words: [StudyWord] { snapshot.words.sorted { $0.createdAt > $1.createdAt } }

    func words(in video: StudyVideo) -> [StudyWord] {
        snapshot.words
            .filter { $0.sources.contains { $0.videoId == video.id } }
            .sorted { ($0.sources.first { $0.videoId == video.id }?.startMs ?? 0) < ($1.sources.first { $0.videoId == video.id }?.startMs ?? 0) }
    }

    func video(_ id: String) -> StudyVideo? { snapshot.videos.first { $0.id == id } }

    func word(_ id: Int) -> StudyWord? { snapshot.words.first { $0.id == id } }

    func card(for word: StudyWord) -> CardState { cards[word.id] ?? .seed(from: word) }

    /// Words to study now: reviewed ones that are due, then new ones. Words marked
    /// known in the extension stay out unless you ask for them.
    func dueWords(now: Date = .now, includeKnown: Bool = false, newLimit: Int = 20) -> [StudyWord] {
        let pool = snapshot.words.filter { includeKnown || !$0.isKnown }
        let due = pool.filter { !card(for: $0).isNew && card(for: $0).dueAt <= now.ms }.sorted { card(for: $0).dueAt < card(for: $1).dueAt }
        let fresh = pool.filter { card(for: $0).isNew }.sorted { $0.createdAt < $1.createdAt }.prefix(newLimit)
        return due + fresh
    }

    var dueCount: Int { dueWords().count }

    /// When the next card comes due, if nothing is due now.
    var nextDue: Date? {
        snapshot.words.filter { !$0.isKnown && !card(for: $0).isNew }.map { card(for: $0).dueAt }.min().map { Date(ms: $0) }
    }

    // MARK: Reviewing

    func record(_ word: StudyWord, correct: Bool, now: Date = .now) {
        cards[word.id] = Scheduler.review(card(for: word), correct: correct, now: now.ms)
        pending.append(StudyReview(wordId: word.id, colloquial: word.colloquial, correct: correct, at: now.ms))
        save(cards, "cards.json")
        save(pending, "pending.json")
    }

    // MARK: Syncing

    func refresh() async {
        guard let backend = HelperBackend(address: address) else {
            sync = .failed(BackendError.badURL.localizedDescription)
            return
        }
        await refresh(from: backend)
    }

    func refresh(from backend: some StudyBackend) async {
        sync = .syncing
        do {
            let snap = try await backend.fetchSnapshot()
            // An empty export from a fresh browser shouldn't wipe what the phone has.
            if !snap.words.isEmpty || snapshot.words.isEmpty {
                snapshot = snap
                save(snapshot, "snapshot.json")
            }
            let sent = pending
            try await backend.upload(reviews: sent)
            pending.removeFirst(min(sent.count, pending.count))
            save(pending, "pending.json")
            let now = Date.now
            lastSyncedAt = now
            save(now, "synced.json")
            sync = .synced(now)
        } catch {
            sync = .failed(Self.describe(error))
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
        save(cards, "cards.json")
        save(pending, "pending.json")
    }

    private static func describe(_ error: Error) -> String {
        if let e = error as? URLError {
            switch e.code {
            case .cannotConnectToHost, .cannotFindHost, .timedOut, .networkConnectionLost, .notConnectedToInternet:
                return "Couldn't reach your computer. Start the helper with pnpm transcriber."
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
