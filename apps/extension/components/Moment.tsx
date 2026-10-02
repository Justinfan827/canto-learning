import type { LineWord, Sense, TaughtWord } from "@pna/shared"
import { useEffect, useRef, useState } from "react"

import type { ChatMessage } from "~lib/useTutor"

import { Icon } from "./Icon"
import { Markdown } from "./Markdown"
import { formatTime, Ruby } from "./Ruby"

const isWord = (w: LineWord) => /[\p{L}\p{N}]/u.test(w.text)

/** The paused line, lifted into a card with tappable dictionary words. */
export function MomentCard(props: {
  words: LineWord[]
  startMs: number
  english: string | null
  inferred: boolean
  showJyutping: boolean
  saved: Set<string>
  selected: number | null
  looping: boolean
  onWord: (i: number) => void
  onHear: (slow: boolean) => void
  onLoop: () => void
  onExplain: (() => void) | null
}) {
  const { words, saved, selected } = props
  return (
    <section className="moment" aria-label="Paused line">
      <div className="top">
        <Icon name={props.looping ? "loop" : "pause"} />
        <span>
          {props.looping ? "Looping" : "Paused at"} {formatTime(props.startMs)}
        </span>
        <span className="grow" />
        {props.inferred && <span title="The caption was written Chinese; the spoken words are a guess">Spoken form inferred</span>}
      </div>
      <div className="big" lang="yue-Hant">
        {words.map((w, i) =>
          isWord(w) ? (
            <button
              key={i}
              className={"chip-w " + (selected === i ? "sel" : saved.has(w.colloquial ?? w.text) ? "saved" : "tap")}
              aria-pressed={selected === i}
              onClick={() => props.onWord(i)}
            >
              <Ruby text={w.text} jyutping={w.jyutping} show={props.showJyutping} />
            </button>
          ) : (
            <span key={i}>{w.text}</span>
          )
        )}
      </div>
      {props.english && <div className="en">{props.english}</div>}
      <div className="acts">
        <button className="act" onClick={() => props.onHear(false)}>
          <Icon name="sound" />
          Hear
        </button>
        <button className="act" onClick={() => props.onHear(true)}>
          <Icon name="slow" />
          Slower
        </button>
        <button className={"act" + (props.looping ? " on" : "")} aria-pressed={props.looping} onClick={props.onLoop}>
          <Icon name="loop" />
          {props.looping ? "Stop loop" : "Loop"}
        </button>
        {props.onExplain && (
          <button className="act ai" onClick={props.onExplain}>
            <Icon name="spark" />
            Explain
          </button>
        )}
      </div>
    </section>
  )
}

