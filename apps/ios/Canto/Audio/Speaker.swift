import AVFoundation
import Observation

/// Speaks Cantonese (zh-HK) and English with the phone's built-in voices.
@MainActor @Observable
final class Speaker: NSObject, AVSpeechSynthesizerDelegate {
    enum Language { case cantonese, english }

    /// The text being spoken right now, for highlighting the tapped button.
    private(set) var speaking: String?

    @ObservationIgnored private let synth = AVSpeechSynthesizer()
    @ObservationIgnored private var waiters: [ObjectIdentifier: CheckedContinuation<Void, Never>] = [:]

    override init() {
        super.init()
        synth.delegate = self
    }

    static func voice(_ lang: Language) -> AVSpeechSynthesisVoice? {
        let code = lang == .cantonese ? "zh-HK" : "en-US"
        let voices = AVSpeechSynthesisVoice.speechVoices().filter { $0.language == code }
        return voices.max { $0.quality.rawValue < $1.quality.rawValue } ?? AVSpeechSynthesisVoice(language: code)
    }

    static var hasCantoneseVoice: Bool { AVSpeechSynthesisVoice.speechVoices().contains { $0.language == "zh-HK" } }

    /// Interrupts anything playing and says `text` once.
    func say(_ text: String, _ lang: Language = .cantonese, slow: Bool = false) {
        stop()
        Task { await speak(text, lang, rate: slow ? 0.36 : 0.46) }
    }

    /// Speaks and returns when the utterance finishes or is stopped.
    func speak(_ text: String, _ lang: Language, rate: Float = 0.46) async {
        AudioSession.activate()
        let u = AVSpeechUtterance(string: text)
        u.voice = Self.voice(lang)
        u.rate = rate
        u.postUtteranceDelay = 0
        speaking = text
        await withCheckedContinuation { cont in
            waiters[ObjectIdentifier(u)] = cont
            synth.speak(u)
        }
        if speaking == text { speaking = nil }
    }

    func stop() {
        synth.stopSpeaking(at: .immediate)
    }

    private func finish(_ id: ObjectIdentifier) {
        waiters.removeValue(forKey: id)?.resume()
    }

    nonisolated func speechSynthesizer(_ s: AVSpeechSynthesizer, didFinish u: AVSpeechUtterance) {
        let id = ObjectIdentifier(u)
        Task { @MainActor in self.finish(id) }
    }

    nonisolated func speechSynthesizer(_ s: AVSpeechSynthesizer, didCancel u: AVSpeechUtterance) {
        let id = ObjectIdentifier(u)
        Task { @MainActor in self.finish(id) }
    }
}

enum AudioSession {
    /// Spoken-audio playback that keeps going with the screen locked and ducks music.
    static func activate() {
        let s = AVAudioSession.sharedInstance()
        try? s.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
        try? s.setActive(true)
    }
}
