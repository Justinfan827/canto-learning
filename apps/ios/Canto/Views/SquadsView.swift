import SwiftUI

/// Squads you're in, each a leaderboard of words learned. The phone signs in
/// as your extension user with a link code from the extension's Squads view.
struct SquadsView: View {
    @Environment(StudyStore.self) private var study
    @Environment(SquadStore.self) private var squads

    var body: some View {
        NavigationStack {
            Group {
                if squads.signedIn { boards } else { LinkForm() }
            }
            .navigationTitle("Squads")
            .navigationBarTitleDisplayMode(.inline)
            .scrollContentBackground(.hidden)
            .background(Palette.page)
        }
        .task(id: squads.signedIn) { await squads.refresh(progress: SquadStore.progress(of: study)) }
    }

    private var boards: some View {
        List {
            if squads.squads.isEmpty && !squads.loading {
                Section {
                    Text("Make a squad and share its code, or join one with a code from a friend.")
                        .foregroundStyle(Palette.muted)
                }
            }
            ForEach(squads.squads) { squad in
                Section {
                    ForEach(Array(squad.members.enumerated()), id: \.offset) { i, m in
                        MemberRow(rank: i + 1, member: m)
                    }
                } header: {
                    HStack {
                        Text(squad.name)
                        Spacer()
                        ShareLink(item: "Join my Cantonese squad in Pause & Ask with the code \(squad.code)") {
                            Text(squad.code).font(.footnote.monospaced().weight(.semibold))
                        }
                        .accessibilityLabel("Share invite code \(squad.code)")
                    }
                } footer: {
                    Button("Leave \(squad.name)", role: .destructive) { Task { await squads.leave(squad) } }
                        .font(.footnote)
                }
            }
            Section {
                CodeField(placeholder: "Invite code", button: "Join") { await squads.join(code: $0) }
                CodeField(placeholder: "New squad name", button: "Create") { await squads.create(name: $0) }
            } footer: {
                VStack(alignment: .leading, spacing: 6) {
                    if let error = squads.error { Text(error).foregroundStyle(Palette.amber) }
                    Text("You're \(squads.name). Counts are words marked known or reviewed until they come back three weeks apart, out of words saved.")
                }
            }
        }
        .refreshable { await squads.refresh(progress: SquadStore.progress(of: study)) }
    }
}

private struct MemberRow: View {
    var rank: Int
    var member: SquadMember

    var body: some View {
        HStack(spacing: 12) {
            Text("\(rank)")
                .font(.footnote.monospacedDigit())
                .foregroundStyle(Palette.muted)
                .frame(width: 20, alignment: .leading)
            Text(member.name).fontWeight(member.isMe ? .semibold : .regular)
            if member.isMe { Text("you").font(.footnote).foregroundStyle(Palette.muted) }
            Spacer()
            Text("\(member.learned)")
                .font(.body.monospacedDigit().weight(.semibold))
            Text("/ \(member.saved)")
                .font(.footnote.monospacedDigit())
                .foregroundStyle(Palette.muted)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(rank). \(member.name)\(member.isMe ? ", you" : ""), \(member.learned) learned of \(member.saved) saved")
    }
}

private struct CodeField: View {
    var placeholder: String
    var button: String
    var action: (String) async -> Void
    @State private var text = ""
    @Environment(SquadStore.self) private var squads

    var body: some View {
        HStack {
            TextField(placeholder, text: $text)
                .autocorrectionDisabled()
                .submitLabel(.go)
                .onSubmit(submit)
            Button(button, action: submit)
                .disabled(text.trimmingCharacters(in: .whitespaces).isEmpty || squads.loading)
        }
    }

    private func submit() {
        let value = text
        guard !value.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        Task {
            await action(value)
            if squads.error == nil { text = "" }
        }
    }
}

/// Signed out: enter the link code the extension shows.
private struct LinkForm: View {
    @Environment(StudyStore.self) private var study
    @Environment(SquadStore.self) private var squads
    @State private var code = ""

    var body: some View {
        @Bindable var squads = squads
        Form {
            Section {
                Text("See how many words your friends have learned.")
                    .font(.headline)
                Text("Start in the Pause & Ask extension: open Squads, pick a name, then tap Use squads on your phone. Enter the code it shows here.")
                    .foregroundStyle(Palette.muted)
            }
            Section {
                TextField("Link code", text: $code)
                    .font(.body.monospaced())
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .submitLabel(.go)
                    .onSubmit(link)
                TextField("https://your-deployment.convex.cloud", text: $squads.serverURL)
                    .keyboardType(.URL)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                Button(action: link) {
                    HStack {
                        Text("Link this phone")
                        Spacer()
                        if squads.loading { ProgressView() }
                    }
                }
                .disabled(code.trimmingCharacters(in: .whitespaces).isEmpty || squads.loading)
            } footer: {
                VStack(alignment: .leading, spacing: 6) {
                    if let error = squads.error { Text(error).foregroundStyle(Palette.amber) }
                    Text("The squad server is the Convex URL the extension uses for squads. Only your name and word counts go there.")
                }
            }
        }
    }

    private func link() {
        Task { await squads.link(code: code, progress: SquadStore.progress(of: study)) }
    }
}
