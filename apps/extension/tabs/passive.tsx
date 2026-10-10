/**
 * The pause popup: a small card over YouTube's sidebar with the paused line. Framed into the
 * YouTube tab by contents/passive-host.tsx, which only places and sizes it; this page decides
 * when it shows and tells the host. Being an extension page, it shares the side panel's
 * dictionary, saved words and local database.
 */
import { cn } from "cn"
import { examplesFor, lineAt, lookup, regroup, senses, type Examples, type LineWord } from "@pna/shared"
import { useEffect, useMemo, useRef, useState } from "react"

import { Icon } from "~components/Icon"
import { MomentCard, WordSheet } from "~components/Moment"
import { formatTime } from "~components/Ruby"
import { Button } from "~components/ui/button"
import { store } from "~lib/data"
import { loadExamples } from "~lib/dict"
import "~lib/fonts"
import { loadSettings, type Settings } from "~lib/settings"
import { speak } from "~lib/speech"
import { useDict } from "~lib/useDict"
import { useGroupings } from "~lib/useGroupings"
import { usePlayer } from "~lib/usePlayer"
import { useSaved } from "~lib/useSaved"
import { useSaveWord } from "~lib/useSaveWord"
import { useTranscriber, type TranscriberStatus } from "~lib/useTranscriber"
import { createWords } from "~lib/words"

import "../tailwind.css"

const wordLog = createWords(store)
const PANEL_CHECK_MS = 2000
/** Scroll distance per line step, and the pause after which a new scroll starts fresh. */
const WHEEL_STEP = 60
const WHEEL_RESET_MS = 250
const SEEK_SETTLE_MS = 300

const ytTheme = new URLSearchParams(location.search).get("theme") ?? ""
document.documentElement.dataset.theme = ytTheme
followYouTubeTheme(ytTheme)

/**
 * YouTube's own theme wins over the system one, but the design tokens (globals.css) follow the
 * system, and an iframe can't be told otherwise. So copy the light or dark token block onto
 * :root[data-theme], which outranks both.
 */
function followYouTubeTheme(theme: string) {
  if (theme !== "light" && theme !== "dark") return
  const blocks: string[] = []
  const take = (rules: CSSRuleList, inDark: boolean) => {
    for (const r of Array.from(rules)) {
      if (r instanceof CSSMediaRule) take(r.cssRules, inDark || r.conditionText.includes("prefers-color-scheme: dark"))
      else if (r instanceof CSSStyleRule && r.selectorText === ":root" && r.style.getPropertyValue("--primary") && inDark === (theme === "dark"))
        blocks.push(r.style.cssText)
    }
  }
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      take(sheet.cssRules, false)
    } catch {
      // A sheet from another origin (fonts); it has no tokens.
    }
  }
  const style = document.createElement("style")
  style.textContent = `:root[data-theme="${theme}"] { ${blocks.join(" ")} color-scheme: ${theme}; }`
  document.head.append(style)
}

type Mode = "none" | "card"

/**
 * The line card and word sheet are built for the side panel; in this small frame the card drops
 * its header and buttons (the bar below has them) and the sheet sits in place under the line
 * instead of sliding up over it.
 */
const HOSTED = cn(
  "[&_.moment]:m-0 [&_.moment_.acts]:hidden [&_.moment_.top]:hidden [&_.regroup-hint.muted-hint]:hidden",
  "[&_.scrim]:hidden [&_.sheet_.grab]:hidden",
  "[&_.sheet]:static [&_.sheet]:max-h-none [&_.sheet]:translate-y-0 [&_.sheet]:animate-none [&_.sheet]:overflow-visible [&_.sheet]:rounded-none [&_.sheet]:border-0 [&_.sheet]:bg-transparent [&_.sheet]:px-2 [&_.sheet]:pt-2 [&_.sheet]:pb-1 [&_.sheet]:shadow-none"
)

/** Tells the host what to show and how big it is. */
function report(mode: Mode, width: number, height: number) {
  window.parent.postMessage({ source: "pna-passive", mode, width, height }, "https://www.youtube.com")
}

