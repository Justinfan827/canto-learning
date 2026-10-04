import SwiftUI

/// A quick sheet for saving a word you met away from a video. Only the Cantonese is required.
struct AddWordView: View {
    var onAdded: () -> Void = {}
    @Environment(StudyStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var colloquial = ""
    @State private var jyutping = ""
    @State private var meaning = ""
    @FocusState private var focus: Field?

    private enum Field { case colloquial, jyutping, meaning }

    private var trimmed: String { colloquial.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var alreadySaved: Bool { !trimmed.isEmpty && store.isSaved(trimmed) }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("傾偈", text: $colloquial)
                        .font(Typeface.hanzi(24, .medium, relativeTo: .title2))
                        .cantonese()
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($focus, equals: .colloquial)
                        .submitLabel(.next)
                        .onSubmit { focus = .jyutping }
                        .accessibilityLabel("Cantonese")
                } header: {
                    Text("Cantonese")
                } footer: {
                    if alreadySaved { Text("Already in your library.").foregroundStyle(Palette.amber) }
                }
                Section {
                    TextField("Jyutping", text: $jyutping)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($focus, equals: .jyutping)
                        .submitLabel(.next)
                        .onSubmit { focus = .meaning }
                    TextField("Meaning", text: $meaning)
                        .focused($focus, equals: .meaning)
                        .submitLabel(.done)
                        .onSubmit(save)
                } header: {
                    Text("Optional")
                } footer: {
                    Text(footer)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Palette.page)
            .navigationTitle("Add a word")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add", systemImage: "checkmark", action: save)
                        .disabled(trimmed.isEmpty || alreadySaved)
                }
            }
            .onAppear { focus = .colloquial }
        }
    }

    private var footer: String {
        store.backendKind == .computer
            ? "Blank fields fill in from the dictionary when the extension picks the word up from your computer."
            : "Leave these blank if you don't know them yet."
    }

    private func save() {
        guard store.addWord(colloquial: colloquial, jyutping: jyutping, meaning: meaning) == .added else { return }
        onAdded()
        dismiss()
        Task { await store.refresh() }
    }
}

#Preview {
    AddWordView().environment(StudyStore())
}
