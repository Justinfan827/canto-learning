import { alignByTime, examplesFor, lineAt, lookup, pickTrack, regroup, senses, trackLabel, transcriptCoverage, type Examples, type LineWord, type Sense, type Dict } from "@pna/shared"
import { cn } from "cn"
import { Check, CircleAlert, Star, TvMinimalPlay } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { DisplayMenu, Header, StatusDot, type Pill, type SourceOption } from "~components/Header"
import { Lyrics, type LyricLine } from "~components/Lyrics"
import { Dock, MomentCard, WordSheet } from "~components/Moment"
import { formatTime } from "~components/Ruby"
import { SavedList } from "~components/SavedList"
import { Squads } from "~components/Squads"
import { Button } from "~components/ui/button"
import { Progress } from "~components/ui/progress"
import { Skeleton } from "~components/ui/skeleton"
import { Welcome } from "~components/Welcome"
import { CONVEX_URL, leaveGuest, signOut, type Account } from "~lib/auth"
import { LOCAL_HELPER } from "~lib/features"
import { loadExamples } from "~lib/dict"
import "~lib/fonts"
import { store } from "~lib/data"
import { useAccount } from "~lib/useAccount"
import { fillLineJyutping } from "~lib/data/lineJyutping"
import { loadSettings, saveSettings, type Settings } from "~lib/settings"
import { speak } from "~lib/speech"
import { useDict } from "~lib/useDict"
import { useGroupings } from "~lib/useGroupings"
import { usePlayer, type PlayerState } from "~lib/usePlayer"
import { useSaved, type SavedWord } from "~lib/useSaved"
import { useSaveWord } from "~lib/useSaveWord"
import { pickEngine, type Engine } from "~lib/transcriber"
import { useTranscriber, type TranscribeJob, type TranscriberStatus } from "~lib/useTranscriber"
import { createWords } from "~lib/words"

import "./tailwind.css"

const wordLog = createWords(store)
const openSetup = (hash = "") => chrome.tabs.create({ url: chrome.runtime.getURL("tabs/setup.html") + hash })

