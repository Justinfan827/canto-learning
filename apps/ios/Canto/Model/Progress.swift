import Foundation

/// How well a word is known, from how far apart its reviews have spread.
nonisolated enum Mastery: Int, CaseIterable, Sendable, Identifiable {
    case new, learning, familiar, mastered
    var id: Self { self }

    var label: String {
        switch self {
        case .new: "New"
        case .learning: "Learning"
        case .familiar: "Familiar"
        case .mastered: "Mastered"
        }
    }

    var hint: String {
        switch self {
        case .new: "Not reviewed yet"
        case .learning: "Comes back within a week"
        case .familiar: "Remembered a week or more apart"
        case .mastered: "Remembered three weeks or more apart"
        }
    }

    /// Mastered matches the squads leaderboard's "learned": marked known, or 21 days or more between reviews.
    static func of(_ card: CardState, known: Bool) -> Mastery {
        if known { return .mastered }
        if card.isNew { return .new }
        if card.intervalDays >= 21 { return .mastered }
        if card.intervalDays >= 7 { return .familiar }
        return .learning
    }
}

/// What the Progress tab shows: where your words stand and how your reviews have gone.
nonisolated struct ProgressStats: Sendable {
    struct Day: Sendable, Identifiable {
        var date: Date
        var correct: Int
        var missed: Int
        var id: Date { date }
        var total: Int { correct + missed }
    }

    struct Hard: Sendable, Identifiable {
        var word: StudyWord
        var missed: Int
        var id: Int { word.id }
    }

    var counts: [Mastery: Int]
    var total: Int
    /// The last 14 days, oldest first, today last.
    var days: [Day]
    /// Share of answers you knew in the last 7 days; nil with no reviews.
    var recall: Double?
    /// Days in a row with at least one review, counting today or, if you haven't reviewed yet today, yesterday.
    var streak: Int
    var reviewedToday: Int
    var allTimeReviews: Int
    /// Words missed most, worst first.
    var hardest: [Hard]

    func count(_ m: Mastery) -> Int { counts[m] ?? 0 }

    init(words: [StudyWord], card: (StudyWord) -> CardState, history: [StudyReview], now: Date = .now, calendar: Calendar = .current) {
        var counts: [Mastery: Int] = [:]
        for w in words { counts[Mastery.of(card(w), known: w.isKnown), default: 0] += 1 }
        self.counts = counts
        total = words.count

        let today = calendar.startOfDay(for: now)
        var byDay: [Date: (Int, Int)] = [:]
        for r in history {
            let d = calendar.startOfDay(for: Date(ms: r.at))
            var v = byDay[d] ?? (0, 0)
            if r.correct { v.0 += 1 } else { v.1 += 1 }
            byDay[d] = v
        }
        days = (0..<14).reversed().compactMap { back in
            calendar.date(byAdding: .day, value: -back, to: today).map { d in Day(date: d, correct: byDay[d]?.0 ?? 0, missed: byDay[d]?.1 ?? 0) }
        }
        reviewedToday = byDay[today].map { $0.0 + $0.1 } ?? 0
        allTimeReviews = history.count

        let weekAgo = calendar.date(byAdding: .day, value: -6, to: today) ?? today
        let recent = history.filter { Date(ms: $0.at) >= weekAgo }
        recall = recent.isEmpty ? nil : Double(recent.filter(\.correct).count) / Double(recent.count)

        var streak = 0
        var day = byDay[today] == nil ? calendar.date(byAdding: .day, value: -1, to: today) : today
        while let d = day, byDay[d] != nil {
            streak += 1
            day = calendar.date(byAdding: .day, value: -1, to: d)
        }
        self.streak = streak

        hardest = words
            .map { Hard(word: $0, missed: card($0).timesMissed) }
            .filter { $0.missed > 0 }
            .sorted { $0.missed != $1.missed ? $0.missed > $1.missed : $0.word.colloquial < $1.word.colloquial }
            .prefix(5)
            .map { $0 }
    }
}
