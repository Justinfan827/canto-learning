import SwiftUI

struct LibraryView: View {
    @Binding var tab: AppTab
    @Environment(StudyStore.self) private var store
    @State private var mode: Mode = .videos
    @State private var query = ""
    @State private var showSettings = false
    @State private var path = NavigationPath()

    enum Mode: String, CaseIterable { case videos = "Videos", words = "Words" }

    var body: some View {
        NavigationStack(path: $path) {
            Group {
                if store.hasWords {
                    content
                } else {
                    EmptyLibrary(showSettings: $showSettings)
                }
            }
            .navigationTitle("Library")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Settings", systemImage: "gearshape") { showSettings = true }
                }
            }
            .navigationDestination(for: StudyVideo.self) { VideoDetailView(video: $0) }
            .navigationDestination(for: StudyWord.self) { WordDetailView(wordID: $0.id) }
            .sheet(isPresented: $showSettings) { SettingsView() }
            .refreshable { await store.refresh() }
        }
        .onAppear(perform: openLaunchRoute)
    }

    /// `-video <id>` or `-word <id>` on launch opens that page (used for screenshots).
    private func openLaunchRoute() {
        guard path.isEmpty else { return }
        let d = UserDefaults.standard
        if let id = d.string(forKey: "video"), let v = store.video(id) { path.append(v) }
        if d.integer(forKey: "word") > 0, let w = store.word(d.integer(forKey: "word")) { path.append(w) }
    }

    private var content: some View {
        List {
            if store.dueCount > 0 && query.isEmpty {
                Section {
                    ReviewPrompt(count: store.dueCount) { tab = .review }
                }
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
            }
            Section {
                Picker("Show", selection: $mode) {
                    ForEach(Mode.allCases, id: \.self) { Text($0.rawValue) }
                }
                .pickerStyle(.segmented)
                .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                .listRowBackground(Color.clear)
            }
            switch mode {
            case .videos:
                Section {
                    ForEach(store.videos) { video in
                        NavigationLink(value: video) { VideoRow(video: video, words: store.words(in: video)) }
                    }
                    .listRowBackground(Palette.surface)
                } footer: {
                    SyncFooter()
                }
            case .words:
                Section {
                    ForEach(filteredWords) { word in
                        NavigationLink(value: word) { WordRow(word: word) }
                    }
                    .listRowBackground(Palette.surface)
                } footer: {
                    SyncFooter()
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(Palette.page)
        .listSectionSpacing(.compact)
        .searchable(text: $query, prompt: "Characters, Jyutping or meaning")
        .onChange(of: query) { if !query.isEmpty { mode = .words } }
    }

    private var filteredWords: [StudyWord] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return store.words }
        let bare = q.filter { !$0.isNumber && $0 != " " }
        return store.words.filter { w in
            w.colloquial.contains(q) || (w.formal ?? "").contains(q) || (w.meaning ?? "").lowercased().contains(q)
                || (w.jyutping ?? "").filter { !$0.isNumber && $0 != " " }.contains(bare)
        }
    }
}

struct ReviewPrompt: View {
    var count: Int
    var action: () -> Void
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12)) : AnyLayout(HStackLayout(spacing: 14))
        Button(action: action) {
            layout {
                VStack(alignment: .leading, spacing: 2) {
                    Text(count == 1 ? "1 word to review" : "\(count) words to review")
                        .font(.headline)
                        .foregroundStyle(Palette.ink)
                    Text("A few minutes of flashcards")
                        .font(.subheadline)
                        .foregroundStyle(Palette.muted)
                }
                if !typeSize.isAccessibilitySize { Spacer() }
                Text("Review")
                    .font(.subheadline.weight(.semibold))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Palette.jade, in: .capsule)
                    .foregroundStyle(Palette.onAccent)
            }
            .padding(16)
            .background(Palette.jadeSoft, in: .rect(cornerRadius: 18))
        }
        .buttonStyle(.plain)
    }
}

