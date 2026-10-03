import SwiftUI

struct ListenView: View {
    @Environment(StudyStore.self) private var store
    @Environment(ListenSession.self) private var listen
    @State private var scope: Scope = .due

    enum Scope: Hashable {
        case due, all
        case video(String)
    }

    var body: some View {
        @Bindable var listen = listen
        NavigationStack {
            Group {
                if !store.hasWords {
                    ContentUnavailableView("Nothing to listen to", systemImage: "headphones", description: Text("Saved words play here, with their meaning and the line they came from."))
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 28) {
                            NowPlaying(word: listen.current ?? words.first, step: listen.step, position: listen.current == nil ? nil : (listen.index, listen.queue.count))
                            controls
                            if !Speaker.hasCantoneseVoice {
                                Text("No Cantonese voice is installed. Add one in Settings > Accessibility > Spoken Content > Voices > Chinese (Hong Kong).")
                                    .font(.footnote)
                                    .foregroundStyle(Palette.amber)
                            }
                            options(listen: $listen.options)
                            upNext
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 32)
                    }
                }
            }
            .navigationTitle("Listen")
            .background(Palette.paper)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { scopeMenu }
            }
        }
    }

    private var words: [StudyWord] {
        switch scope {
        case .due:
            let due = store.dueWords()
            return due.isEmpty ? store.words : due
        case .all: return store.words
        case .video(let id): return store.video(id).map { store.words(in: $0) } ?? []
        }
    }

    private var scopeLabel: String {
        switch scope {
        case .due: "Due today"
        case .all: "All words"
        case .video(let id): store.video(id)?.title ?? "Video"
        }
    }

    private var scopeMenu: some View {
        Menu {
            Picker("Play", selection: $scope) {
                Text("Due today").tag(Scope.due)
                Text("All words").tag(Scope.all)
                Section("From a video") {
                    ForEach(store.videos) { v in
                        Text(v.title).tag(Scope.video(v.id))
                    }
                }
            }
        } label: {
            Label(scopeLabel, systemImage: "line.3.horizontal.decrease")
                .labelStyle(.titleAndIcon)
                .lineLimit(1)
                .frame(maxWidth: 180)
        }
        .onChange(of: scope) { if listen.isPlaying { listen.start(words) } }
    }

    private var controls: some View {
        HStack(spacing: 28) {
            Spacer()
            Button { listen.previous() } label: {
                Image(systemName: "backward.fill").font(.title2).frame(width: 56, height: 56)
            }
            .buttonStyle(.glass)
            .buttonBorderShape(.circle)
            .disabled(listen.queue.isEmpty)
            .accessibilityLabel("Previous word")

            Button {
                if listen.queue.isEmpty || listen.queue.map(\.id) != words.map(\.id) && !listen.isPlaying {
                    listen.start(words)
                } else {
                    listen.toggle()
                }
            } label: {
                Image(systemName: listen.isPlaying ? "pause.fill" : "play.fill")
                    .font(.system(size: 30, weight: .semibold))
                    .contentTransition(.symbolEffect(.replace))
                    .frame(width: 84, height: 84)
            }
            .buttonStyle(.glassProminent)
            .buttonBorderShape(.circle)
            .accessibilityLabel(listen.isPlaying ? "Pause" : "Play")

            Button { listen.next() } label: {
                Image(systemName: "forward.fill").font(.title2).frame(width: 56, height: 56)
            }
            .buttonStyle(.glass)
            .buttonBorderShape(.circle)
            .disabled(listen.queue.isEmpty)
            .accessibilityLabel("Next word")
            Spacer()
        }
    }

    private func options(listen: Binding<ListenSession.Options>) -> some View {
        VStack(spacing: 0) {
            Toggle("Say the meaning in English", isOn: listen.sayMeaning)
            Divider().padding(.vertical, 10)
            Toggle("Say the line it came from", isOn: listen.saySentence)
            Divider().padding(.vertical, 10)
            Toggle("Repeat each word", isOn: listen.repeatWord)
            Divider().padding(.vertical, 10)
            Toggle("Speak slowly", isOn: listen.slow)
            Divider().padding(.vertical, 10)
            Toggle("Start over at the end", isOn: listen.loop)
        }
        .font(.subheadline)
        .padding(16)
        .background(Palette.soft, in: .rect(cornerRadius: 18))
    }

    private var upNext: some View {
        let list = listen.queue.isEmpty ? words : listen.queue
        return VStack(alignment: .leading, spacing: 10) {
            Text(listen.queue.isEmpty ? "\(list.count) words" : "Playing \(list.count) words")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Palette.muted)
            ForEach(Array(list.enumerated()), id: \.offset) { i, word in
                Button {
                    if listen.queue.isEmpty { listen.start(list, at: i) } else { listen.jump(to: i) }
                } label: {
                    HStack(spacing: 12) {
                        Text(word.colloquial)
                            .font(Typeface.hanzi(18, .medium, relativeTo: .body))
                            .foregroundStyle(isCurrent(i) ? Palette.jade : Palette.ink)
                            .frame(minWidth: 64, alignment: .leading)
                        Text(word.meaning ?? "")
                            .font(.subheadline)
                            .foregroundStyle(Palette.muted)
                            .lineLimit(1)
                        Spacer()
                        if isCurrent(i) {
                            Image(systemName: "waveform")
                                .foregroundStyle(Palette.jade)
                                .symbolEffect(.variableColor.iterative, isActive: listen.isPlaying)
                        }
                    }
                    .padding(.vertical, 6)
                    .contentShape(.rect)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func isCurrent(_ i: Int) -> Bool { !listen.queue.isEmpty && listen.index == i }
}

/// The word being spoken, large, with the part being read out picked out.
struct NowPlaying: View {
    var word: StudyWord?
    var step: ListenSession.Step?
    var position: (Int, Int)?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            if let word {
                Text(word.colloquial)
                    .font(Typeface.hanzi(64, .medium, relativeTo: .largeTitle))
                    .foregroundStyle(step == .word ? Palette.jade : Palette.ink)
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                    .cantonese()
                ToneJyutping(jyutping: word.jyutping, size: 18)
                Text(word.meaning ?? "")
                    .font(.title3)
                    .foregroundStyle(step == .meaning ? Palette.jade : Palette.ink)
                if let source = word.latestSource {
                    Text(source.spoken)
                        .font(Typeface.hanzi(17, relativeTo: .body))
                        .foregroundStyle(step == .sentence ? Palette.jade : Palette.muted)
                        .lineLimit(2)
                        .cantonese()
                }
            }
            if let (i, n) = position {
                Text("\(i + 1) of \(n)")
                    .font(.footnote.monospacedDigit())
                    .foregroundStyle(Palette.faint)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .animation(.easeInOut(duration: 0.2), value: step)
        .padding(.top, 8)
    }
}
