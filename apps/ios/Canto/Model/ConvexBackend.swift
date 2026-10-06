import Foundation

/// A Convex deployment (packages/backend/convex): `study:snapshot` and
/// `study:addReviews`, called over Convex's HTTP API so the app needs no SDK.
nonisolated struct ConvexBackend: StudyBackend {
    var deploymentURL: URL
    var token: String
    var session: URLSession = .shared

    init?(url: String, token: String) {
        let trimmed = url.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: trimmed.contains("://") ? trimmed : "https://\(trimmed)"), url.host != nil, !token.isEmpty else { return nil }
        deploymentURL = url
        self.token = token
    }

    func fetchSnapshot() async throws -> StudySnapshot {
        let snap: StudySnapshot = try await call(.query, "study:snapshot", args: TokenArgs(token: token))
        guard snap.version == 1 else { throw BackendError.unsupported(snap.version) }
        return snap
    }

    func upload(reviews: [StudyReview]) async throws {
        guard !reviews.isEmpty else { return }
        let _: Ignored = try await call(.mutation, "study:addReviews", args: ReviewArgs(token: token, reviews: reviews))
    }

    // MARK: HTTP API

    private enum Kind: String { case query, mutation }

    private struct TokenArgs: Encodable { var token: String }
    private struct ReviewArgs: Encodable { var token: String; var reviews: [StudyReview] }
    private struct Request<A: Encodable>: Encodable { var path: String; var args: A; var format = "json" }
    private struct Response<T: Decodable>: Decodable { var status: String; var value: T?; var errorMessage: String? }
    private struct Ignored: Decodable { init(from decoder: Decoder) throws {} }

    private func call<A: Encodable, T: Decodable>(_ kind: Kind, _ path: String, args: A) async throws -> T {
        var req = URLRequest(url: deploymentURL.appending(path: "api/\(kind.rawValue)"))
        req.httpMethod = "POST"
        req.timeoutInterval = 10
        req.cachePolicy = .reloadIgnoringLocalCacheData
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.httpBody = try JSONEncoder().encode(Request(path: path, args: args))
        let (data, resp) = try await session.data(for: req)
        let body = try? JSONDecoder().decode(Response<T>.self, from: data)
        if let body, body.status == "success", let value = body.value { return value }
        if let message = body?.errorMessage { throw BackendError.server(Self.reason(message)) }
        if let http = resp as? HTTPURLResponse, !(200..<300).contains(http.statusCode) { throw BackendError.http(http.statusCode) }
        throw BackendError.server("Convex sent a reply this app couldn't read.")
    }

    /// Convex error messages carry a request id and a stack; keep the thrown message.
    static func reason(_ message: String) -> String {
        let line = message.split(separator: "\n").first { $0.contains("Uncaught Error: ") }
        return line.map { String($0.split(separator: "Uncaught Error: ", maxSplits: 1).last ?? $0) } ?? message
    }
}