/** Play state and card width straight from the host page, which sees the <video> directly. */
function useHost() {
  const [paused, setPaused] = useState<boolean | null>(null)
  const [cardWidth, setCardWidth] = useState<number | null>(null)
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== "https://www.youtube.com" || e.data?.source !== "pna-host") return
      if (typeof e.data.paused === "boolean") setPaused(e.data.paused)
      if (typeof e.data.cardWidth === "number") setCardWidth(e.data.cardWidth)
    }
    window.addEventListener("message", onMsg)
    return () => window.removeEventListener("message", onMsg)
  }, [])
  return { paused, cardWidth }
}

/** Whether the side panel is open in this tab's window; the popup stays out of its way. */
function usePanelOpen(windowId: number | null) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (windowId == null) return
    const check = () =>
      chrome.runtime
        .getContexts({ contextTypes: [chrome.runtime.ContextType.SIDE_PANEL] })
        .then((cs) => setOpen(cs.some((c) => c.windowId === windowId || c.windowId === -1)))
        .catch(() => setOpen(false))
    check()
    const t = window.setInterval(check, PANEL_CHECK_MS)
    return () => clearInterval(t)
  }, [windowId])
  return [open, setOpen] as const
}

function PausePopup() {
  const [settings, setSettings] = useState<Settings | null>(null)
  useEffect(() => {
    loadSettings().then(setSettings)
    const onChange = () => loadSettings().then(setSettings)
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const player = usePlayer({ ownTab: true })
  const { seek, play, pause, setLocalCaptions } = player
  const host = useHost()
  // The host's word on play and pause wins: it comes from the <video> itself.
  const state = useMemo(() => (host.paused == null ? player.state : { ...player.state, paused: host.paused }), [player.state, host.paused])
  const [windowId, setWindowId] = useState<number | null>(null)
  useEffect(() => {
    if (state.tabId != null) chrome.tabs.get(state.tabId).then((t) => setWindowId(t.windowId))
  }, [state.tabId])
  const [panelOpen, setPanelOpen] = usePanelOpen(windowId)

  const t = useSaveWord(wordLog, state)
  const { dict, split } = useDict()
  const groupings = useGroupings()
  const saved = useSaved(store)
  // Keep transcribing while the video plays, so the line is there when it pauses.
  const tr = useTranscriber(state, settings?.transcribeEngine ?? "auto", !!settings?.preferLocal, setLocalCaptions, !panelOpen)

  const [focusIdx, setFocusIdx] = useState<number | null>(null)
  const [selWord, setSelWord] = useState<number | null>(null)
  const [examples, setExamples] = useState<Examples | null>(null)
  useEffect(() => {
    if (selWord !== null && !examples) loadExamples().then(setExamples, (e) => console.warn(e))
  }, [selWord, examples])
  const [loopIdx, setLoopIdx] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const current = lineAt(state.lines, state.timeMs)
  const focus = focusIdx ?? (current >= 0 ? current : null)

  const wordsOf = (text: string): LineWord[] => (groupings.map[text] && dict ? groupings.map[text].map((w) => lookup(w, dict)) : split(text))
  const line = focus != null ? state.lines[focus] : undefined
  const words = useMemo(() => (line ? wordsOf(line.text) : []), [line?.text, groupings.map, dict, split])
  const prev = focus != null && focus > 0 ? state.lines[focus - 1] : undefined
  const [pausedAt, setPausedAt] = useState(0)

  // A pause opens the popup on the current line; playing closes it, unless it's looping.
  const wasPaused = useRef(state.paused)
  useEffect(() => {
    if (state.paused && !wasPaused.current) {
      setPausedAt(state.timeMs)
      setFocusIdx(current >= 0 ? current : null)
      setSelWord(null)
      setLoopIdx(null)
      setDismissed(false)
    } else if (!state.paused && wasPaused.current && loopIdx == null) {
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

  useEffect(() => {
    setFocusIdx(null)
    setSelWord(null)
    setLoopIdx(null)
  }, [state.video?.id])

  // Nothing at all while the video plays; the card only while paused (or looping a line).
  const mode: Mode = settings?.pausePopup && state.video && !panelOpen && ((state.paused && !dismissed) || loopIdx != null) ? "card" : "none"

  // Report the mode and the content's size to the host on every layout change.
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = box.current
    if (!el || mode === "none") return report("none", 0, 0)
    const send = () => {
      const r = el.getBoundingClientRect()
      report(mode, Math.ceil(r.width), Math.ceil(r.height))
    }
    send()
    const ro = new ResizeObserver(send)
    ro.observe(el)
    return () => ro.disconnect()
  }, [mode])

  // Stepping through lines moves the card at once; the video follows once the stepping stops.
  const seekTimer = useRef<number>()
  const goTo = (idx: number) => {
    const l = state.lines[idx]
    if (!l) return
    setFocusIdx(idx)
    setSelWord(null)
    if (loopIdx != null) setLoopIdx(idx)
    clearTimeout(seekTimer.current)
    seekTimer.current = window.setTimeout(() => seek(l.startMs), SEEK_SETTLE_MS)
  }

  // Scrolling over the card steps lines: up for earlier, down for later.
  const wheel = useRef({ acc: 0, last: 0 })
  const onWheel = (e: React.WheelEvent) => {
    if (focus == null) return
    const w = wheel.current
    const now = performance.now()
    if (now - w.last > WHEEL_RESET_MS) w.acc = 0
    w.last = now
    w.acc += e.deltaY
    if (Math.abs(w.acc) < WHEEL_STEP) return
    const step = w.acc < 0 ? -1 : 1
    w.acc = 0
    goTo(focus + step)
  }

  // Keys once the popup has focus: Space resumes, arrows step lines, Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || mode !== "card") return
      if (e.key === "Escape") {
        if (selWord != null) setSelWord(null)
        else setDismissed(true)
      } else if (e.code === "Space" || e.key === "k") {
        e.preventDefault()
        setLoopIdx(null)
        play()
      } else if (e.key === "ArrowUp" && focus != null) {
        e.preventDefault()
        goTo(focus - 1)
      } else if (e.key === "ArrowDown" && focus != null) {
        e.preventDefault()
        goTo(focus + 1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const openPanel = () => {
    if (state.tabId == null) return
    // Must run inside the click for Chrome to allow it.
    chrome.sidePanel.open({ tabId: state.tabId }).then(() => setPanelOpen(true), console.warn)
  }

  if (!settings || mode === "none") return null
  const word = line && selWord != null ? words[selWord] : null
  const looping = !!line && loopIdx === line.idx

  return (
    <div
      ref={box}
      className={cn("pp card size-" + settings.textSize, "grid gap-1 bg-background p-2 pb-0 font-sans text-body", HOSTED)}
      style={host.cardWidth ? { width: host.cardWidth } : undefined}
      onWheel={onWheel}>
      {line ? (
        <MomentCard
          words={words}
          startMs={line.startMs}
          showJyutping={settings.showJyutping}
          saved={saved.words}
          selected={selWord}
          looping={looping}
          onWord={(i) => setSelWord(selWord === i ? null : i)}
          regrouped={!!groupings.map[line.text]}
          onRegroup={(a, b) => {
            const next = regroup(
              words.map((w) => w.text),
              a,
              b
            )
            groupings.set(line.text, next)
            let at = 0
            setSelWord(next.findIndex((w) => (at += [...w].length) > Math.min(a, b)))
          }}
          onResetGrouping={() => {
            groupings.clear(line.text)
            setSelWord(null)
          }}
          onHear={() => {}}
          onLoop={() => {}}
        />
      ) : (
        <NoLine status={tr.status} hasLines={state.lines.length > 0} onOpen={openPanel} />
      )}

      <div className="pp-more grid gap-1">
        {word && (
          <WordSheet
            word={word}
            senses={dict ? senses(word.text, dict) : []}
            examples={examples ? examplesFor(typeof dict?.[word.text] === "string" ? (dict[word.text] as string) : word.text, examples) : null}
            onHearExample={(text) => speak(text)}
            saved={saved.words.has(word.colloquial ?? word.text)}
            from={{ ms: line!.startMs }}
            onSave={async () => {
              await t.saveWord(word, line!.idx)
              saved.refresh()
            }}
            onHear={() => speak(word.colloquial ?? word.text)}
            onClose={() => setSelWord(null)}
          />
        )}
        <div className="pp-bar -mx-2 flex items-center gap-0.5 border-t-2 border-border px-2 py-1.5">
          {line && (
            <>
              <BarButton aria-label="Hear it" title="Hear it" onClick={() => speak(line.text)}>
                <Icon name="sound" />
              </BarButton>
              <BarButton aria-label="Hear it slower" title="Hear it slower" onClick={() => speak(line.text, { slow: true })}>
                <Icon name="slow" />
              </BarButton>
              <BarButton
                aria-label={looping ? "Stop looping" : "Loop this line"}
                aria-pressed={looping}
                title={looping ? "Stop looping" : "Loop this line"}
                onClick={() => {
                  if (looping) {
                    setLoopIdx(null)
                    pause()
                  } else {
                    setLoopIdx(line.idx)
                    seek(line.startMs)
                    play()
                  }
                }}
              >
                <Icon name="loop" />
              </BarButton>
            </>
          )}
          <span
            className={cn(
              "pp-time ml-1 rounded-full px-2 py-1 type-body-sm font-bold text-muted-foreground tabular-nums",
              looping && "bg-jade-soft text-jade-pressed dark:text-jade"
            )}>
            {looping
              ? "Looping " + formatTime(line!.startMs)
              : focusIdx != null && focusIdx !== current
                ? formatTime(line?.startMs ?? 0)
                : formatTime(pausedAt)}
          </span>
          <span className="flex-1" />
          {line && (
            <>
              <BarButton aria-label="Previous line" title="Previous line (scroll up or ↑)" disabled={!prev} onClick={() => goTo(focus! - 1)}>
                <Icon name="up" />
              </BarButton>
              <BarButton
                aria-label="Next line"
                title="Next line (scroll down or ↓)"
                disabled={focus! + 1 >= state.lines.length}
                onClick={() => goTo(focus! + 1)}
              >
                <Icon name="down" />
              </BarButton>
            </>
          )}
          <BarButton aria-label="Open transcript" title="Open the full transcript" onClick={openPanel}>
            <Icon name="panel" />
          </BarButton>
          <BarButton aria-label="Close" title="Close (Esc)" onClick={() => setDismissed(true)}>
            <Icon name="close" />
          </BarButton>
        </div>
      </div>
    </div>
  )
}

/** A small icon button in the popup's bottom bar. Pressed (looping) shows in jade. */
function BarButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn(
        "text-muted-foreground hover:bg-surface hover:text-foreground aria-pressed:bg-jade-soft aria-pressed:text-jade-pressed disabled:opacity-35 dark:aria-pressed:text-jade [&_svg]:size-4",
        className
      )}
      {...props}
    />
  )
}

function NoLine({ status, hasLines, onOpen }: { status: TranscriberStatus; hasLines: boolean; onOpen: () => void }) {
  const text = hasLines
    ? "Nothing has been said yet at this point."
    : status.kind === "no-captions"
      ? "This video has no Cantonese or Chinese captions."
      : status.kind === "running" || status.kind === "checking"
      ? "Transcribing this video on your computer. Lines appear here as they're ready."
      : status.kind === "missing" || status.kind === "no-engine"
        ? "This video has no Cantonese captions, and the local transcriber isn't set up."
        : status.kind === "error"
          ? status.message
          : "Looking for captions…"
  return (
    <div className="pp-empty grid justify-items-start gap-2 px-2 pt-2 pb-2.5">
      <p className="m-0 type-body text-body">{text}</p>
      {!hasLines && (status.kind === "missing" || status.kind === "no-engine" || status.kind === "error") && (
        <Button variant="outline" size="sm" onClick={onOpen}>
          Open the side panel
        </Button>
      )}
    </div>
  )
}

export default PausePopup
