import SwiftUI

@main
struct CantoApp: App {
    @State private var store = StudyStore()
    @State private var squads = SquadStore()
    @State private var speaker: Speaker
    @State private var listen: ListenSession

    init() {
        let speaker = Speaker()
        _speaker = State(initialValue: speaker)
        _listen = State(initialValue: ListenSession(speaker: speaker))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .environment(squads)
                .environment(speaker)
                .environment(listen)
                .tint(Palette.jade)
        }
    }
}

enum AppTab: Hashable { case library, review, progress, listen, squads }

struct RootView: View {
    @Environment(StudyStore.self) private var store
    @Environment(\.scenePhase) private var phase
    @State private var tab: AppTab = Self.initialTab

    var body: some View {
        TabView(selection: $tab) {
            Tab("Library", systemImage: "books.vertical", value: AppTab.library) {
                LibraryView(tab: $tab)
            }
            Tab("Review", systemImage: "rectangle.on.rectangle.angled", value: AppTab.review) {
                ReviewView()
            }
            .badge(store.dueCount > 0 ? store.dueCount : 0)
            Tab("Progress", systemImage: "chart.bar", value: AppTab.progress) {
                StudyProgressView(tab: $tab)
            }
            Tab("Listen", systemImage: "headphones", value: AppTab.listen) {
                ListenView()
            }
            Tab("Squads", systemImage: "person.3", value: AppTab.squads) {
                SquadsView()
            }
        }
        .task(id: phase) {
            if phase == .active { await store.refresh() }
        }
    }

    /// `-tab review` on launch opens a tab directly (used for screenshots).
    private static var initialTab: AppTab {
        switch UserDefaults.standard.string(forKey: "tab") {
        case "review": .review
        case "progress": .progress
        case "listen": .listen
        case "squads": .squads
        default: .library
        }
    }
}
