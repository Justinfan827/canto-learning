import SwiftUI

struct SettingsView: View {
    @Environment(StudyStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var confirmReset = false

    var body: some View {
        @Bindable var store = store
        NavigationStack {
            Form {
                Section {
                    TextField("http://127.0.0.1:8787", text: $store.address)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .submitLabel(.done)
                        .onSubmit { Task { await store.refresh() } }
                    Button {
                        Task { await store.refresh() }
                    } label: {
                        HStack {
                            Text("Sync now")
                            Spacer()
                            if store.sync == .syncing { ProgressView() }
                        }
                    }
                    .disabled(store.sync == .syncing)
                } header: {
                    Text("Your computer")
                } footer: {
                    VStack(alignment: .leading, spacing: 8) {
                        status
                        Text("Start the helper on your Mac with pnpm transcriber. From a phone on the same Wi-Fi, start it with HOST=0.0.0.0 pnpm transcriber and enter your Mac's address, like http://192.168.1.20:8787.")
                    }
                }

                Section {
                    Button("Load sample words") { store.loadSample() }
                    Button("Reset review progress", role: .destructive) { confirmReset = true }
                } footer: {
                    Text("Sample words come from three Cantonese YouTube videos. Resetting makes every word new again on this phone.")
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
            .confirmationDialog("Reset review progress?", isPresented: $confirmReset, titleVisibility: .visible) {
                Button("Reset", role: .destructive) { store.resetProgress() }
            } message: {
                Text("Every word becomes new again. Your saved words stay.")
            }
        }
    }

    @ViewBuilder private var status: some View {
        switch store.sync {
        case .failed(let message): Text(message).foregroundStyle(Palette.amber)
        case .synced(let at): Text("Synced \(store.snapshot.words.count) words \(at.formatted(.relative(presentation: .named))).")
        case .syncing: Text("Syncing…")
        case .idle: EmptyView()
        }
    }
}
