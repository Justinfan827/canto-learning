import { lineAt, pickTrack, senses, trackLabel, transcriptCoverage, type LineWord, type TaughtWord } from "@pna/shared"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { DisplayMenu, Header, type Pill } from "~components/Header"
import { Lyrics, type LyricLine } from "~components/Lyrics"
import { Dock, MomentCard, Thread, WordSheet } from "~components/Moment"
import { formatTime } from "~components/Ruby"
import { SavedList } from "~components/SavedList"
import { loadDict } from "~lib/dict"
import "~lib/fonts"
import { createLocalStore } from "~lib/localStore"
import { aiKey, loadSettings, saveSettings, type Settings } from "~lib/settings"
import { listen, speak, speechSupported } from "~lib/speech"
import { aiFor, createTutor } from "~lib/tutor"
import { useDict } from "~lib/useDict"
import { usePlayer, type PlayerState } from "~lib/usePlayer"
import { useSaved, type SavedWord } from "~lib/useSaved"
import { useTranscriber, type TranscriberStatus } from "~lib/useTranscriber"
import { useTutor } from "~lib/useTutor"

import "./style.css"

const LISTEN_SILENCE_MS = 8000
const store = createLocalStore()
const openSetup = (hash = "") => chrome.tabs.create({ url: chrome.runtime.getURL("tabs/setup.html") + hash })