function SidePanel() {
  const [settings, setSettings] = useState<Settings | null>(null)
  useEffect(() => {
    loadSettings().then(setSettings)
    const onChange = () => loadSettings().then(setSettings)
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const { state, seek, play, pause, setLocalCaptions, useTrack } = usePlayer()
  const t = useSaveWord(wordLog, state)
  const { dict, split } = useDict()
  const groupings = useGroupings()
  const saved = useSaved(store)
  const tr = useTranscriber(state, settings?.transcribeEngine ?? "auto", !!settings?.preferLocal, setLocalCaptions)

  const acct = useAccount()
  const [signingIn, setSigningIn] = useState(false)
  const [view, setView] = useState<"video" | "saved" | "squads">("video")
  const [savedSel, setSavedSel] = useState<SavedWord | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [focusIdx, setFocusIdx] = useState<number | null>(null)
  const [selWord, setSelWord] = useState<number | null>(null)
  const [loopIdx, setLoopIdx] = useState<number | null>(null)
  const loopRef = useRef<number | null>(null)

  const [examples, setExamples] = useState<Examples | null>(null)
  useEffect(() => {
    if ((selWord !== null || savedSel) && !examples) loadExamples().then(setExamples, (e) => console.warn(e))
  }, [selWord, savedSel, examples])
  // Written Chinese for each line from a second local transcript, when there is one.
  const written = useMemo(() => (tr.written ? alignByTime(state.lines, tr.written) : null), [state.lines, tr.written])
  const canFormal = !!written
  const register = canFormal ? (settings?.register ?? "colloquial") : "colloquial"
  const current = lineAt(state.lines, state.timeMs)

  // Each line in the chosen register, split into dictionary words. Stable between time updates.
  const lines = useMemo<(LyricLine & { text: string; regrouped: boolean })[]>(
    () =>
      state.lines.map((l) => {
        const text = (register === "formal" && written?.get(l.idx)) || l.text
        return {
          idx: l.idx,
          startMs: l.startMs,
          endMs: l.endMs,
          text,
          words: groupings.map[text] && dict ? groupings.map[text].map((w) => lookup(w, dict)) : split(text),
          regrouped: !!groupings.map[text]
        }
      }),
    [state.lines, register, split, groupings.map, dict, written]
  )

  const pausedView = state.paused || loopIdx != null
  const focus = pausedView && current >= 0 ? (focusIdx ?? current) : null
  const focusLine = focus != null ? lines[focus] : undefined

  const setLoop = (idx: number | null) => {
    loopRef.current = idx
    setLoopIdx(idx)
  }

  // Pause opens the line; play closes it (unless it's looping).
  const wasPaused = useRef(state.paused)
  useEffect(() => {
    if (state.paused && !wasPaused.current) {
      setLoop(null)
      setSelWord(null)
      if (current >= 0) {
        setFocusIdx(current)
      }
    } else if (!state.paused && wasPaused.current && loopRef.current == null) {
      setFocusIdx(null)
      setSelWord(null)
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

  // Fill in Jyutping for saved words' source lines, for the phone. Runs once the dictionary loads
  // and after each save; only lines without it are touched.
  const savedCount = saved.list.length
  useEffect(() => {
    if (dict) fillLineJyutping(store, split).catch((e) => console.warn("Line Jyutping", e))
  }, [dict, split, savedCount])

  const saveWord = async (w: LineWord) => {
    if (focus == null) return
    await t.saveWord(w, focus)
    saved.refresh()
  }

  if (!settings || !acct) return null
  if (acct.choosing || signingIn)
    return (
      <div className={panelClass(settings.textSize)}>
        <Welcome onBusy={setSigningIn} />
      </div>
    )
  if (view === "squads")
    return (
      <div className={panelClass(settings.textSize)}>
        <Squads defaultUrl={process.env.PLASMO_PUBLIC_SQUADS_URL || CONVEX_URL} onBack={() => setView("video")} />
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
      <div className={panelClass(settings.textSize)}>
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
  if (!state.tabId) return <Empty text="Open a YouTube video in this window to start." onSaved={openSaved} account={acct.account} />
  if (!state.video) return <Empty text="Waiting for the video… if this doesn't change, reload the YouTube tab." onSaved={openSaved} account={acct.account} />

  const status = tr.status
  const job = status.kind === "running" ? status : null
  const coverage = job ? transcriptCoverage(state.lines, { ...job, done: false }) : null
  const word = focusLine && selWord != null ? focusLine.words[selWord] : null

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
      account={CONVEX_URL ? acct.account : undefined}
      onSignIn={() => leaveGuest()}
      onSignOut={() => signOut()}
      onSettings={() => openSetup()}
      menu={<DisplayMenu s={settings} canFormal={canFormal} onChange={(p) => saveSettings(p)} />}
    />
  )

  return (
    <div className={panelClass(settings.textSize)}>
      {header}
      {job && <Progress value={Math.round((coverage?.fraction ?? 0) * 100)} aria-label="Transcription progress" className="mx-4 mb-1 flex-none [&_[data-slot=progress-track]]:h-2.5" />}
      {(status.kind === "running" || status.kind === "checking") && !lines.length ? (
        <TranscribeLoading job={job} />
      ) : (
        <Lyrics
          lines={lines}
          current={current}
          showJyutping={settings.showJyutping}
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
          focus={focusLine ? focusLine.idx : null}
          raised={!!word}
          card={
            focusLine && (
              <MomentCard
                words={focusLine.words}
                startMs={focusLine.startMs}
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
              />
            )
          }
        />
      )}

      {word && focusLine && (
        <WordSheet
          word={word}
          senses={dict ? senses(word.text, dict) : []}
          examples={examples ? examplesFor(typeof dict?.[word.text] === "string" ? (dict[word.text] as string) : word.text, examples) : null}
          onHearExample={(text) => speak(text)}
          saved={saved.words.has(word.colloquial ?? word.text)}
          from={{ ms: focusLine.startMs }}
          onSave={() => saveWord(word)}
          onHear={() => speak(word.colloquial ?? word.text)}
          onClose={() => setSelWord(null)}
        />
      )}

      <Dock watching={!focusLine} error={t.error} onClearError={t.clearError} />
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
  if (!LOCAL_HELPER) return [{ id: "youtube", label: trackLabel(track), note: track ? undefined : "None in Chinese on this video", active: !!track, disabled: !track }]
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
    case "no-captions":
      return { text: "No Chinese captions", tone: "warn" }
    case "missing":
      return { text: "No captions", tone: "warn", action: { label: "Set up transcriber", run: () => openSetup("#captions") } }
    case "no-engine":
      return { text: "No captions", tone: "warn", action: { label: "Install a speech model", run: () => openSetup("#captions") } }
    case "error":
      return { text: "Transcription failed", tone: "warn", action: { label: "Retry", run: retry } }
  }
  return { text: pickTrack(state.tracks) ? "Loading captions…" : "Finding captions…", tone: "idle" }
}

/** The panel's frame: rice-paper page, Nunito, and the caption sizes the Aa menu picks. */
function panelClass(size: Settings["textSize"]) {
  return cn(
    "panel relative flex h-screen flex-col overflow-hidden bg-surface font-sans text-body",
    "size-" + size,
    size === "s" && "[--card-size:18px] [--ln:15px] [--now:19px]",
    size === "m" && "[--card-size:21px] [--ln:17px] [--now:23px]",
    size === "l" && "[--card-size:25px] [--ln:20px] [--now:28px]"
  )
}

/** Placeholder lines while captions or the next stretch of transcript load. */
function SkeletonLines({ widths, className }: { widths: string[]; className?: string }) {
  return (
    <>
      {widths.map((w) => (
        <Skeleton key={w} className={cn("h-3.5 rounded-full bg-border", className)} style={{ width: w }} />
      ))}
    </>
  )
}

function TranscribingEdge({ text }: { text: string }) {
  return (
    <div className="grid gap-3" aria-live="polite">
      <div className="flex w-fit max-w-full items-center gap-2 rounded-md bg-gold-soft px-2.5 py-1.5 type-body-sm font-bold text-gold-ink">
        <StatusDot tone="work" />
        <span className="truncate">{text}</span>
      </div>
      <div className="grid gap-3 pt-0.5" aria-hidden="true">
        <SkeletonLines widths={["82%", "64%", "74%"]} />
      </div>
    </div>
  )
}

/** The download, convert and transcribe steps the helper reports, in order. */
const STEPS = ["Download audio", "Convert audio", "Transcribe"]
const stepOf = (stage: string) => (stage.startsWith("Transcribing") ? 2 : stage.startsWith("Converting") ? 1 : 0)

/** Shown until the first transcribed lines arrive, when a video starts or the user switches model. */
function TranscribeLoading({ job }: { job: (TranscribeJob & { kind: "running" }) | null }) {
  const [started] = useState(Date.now)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const step = job ? stepOf(job.stage) : -1
  return (
    <div className="grid min-h-0 flex-1 place-items-center px-4 pb-12" role="status" aria-live="polite">
      <div className="loading-card grid w-full max-w-[320px] gap-4 rounded-xl border-2 border-b-4 border-border bg-card p-4 text-card-foreground">
        <div className="flex items-center gap-2">
          <StatusDot tone="work" className="size-2.5" />
          <b className="min-w-0 flex-1 truncate type-body font-extrabold text-foreground">
            {job ? `Transcribing with ${shortName(job.engine)}` : "Starting the transcriber"}
          </b>
          <span className="rounded-full bg-gold-soft px-2 py-0.5 type-body-sm font-extrabold text-gold-ink tabular-nums">{formatTime(now - started)}</span>
        </div>
        <ol className="m-0 grid list-none gap-2.5 p-0">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={cn(
                "flex items-center gap-2.5 type-body",
                i < step ? "text-muted-foreground" : i === step ? "font-extrabold text-foreground" : "text-faint"
              )}>
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-[22px] flex-none place-items-center rounded-full border-[2.5px] border-current",
                  i < step && "border-jade bg-jade text-white dark:text-background",
                  i === step && "animate-spin border-gold border-t-transparent"
                )}>
                {i < step && <Check className="size-3.5" strokeWidth={3.5} />}
              </span>
              {s}
            </li>
          ))}
        </ol>
        {/* Which step it's on, as a gold bar; the steps above carry the meaning. */}
        <div className="h-3 overflow-hidden rounded-full bg-border" aria-hidden="true">
          <div className="h-full animate-pulse rounded-full bg-gold transition-[width] duration-500" style={{ width: `${((step + 1) / (STEPS.length + 1)) * 100}%` }} />
        </div>
        <p className="m-0 type-body-sm text-muted-foreground">Audio stays on this computer. Lines appear as they&apos;re ready, starting from where you are in the video.</p>
      </div>
    </div>
  )
}

