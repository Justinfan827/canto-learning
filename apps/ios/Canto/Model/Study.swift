import Foundation

/// Mirrors `StudySnapshot` in packages/shared/src/study.ts: what the extension exports.
nonisolated struct StudySnapshot: Codable, Sendable {
    var version: Int
    var exportedAt: Double
    var videos: [StudyVideo]
    var words: [StudyWord]

    static let empty = StudySnapshot(version: 1, exportedAt: 0, videos: [], words: [])
}

nonisolated struct StudyVideo: Codable, Sendable, Identifiable, Hashable {
    var id: String
    var title: String
    var channel: String?
    var url: String
    var firstSeenAt: Double

    var thumbnailURL: URL? { URL(string: "https://i.ytimg.com/vi/\(id)/mqdefault.jpg") }

    func watchURL(at ms: Double = 0) -> URL? {
        let t = Int(ms / 1000)
        return URL(string: "https://www.youtube.com/watch?v=\(id)" + (t > 0 ? "&t=\(t)s" : ""))
    }
}

nonisolated struct StudyWord: Codable, Sendable, Identifiable, Hashable {
    var id: Int
    var colloquial: String
    var formal: String?
    var jyutping: String?
    var meaning: String?
    var notes: String?
    var status: String
    var timesAsked: Int
    var timesMissed: Int
    var intervalDays: Double
    var ease: Double
    var dueAt: Double
    var createdAt: Double
    var updatedAt: Double
    /// "manual" for words typed in by hand; missing means saved from a video.
    var source: String? = nil
    var sources: [StudySource]

    var isKnown: Bool { status == "known" }
    var isManual: Bool { source == "manual" }
    /// The written form, only when it differs from the spoken one.
    var formalIfDifferent: String? { formal.flatMap { $0.isEmpty || $0 == colloquial ? nil : $0 } }
    var latestSource: StudySource? { sources.first }
}

nonisolated struct StudySource: Codable, Sendable, Hashable {
    var videoId: String
    var lineIdx: Int
    var startMs: Double
    var endMs: Double
    var text: String
    var textColloquial: String?
    var textFormal: String?
    var textEnglish: String?
    var createdAt: Double

    /// The spoken (口語) line when the extension has one, else the caption as captured.
    var spoken: String { textColloquial ?? text }
}

/// A word typed in on the phone, queued for upload. Matches `StudyNewWord` in study.ts.
nonisolated struct StudyNewWord: Codable, Sendable, Hashable {
    var colloquial: String
    var jyutping: String?
    var meaning: String?
    var at: Double
}

/// A flashcard answer queued for upload, matching `StudyReview` in study.ts.
nonisolated struct StudyReview: Codable, Sendable, Hashable {
    var wordId: Int
    var colloquial: String
    var correct: Bool
    var at: Double
}

extension Date {
    var ms: Double { timeIntervalSince1970 * 1000 }
    init(ms: Double) { self.init(timeIntervalSince1970: ms / 1000) }
}