function SidePanel() {
  const [settings, setSettings] = useState<Settings | null>(null)
  useEffect(() => {
    loadSettings().then(setSettings)
    const onChange = () => loadSettings().then(setSettings)
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])
  // Rebuild the tutor only when the model changes, not on every display tweak.
  const modelKey = settings ? aiKey(settings) : null
  const tutor = useMemo(
    () => (settings ? createTutor(store, aiFor(settings), loadDict) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modelKey]
  )

  const { state, seek, play, pause, setLocalCaptions } = usePlayer()
  const t = useTutor(tutor, state)
  const { dict, split } = useDict()
  const saved = useSaved(store)
  const tr = useTranscriber(state, settings?.transcribeEngine ?? "auto", setLocalCaptions)

  const [view, setView] = useState<"video" | "saved">("video")
  const [menuOpen, setMenuOpen] = useState(false)
  const [focusIdx, setFocusIdx] = useState<number | null>(null)
  const [selWord, setSelWord] = useState<number | null>(null)
  const [loopIdx, setLoopIdx] = useState<number | null>(null)
  const loopRef = useRef<number | null>(null)
  const [input, setInput] = useState("")
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const stopListening = useRef<(() => void) | null>(null)

  const hasAi = !!tutor?.hasAi
  const register = hasAi ? (settings?.register ?? "colloquial") : "colloquial"
  const current = lineAt(state.lines, state.timeMs)

  // Each line in the chosen register, split into dictionary words. Stable between time updates.
  const lines = useMemo<(LyricLine & { inferred: boolean; text: string })[]>(
    () =>
      state.lines.map((l) => {
        const c = t.converted[l.idx]
        const conv = c && c.text === l.text ? c : undefined
        const text = (register === "formal" ? conv?.textFormal : conv?.textColloquial) || l.text
        return {
          idx: l.idx,
          startMs: l.startMs,
          endMs: l.endMs,
          text,
          words: split(text),
          english: conv?.textEnglish ?? null,
          inferred: register === "colloquial" && !!conv?.colloquialInferred && text !== l.text
        }
      }),
    [state.lines, t.converted, register, split]
  )

  const pausedView = state.paused || loopIdx != null
  const focus = pausedView && current >= 0 ? (focusIdx ?? current) : null
  const focusLine = focus != null ? lines[focus] : undefined

  const setLoop = (idx: number | null) => {
    loopRef.current = idx
    setLoopIdx(idx)
  }

  const ask = useCallback(
    (q: string) => {
      const question = q.trim()
      if (!question) return
      stopListening.current?.()
      setInput("")
      t.ask(question, focus ?? current, (answer) => {
        if (settings?.speakAnswers) speak(answer.replace(/[*`#]/g, ""), { lang: "en-US" })
      })
    },
    [t, focus, current, settings]
  )

  const startListening = useCallback(() => {
    if (!speechSupported() || listening) return
    setMicError(null)
    setListening(true)
    stopListening.current = listen({
      lang: settings?.listenLang ?? "zh-HK",
      silenceMs: LISTEN_SILENCE_MS,
      onText: (text) => setInput(text),
      onDone: (err) => {
        setListening(false)
        stopListening.current = null
        if (err === "not-allowed") setMicError("Microphone blocked. Allow it in settings.")
        else if (err && err !== "no-speech" && err !== "aborted") setMicError(`Voice input stopped: ${err}`)
        // Send what was heard; the user can edit and resend if it was misheard.
        setInput((text) => {
          if (text.trim() && !err) setTimeout(() => ask(text), 0)
          return text
        })
      }
    })
  }, [listening, settings, ask])

  // Pause opens the line; play closes it (unless it's looping).
  const wasPaused = useRef(state.paused)
  useEffect(() => {
    if (state.paused && !wasPaused.current) {
      setLoop(null)
      setSelWord(null)
      if (current >= 0) {
        setFocusIdx(current)
        if (state.captionSource !== "track") t.convertAround(current).catch(() => {})
        if (hasAi) startListening()
      }
    } else if (!state.paused && wasPaused.current && loopRef.current == null) {
      setFocusIdx(null)
      setSelWord(null)
      stopListening.current?.()
    }
    wasPaused.current = state.paused
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.paused])

  // Loop: jump back to the line's start whenever playback runs past it.
  useEffect(() => {
    const l = loopIdx != null ? state.lines[loopIdx] : null
    if (l && (state.timeMs >= l.endMs || state.timeMs < l.startMs - 1500)) seek(l.startMs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timeMs, loopIdx])

  // A new video starts fresh.
  useEffect(() => {
    setFocusIdx(null)
    setSelWord(null)
    setLoop(null)
  }, [state.video?.id])

  // Space plays and pauses; Esc closes the word sheet or the menu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      if (e.key === "Escape") {
        if (selWord != null) setSelWord(null)
        else setMenuOpen(false)
      } else if (e.code === "Space" && !typing && view === "video") {
        e.preventDefault()
        if (state.paused) play()
        else pause()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selWord, state.paused, play, pause, view])

  const onSeek = useCallback(
    (l: { idx: number; startMs: number }) => {
      seek(l.startMs)
      setSelWord(null)
      if (state.paused) setFocusIdx(l.idx)
    },
    [seek, state.paused]
  )

  const saveWord = async (w: LineWord) => {
    if (focus == null) return
    await t.saveWord(w, focus)
    saved.refresh()
  }
  const saveTaught = async (w: TaughtWord) => {
    if (focus == null) return
    await t.saveTaught(w, focus)
    saved.refresh()
  }

  if (!settings || !tutor) return null
  if (view === "saved")
    return (
      <div className={"panel size-" + settings.textSize}>
        <SavedList
          list={saved.list}
          videoId={state.video?.id ?? null}
          onBack={() => setView("video")}
          onOpen={(s: SavedWord) => {
            if (!s.at) return
            if (s.at.videoId === state.video?.id) seek(s.at.startMs)
            else if (state.tabId != null)
              chrome.tabs.update(state.tabId, { url: `https://www.youtube.com/watch?v=${s.at.videoId}&t=${Math.floor(s.at.startMs / 1000)}s` })
            setView("video")
          }}
        />
      </div>
    )
  if (!state.tabId) return <Empty text="Open a YouTube video in this window to start." />
  if (!state.video) return <Empty text="Waiting for the video… if this doesn't change, reload the YouTube tab." />

  const status = tr.status
  const job = status.kind === "running" ? status : null
  const coverage = job ? transcriptCoverage(state.lines, { ...job, done: false }) : null
  const word = focusLine && selWord != null ? focusLine.words[selWord] : null
  const thread = focus != null ? t.chat.filter((m) => m.lineIdx === focus) : []
  const showEnglish = settings.showEnglish && hasAi

  const header = (
    <Header
      pill={pillFor(state, status, tr.retry)}
      savedCount={saved.list.length}
      menuOpen={menuOpen}
      onMenu={setMenuOpen}
      onSaved={() => setView("saved")}
      onMore={() => openSetup()}
      menu={<DisplayMenu s={settings} hasAi={hasAi} onChange={(p) => saveSettings(p)} />}
    />
  )

  return (
    <div className={"panel size-" + settings.textSize}>
      {header}
      {job && (
        <div className="progress" role="progressbar" aria-label="Transcription progress" aria-valuenow={Math.round((coverage?.fraction ?? 0) * 100)}>
          <i style={{ width: `${(coverage?.fraction ?? 0) * 100}%` }} />
        </div>
      )}
      {job && !settings.transcribeNoticeSeen && (
        <div className="notice">
          <b>No Cantonese captions on this video.</b>
          <span>Transcribing locally with {job.engine}. Audio stays on this computer.</span>
          <div className="row">
            <button className="link" onClick={() => saveSettings({ transcribeNoticeSeen: true })}>
              Got it
            </button>
          </div>
        </div>
      )}

      {focusLine ? (
        <div className="paused">
          <div className="ctx">{lines[focusLine.idx - 1] && <CtxLine line={lines[focusLine.idx - 1]} past onSeek={onSeek} />}</div>
          <MomentCard
            words={focusLine.words}
            startMs={focusLine.startMs}
            english={showEnglish ? focusLine.english : null}
            inferred={focusLine.inferred}
            showJyutping={settings.showJyutping}
            saved={saved.words}
            selected={selWord}
            looping={loopIdx === focusLine.idx}
            onWord={(i) => setSelWord(selWord === i ? null : i)}
            onHear={(slow) => speak(focusLine.text, { slow })}
            onLoop={() => {
              if (loopIdx === focusLine.idx) {
                setLoop(null)
                pause()
              } else {
                setLoop(focusLine.idx)
                setFocusIdx(focusLine.idx)
                seek(focusLine.startMs)
                play()
              }
            }}
            onExplain={hasAi ? () => ask("Explain this line") : null}
          />
          {thread.length ? (
            <Thread messages={thread} saved={saved.words} onSave={saveTaught} onAsk={ask} />
          ) : (
            <div className="ctx after">
              {lines.slice(focusLine.idx + 1, focusLine.idx + 3).map((l) => (
                <CtxLine key={l.idx} line={l} onSeek={onSeek} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <Lyrics
          lines={lines}
          current={current}
          timeMs={state.timeMs}
          showJyutping={settings.showJyutping}
          showEnglish={showEnglish}
          onSeek={onSeek}
          head={
            job?.pass === 2 && job.fromMs > 0 ? (
              <TranscribingEdge text={`Filling in the start · ${formatTime(coverage!.fillMs)} of ${formatTime(job.fromMs)}`} />
            ) : null
          }
          tail={
            job && job.pass === 1 ? (
              <TranscribingEdge
                text={job.durationMs ? `Transcribing ahead · ${formatTime(coverage!.frontierMs)} of ${formatTime(job.durationMs)}` : `${job.stage}…`}
              />
            ) : null
          }
          empty={<EmptyLyrics status={status} hasTrack={!!pickTrack(state.tracks)} screen={state.captionSource === "screen"} onRetry={tr.retry} />}
        />
      )}

      {word && focusLine && (
        <WordSheet
          word={word}
          senses={dict ? senses(word.text, dict) : []}
          saved={saved.words.has(word.colloquial ?? word.text)}
          fromMs={focusLine.startMs}
          onSave={() => saveWord(word)}
          onHear={() => speak(word.colloquial ?? word.text)}
          onClose={() => setSelWord(null)}
        />
      )}

      <Dock
        mode={!focusLine ? "watching" : hasAi ? "ask" : "no-tutor"}
        listening={listening}
        canListen={speechSupported()}
        onListen={() => (listening ? stopListening.current?.() : startListening())}
        onAsk={ask}
        onSetup={() => openSetup("#tutor")}
        input={input}
        setInput={setInput}
        error={micError ?? t.error}
        onClearError={() => {
          setMicError(null)
          t.clearError()
        }}
      />
    </div>
  )
}

/** The caption-source pill: which source is in use, and what to do when there is none. */
function pillFor(state: PlayerState, status: TranscriberStatus, retry: () => void): Pill {
  if (state.captionSource === "track") return { text: trackLabel(pickTrack(state.tracks)), tone: "ok" }
  if (state.captionSource === "screen") return { text: "On-screen captions", tone: "ok" }
  switch (status.kind) {
    case "running":
      return { text: "Transcribing on this computer", tone: "work" }
    case "done":
      return { text: "Transcribed on this computer", tone: "ok" }
    case "missing":
      return { text: "No captions", tone: "warn", action: { label: "Set up transcriber", run: () => openSetup("#captions") } }
    case "no-engine":
      return { text: "No captions", tone: "warn", action: { label: "Install a speech model", run: () => openSetup("#captions") } }
    case "error":
      return { text: "Transcription failed", tone: "warn", action: { label: "Retry", run: retry } }
  }
  return { text: pickTrack(state.tracks) ? "Loading captions…" : "Finding captions…", tone: "idle" }
}

function CtxLine({ line, past, onSeek }: { line: LyricLine; past?: boolean; onSeek: (l: LyricLine) => void }) {
  return (
    <div className={"ln " + (past ? "past" : "next")} data-idx={line.idx} role="button" tabIndex={-1} onClick={() => onSeek(line)} lang="yue-Hant">
      {line.words.map((w, i) => (
        <span key={i} className="w">
          {w.text}
        </span>
      ))}
    </div>
  )
}

function TranscribingEdge({ text }: { text: string }) {
  return (
    <div className="edge-wrap" aria-live="polite">
      <div className="edge">
        <span className="dot work" />
        {text}
      </div>
      <div className="skel" aria-hidden="true">
        <i style={{ width: "82%" }} />
        <i style={{ width: "64%" }} />
        <i style={{ width: "74%" }} />
      </div>
    </div>
  )
}

function EmptyLyrics({ status, hasTrack, screen, onRetry }: { status: TranscriberStatus; hasTrack: boolean; screen: boolean; onRetry: () => void }) {
  if (screen) return <p className="lyrics-note">Reading captions from the video as they appear. Play the video to start.</p>
  switch (status.kind) {
    case "missing":
      return (
        <div className="lyrics-note">
          <p>This video has no Cantonese captions. The transcriber helper can write them on this computer.</p>
          <button className="primary" onClick={() => openSetup("#captions")}>
            Set up transcriber
          </button>
        </div>
      )
    case "no-engine":
      return (
        <div className="lyrics-note">
          <p>The transcriber is running but has no speech model for Cantonese.</p>
          <button className="primary" onClick={() => openSetup("#captions")}>
            See how to install one
          </button>
        </div>
      )
    case "error":
      return (
        <div className="lyrics-note">
          <p className="warn">{status.message}</p>
          <button className="primary" onClick={onRetry}>
            Try again
          </button>
        </div>
      )
    case "running":
      return null // the edge shows progress
  }
  return (
    <div className="skel big" aria-label={hasTrack ? "Loading captions" : "Finding captions"}>
      <i style={{ width: "70%" }} />
      <i style={{ width: "86%" }} />
      <i style={{ width: "58%" }} />
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>
}

export default SidePanel