function EmptyLyrics({ status, hasTrack, screen, onRetry }: { status: TranscriberStatus; hasTrack: boolean; screen: boolean; onRetry: () => void }) {
  const note = "lyrics-note grid justify-items-start gap-3 type-body text-muted-foreground"
  if (screen) return <p className={cn(note, "m-0")}>Reading captions from the video as they appear. Play the video to start.</p>
  switch (status.kind) {
    case "no-captions":
      return <p className={cn(note, "m-0")}>This video has no Cantonese or Chinese captions.</p>
    case "missing":
      return (
        <div className={note}>
          <p className="m-0">This video has no Cantonese captions. The transcriber helper can write them on this computer.</p>
          <Button onClick={() => openSetup("#captions")}>Set up transcriber</Button>
        </div>
      )
    case "no-engine":
      return (
        <div className={note}>
          <p className="m-0">The transcriber is running but has no speech model for Cantonese.</p>
          <Button onClick={() => openSetup("#captions")}>See how to install one</Button>
        </div>
      )
    case "error":
      return (
        <div className={note}>
          <p className="m-0 flex w-full items-start gap-2 rounded-md bg-primary-soft px-3 py-2.5 type-body-sm font-bold text-destructive">
            <CircleAlert className="mt-px size-4 flex-none" strokeWidth={2.5} aria-hidden="true" />
            {status.message}
          </p>
          <Button onClick={onRetry}>Try again</Button>
        </div>
      )
    case "running":
      return null // the edge shows progress
  }
  return (
    <div className="grid gap-3.5" aria-label={hasTrack ? "Loading captions" : "Finding captions"}>
      <SkeletonLines widths={["70%", "86%", "58%"]} className="h-[18px]" />
    </div>
  )
}

