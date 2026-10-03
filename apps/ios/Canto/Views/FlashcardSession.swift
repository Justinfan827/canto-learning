import SwiftUI

/// Quizlet-style flashcards: tap to flip, swipe right if you knew it, left if
/// you're still learning it. Missed words come back a few cards later. The
/// first answer for each word sets when it's due again.
struct FlashcardSession: View {
    let words: [StudyWord]
    @Environment(StudyStore.self) private var store
    @Environment(Speaker.self) private var speaker
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @AppStorage("cardFront") private var front: CardFront = .characters

    @State private var queue: [StudyWord] = []
    @State private var position = 0
    @State private var flipped = false
    @State private var offset: CGSize = .zero
    @State private var firstAnswers: [Int: Bool] = [:]
    @State private var answered = 0
    @State private var lastCorrect = true

    private var current: StudyWord? { queue.indices.contains(position) ? queue[position] : nil }

    var body: some View {
        VStack(spacing: 0) {
            topBar
            if let word = current {
                Spacer(minLength: 12)
                card(word)
                    .padding(.horizontal, 20)
                Spacer(minLength: 12)
                answerButtons
            } else {
                SessionSummary(words: words, firstAnswers: firstAnswers) { missed in
                    restart(with: missed)
                } done: {
                    dismiss()
                }
            }
        }
        .background(Palette.soft.ignoresSafeArea())
        .sensoryFeedback(trigger: answered) { _, _ in lastCorrect ? .success : .impact(weight: .light) }
        .onAppear { if queue.isEmpty { restart(with: words) } }
        .onChange(of: position) { autoplay() }
        .onChange(of: flipped) { if flipped, front != .sound, let w = current { speaker.say(w.colloquial) } }
    }

    // MARK: Pieces

    private var topBar: some View {
        HStack(spacing: 14) {
            Button {
                speaker.stop()
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.body.weight(.semibold))
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.glass)
            .buttonBorderShape(.circle)
            .accessibilityLabel("End review")

            ProgressView(value: Double(min(answered, total)), total: Double(max(total, 1)))
                .tint(Palette.jade)

            Text("\(min(firstAnswers.count + (current == nil ? 0 : 1), words.count)) of \(words.count)")
                .font(.subheadline.monospacedDigit())
                .foregroundStyle(Palette.muted)
                .frame(minWidth: 52, alignment: .trailing)
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }

    private var total: Int { queue.count }

    private func card(_ word: StudyWord) -> some View {
        let dx = offset.width
        let lean = min(1, abs(dx) / 140)
        return ZStack {
            CardFace { FrontContent(word: word, front: front, compact: false) }
                .rotation3DEffect(.degrees(reduceMotion ? 0 : (flipped ? 180 : 0)), axis: (0, 1, 0), perspective: 0.6)
                .opacity(flipped ? 0 : 1)
            CardFace { BackContent(word: word) }
                .rotation3DEffect(.degrees(reduceMotion ? 0 : (flipped ? 0 : -180)), axis: (0, 1, 0), perspective: 0.6)
                .opacity(flipped ? 1 : 0)
        }
        .overlay(alignment: .top) {
            HStack {
                SwipeTag(text: "Still learning", color: Palette.amber).opacity(dx < 0 ? lean : 0)
                Spacer()
                SwipeTag(text: "Know it", color: Palette.jade).opacity(dx > 0 ? lean : 0)
            }
            .padding(18)
            .allowsHitTesting(false)
        }
        .frame(maxHeight: 520)
        .offset(x: dx, y: offset.height * 0.2)
        .rotationEffect(.degrees(Double(dx) / 22), anchor: .bottom)
        .contentShape(.rect)
        .onTapGesture { flip() }
        .gesture(drag)
        .accessibilityElement(children: .combine)
        .accessibilityHint("Double tap to flip")
        .accessibilityAction(named: "Know it") { answer(true) }
        .accessibilityAction(named: "Still learning") { answer(false) }
        .id(word.id)
        .transition(.asymmetric(insertion: .scale(scale: 0.94).combined(with: .opacity), removal: .identity))
    }

    private var drag: some Gesture {
        DragGesture(minimumDistance: 12)
            .onChanged { offset = $0.translation }
            .onEnded { v in
                // Decide from where the throw is heading, not just where the finger stopped.
                let projected = v.predictedEndTranslation.width
                if abs(projected) > 170 || abs(v.translation.width) > 140 {
                    answer(projected > 0)
                } else {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) { offset = .zero }
                }
            }
    }

    private var answerButtons: some View {
        HStack(spacing: 12) {
            Button {
                answer(false)
            } label: {
                Label("Still learning", systemImage: "arrow.uturn.left")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.glass)
            .tint(Palette.amber)

            Button {
                answer(true)
            } label: {
                Label("Know it", systemImage: "checkmark")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.glassProminent)
        }
        .controlSize(.extraLarge)
        .padding(.horizontal, 20)
        .padding(.bottom, 12)
        .overlay(alignment: .top) {
            Text(flipped ? "Swipe or tap a button" : "Tap the card to flip")
                .font(.footnote)
                .foregroundStyle(Palette.muted)
                .offset(y: -28)
        }
    }

    // MARK: Actions

    private func restart(with list: [StudyWord]) {
        queue = list
        position = 0
        flipped = false
        offset = .zero
        answered = 0
        if list.count != words.count || !firstAnswers.isEmpty { firstAnswers = [:] }
        autoplay()
    }

    private func autoplay() {
        if front == .sound, let w = current { speaker.say(w.colloquial) }
    }

    private func flip() {
        if reduceMotion {
            withAnimation(.easeInOut(duration: 0.2)) { flipped.toggle() }
        } else {
            withAnimation(.spring(response: 0.45, dampingFraction: 0.86)) { flipped.toggle() }
        }
    }

    private func answer(_ correct: Bool) {
        guard let word = current else { return }
        lastCorrect = correct
        if firstAnswers[word.id] == nil {
            firstAnswers[word.id] = correct
            store.record(word, correct: correct)
        }
        answered += 1
        let fly = reduceMotion ? 0 : (correct ? 1 : -1) * 600.0
        withAnimation(.spring(response: 0.3, dampingFraction: 1)) {
            offset = CGSize(width: fly, height: offset.height)
        }
        Task {
            try? await Task.sleep(for: .milliseconds(reduceMotion ? 60 : 200))
            if !correct {
                // Still learning: see it again three cards from now.
                queue.insert(word, at: min(position + 4, queue.count))
            }
            offset = .zero
            flipped = false
            withAnimation(.spring(response: 0.35, dampingFraction: 1)) { position += 1 }
        }
    }
}

