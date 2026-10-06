import Foundation

/// One example sentence that uses a word, from the bundled set (see build-examples.mjs).
nonisolated struct ExampleSentence: Hashable, Sendable {
    var yue: String
    var jyutping: String
    var english: String
    var source: String
}

/// Example sentences bundled as `examples.json`, the same file the extension ships:
/// `sentences` are `[Cantonese, Jyutping, English, source index]`, `words` maps a
/// Traditional headword to sentence indexes, best first.
nonisolated struct ExampleBank: Decodable, Sendable {
    struct Source: Decodable, Sendable {
        var name: String
        var license: String
        var url: String
    }

    struct Row: Decodable, Sendable {
        var yue: String
        var jyutping: String
        var english: String
        var source: Int

        init(from decoder: Decoder) throws {
            var c = try decoder.unkeyedContainer()
            yue = try c.decode(String.self)
            jyutping = try c.decode(String.self)
            english = try c.decode(String.self)
            source = try c.decode(Int.self)
        }
    }

    var sources: [Source]
    var sentences: [Row]
    var words: [String: [Int]]

    static let empty = ExampleBank(sources: [], sentences: [], words: [:])

    /// Loaded from the app bundle on first use.
    static let bundled: ExampleBank = {
        guard let url = Bundle.main.url(forResource: "examples", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let bank = try? JSONDecoder().decode(ExampleBank.self, from: data)
        else { return .empty }
        return bank
    }()

    func examples(for word: String, max: Int = 3) -> [ExampleSentence] {
        (words[word] ?? []).prefix(max).compactMap { i in
            guard sentences.indices.contains(i) else { return nil }
            let r = sentences[i]
            return ExampleSentence(yue: r.yue, jyutping: r.jyutping, english: r.english, source: sources.indices.contains(r.source) ? sources[r.source].name : "")
        }
    }
}
