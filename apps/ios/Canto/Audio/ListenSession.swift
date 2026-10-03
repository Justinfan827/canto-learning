import MediaPlayer
import Observation

/// Plays a list of words aloud, hands-free: the word, its meaning, then the line
/// it came from. Keeps going with the screen locked and answers the lock-screen
/// and headphone controls.
@Observable
final class ListenSession {
    struct Options: Codable, Equatable {
        var sayMeaning = true
        var saySentence = true
        var repeatWord = true
        var slow = false
        var loop = true
    }

    enum Step: Equatable { case word, meaning, sentence }

    private(set) var queue: [StudyWord] = []
    private(set) var index = 0
    private(set) var isPlaying = false
    private(set) var step: Step?
    var options: Options {
        didSet { if let d = try? JSONEncoder().encode(options) { UserDefaults.standard.set(d, forKey: "listenOptions") } }
    }

    var current: StudyWord? { queue.indices.contains(index) ? queue[index] : nil }

    @ObservationIgnored private let speaker: Speaker
    @ObservationIgnored private var task: Task<Void, Never>?
    @ObservationIgnored private var remoteReady = false

    init(speaker: Speaker) {
        self.speaker = speaker
        options = UserDefaults.standard.data(forKey: "listenOptions").flatMap { try? JSONDecoder().decode(Options.self, from: $0) } ?? Options()
    }

    func start(_ words: [StudyWord], at i: Int = 0) {
        queue = words
        index = min(max(0, i), max(0, words.count - 1))
        play()
    }

    func play() {
        guard !queue.isEmpty else { return }
        setUpRemote()
        isPlaying = true
        task?.cancel()
        task = Task { await run() }
    }

    func pause() {
        isPlaying = false
        task?.cancel()
        task = nil
        speaker.stop()
        step = nil
        updateNowPlaying()
    }

    func toggle() { isPlaying ? pause() : play() }

    func next() { jump(to: index + 1) }

    func previous() { jump(to: index - 1) }

    func jump(to i: Int) {
        guard !queue.isEmpty else { return }
        index = (i + queue.count) % queue.count
        if isPlaying { play() } else { updateNowPlaying() }
    }

    func stop() {
        pause()
        queue = []
        index = 0
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    }

    private func run() async {
        let rate: Float = options.slow ? 0.34 : 0.44
        while !Task.isCancelled, let word = current {
            updateNowPlaying()
            step = .word
            await speaker.speak(word.colloquial, .cantonese, rate: rate)
            if Task.isCancelled { return }
            if options.repeatWord {
                await rest(0.7)
                await speaker.speak(word.colloquial, .cantonese, rate: rate)
            }
            if options.sayMeaning, let meaning = word.meaning {
                await rest(0.8)
                if Task.isCancelled { return }
                step = .meaning
                await speaker.speak(meaning, .english, rate: 0.5)
            }
            if options.saySentence, let line = word.latestSource?.spoken {
                await rest(0.8)
                if Task.isCancelled { return }
                step = .sentence
                await speaker.speak(line, .cantonese, rate: rate)
            }
            await rest(1.6)
            if Task.isCancelled { return }
            if index + 1 < queue.count {
                index += 1
            } else if options.loop {
                index = 0
            } else {
                isPlaying = false
                step = nil
                updateNowPlaying()
                return
            }
        }
    }

    private func rest(_ seconds: Double) async {
        try? await Task.sleep(for: .seconds(seconds))
    }

    // MARK: Lock screen

    private func updateNowPlaying() {
        guard let word = current else { return }
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: word.colloquial,
            MPMediaItemPropertyArtist: [word.jyutping, word.meaning].compactMap { $0 }.joined(separator: "  "),
            MPMediaItemPropertyAlbumTitle: "Canto · \(index + 1) of \(queue.count)",
            MPNowPlayingInfoPropertyPlaybackRate: isPlaying ? 1.0 : 0.0
        ]
        info[MPNowPlayingInfoPropertyMediaType] = MPNowPlayingInfoMediaType.audio.rawValue
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    private func setUpRemote() {
        guard !remoteReady else { return }
        remoteReady = true
        let c = MPRemoteCommandCenter.shared()
        c.playCommand.addTarget { [weak self] _ in self?.play(); return .success }
        c.pauseCommand.addTarget { [weak self] _ in self?.pause(); return .success }
        c.togglePlayPauseCommand.addTarget { [weak self] _ in self?.toggle(); return .success }
        c.nextTrackCommand.addTarget { [weak self] _ in self?.next(); return .success }
        c.previousTrackCommand.addTarget { [weak self] _ in self?.previous(); return .success }
    }
}