struct SwipeTag: View {
    var text: String
    var color: Color

    var body: some View {
        Text(text)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .overlay(Capsule().stroke(color, lineWidth: 1.5))
    }
}

/// The paper the card is printed on.
struct CardFace<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(24)
            .background(Palette.paper, in: .rect(cornerRadius: 28))
            .shadow(color: .black.opacity(0.06), radius: 1, y: 1)
            .shadow(color: .black.opacity(0.08), radius: 24, y: 12)
    }
}

struct FrontContent: View {
    var word: StudyWord
    var front: CardFront
    var compact: Bool

    var body: some View {
        switch front {
        case .characters:
            Text(word.colloquial)
                .font(Typeface.hanzi(compact ? 44 : 84, .medium, relativeTo: .largeTitle))
                .foregroundStyle(Palette.ink)
                .minimumScaleFactor(0.4)
                .lineLimit(1)
                .cantonese()
        case .meaning:
            Text(word.meaning ?? word.colloquial)
                .font(compact ? .title3 : .title)
                .fontWeight(.medium)
                .multilineTextAlignment(.center)
                .foregroundStyle(Palette.ink)
        case .sound:
            if compact {
                Image(systemName: "waveform")
                    .font(.system(size: 40))
                    .foregroundStyle(Palette.jade)
            } else {
                VStack(spacing: 18) {
                    SpeakButton(text: word.colloquial, size: 96)
                    Text("Listen, then flip")
                        .font(.subheadline)
                        .foregroundStyle(Palette.muted)
                }
            }
        }
    }
}

struct BackContent: View {
    var word: StudyWord

    var body: some View {
        VStack(spacing: 18) {
            Spacer(minLength: 0)
            Text(word.colloquial)
                .font(Typeface.hanzi(56, .medium, relativeTo: .largeTitle))
                .foregroundStyle(Palette.ink)
                .minimumScaleFactor(0.4)
                .lineLimit(1)
                .cantonese()
            ToneJyutping(jyutping: word.jyutping, size: 19)
            Text(word.meaning ?? "")
                .font(.title3)
                .multilineTextAlignment(.center)
                .foregroundStyle(Palette.ink)
            Spacer(minLength: 0)
            if let source = word.latestSource {
                VStack(spacing: 6) {
                    Text(highlighted(source.spoken, word.colloquial))
                        .font(Typeface.hanzi(17, relativeTo: .body))
                        .multilineTextAlignment(.center)
                        .lineLimit(3)
                        .cantonese()
                    if let english = source.textEnglish {
                        Text(english)
                            .font(.footnote)
                            .foregroundStyle(Palette.muted)
                            .multilineTextAlignment(.center)
                            .lineLimit(2)
                    }
                }
                .padding(.top, 14)
                .frame(maxWidth: .infinity)
                .overlay(alignment: .top) { Rectangle().fill(Palette.line).frame(height: 1) }
            }
        }
    }
}

struct SessionSummary: View {
    var words: [StudyWord]
    var firstAnswers: [Int: Bool]
    var again: ([StudyWord]) -> Void
    var done: () -> Void

    var body: some View {
        let missed = words.filter { firstAnswers[$0.id] == false }
        let known = words.count - missed.count
        VStack(alignment: .leading, spacing: 24) {
            Spacer()
            VStack(alignment: .leading, spacing: 8) {
                Text(missed.isEmpty ? "You knew all \(words.count)." : "You knew \(known) of \(words.count).")
                    .font(.largeTitle.weight(.semibold))
                    .foregroundStyle(Palette.ink)
                Text(missed.isEmpty ? "They'll come back further apart from now on." : "The ones you missed come back tomorrow.")
                    .font(.body)
                    .foregroundStyle(Palette.muted)
            }
            if !missed.isEmpty {
                FlowWords(words: missed)
            }
            Spacer()
            VStack(spacing: 12) {
                if !missed.isEmpty {
                    Button { again(missed) } label: {
                        Text(missed.count == 1 ? "Go over the one I missed" : "Go over the \(missed.count) I missed").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.glass)
                }
                Button(action: done) { Text("Done").frame(maxWidth: .infinity) }
                    .buttonStyle(.glassProminent)
            }
            .controlSize(.extraLarge)
        }
        .padding(24)
    }
}

/// Missed words laid out like a line of text.
struct FlowWords: View {
    var words: [StudyWord]

    var body: some View {
        Text(words.map(\.colloquial).joined(separator: "   "))
            .font(Typeface.hanzi(28, .medium, relativeTo: .title))
            .foregroundStyle(Palette.amber)
            .lineSpacing(8)
            .cantonese()
    }
}
