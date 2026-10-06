import Foundation

/// One Jyutping syllable, split into its letters and tone number (1–6).
nonisolated struct Syllable: Hashable, Sendable {
    var letters: String
    var tone: Int?

    /// Chao pitch contour (1 = lowest, 5 = highest) for each Cantonese tone.
    var contour: (Double, Double)? {
        switch tone {
        case 1: (5, 5)
        case 2: (3, 5)
        case 3: (3, 3)
        case 4: (2, 1)
        case 5: (2, 3)
        case 6: (2, 2)
        default: nil
        }
    }
}

nonisolated enum Jyutping {
    static func syllables(_ s: String?) -> [Syllable] {
        guard let s else { return [] }
        return s.split(whereSeparator: { $0 == " " || $0 == "," }).map { part in
            let str = String(part)
            if let last = str.last, let t = last.wholeNumberValue, (1...6).contains(t) {
                return Syllable(letters: String(str.dropLast()), tone: t)
            }
            return Syllable(letters: str, tone: nil)
        }
    }
}
