import Foundation
import Testing
@testable import Canto

struct SchedulerTests {
    let seed = CardState(intervalDays: 1, ease: 2.5, timesMissed: 0, dueAt: 0, reviews: 0, lastReviewedAt: nil)

    @Test func correctAnswersSpaceOut() {
        let first = Scheduler.review(seed, correct: true, now: 0)
        #expect(first.intervalDays == 1)
        #expect(first.dueAt == Scheduler.day)
        let second = Scheduler.review(first, correct: true, now: 0)
        #expect(second.intervalDays == 2.5)
    }

    @Test func missResetsAndLowersEase() {
        var s = Scheduler.review(seed, correct: true, now: 0)
        s = Scheduler.review(s, correct: true, now: 0)
        let missed = Scheduler.review(s, correct: false, now: 0)
        #expect(missed.intervalDays == 1)
        #expect(missed.ease == 2.3)
        #expect(missed.timesMissed == 1)
        var low = missed
        for _ in 0..<10 { low = Scheduler.review(low, correct: false, now: 0) }
        #expect(low.ease == 1.3)
    }
}

struct JyutpingTests {
    @Test func splitsTones() {
        let s = Jyutping.syllables("m4 zi1 dim2 gaai2")
        #expect(s.map(\.letters) == ["m", "zi", "dim", "gaai"])
        #expect(s.map(\.tone) == [4, 1, 2, 2])
        #expect(s[0].contour! == (2, 1))
    }
}

struct SnapshotTests {
    @Test func decodesSample() throws {
        let url = Bundle(for: StudyStore.self).url(forResource: "study-sample", withExtension: "json")!
        let snap = try JSONDecoder().decode(StudySnapshot.self, from: Data(contentsOf: url))
        #expect(snap.version == 1)
        #expect(snap.videos.count == 3)
        #expect(snap.words.allSatisfy { !$0.sources.isEmpty })
    }

    @Test func storeQueuesReviewsAndPicksDueWords() throws {
        let dir = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
        let store = StudyStore(directory: dir)
        store.loadSample()
        let due = store.dueWords()
        #expect(due.count == 20) // new words, capped
        #expect(due.allSatisfy { !$0.isKnown })
        store.record(due[0], correct: true)
        #expect(store.pending.count == 1)
        #expect(!store.dueWords().contains(due[0]))
        // Survives a relaunch.
        #expect(StudyStore(directory: dir).cards[due[0].id]?.reviews == 1)
    }
    @Test func addsWordsByHandAndSettlesThemWhenTheyArrive() async throws {
        let dir = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
        let store = StudyStore(directory: dir)
        #expect(store.addWord(colloquial: "  ") == .empty)
        #expect(store.addWord(colloquial: " 傾偈 ", meaning: "to chat") == .added)
        #expect(store.addWord(colloquial: "傾偈") == .alreadySaved)
        let temp = try #require(store.words.first)
        #expect(temp.colloquial == "傾偈" && temp.isManual && temp.id < 0 && temp.jyutping == nil)
        #expect(store.dueWords().contains(temp))
        store.record(temp, correct: true)
        // Survives a relaunch.
        #expect(StudyStore(directory: dir).words.map(\.colloquial) == ["傾偈"])

        let backend = FakeBackend()
        await store.refresh(from: backend)
        #expect(backend.added.map(\.colloquial) == ["傾偈"])
        // The helper hasn't handed it to the extension yet: still listed, not sent twice.
        #expect(store.added.first?.sent == true)
        await store.refresh(from: backend)
        #expect(backend.added.count == 1)

        var real = temp
        real.id = 42
        real.jyutping = "king1 gai2"
        backend.snapshot.words = [real]
        await store.refresh(from: backend)
        #expect(store.added.isEmpty)
        #expect(store.words.map(\.id) == [42])
        #expect(store.cards[42]?.reviews == 1)
    }
}

final class FakeBackend: StudyBackend, @unchecked Sendable {
    var snapshot = StudySnapshot.empty
    var added: [StudyNewWord] = []
    func fetchSnapshot() async throws -> StudySnapshot { snapshot }
    func upload(reviews: [StudyReview]) async throws {}
    func add(words: [StudyNewWord]) async throws { added += words }
}

struct ExampleTests {
    @Test func bundledExamplesHaveJyutpingAndEnglish() {
        let examples = ExampleBank.bundled.examples(for: "鍾意")
        #expect(!examples.isEmpty)
        #expect(examples.count <= 3)
        #expect(examples.allSatisfy { $0.yue.contains("鍾意") && !$0.jyutping.isEmpty && !$0.english.isEmpty && $0.source == "Tatoeba" })
        #expect(ExampleBank.bundled.examples(for: "唔存在嘅詞").isEmpty)
    }
}

