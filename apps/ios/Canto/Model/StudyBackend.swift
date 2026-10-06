import Foundation

/// Where study data comes from: the Pause & Ask helper on your computer, or a
/// Convex deployment. Only `StudyStore` talks to a backend; views never do.
nonisolated protocol StudyBackend: Sendable {
    func fetchSnapshot() async throws -> StudySnapshot
    func upload(reviews: [StudyReview]) async throws
    /// Words typed in on the phone. Convex saves them right away; the helper
    /// queues them until the extension adds them to its store.
    func add(words: [StudyNewWord]) async throws
}

/// Which backend to sync with, chosen in Settings. The helper is the default.
nonisolated enum BackendKind: String, CaseIterable, Sendable {
    case computer
    case convex
}

nonisolated enum BackendError: LocalizedError {
    case badURL
    case convexNotSetUp
    case http(Int)
    case server(String)
    case unsupported(Int)

    var errorDescription: String? {
        switch self {
        case .badURL: "The computer address isn't a valid URL."
        case .convexNotSetUp: "Enter your Convex deployment URL and sync token."
        case .http(let code): "The server answered with HTTP \(code)."
        case .server(let message): message
        case .unsupported(let v): "The helper sent study data version \(v), which this app doesn't read yet."
        }
    }
}

/// The local helper in apps/transcriber: `GET /study`, `POST /study/reviews` and `POST /study/words`.
nonisolated struct HelperBackend: StudyBackend {
    var baseURL: URL
    var session: URLSession = .shared

    init?(address: String) {
        let trimmed = address.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: trimmed.contains("://") ? trimmed : "http://\(trimmed)"), url.host != nil else { return nil }
        baseURL = url
    }

    func fetchSnapshot() async throws -> StudySnapshot {
        var req = URLRequest(url: baseURL.appending(path: "study"))
        req.timeoutInterval = 6
        req.cachePolicy = .reloadIgnoringLocalCacheData
        let (data, resp) = try await session.data(for: req)
        try check(resp)
        let snap = try JSONDecoder().decode(StudySnapshot.self, from: data)
        guard snap.version == 1 else { throw BackendError.unsupported(snap.version) }
        return snap
    }

    func upload(reviews: [StudyReview]) async throws {
        guard !reviews.isEmpty else { return }
        var req = URLRequest(url: baseURL.appending(path: "study/reviews"))
        req.httpMethod = "POST"
        req.timeoutInterval = 6
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.httpBody = try JSONEncoder().encode(["reviews": reviews])
        let (_, resp) = try await session.data(for: req)
        try check(resp)
    }

    func add(words: [StudyNewWord]) async throws {
        guard !words.isEmpty else { return }
        var req = URLRequest(url: baseURL.appending(path: "study/words"))
        req.httpMethod = "POST"
        req.timeoutInterval = 6
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.httpBody = try JSONEncoder().encode(["words": words])
        let (_, resp) = try await session.data(for: req)
        try check(resp)
    }

    private func check(_ resp: URLResponse) throws {
        if let http = resp as? HTTPURLResponse, !(200..<300).contains(http.statusCode) { throw BackendError.http(http.statusCode) }
    }
}
