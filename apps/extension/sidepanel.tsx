import { alignByTime, examplesFor, lineAt, lookup, pickTrack, regroup, senses, trackLabel, transcriptCoverage, type Examples, type LineWord, type Sense, type TaughtWord, type Dict } from "@pna/shared"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { DisplayMenu, Header, type Pill, type SourceOption } from "~components/Header"
import { Lyrics, type LyricLine } from "~components/Lyrics"
import { Dock, MomentCard, Thread, WordSheet } from "~components/Moment"
import { formatTime } from "~components/Ruby"
import { SavedList } from "~components/SavedList"
import { Squads } from "~components/Squads"
import { loadDict, loadExamples } from "~lib/dict"
import "~lib/fonts"
import { store } from "~lib/data"
import { aiKey, loadSettings, saveSettings, type Settings } from "~lib/settings"
import { listen, speak, speechSupported } from "~lib/speech"
import { aiFor, createTutor } from "~lib/tutor"
import { useDict } from "~lib/useDict"
import { useGroupings } from "~lib/useGroupings"
import { usePlayer, type PlayerState } from "~lib/usePlayer"
import { useSaved, type SavedWord } from "~lib/useSaved"
import { pickEngine, type Engine } from "~lib/transcriber"
import { useTranscriber, type TranscriberStatus } from "~lib/useTranscriber"
import { useTutor } from "~lib/useTutor"

import "./style.css"

