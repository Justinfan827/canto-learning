import Foundation

/// Where study data comes from. Today that's the Pause & Ask helper on your
/// computer; a hosted backend can implement the same two calls later.
nonisolated protocol StudyBackend: Sendable {
    func fetchSnapshot() async throws -> StudySnapshot
    func upload(reviews: [StudyReview]) async throws
}

nonisolated enum BackendError: LocalizedError {
    case badURL
    case http(Int)
    case unsupported(Int)

    var errorDescription: String? {
        switch self {
        case .badURL: "The computer address isn't a valid URL."
        case .http(let code): "The helper answered with HTTP \(code)."
        case .unsupported(let v): "The helper sent study data version \(v), which this app doesn't read yet."
        }
    }
}

/// The local helper in apps/transcriber: `GET /study` and `POST /study/reviews`.
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

    private func check(_ resp: URLResponse) throws {
        if let http = resp as? HTTPURLResponse, !(200..<300).contains(http.statusCode) { throw BackendError.http(http.statusCode) }
    }
}