struct VideoRow: View {
    var video: StudyVideo
    var words: [StudyWord]
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        // At the largest text sizes the thumbnail sits above the title so the title keeps the full width.
        let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 10)) : AnyLayout(HStackLayout(alignment: .top, spacing: 12))
        layout {
            Thumbnail(video: video)
                .frame(width: typeSize.isAccessibilitySize ? 200 : 112)
            VStack(alignment: .leading, spacing: 4) {
                Text(video.title)
                    .font(Typeface.hanzi(15, .medium, relativeTo: .subheadline))
                    .foregroundStyle(Palette.ink)
                    .lineLimit(typeSize.isAccessibilitySize ? 4 : 2)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(Palette.muted)
                    .lineLimit(1)
                Text(words.prefix(6).map(\.colloquial).joined(separator: "  "))
                    .font(Typeface.hanzi(14, relativeTo: .footnote))
                    .foregroundStyle(Palette.jade)
                    .lineLimit(1)
                    .padding(.top, 2)
            }
        }
        .padding(.vertical, 4)
    }

    private var subtitle: String {
        let n = words.count == 1 ? "1 word" : "\(words.count) words"
        return [video.channel, n].compactMap { $0 }.joined(separator: ", ")
    }
}

struct Thumbnail: View {
    var video: StudyVideo
    var radius: CGFloat = 8

    var body: some View {
        Color(Palette.soft)
            .aspectRatio(16 / 9, contentMode: .fit)
            .overlay {
                AsyncImage(url: video.thumbnailURL) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                    } else {
                        Image(systemName: "play.rectangle").foregroundStyle(Palette.faint)
                    }
                }
            }
            .clipShape(.rect(cornerRadius: radius))
            .accessibilityHidden(true)
    }
}

struct WordRow: View {
    var word: StudyWord
    @Environment(StudyStore.self) private var store

    var body: some View {
        HStack(alignment: .center, spacing: 14) {
            Text(word.colloquial)
                .font(Typeface.hanzi(24, .medium, relativeTo: .title2))
                .foregroundStyle(Palette.ink)
                .frame(minWidth: 56, alignment: .leading)
                .cantonese()
            VStack(alignment: .leading, spacing: 2) {
                Text(word.jyutping ?? "")
                    .font(.subheadline)
                    .foregroundStyle(Palette.muted)
                Text(word.meaning ?? "")
                    .font(.subheadline)
                    .foregroundStyle(Palette.ink)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            StatusMark(word: word, card: store.card(for: word))
        }
        .padding(.vertical, 2)
    }
}

/// A small mark on the right of a word: new, due, or known.
struct StatusMark: View {
    var word: StudyWord
    var card: CardState

    var body: some View {
        if word.isKnown {
            Image(systemName: "checkmark")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Palette.faint)
                .accessibilityLabel("Known")
        } else if card.isNew {
            Text("New")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(Palette.jade)
                .padding(.horizontal, 7)
                .padding(.vertical, 3)
                .background(Palette.jadeSoft, in: .capsule)
        } else if card.dueAt <= Date.now.ms {
            Circle().fill(Palette.amber).frame(width: 7, height: 7)
                .accessibilityLabel("Due")
        }
    }
}

struct SyncFooter: View {
    @Environment(StudyStore.self) private var store

    var body: some View {
        Group {
            switch store.sync {
            case .syncing:
                Text("Syncing with your computer…")
            case .failed(let message):
                Text(store.lastSyncedAt.map { "\(message) Showing words from \($0.formatted(.relative(presentation: .named)))." } ?? message)
            default:
                if let at = store.lastSyncedAt {
                    Text("Synced \(at.formatted(.relative(presentation: .named))). Pull down to sync again.")
                } else {
                    Text("Sample words. Pull down to sync with your computer.")
                }
            }
        }
        .font(.footnote)
        .foregroundStyle(Palette.muted)
        .padding(.top, 8)
    }
}

struct EmptyLibrary: View {
    @Binding var showSettings: Bool
    @Environment(StudyStore.self) private var store

    var body: some View {
        ContentUnavailableView {
            Label("No saved words yet", systemImage: "character.book.closed")
        } description: {
            Text(description)
        } actions: {
            Button("Sync now") { Task { await store.refresh() } }
                .buttonStyle(.glassProminent)
                    .foregroundStyle(Palette.onAccent)
            Button("Try sample words") { store.loadSample() }
            Button("Computer address") { showSettings = true }
                .font(.footnote)
        }
    }

    private var description: String {
        if case .failed(let message) = store.sync { return message }
        return "Save words while you watch with Pause & Ask on your computer, and they show up here with the videos they came from."
    }
}
