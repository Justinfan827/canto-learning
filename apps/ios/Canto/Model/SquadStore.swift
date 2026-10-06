import Foundation
import Observation

/// The squads tab's state: this phone's sign-in (from a link code made in the
/// extension), the squads it's in, and the counts it reports.
@Observable
final class SquadStore {
    private(set) var session: SquadSession?
    private(set) var name: String
    private(set) var squads: [Squad] = []
    private(set) var loading = false
    var error: String?

    /// The Convex deployment friends share for squads. Defaults to the one in Settings.
    var serverURL: String {
        didSet { defaults.set(serverURL, forKey: "squadsURL") }
    }

    private let defaults: UserDefaults
    private let makeBackend: (String) -> (any SquadBackend)?

    init(defaults: UserDefaults = .standard, backend: ((String) -> (any SquadBackend)?)? = nil) {
        self.defaults = defaults
        makeBackend = backend ?? { ConvexSquads(url: $0) }
        serverURL = defaults.string(forKey: "squadsURL") ?? defaults.string(forKey: "convexURL") ?? ""
        name = defaults.string(forKey: "squadsName") ?? ""
        session = defaults.data(forKey: "squadsSession").flatMap { try? JSONDecoder().decode(SquadSession.self, from: $0) }
    }

    var signedIn: Bool { session != nil }

    /// Counts for the leaderboard: words marked known, or whose phone schedule has reached three weeks, out of all saved.
    static func progress(of study: StudyStore) -> SquadProgress {
        let learned = study.snapshot.words.filter { $0.isKnown || study.card(for: $0).intervalDays >= SquadProgress.learnedIntervalDays }.count
        return SquadProgress(learned: learned, saved: study.snapshot.words.count)
    }

    /// Signs this phone in as the extension's user with the code it shows under Squads.
    func link(code: String, progress: SquadProgress) async {
        await run { backend in
            let (session, name) = try await backend.redeemLinkCode(code)
            self.save(session: session, name: name)
            if progress.saved > 0 { try await backend.report(session, progress) }
            self.squads = try await backend.mySquads(session)
        }
    }

    /// Reports this phone's counts and reloads the boards.
    func refresh(progress: SquadProgress) async {
        guard let session else { return }
        await run { backend in
            // A phone that hasn't synced any words yet shouldn't overwrite the extension's counts with zeros.
            if progress.saved > 0 { try await backend.report(session, progress) }
            self.squads = try await backend.mySquads(session)
        }
    }

    func create(name: String) async {
        guard let session else { return }
        await run { backend in self.upsert(try await backend.create(session, name: name)) }
    }

    func join(code: String) async {
        guard let session else { return }
        await run { backend in self.upsert(try await backend.join(session, code: code)) }
    }

    func leave(_ squad: Squad) async {
        guard let session else { return }
        await run { backend in
            try await backend.leave(session, squadId: squad.id)
            self.squads.removeAll { $0.id == squad.id }
        }
    }

    func signOut() {
        session = nil
        squads = []
        defaults.removeObject(forKey: "squadsSession")
    }

    private func upsert(_ squad: Squad) {
        if let i = squads.firstIndex(where: { $0.id == squad.id }) { squads[i] = squad } else { squads.append(squad) }
    }

    private func save(session: SquadSession, name: String) {
        self.session = session
        self.name = name
        defaults.set(try? JSONEncoder().encode(session), forKey: "squadsSession")
        defaults.set(name, forKey: "squadsName")
    }

    private func run(_ work: (any SquadBackend) async throws -> Void) async {
        guard let backend = makeBackend(serverURL) else {
            error = "Enter the squad server, the same Convex URL as in the extension."
            return
        }
        loading = true
        error = nil
        defer { loading = false }
        do {
            try await work(backend)
        } catch {
            self.error = error.localizedDescription
        }
    }
}
