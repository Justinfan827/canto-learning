/**
 * The pause popup: a small card over YouTube's sidebar with the paused line. Framed into the
 * YouTube tab by contents/passive-host.tsx, which only places and sizes it; this page decides
 * when it shows and tells the host. Being an extension page, it shares the side panel's
 * dictionary, saved words and local database.
 */
import { lineAt, lookup, regroup, senses, type LineWord } from "@pna/shared"
import { useEffect, useMemo, useRef, useState } from "react"

import { Icon } from "~components/Icon"
import { MomentCard, WordSheet } from "~components/Moment"
import { formatTime } from "~components/Ruby"
import { loadDict } from "~lib/dict"
import "~lib/fonts"
import { createLocalStore } from "~lib/localStore"
import { loadSettings, type Settings } from "~lib/settings"
import { speak } from "~lib/speech"
import { createTutor } from "~lib/tutor"
import { useDict } from "~lib/useDict"
import { useGroupings } from "~lib/useGroupings"
import { usePlayer } from "~lib/usePlayer"
import { useSaved } from "~lib/useSaved"
import { useTranscriber, type TranscriberStatus } from "~lib/useTranscriber"
import { useTutor } from "~lib/useTutor"

import "../style.css"

const store = createLocalStore()
// No AI here: the popup is for quick lookups. Explanations live in the side panel.
const tutor = createTutor(store, null, loadDict)
const PANEL_CHECK_MS = 2000

document.documentElement.dataset.theme = new URLSearchParams(location.search).get("theme") ?? ""

/** Tells the host whether to show the popup, and how tall its content is. */
function report(visible: boolean, height: number) {
  window.parent.postMessage({ source: "pna-passive", visible, height }, "https://www.youtube.com")
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

  const { state, seek, play, pause, setLocalCaptions } = usePlayer({ ownTab: true })
  const [windowId, setWindowId] = useState<number | null>(null)
  useEffect(() => {
    if (state.tabId != null) chrome.tabs.get(state.tabId).then((t) => setWindowId(t.windowId))
  }, [state.tabId])
  const [panelOpen, setPanelOpen] = usePanelOpen(windowId)

  const t = useTutor(tutor, state)
  const { dict, split } = useDict()
  const groupings = useGroupings()
  const saved = useSaved(store)
  // Keep transcribing while the video plays, so the line is there when it pauses.
  const tr = useTranscriber(state, settings?.transcribeEngine ?? "auto", setLocalCaptions, !panelOpen)

  const [focusIdx, setFocusIdx] = useState<number | null>(null)
  const [selWord, setSelWord] = useState<number | null>(null)
  const [loopIdx, setLoopIdx] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const current = lineAt(state.lines, state.timeMs)
  const focus = focusIdx ?? (current >= 0 ? current : null)

  const wordsOf = (text: string): LineWord[] =>
    groupings.map[text] && dict ? groupings.map[text].map((w) => lookup(w, dict)) : split(text)
  const line = focus != null ? state.lines[focus] : undefined
  const words = useMemo(() => (line ? wordsOf(line.text) : []), [line?.text, groupings.map, dict, split])
  const prev = focus != null && focus > 0 ? state.lines[focus - 1] : undefined

  // A pause opens the popup on the current line; playing closes it, unless it's looping.
  const wasPaused = useRef(state.paused)
  useEffect(() => {
    if (state.paused && !wasPaused.current) {
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

  const visible = !!settings?.pausePopup && !!state.video && !panelOpen && !dismissed && (state.paused || loopIdx != null)

  // Report visibility and content height to the host on every layout change.
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = box.current
    if (!el) return report(visible, 0)
    const send = () => report(visible, Math.ceil(el.getBoundingClientRect().height))
    send()
    const ro = new ResizeObserver(send)
    ro.observe(el)
    return () => ro.disconnect()
  }, [visible])

  const goTo = (idx: number) => {
    const l = state.lines[idx]
    if (!l) return
    setFocusIdx(idx)
    setSelWord(null)
    if (loopIdx != null) setLoopIdx(idx)
    seek(l.startMs)
  }

  // Keys once the popup has focus: Space resumes, arrows step lines, Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !visible) return
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

  if (!settings) return null
  const word = line && selWord != null ? words[selWord] : null

  return (
    <div ref={box} className={"pp size-" + settings.textSize} hidden={!visible}>
      <div className="pp-bar">
        <span className="pp-time">
          {loopIdx != null ? "Looping" : "Paused"} {line ? formatTime(line.startMs) : formatTime(state.timeMs)}
        </span>
        <span className="grow" />
        {line && (
          <>
            <button className="ib small" aria-label="Previous line" title="Previous line (↑)" disabled={!prev} onClick={() => goTo(focus! - 1)}>
              <Icon name="up" />
            </button>
            <button
              className="ib small"
              aria-label="Next line"
              title="Next line (↓)"
              disabled={focus! + 1 >= state.lines.length}
              onClick={() => goTo(focus! + 1)}
            >
              <Icon name="down" />
            </button>
          </>
        )}
        <button className="ib small" aria-label="Open transcript" title="Open the full transcript" onClick={openPanel}>
          <Icon name="panel" />
        </button>
        <button className="ib small" aria-label="Close" title="Close (Esc)" onClick={() => setDismissed(true)}>
          <Icon name="close" />
        </button>
      </div>

      {line ? (
        <>
          {prev && (
            <button className="pp-prev" lang="yue-Hant" onClick={() => goTo(focus! - 1)}>
              {prev.text}
            </button>
          )}
          <MomentCard
            words={words}
            startMs={line.startMs}
            english={null}
            inferred={false}
            showJyutping={settings.showJyutping}
            saved={saved.words}
            selected={selWord}
            looping={loopIdx === line.idx}
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
            onHear={(slow) => speak(line.text, { slow })}
            onLoop={() => {
              if (loopIdx === line.idx) {
                setLoopIdx(null)
                pause()
              } else {
                setLoopIdx(line.idx)
                seek(line.startMs)
                play()
              }
            }}
            onExplain={null}
          />
          {word ? (
            <WordSheet
              word={word}
              senses={dict ? senses(word.text, dict) : []}
              saved={saved.words.has(word.colloquial ?? word.text)}
              fromMs={line.startMs}
              onSave={async () => {
                await t.saveWord(word, line.idx)
                saved.refresh()
              }}
              onHear={() => speak(word.colloquial ?? word.text)}
              onClose={() => setSelWord(null)}
            />
          ) : (
            <p className="pp-hint">Tap a word to look it up</p>
          )}
        </>
      ) : (
        <NoLine status={tr.status} hasLines={state.lines.length > 0} onOpen={openPanel} />
      )}
    </div>
  )
}

function NoLine({ status, hasLines, onOpen }: { status: TranscriberStatus; hasLines: boolean; onOpen: () => void }) {
  const text = hasLines
    ? "Nothing has been said yet at this point."
    : status.kind === "running" || status.kind === "checking"
      ? "Transcribing this video on your computer. Lines appear here as they're ready."
      : status.kind === "missing" || status.kind === "no-engine"
        ? "This video has no Cantonese captions, and the local transcriber isn't set up."
        : status.kind === "error"
          ? status.message
          : "Looking for captions…"
  return (
    <div className="pp-empty">
      <p>{text}</p>
      {!hasLines && (status.kind === "missing" || status.kind === "no-engine" || status.kind === "error") && (
        <button className="link" onClick={onOpen}>
          Open the side panel
        </button>
      )}
    </div>
  )
}

export default PausePopup
