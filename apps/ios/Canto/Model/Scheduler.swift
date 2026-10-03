import Foundation

/// The phone's review state for one word. Seeded from the extension's numbers,
/// then owned by the phone once you review the word here.
nonisolated struct CardState: Codable, Sendable, Hashable {
    var intervalDays: Double
    var ease: Double
    var timesMissed: Int
    var dueAt: Double
    var reviews: Int
    var lastReviewedAt: Double?

    static func seed(from word: StudyWord) -> CardState {
        CardState(intervalDays: max(1, word.intervalDays), ease: word.ease, timesMissed: word.timesMissed, dueAt: 0, reviews: 0, lastReviewedAt: nil)
    }

    var isNew: Bool { reviews == 0 }
}

/// Simplified SM-2, the same rule as packages/shared/src/schedule.ts: a correct
/// answer multiplies the interval by ease; a miss resets it to a day and lowers
/// ease by 0.2, never below 1.3.
nonisolated enum Scheduler {
    static let day: Double = 86_400_000

    static func review(_ s: CardState, correct: Bool, now: Double) -> CardState {
        var n = s
        if correct {
            // A word you know on first sight still comes back tomorrow, then spaces out.
            n.intervalDays = s.isNew ? 1 : max(1, s.intervalDays * s.ease)
        } else {
            n.intervalDays = 1
            n.ease = max(1.3, ((s.ease - 0.2) * 100).rounded() / 100)
            n.timesMissed += 1
        }
        // A miss comes back later in the same session; the next real review is in ten minutes.
        n.dueAt = now + (correct ? n.intervalDays * day : 10 * 60 * 1000)
        n.reviews += 1
        n.lastReviewedAt = now
        return n
    }
}
