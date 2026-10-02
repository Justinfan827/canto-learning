import { lineAt } from "@pna/shared"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { FocusCard } from "~components/FocusCard"
import { formatTime, LineText, type RegisterView } from "~components/Line"
import { Markdown } from "~components/Markdown"
import { createLocalStore } from "~lib/localStore"
import { loadSettings, type Settings } from "~lib/settings"
import { listen, speak, speechSupported, type ListenLang } from "~lib/speech"
import { usePlayer } from "~lib/usePlayer"
import { claudeAi, createTutor } from "~lib/tutor"
import { useTutor } from "~lib/useTutor"

import "./style.css"

const LISTEN_SILENCE_MS = 8000
const store = createLocalStore()

function SidePanel() {
  const [settings, setSettings] = useState<Settings | null>(null)
  useEffect(() => {
    loadSettings().then(setSettings)
    const onChange = () => loadSettings().then(setSettings)
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])
  const tutor = useMemo(() => (settings?.apiKey ? createTutor(store, claudeAi(settings.apiKey)) : null), [settings?.apiKey])

  const { state, seek } = usePlayer()
  const t = useTutor(tutor, state)
  const [view, setView] = useState<RegisterView>("colloquial")
  const [focusIdx, setFocusIdx] = useState<number | null>(null)
  const [input, setInput] = useState("")
  const [listening, setListening] = useState(false)
  const [listenLang, setListenLang] = useState<ListenLang>("zh-HK")
  const [micError, setMicError] = useState<string | null>(null)
  const stopListening = useRef<(() => void) | null>(null)

  const current = lineAt(state.lines, state.timeMs)

  const ask = useCallback(
    (q: string) => {
      const question = q.trim()
      if (!question) return
      stopListening.current?.()
      setInput("")
      t.ask(question, focusIdx ?? current, (answer) => {
        if (settings?.speakAnswers) speak(answer.replace(/[*`#]/g, ""), { lang: "en-US" })
      })
    },
    [t, focusIdx, current, settings]
  )

  const startListening = useCallback(() => {
    if (!speechSupported() || listening) return
    setMicError(null)
    setListening(true)
    stopListening.current = listen({
      lang: listenLang,
      silenceMs: LISTEN_SILENCE_MS,
      onText: (t) => setInput(t),
      onDone: (err) => {
        setListening(false)
        stopListening.current = null
        if (err === "not-allowed") setMicError("Microphone blocked. Open setup to allow it.")
        else if (err && err !== "no-speech" && err !== "aborted") setMicError(`Voice input stopped: ${err}`)
        // Send what was heard; the user can edit and resend if it was misheard.
        setInput((t) => {
          if (t.trim() && !err) setTimeout(() => ask(t), 0)
          return t
        })
      }
    })
  }, [listening, listenLang, ask])

  // Pause: focus the current line, explain it, start listening. Play: collapse and stop.
  const wasPaused = useRef(state.paused)
  useEffect(() => {
    if (state.paused && !wasPaused.current && current >= 0) {
      setFocusIdx(current)
      t.explain(current)
      if (state.captionSource === "screen") t.convertAround(current).catch(() => {})
      startListening()
    } else if (!state.paused && wasPaused.current) {
      setFocusIdx(null)
      stopListening.current?.()
    }
    wasPaused.current = state.paused
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.paused])

  // Keep the current (or focused) line in view.
  const listRef = useRef<HTMLOListElement>(null)
  const scrollTo = focusIdx ?? current
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${scrollTo}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [scrollTo])

  const chatEnd = useRef<HTMLDivElement>(null)
  useEffect(() => chatEnd.current?.scrollIntoView({ block: "end" }), [t.chat])

  if (!settings) return null
  if (!tutor) return <Setup />
  if (!state.tabId) return <Empty text="Open a YouTube video in this window to start." />
  if (!state.video) return <Empty text="Waiting for the video… if this doesn't change, reload the YouTube tab." />

  const focusLine = focusIdx != null ? state.lines[focusIdx] : null

  return (
    <div className="panel">
      <header>
        <div className="title" title={state.video.title}>
          {state.video.title}
        </div>
        <div className="switch" role="group" aria-label="Register">
          <button className={view === "colloquial" ? "on" : ""} onClick={() => setView("colloquial")}>
            口語
          </button>
          <button className={view === "formal" ? "on" : ""} onClick={() => setView("formal")}>
            書面語
          </button>
        </div>
        <button className="icon" title="Settings" onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL("tabs/setup.html") })}>
          ⚙
        </button>
      </header>

      {t.error && (
        <div className="banner" onClick={t.clearError}>
          {t.error}
        </div>
      )}

      <ol className="transcript" ref={listRef}>
        {state.lines.length === 0 && (
          <li className="muted pad">
            {state.captionSource === "screen"
              ? "No caption file found. Reading captions from the screen as they appear."
              : state.tracks.length
                ? "Loading captions…"
                : "This video has no caption track. You can still type questions."}
          </li>
        )}
        {state.lines.map((l) => (
          <li
            key={l.idx}
            data-idx={l.idx}
            className={(l.idx === current ? "current " : "") + (l.idx === focusIdx ? "focused" : "")}
            onClick={() => {
              seek(l.startMs)
              if (state.paused) {
                setFocusIdx(l.idx)
                t.explain(l.idx)
              }
            }}>
            <span className="ts">{formatTime(l.startMs)}</span>
            <LineText line={l} conv={t.converted[l.idx]} view={view} />
          </li>
        ))}
      </ol>

      {focusLine && (
        <FocusCard
          line={focusLine}
          conv={t.converted[focusLine.idx]}
          view={view}
          words={t.explained[focusLine.idx]}
          onAsk={ask}
          onRetry={() => t.explain(focusLine.idx, true)}
        />
      )}

      {t.chat.length > 0 && (
        <section className="chat">
          {t.chat.map((m, i) => (
            <div key={i} className={`msg ${m.role}` + (m.error ? " error" : "")}>
              {m.role === "assistant" ? <Markdown text={m.content || "…"} /> : m.content}
            </div>
          ))}
          {t.logged.length > 0 && <div className="logged">Added to your words: {[...new Set(t.logged)].join("、")}</div>}
          <div ref={chatEnd} />
        </section>
      )}

      <footer className="voice">
        {speechSupported() && (
          <>
            <button
              className={"mic" + (listening ? " live" : "")}
              title={listening ? "Stop listening" : "Ask by voice"}
              onClick={() => (listening ? stopListening.current?.() : startListening())}>
              {listening ? "●" : "🎤"}
            </button>
            <button className="lang" title="Voice input language" onClick={() => setListenLang(listenLang === "zh-HK" ? "en-US" : "zh-HK")}>
              {listenLang === "zh-HK" ? "粵" : "EN"}
            </button>
          </>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(input)
          }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? "Listening…" : state.paused ? "Ask about this moment" : "Pause to ask"}
          />
        </form>
      </footer>
      {micError && (
        <div className="banner" onClick={() => setMicError(null)}>
          {micError}
        </div>
      )}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>
}

function Setup() {
  return (
    <div className="empty">
      <p>Add your Claude API key to get started.</p>
      <button className="primary" onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL("tabs/setup.html") })}>
        Open setup
      </button>
    </div>
  )
}

export default SidePanel