/// Answers every request with a canned Convex reply and remembers what was sent.
nonisolated final class StubProtocol: URLProtocol, @unchecked Sendable {
    nonisolated(unsafe) static var reply = Data()
    nonisolated(unsafe) static var sent: [URLRequest] = []

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        var req = request
        if let stream = request.httpBodyStream {
            stream.open()
            var body = Data()
            let buf = UnsafeMutablePointer<UInt8>.allocate(capacity: 4096)
            while stream.hasBytesAvailable { let n = stream.read(buf, maxLength: 4096); if n <= 0 { break }; body.append(buf, count: n) }
            buf.deallocate()
            req.httpBody = body
        }
        Self.sent.append(req)
        client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Self.reply)
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}

@Suite(.serialized) struct ConvexBackendTests {
    func backend() -> ConvexBackend {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        var b = ConvexBackend(url: "happy-otter-123.convex.cloud", token: "secret")!
        b.session = URLSession(configuration: config)
        return b
    }

    @Test func fetchesSnapshotThroughTheQueryAPI() async throws {
        // Convex sends every number as a float.
        StubProtocol.reply = Data(#"{"status":"success","value":{"version":1.0,"exportedAt":5.0,"videos":[],"words":[{"id":7.0,"colloquial":"咁","formal":null,"jyutping":"gam3","meaning":"so","notes":null,"status":"learning","timesAsked":1.0,"timesMissed":0.0,"intervalDays":1.0,"ease":2.5,"dueAt":1.0,"createdAt":1.0,"updatedAt":1.0,"sources":[]}]}}"#.utf8)
        StubProtocol.sent = []
        let snap = try await backend().fetchSnapshot()
        #expect(snap.words.first?.id == 7)
        let req = try #require(StubProtocol.sent.first)
        #expect(req.url?.absoluteString == "https://happy-otter-123.convex.cloud/api/query")
        let body = try JSONSerialization.jsonObject(with: req.httpBody ?? Data()) as? [String: Any]
        #expect(body?["path"] as? String == "study:snapshot")
        #expect((body?["args"] as? [String: Any])?["token"] as? String == "secret")
    }

    @Test func surfacesTheServerError() async {
        StubProtocol.reply = Data(#"{"status":"error","errorMessage":"[Request ID: 1] Server Error\nUncaught Error: Wrong sync token\n    at checkToken (../convex/lib.ts:11:0)"}"#.utf8)
        await #expect(throws: BackendError.self) { try await backend().fetchSnapshot() }
        #expect(ConvexBackend.reason("[Request ID: 1] Server Error\nUncaught Error: Wrong sync token\n    at x") == "Wrong sync token")
    }

    @Test func addsWordsThroughTheMutationAPI() async throws {
        StubProtocol.reply = Data(#"{"status":"success","value":{"created":true,"word":{}}}"#.utf8)
        StubProtocol.sent = []
        try await backend().add(words: [StudyNewWord(colloquial: "傾偈", jyutping: nil, meaning: "to chat", at: 1)])
        let req = try #require(StubProtocol.sent.first)
        #expect(req.url?.absoluteString == "https://happy-otter-123.convex.cloud/api/mutation")
        let body = try JSONSerialization.jsonObject(with: req.httpBody ?? Data()) as? [String: Any]
        #expect(body?["path"] as? String == "store:addWord")
        let word = (body?["args"] as? [String: Any])?["word"] as? [String: Any]
        #expect(word?["colloquial"] as? String == "傾偈")
        #expect(word?["jyutping"] is NSNull)
    }

    @Test func needsAURLAndToken() {
        #expect(ConvexBackend(url: "", token: "t") == nil)
        #expect(ConvexBackend(url: "https://x.convex.cloud", token: "") == nil)
    }
}

/// Records calls and serves canned squads, standing in for Convex.
private final class FakeSquads: SquadBackend, @unchecked Sendable {
    var reported: [SquadProgress] = []
    let session = SquadSession(userId: "u1", secret: "s1")
    let squad = Squad(id: "q1", name: "Crew", code: "AB2CD3", members: [SquadMember(name: "Ana", learned: 2, saved: 3, isMe: true, updatedAt: nil)])

    func redeemLinkCode(_ code: String) async throws -> (session: SquadSession, name: String) {
        guard code == "LINK42" else { throw BackendError.server("That link code didn't work") }
        return (session, "Ana")
    }
    func report(_ s: SquadSession, _ p: SquadProgress) async throws { reported.append(p) }
    func mySquads(_ s: SquadSession) async throws -> [Squad] { [squad] }
    func create(_ s: SquadSession, name: String) async throws -> Squad { squad }
    func join(_ s: SquadSession, code: String) async throws -> Squad { squad }
    func leave(_ s: SquadSession, squadId: String) async throws {}
}

@MainActor
struct SquadStoreTests {
    @Test func linkCodeSignsInReportsAndLoads() async throws {
        let defaults = UserDefaults(suiteName: "squads-\(UUID())")!
        let fake = FakeSquads()
        let store = SquadStore(defaults: defaults, backend: { _ in fake })
        store.serverURL = "http://127.0.0.1:3210"

        await store.link(code: "nope", progress: SquadProgress(learned: 1, saved: 1))
        #expect(!store.signedIn)
        #expect(store.error == "That link code didn't work")

        await store.link(code: "LINK42", progress: SquadProgress(learned: 4, saved: 9))
        #expect(store.signedIn && store.name == "Ana" && store.error == nil)
        #expect(fake.reported == [SquadProgress(learned: 4, saved: 9)])
        #expect(store.squads.map(\.code) == ["AB2CD3"])

        // A phone with no words yet leaves the counts alone.
        await store.refresh(progress: SquadProgress(learned: 0, saved: 0))
        #expect(fake.reported.count == 1)

        // The sign-in survives a relaunch.
        let again = SquadStore(defaults: defaults, backend: { _ in fake })
        #expect(again.signedIn && again.name == "Ana")
    }

    @Test func learnedCountsKnownAndMatureWords() throws {
        let dir = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
        let study = StudyStore(directory: dir)
        study.loadSample()
        let words = study.snapshot.words
        let expected = words.filter { $0.isKnown || max(1, $0.intervalDays) >= 21 }.count
        #expect(SquadStore.progress(of: study) == SquadProgress(learned: expected, saved: words.count))
    }
}

private struct ConvexValue<V: Decodable>: Decodable { var value: V }

/// Runs against a local deployment: TEST_RUNNER_CONVEX_TEST_URL=http://127.0.0.1:3210 xcodebuild test ...
struct ConvexSquadsTests {
    @Test(.enabled(if: ProcessInfo.processInfo.environment["CONVEX_TEST_URL"] != nil))
    func redeemsLinkCodeAndJoins() async throws {
        let url = ProcessInfo.processInfo.environment["CONVEX_TEST_URL"]!
        let api = try #require(ConvexSquads(url: url))
        // Make the extension's user and a link code the way the extension does.
        func mutation<T: Decodable>(_ path: String, _ args: [String: Any]) async throws -> T {
            var req = URLRequest(url: URL(string: url)!.appending(path: "api/mutation"))
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "content-type")
            req.httpBody = try JSONSerialization.data(withJSONObject: ["path": path, "args": args, "format": "json"])
            return try JSONDecoder().decode(ConvexValue<T>.self, from: try await URLSession.shared.data(for: req).0).value
        }
        let chrome: SquadSession = try await mutation("squads:signUp", ["name": "Ana"])
        let squad: Squad = try await mutation("squads:create", ["session": ["userId": chrome.userId, "secret": chrome.secret], "name": "Crew"])
        struct Link: Decodable { var code: String }
        let link: Link = try await mutation("squads:linkCode", ["session": ["userId": chrome.userId, "secret": chrome.secret]])

        let (phone, name) = try await api.redeemLinkCode(link.code)
        #expect(name == "Ana" && phone.userId == chrome.userId)
        try await api.report(phone, SquadProgress(learned: 5, saved: 8))
        let mine = try await api.mySquads(phone)
        #expect(mine.map(\.code) == [squad.code])
        #expect(mine[0].members.map(\.learned) == [5])
        do {
            _ = try await api.join(phone, code: "ZZZZZZ")
            Issue.record("joined a squad that doesn't exist")
        } catch {
            #expect(error.localizedDescription == "No squad has the code ZZZZZZ")
        }
    }
}

struct ProgressTests {
    func word(_ id: Int, _ c: String, meaning: String? = nil, known: Bool = false) -> StudyWord {
        StudyWord(id: id, colloquial: c, formal: nil, jyutping: nil, meaning: meaning, notes: nil, status: known ? "known" : "learning", timesAsked: 0, timesMissed: 0,
                  intervalDays: 1, ease: 2.5, dueAt: 0, createdAt: 0, updatedAt: 0, sources: [])
    }
    func card(interval: Double, reviews: Int = 3, missed: Int = 0) -> CardState {
        CardState(intervalDays: interval, ease: 2.5, timesMissed: missed, dueAt: 0, reviews: reviews, lastReviewedAt: 0)
    }

    @Test func stagesFollowTheInterval() {
        #expect(Mastery.of(card(interval: 1, reviews: 0), known: false) == .new)
        #expect(Mastery.of(card(interval: 2.5), known: false) == .learning)
        #expect(Mastery.of(card(interval: 7), known: false) == .familiar)
        #expect(Mastery.of(card(interval: 21), known: false) == .mastered)
        #expect(Mastery.of(card(interval: 1, reviews: 0), known: true) == .mastered)
    }

    @Test func countsStreakRecallAndHardestWords() {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let day = 86_400_000.0
        let words = [word(1, "迷茫"), word(2, "交友"), word(3, "幽默")]
        let cards = [1: card(interval: 1, missed: 3), 2: card(interval: 30), 3: card(interval: 1, reviews: 0)]
        // Answers today, yesterday and two days ago (a 3-day streak), and one 10 days ago.
        let history = [
            StudyReview(wordId: 1, colloquial: "迷茫", correct: false, at: now.ms),
            StudyReview(wordId: 2, colloquial: "交友", correct: true, at: now.ms - day),
            StudyReview(wordId: 2, colloquial: "交友", correct: true, at: now.ms - 2 * day),
            StudyReview(wordId: 1, colloquial: "迷茫", correct: true, at: now.ms - 10 * day),
        ]
        let p = ProgressStats(words: words, card: { cards[$0.id]! }, history: history, now: now, calendar: cal)
        #expect(p.count(.learning) == 1 && p.count(.mastered) == 1 && p.count(.new) == 1)
        #expect(p.streak == 3)
        #expect(p.reviewedToday == 1)
        #expect(p.recall == 2.0 / 3.0) // the 10-day-old answer is outside the week
        #expect(p.days.count == 14 && p.days.last?.missed == 1)
        #expect(p.hardest.map(\.word.colloquial) == ["迷茫"])
    }

    @Test func streakSurvivesUntilYouReviewToday() {
        let now = Date()
        let yesterday = now.ms - 86_400_000
        let p = ProgressStats(words: [], card: { _ in .seed(from: word(0, "")) }, history: [StudyReview(wordId: 1, colloquial: "x", correct: true, at: yesterday)], now: now)
        #expect(p.streak == 1)
        #expect(p.reviewedToday == 0)
    }

    @Test func storeKeepsEveryAnswerForProgress() {
        let dir = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
        let store = StudyStore(directory: dir)
        store.loadSample()
        let w = store.dueWords()[0]
        store.record(w, correct: false)
        store.record(w, correct: true)
        #expect(store.history.count == 2)
        #expect(StudyStore(directory: dir).history.count == 2)
        #expect(store.progress().reviewedToday == 2)
        store.resetProgress()
        #expect(store.history.isEmpty)
    }
}

struct WordSetTests {
    let p = ProgressTests()

    @Test func findsTopicsIdiomsAndProgressSets() {
        let words = [
            p.word(1, "交友", meaning: "to make friends"), p.word(2, "相遇", meaning: "to meet; to encounter"), p.word(3, "緣分", meaning: "fate or chance that brings people together"),
            p.word(4, "血統", meaning: "blood relationship; lineage"), p.word(5, "不知所措", meaning: "not knowing what to do (idiom)"), p.word(6, "玩世不恭", meaning: "frivolous"),
        ]
        let cards = [1: p.card(interval: 1, missed: 2), 2: p.card(interval: 30)]
        let sets = WordSets.build(words: words, card: { cards[$0.id] ?? .seed(from: $0) }, videos: [])
        let byID = Dictionary(uniqueKeysWithValues: sets.map { ($0.id, $0) })
        #expect(byID["topic-relationships"]?.words.map(\.id) == [1, 2, 3]) // not 血統's "blood relationship"
        #expect(byID["topic-idioms"]?.words.map(\.id) == [5, 6])
        #expect(byID["missing"]?.words.map(\.id) == [1])
        #expect(byID["new"]?.words.count == 4)
    }

    @Test func matchesWholeWordsOrWordStarts() {
        #expect(WordSets.matches("to make friends", "friend"))
        #expect(!WordSets.matches("mankind", "kind"))
        #expect(WordSets.matches("good and honest; kindhearted", "kind"))
    }

    @Test func practicesUnmasteredWordsFirst() {
        let words = (1...6).map { p.word($0, "字\($0)") }
        let cards = [1: p.card(interval: 30), 2: p.card(interval: 30)]
        let order = WordSets.practiceOrder(words, card: { cards[$0.id] ?? .seed(from: $0) })
        #expect(Set(order.suffix(2).map(\.id)) == [1, 2])
    }

    @Test func findsExamplesForSimplifiedWords() {
        #expect(!ExampleBank.bundled.examples(for: "摇篮").isEmpty)
    }
}
