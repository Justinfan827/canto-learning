import Foundation

// Squads: friends who see each other's words-learned counts. Mirrors
// packages/shared/src/squads.ts. There's no login: the extension creates an
// anonymous user, and the phone joins as the same user with a one-time link
// code shown in the extension.

/// A device's sign-in to squads: which user, and the secret that proves it.
nonisolated struct SquadSession: Codable, Sendable, Hashable {
    var userId: String
    var secret: String
}

nonisolated struct SquadMember: Codable, Sendable, Hashable {
    var name: String
    var learned: Int
    var saved: Int
    var isMe: Bool
    var updatedAt: Double?
}

nonisolated struct Squad: Codable, Sendable, Hashable, Identifiable {
    var id: String
    var name: String
    var code: String
    /// Most learned first.
    var members: [SquadMember]
}

nonisolated struct SquadProgress: Codable, Sendable, Hashable {
    var learned: Int
    var saved: Int

    /// A word counts as learned once it's marked known or its interval reaches three weeks (`LEARNED_INTERVAL_DAYS`).
    static let learnedIntervalDays: Double = 21
}

/// Where squads live. Only `SquadStore` talks to it.
nonisolated protocol SquadBackend: Sendable {
    func redeemLinkCode(_ code: String) async throws -> (session: SquadSession, name: String)
    func report(_ session: SquadSession, _ progress: SquadProgress) async throws
    func mySquads(_ session: SquadSession) async throws -> [Squad]
    func create(_ session: SquadSession, name: String) async throws -> Squad
    func join(_ session: SquadSession, code: String) async throws -> Squad
    func leave(_ session: SquadSession, squadId: String) async throws
}

/// `convex/squads.ts` over Convex's HTTP API, like `ConvexBackend`. Squads need no sync token.
nonisolated struct ConvexSquads: SquadBackend {
    var deploymentURL: URL
    var session: URLSession = .shared

    init?(url: String) {
        let trimmed = url.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: trimmed.contains("://") ? trimmed : "https://\(trimmed)"), url.host != nil else { return nil }
        deploymentURL = url
    }

    private struct Redeemed: Decodable { var userId: String; var secret: String; var name: String }

    func redeemLinkCode(_ code: String) async throws -> (session: SquadSession, name: String) {
        let r: Redeemed = try await call(.mutation, "squads:redeemLinkCode", ["code": .string(code)])
        return (SquadSession(userId: r.userId, secret: r.secret), r.name)
    }

    func report(_ s: SquadSession, _ p: SquadProgress) async throws {
        try await run("squads:report", ["session": .session(s), "learned": .int(p.learned), "saved": .int(p.saved)])
    }

    func mySquads(_ s: SquadSession) async throws -> [Squad] {
        try await call(.query, "squads:mySquads", ["session": .session(s)])
    }

    func create(_ s: SquadSession, name: String) async throws -> Squad {
        try await call(.mutation, "squads:create", ["session": .session(s), "name": .string(name)])
    }

    func join(_ s: SquadSession, code: String) async throws -> Squad {
        try await call(.mutation, "squads:join", ["session": .session(s), "code": .string(code)])
    }

    func leave(_ s: SquadSession, squadId: String) async throws {
        try await run("squads:leave", ["session": .session(s), "squadId": .string(squadId)])
    }

    // MARK: HTTP API

    private enum Kind: String { case query, mutation }

    private enum Arg: Encodable {
        case string(String), int(Int), session(SquadSession)
        func encode(to encoder: Encoder) throws {
            var c = encoder.singleValueContainer()
            switch self {
            case .string(let s): try c.encode(s)
            case .int(let n): try c.encode(n)
            case .session(let s): try c.encode(s)
            }
        }
    }

    private struct Request: Encodable { var path: String; var args: [String: Arg]; var format = "json" }
    private struct Response<T: Decodable>: Decodable { var status: String; var value: T?; var errorMessage: String? }

    private func call<T: Decodable>(_ kind: Kind, _ path: String, _ args: [String: Arg]) async throws -> T {
        guard let value: T = try await send(kind, path, args) else { throw BackendError.server("Convex sent a reply this app couldn't read.") }
        return value
    }

    /// A mutation that returns nothing.
    private func run(_ path: String, _ args: [String: Arg]) async throws {
        let _: Bool? = try await send(.mutation, path, args)
    }

    private func send<T: Decodable>(_ kind: Kind, _ path: String, _ args: [String: Arg]) async throws -> T? {
        var req = URLRequest(url: deploymentURL.appending(path: "api/\(kind.rawValue)"))
        req.httpMethod = "POST"
        req.timeoutInterval = 10
        req.cachePolicy = .reloadIgnoringLocalCacheData
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.httpBody = try JSONEncoder().encode(Request(path: path, args: args))
        let (data, resp) = try await session.data(for: req)
        let body = try? JSONDecoder().decode(Response<T>.self, from: data)
        if let body, body.status == "success" { return body.value }
        if let message = body?.errorMessage { throw BackendError.server(ConvexBackend.reason(message)) }
        if let http = resp as? HTTPURLResponse, !(200..<300).contains(http.statusCode) { throw BackendError.http(http.statusCode) }
        throw BackendError.server("Convex sent a reply this app couldn't read.")
    }
}
