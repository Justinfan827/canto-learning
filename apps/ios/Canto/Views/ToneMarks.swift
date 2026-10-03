import SwiftUI

/// Jyutping with each syllable's pitch drawn above it, so the tone is something
/// you see as a shape: tone 1 a high flat line, tone 2 a rise, tone 4 a low fall.
struct ToneJyutping: View {
    var jyutping: String?
    var size: CGFloat = 17
    var color: Color = Palette.muted
    var showContours = true

    var body: some View {
        let syllables = Jyutping.syllables(jyutping)
        HStack(alignment: .bottom, spacing: size * 0.45) {
            ForEach(Array(syllables.enumerated()), id: \.offset) { _, s in
                VStack(spacing: size * 0.18) {
                    if showContours {
                        ToneContour(syllable: s)
                            .stroke(color.opacity(0.9), style: StrokeStyle(lineWidth: max(1.5, size * 0.1), lineCap: .round, lineJoin: .round))
                            .frame(width: size * 1.3, height: size * 0.62)
                    }
                    HStack(alignment: .firstTextBaseline, spacing: 0.5) {
                        Text(s.letters)
                            .font(.system(size: size, weight: .medium))
                        if let t = s.tone {
                            Text("\(t)")
                                .font(.system(size: size * 0.62, weight: .semibold))
                                .baselineOffset(size * 0.32)
                        }
                    }
                    .foregroundStyle(color)
                }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(jyutping ?? "")
    }
}

/// A pitch contour on a 5-level scale; the path runs left to right across the frame.
nonisolated struct ToneContour: Shape {
    var syllable: Syllable

    func path(in rect: CGRect) -> Path {
        var p = Path()
        guard let (a, b) = syllable.contour else { return p }
        let y = { (level: Double) in rect.maxY - (level - 1) / 4 * rect.height }
        let inset = rect.width * 0.12
        let start = CGPoint(x: rect.minX + inset, y: y(a))
        let end = CGPoint(x: rect.maxX - inset, y: y(b))
        p.move(to: start)
        if a == b {
            p.addLine(to: end)
        } else {
            // A gentle curve: pitch glides rather than steps.
            p.addCurve(to: end, control1: CGPoint(x: start.x + (end.x - start.x) * 0.45, y: start.y), control2: CGPoint(x: start.x + (end.x - start.x) * 0.6, y: end.y))
        }
        return p
    }
}

#Preview {
    VStack(alignment: .leading, spacing: 24) {
        ToneJyutping(jyutping: "si1 si2 si3 si4 si5 si6", size: 22)
        ToneJyutping(jyutping: "m4 zi1 dim2 gaai2", size: 17)
    }
    .padding()
}