const LISTEN_SILENCE_MS = 8000
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

  const { state, seek, play, pause, setLocalCaptions, useTrack } = usePlayer()
  const t = useTutor(tutor, state)
  const { dict, split } = useDict()
  const groupings = useGroupings()
  const saved = useSaved(store)
  const tr = useTranscriber(state, settings?.transcribeEngine ?? "auto", !!settings?.preferLocal, setLocalCaptions)

  const [view, setView] = useState<"video" | "saved" | "squads">("video")
  const [savedSel, setSavedSel] = useState<SavedWord | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [focusIdx, setFocusIdx] = useState<number | null>(null)
  const [selWord, setSelWord] = useState<number | null>(null)
  const [loopIdx, setLoopIdx] = useState<number | null>(null)
  const loopRef = useRef<number | null>(null)
  const [input, setInput] = useState("")
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const stopListening = useRef<(() => void) | null>(null)

  const [examples, setExamples] = useState<Examples | null>(null)
  useEffect(() => {
    if ((selWord !== null || savedSel) && !examples) loadExamples().then(setExamples, (e) => console.warn(e))
  }, [selWord, savedSel, examples])
  const hasAi = !!tutor?.hasAi
  // Written Chinese for each line from a second local transcript, when there is one.
  const written = useMemo(() => (tr.written ? alignByTime(state.lines, tr.written) : null), [state.lines, tr.written])
  const canFormal = hasAi || !!written
  const register = canFormal ? (settings?.register ?? "colloquial") : "colloquial"
  const current = lineAt(state.lines, state.timeMs)

  // Each line in the chosen register, split into dictionary words. Stable between time updates.
  const lines = useMemo<(LyricLine & { inferred: boolean; text: string; regrouped: boolean })[]>(
    () =>
      state.lines.map((l) => {
        const c = t.converted[l.idx]
        const conv = c && c.text === l.text ? c : undefined
        const text = (register === "formal" ? conv?.textFormal || written?.get(l.idx) : conv?.textColloquial) || l.text
        return {
          idx: l.idx,
          startMs: l.startMs,
          endMs: l.endMs,
          text,
          words: groupings.map[text] && dict ? groupings.map[text].map((w) => lookup(w, dict)) : split(text),
          regrouped: !!groupings.map[text],
          english: conv?.textEnglish ?? null,
          inferred: register === "colloquial" && !!conv?.colloquialInferred && text !== l.text
        }
      }),
    [state.lines, t.converted, register, split, groupings.map, dict, written]
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
        if (savedSel) setSavedSel(null)
        else if (selWord != null) setSelWord(null)
        else setMenuOpen(false)
      } else if (e.code === "Space" && !typing && view === "video") {
        e.preventDefault()
        if (state.paused) play()
        else pause()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selWord, savedSel, state.paused, play, pause, view])

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
  if (view === "squads")
    return (
      <div className={"panel size-" + settings.textSize}>
        <Squads defaultUrl={process.env.PLASMO_PUBLIC_SQUADS_URL || settings.convexUrl} onBack={() => setView("video")} />
      </div>
    )
  if (view === "saved") {
    const openSource = (s: SavedWord) => {
      if (!s.at) return
      if (s.at.videoId === state.video?.id) seek(s.at.startMs)
      else if (state.tabId != null)
        chrome.tabs.update(state.tabId, { url: `https://www.youtube.com/watch?v=${s.at.videoId}&t=${Math.floor(s.at.startMs / 1000)}s` })
      setSavedSel(null)
      setView("video")
    }
    const sel = savedSel ? savedDetail(savedSel, dict) : null
    return (
      <div className={"panel size-" + settings.textSize}>
        <SavedList
          list={saved.list}
          videoId={state.video?.id ?? null}
          dict={dict}
          onAdd={async (w) => {
            const r = await store.addWord(w)
            await saved.refresh()
            return r
          }}
          onBack={() => {
            setSavedSel(null)
            setView("video")
          }}
          onOpen={setSavedSel}
          onHear={(s) => speak(s.word.colloquial)}
        />
        {savedSel && sel && (
          <WordSheet
            word={sel.word}
            senses={sel.senses}
            examples={examples ? examplesFor(typeof dict?.[sel.word.text] === "string" ? (dict[sel.word.text] as string) : sel.word.text, examples) : null}
            onHearExample={(text) => speak(text)}
            onAskExamples={null}
            saved
            from={savedSel.at ? { ms: savedSel.at.startMs, title: savedSel.at.videoTitle, onOpen: () => openSource(savedSel) } : null}
            onSave={() => {}}
            onHear={() => speak(sel.word.text)}
            onClose={() => setSavedSel(null)}
          />
        )}
      </div>
    )
  }
  const openSaved = () => setView("saved")
  if (!state.tabId) return <Empty text="Open a YouTube video in this window to start." onSaved={openSaved} />
  if (!state.video) return <Empty text="Waiting for the video… if this doesn't change, reload the YouTube tab." onSaved={openSaved} />

  const status = tr.status
  const job = status.kind === "running" ? status : null
  const coverage = job ? transcriptCoverage(state.lines, { ...job, done: false }) : null
  const word = focusLine && selWord != null ? focusLine.words[selWord] : null
  const thread = focus != null ? t.chat.filter((m) => m.lineIdx === focus) : []
  const showEnglish = settings.showEnglish && hasAi

  const header = (
    <Header
      pill={pillFor(state, status, tr.retry)}
      sources={sourceOptions(state, tr.engines, settings, status)}
      onSource={(id) => {
        const hasTrack = !!pickTrack(state.tracks)
        if (id === "youtube") {
          saveSettings({ preferLocal: false })
          if (state.video) useTrack(state.video.id)
        } else saveSettings({ transcribeEngine: id, preferLocal: hasTrack })
      }}
      savedCount={saved.list.length}
      menuOpen={menuOpen}
      onMenu={setMenuOpen}
      onSaved={() => setView("saved")}
      onSquads={() => setView("squads")}
      onMore={() => openSetup()}
      menu={<DisplayMenu s={settings} hasAi={hasAi} canFormal={canFormal} onChange={(p) => saveSettings(p)} />}
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
            regrouped={focusLine.regrouped}
            onRegroup={(a, b) => {
              const next = regroup(
                focusLine.words.map((w) => w.text),
                a,
                b
              )
              groupings.set(focusLine.text, next)
              // Open the new word: the one starting at the drag's first character.
              let at = 0
              setSelWord(next.findIndex((w) => (at += [...w].length) > Math.min(a, b)))
            }}
            onResetGrouping={() => {
              groupings.clear(focusLine.text)
              setSelWord(null)
            }}
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
          examples={examples ? examplesFor(typeof dict?.[word.text] === "string" ? (dict[word.text] as string) : word.text, examples) : null}
          onHearExample={(text) => speak(text)}
          onAskExamples={hasAi ? () => ask(`Give two short everyday example sentences that use ${word.colloquial ?? word.text}, each with Jyutping and English.`) : null}
          saved={saved.words.has(word.colloquial ?? word.text)}
          from={{ ms: focusLine.startMs }}
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

/** A saved word as the word sheet shows it: dictionary senses when there are any, else the meaning it was saved with. */
function savedDetail(s: SavedWord, dict: Dict | null): { word: LineWord; senses: Sense[] } {
  const w = s.word
  const fromDict = dict ? senses(w.colloquial, dict) : []
  return {
    word: { text: w.colloquial, colloquial: w.colloquial, formal: w.formal && w.formal !== w.colloquial ? w.formal : null, jyutping: w.jyutping || (dict ? lookup(w.colloquial, dict).jyutping : ""), meaning: w.meaning ?? "", likelyError: null },
    senses: fromDict.length ? fromDict : w.meaning ? [{ jyutping: w.jyutping ?? "", gloss: w.meaning, formal: null }] : []
  }
}

/** The caption-source pill: which source is in use, and what to do when there is none. */
/** "SenseVoice Small (sherpa-onnx)" → "SenseVoice Small", for the pill. */
const shortName = (label: string) => label.replace(/\s*\(.*\)$/, "")

/** The pill's menu: YouTube's captions first, then each local speech model. */
function sourceOptions(state: PlayerState, engines: Engine[] | null, s: Settings, status: TranscriberStatus): SourceOption[] {
  const track = pickTrack(state.tracks)
  const local = status.kind !== "off" || state.captionSource === "local"
  const chosen = engines ? pickEngine(engines, s.transcribeEngine) : null
  const out: SourceOption[] = [
    track
      ? { id: "youtube", label: trackLabel(track), active: !local }
      : { id: "youtube", label: "YouTube captions", note: "None in Chinese on this video", active: false, disabled: true }
  ]
  if (!engines) {
    out.push({ id: "none", label: "On this computer", note: "Start the transcriber: pnpm transcriber", active: false, disabled: true })
    return out
  }
  for (const e of engines)
    out.push({ id: e.id, label: shortName(e.label), note: e.unavailable ?? e.languages, active: local && chosen?.id === e.id, disabled: !!e.unavailable })
  return out
}

function pillFor(state: PlayerState, status: TranscriberStatus, retry: () => void): Pill {
  if (state.captionSource === "track" && status.kind === "off") return { text: trackLabel(pickTrack(state.tracks)), tone: "ok" }
  if (state.captionSource === "screen" && status.kind === "off") return { text: "On-screen captions", tone: "ok" }
  switch (status.kind) {
    case "running":
      return { text: `Transcribing · ${shortName(status.engine)}`, tone: "work" }
    case "done":
      return { text: `${shortName(status.engine)} · this computer`, tone: "ok" }
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

function Empty({ text, onSaved }: { text: string; onSaved: () => void }) {
  return (
    <div className="empty">
      <div>
        <p>{text}</p>
        <button className="link" onClick={onSaved}>
          Saved words
        </button>
      </div>
    </div>
  )
}

export default SidePanel