/** A bottom sheet with a word's dictionary senses and a Save button. */
export function WordSheet(props: {
  word: LineWord
  senses: Sense[]
  saved: boolean
  fromMs: number
  onSave: () => void
  onHear: () => void
  onClose: () => void
}) {
  const { word, senses } = props
  const head = word.colloquial ?? word.text
  const formal = word.formal ?? senses.find((s) => s.formal)?.formal ?? null
  const sheet = useRef<HTMLDivElement>(null)
  useEffect(() => sheet.current?.focus(), [word])
  return (
    <>
      <div className="scrim" onClick={props.onClose} />
      <div className="sheet" role="dialog" aria-label={`${head} in the dictionary`} tabIndex={-1} ref={sheet}>
        <button className="grab" aria-label="Close" onClick={props.onClose} />
        <div className="dhead">
          <span className="hz" lang="yue-Hant">
            {head}
          </span>
          <span className="jp">{word.jyutping}</span>
          <button className="ib small" aria-label="Hear it" title="Hear it" onClick={props.onHear}>
            <Icon name="sound" />
          </button>
          <span className="grow" />
          <button className={"save" + (props.saved ? " done" : "")} disabled={props.saved} onClick={props.onSave}>
            <Icon name={props.saved ? "starFill" : "star"} />
            {props.saved ? "Saved" : "Save"}
          </button>
        </div>
        {senses.length ? (
          <ol className="senses">
            {senses.map((s, i) => (
              <li key={i}>
                {s.gloss}
                {s.jyutping !== word.jyutping && <span className="sj"> {s.jyutping}</span>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">Not in the dictionary.</p>
        )}
        {formal && (
          <div className="reg" lang="yue-Hant">
            <span>
              Spoken <b>{head}</b>
            </span>
            <span>
              Written <b>{formal}</b>
            </span>
          </div>
        )}
        <div className="src">
          <span>CC-Canto · offline</span>
          <span>from {formatTime(props.fromMs)}</span>
        </div>
      </div>
    </>
  )
}

/** The tutor's answers for one paused line, with Save chips for the words they taught. */
export function Thread(props: { messages: ChatMessage[]; saved: Set<string>; onSave: (w: TaughtWord) => void; onAsk: (q: string) => void }) {
  const end = useRef<HTMLDivElement>(null)
  const last = props.messages[props.messages.length - 1]
  useEffect(() => end.current?.scrollIntoView({ block: "nearest" }), [props.messages.length, last?.content])
  return (
    <div className="answer" aria-live="polite">
      {props.messages.map((m) =>
        m.role === "user" ? (
          <div key={m.id} className="q">
            {m.content}
          </div>
        ) : (
          <div key={m.id} className={"a" + (m.error ? " error" : "")}>
            {m.content ? <Markdown text={m.content} /> : <span className="typing" aria-label="Thinking" />}
            {!!m.taught?.length && (
              <div className="follow">
                {m.taught.map((w) => {
                  const saved = props.saved.has(w.colloquial)
                  return (
                    <button key={"s" + w.colloquial} className={"act" + (saved ? " done" : "")} disabled={saved} onClick={() => props.onSave(w)}>
                      <Icon name={saved ? "starFill" : "star"} />
                      {saved ? "Saved" : "Save"} <span lang="yue-Hant">{w.colloquial}</span>
                    </button>
                  )
                })}
                {m.taught.slice(0, 1).map((w) => (
                  <button key={"m" + w.colloquial} className="act" onClick={() => props.onAsk(`Other uses of ${w.colloquial}?`)}>
                    Other uses of <span lang="yue-Hant">{w.colloquial}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      )}
      <div ref={end} />
    </div>
  )
}

/** Bottom of the panel: a pause hint while playing; the ask bar (or a note about the tutor) when paused. */
export function Dock(props: {
  mode: "watching" | "ask" | "no-tutor"
  listening: boolean
  canListen: boolean
  onListen: () => void
  onAsk: (q: string) => void
  onSetup: () => void
  input: string
  setInput: (s: string) => void
  error: string | null
  onClearError: () => void
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="dock">
      {props.error && (
        <button className="inline-error" onClick={props.onClearError}>
          {props.error}
        </button>
      )}
      {props.mode === "watching" && (
        <div className="hint">
          Pause the video to ask <kbd>Space</kbd>
        </div>
      )}
      {props.mode === "no-tutor" && (
        <div className="offnote">
          <Icon name="lock" />
          <span>
            Tap any word for its meaning. Want explanations?{" "}
            <button className="link" onClick={props.onSetup}>
              Add a tutor
            </button>
          </span>
        </div>
      )}
      {props.mode === "ask" && (
        <form
          className={"ask" + (focused ? " focus" : "")}
          onSubmit={(e) => {
            e.preventDefault()
            props.onAsk(props.input)
          }}
        >
          <input
            value={props.input}
            onChange={(e) => props.setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={props.listening ? "Listening…" : "Ask about this line…"}
            aria-label="Ask about this line"
          />
          {props.input.trim() && !props.listening ? (
            <button className="mic" type="submit" aria-label="Send">
              <Icon name="send" />
            </button>
          ) : (
            props.canListen && (
              <button
                type="button"
                className={"mic" + (props.listening ? " live" : "")}
                aria-label={props.listening ? "Stop listening" : "Ask by voice"}
                onClick={props.onListen}
              >
                <Icon name="mic" />
              </button>
            )
          )}
        </form>
      )}
    </div>
  )
}