function Empty({ text, onSaved, account }: { text: string; onSaved: () => void; account: Account | null }) {
  return (
    <div className="empty relative flex h-screen flex-col items-center justify-center bg-surface px-7 pt-8 pb-20 text-center font-sans text-body">
      <div className="flex w-full max-w-[300px] flex-col items-center gap-4">
        <div aria-hidden className="mb-1 grid size-16 place-items-center rounded-xl bg-harbour-soft text-harbour">
          <TvMinimalPlay className="size-8" strokeWidth={2.25} />
        </div>
        <p className="m-0 type-title text-balance text-foreground">{text}</p>
        <Button variant="outline" className="mt-2 w-full" onClick={onSaved}>
          <Star strokeWidth={2.75} data-icon="inline-start" />
          Saved words
        </Button>
      </div>
      {CONVEX_URL && (
        <p className="empty-account absolute inset-x-0 bottom-5 m-0 flex flex-wrap items-center justify-center gap-x-1.5 px-6 type-body-sm text-muted-foreground">
          <span className="truncate">{account ? `Signed in as ${account.email}` : "Guest"}</span>
          <span aria-hidden>·</span>
          <button className="font-extrabold text-harbour-ink hover:underline" onClick={() => (account ? signOut() : leaveGuest())}>
            {account ? "Sign out" : "Sign in"}
          </button>
        </p>
      )}
    </div>
  )
}

export default SidePanel
