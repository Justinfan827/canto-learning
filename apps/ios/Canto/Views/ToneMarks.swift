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
                VStack(spacing: size * 0.25) {
                    if showContours {
                        // The tinted track is the speaking range, so a contour reads as high or low.
                        ToneContour(syllable: s)
                            .stroke(Palette.jade, style: StrokeStyle(lineWidth: max(2, size * 0.14), lineCap: .round, lineJoin: .round))
                            .padding(.vertical, size * 0.18)
                            .frame(minWidth: size * 1.5, maxWidth: .infinity)
                            .frame(height: size * 1.15)
                            .background(Palette.jadeSoft, in: .rect(cornerRadius: size * 0.25))
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
                .fixedSize()
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
            // Pitch holds briefly, then glides.
            p.addQuadCurve(to: end, control: CGPoint(x: start.x + (end.x - start.x) * 0.5, y: start.y))
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
