import Charts
import SwiftUI

/// How you're doing: where your words stand, your streak and recall, the last two
/// weeks of reviews, and the words you miss most.
struct StudyProgressView: View {
    @Environment(StudyStore.self) private var store
    @Binding var tab: AppTab

    var body: some View {
        NavigationStack {
            Group {
                if !store.hasWords {
                    ContentUnavailableView("No words yet", systemImage: "chart.bar", description: Text("Words you save in Pause & Ask show up here as you learn them."))
                } else {
                    content(store.progress())
                }
            }
            .navigationTitle("Progress")
            .background(Palette.page)
            .navigationDestination(for: StudyWord.self) { WordDetailView(wordID: $0.id) }
        }
    }

    private func content(_ p: ProgressStats) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                MasteryCard(stats: p)
                HStack(spacing: 12) {
                    StatTile(value: "\(p.streak)", unit: p.streak == 1 ? "day" : "days", label: "Streak", systemImage: "flame")
                    StatTile(value: p.recall.map { "\(Int(($0 * 100).rounded()))" } ?? "–", unit: p.recall == nil ? "" : "%", label: "Recall, 7 days", systemImage: "brain")
                    StatTile(value: "\(p.reviewedToday)", unit: "", label: "Today", systemImage: "checkmark.circle")
                }
                .fixedSize(horizontal: false, vertical: true)
                ReviewChart(days: p.days)
                if !p.hardest.isEmpty { HardestWords(words: p.hardest) }
                if store.dueCount > 0 {
                    Button {
                        tab = .review
                    } label: {
                        Text(store.dueCount == 1 ? "Review 1 word now" : "Review \(store.dueCount) words now").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.glassProminent)
                    .foregroundStyle(Palette.onAccent)
                    .controlSize(.extraLarge)
                    .padding(.top, 4)
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
    }
}

/// The headline: how many words are mastered, and a bar of every word by stage.
private struct MasteryCard: View {
    var stats: ProgressStats

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("\(stats.count(.mastered)) of \(stats.total) mastered")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(Palette.ink)
                Text(summary)
                    .font(.subheadline)
                    .foregroundStyle(Palette.muted)
            }
            MasteryBar(counts: stats.counts, total: stats.total)
            VStack(spacing: 10) {
                ForEach(Mastery.allCases.reversed()) { m in
                    HStack(spacing: 10) {
                        Circle().fill(m.color).frame(width: 10, height: 10)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(m.label).font(.subheadline.weight(.medium)).foregroundStyle(Palette.ink)
                            Text(m.hint).font(.caption).foregroundStyle(Palette.muted)
                        }
                        Spacer(minLength: 0)
                        Text("\(stats.count(m))").font(.body.monospacedDigit().weight(.medium)).foregroundStyle(Palette.ink)
                    }
                    .accessibilityElement(children: .combine)
                }
            }
        }
        .padding(18)
        .background(Palette.surface, in: .rect(cornerRadius: 20))
    }

    private var summary: String {
        let started = stats.total - stats.count(.new)
        if started == 0 { return "Start a review to begin." }
        return "You've studied \(started) of your \(stats.total) words."
    }
}

/// Every word in a group as one bar, split by stage: mastered, familiar, learning, new.
struct MasteryBar: View {
    var counts: [Mastery: Int]
    var total: Int
    var height: CGFloat = 12

    var body: some View {
        GeometryReader { geo in
            HStack(spacing: 2) {
                ForEach(Mastery.allCases.reversed()) { m in
                    let n = counts[m] ?? 0
                    if n > 0 {
                        Rectangle()
                            .fill(m.color)
                            .frame(width: max(3, (geo.size.width - 6) * CGFloat(n) / CGFloat(max(total, 1))))
                    }
                }
            }
        }
        .frame(height: height)
        .clipShape(.capsule)
        .accessibilityHidden(true)
    }
}

extension Mastery {
    var color: Color {
        switch self {
        case .new: Palette.faint
        case .learning: Palette.amber
        case .familiar: Palette.jade.opacity(0.45)
        case .mastered: Palette.jade
        }
    }
}

private struct StatTile: View {
    var value: String
    var unit: String
    var label: String
    var systemImage: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: systemImage)
                .font(.subheadline)
                .foregroundStyle(Palette.jade)
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value).font(.title2.weight(.semibold).monospacedDigit()).foregroundStyle(Palette.ink)
                Text(unit).font(.footnote).foregroundStyle(Palette.muted)
            }
            Text(label).font(.caption).foregroundStyle(Palette.muted).lineLimit(2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(14)
        .background(Palette.surface, in: .rect(cornerRadius: 16))
        .accessibilityElement(children: .combine)
    }
}

/// The last 14 days of answers: knew it in jade, missed in amber.
private struct ReviewChart: View {
    var days: [ProgressStats.Day]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Last 14 days").font(.headline).foregroundStyle(Palette.ink)
                Spacer()
                Legend(color: Palette.jade, text: "Knew it")
                Legend(color: Palette.amber, text: "Missed")
            }
            if days.allSatisfy({ $0.total == 0 }) {
                Text("Your reviews will show up here.")
                    .font(.subheadline)
                    .foregroundStyle(Palette.muted)
                    .frame(maxWidth: .infinity, minHeight: 120)
            } else {
                Chart {
                    ForEach(days) { d in
                        BarMark(x: .value("Day", d.date, unit: .day), y: .value("Answers", d.correct))
                            .foregroundStyle(Palette.jade)
                        BarMark(x: .value("Day", d.date, unit: .day), y: .value("Answers", d.missed))
                            .foregroundStyle(Palette.amber)
                    }
                }
                .chartXAxis {
                    AxisMarks(values: .stride(by: .day, count: 2)) { _ in
                        AxisValueLabel(format: .dateTime.day(), centered: true)
                    }
                }
                .chartYAxis { AxisMarks(position: .leading) }
                .frame(height: 150)
                .accessibilityLabel("Reviews per day over the last two weeks")
            }
        }
        .padding(18)
        .background(Palette.surface, in: .rect(cornerRadius: 20))
    }
}

private struct Legend: View {
    var color: Color
    var text: String

    var body: some View {
        HStack(spacing: 4) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(text).font(.caption).foregroundStyle(Palette.muted)
        }
    }
}

private struct HardestWords: View {
    var words: [ProgressStats.Hard]

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Words you miss most").font(.headline).foregroundStyle(Palette.ink).padding(.bottom, 6)
            ForEach(Array(words.enumerated()), id: \.element.id) { i, h in
                NavigationLink(value: h.word) {
                    HStack(spacing: 14) {
                        Text(h.word.colloquial)
                            .font(Typeface.hanzi(22, .medium, relativeTo: .title3))
                            .foregroundStyle(Palette.ink)
                            .cantonese()
                        VStack(alignment: .leading, spacing: 1) {
                            Text(h.word.jyutping ?? "").font(.subheadline).foregroundStyle(Palette.muted)
                            Text(h.word.meaning ?? "").font(.subheadline).foregroundStyle(Palette.ink).lineLimit(1)
                        }
                        Spacer(minLength: 0)
                        Text(h.missed == 1 ? "missed once" : "missed \(h.missed)×")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(Palette.amber)
                    }
                    .padding(.vertical, 10)
                    .contentShape(.rect)
                }
                .buttonStyle(.plain)
                .overlay(alignment: .top) { if i > 0 { Rectangle().fill(Palette.line).frame(height: 1) } }
            }
        }
        .padding(18)
        .background(Palette.surface, in: .rect(cornerRadius: 20))
    }
}
