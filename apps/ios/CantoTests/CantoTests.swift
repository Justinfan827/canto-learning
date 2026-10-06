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
