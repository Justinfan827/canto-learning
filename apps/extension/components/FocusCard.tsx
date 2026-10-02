import type { CaptionLine, ConvertedLine, LineWord } from "@pna/shared"
import { useState } from "react"

import { speak } from "~lib/speech"

import { LineText, type RegisterView } from "./Line"

const SUGGESTIONS = ["Explain this line", "What's the slang here?", "How would I write this?"]

export function FocusCard(props: {
  line: CaptionLine
  conv?: ConvertedLine
  view: RegisterView
  words: LineWord[] | "loading" | "error" | undefined
  onAsk: (q: string) => void
  onRetry: () => void
}) {
  const { line, conv, view, words, onAsk } = props
  const [open, setOpen] = useState<number | null>(null)
  const spoken = conv?.textColloquial ?? line.text

  return (
    <section className="focus">
      <div className="focus-line">
        <LineText line={line} conv={conv} view={view} />
        <button className="icon" title="Hear the line" onClick={() => speak(spoken)}>
          🔊
        </button>
      </div>
      {words === "loading" && <p className="muted">Splitting into words…</p>}
      {words === "error" && (
        <p className="muted">
          Couldn't split this line. <button className="link" onClick={props.onRetry}>Retry</button>
        </p>
      )}
      {Array.isArray(words) && (
        <div className="words">
          {words.map((w, i) => (
            <button key={i} className={"word" + (open === i ? " open" : "") + (w.likelyError ? " suspect" : "")} onClick={() => setOpen(open === i ? null : i)}>
              <span className="jp">{w.jyutping}</span>
              <span>{w.text}</span>
            </button>
          ))}
        </div>
      )}
      {Array.isArray(words) && open != null && words[open] && <WordCard w={words[open]} onAsk={onAsk} />}
      <div className="suggest">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="chip" onClick={() => onAsk(s)}>
            {s}
          </button>
        ))}
      </div>
    </section>
  )
}

function WordCard({ w, onAsk }: { w: LineWord; onAsk: (q: string) => void }) {
  return (
    <div className="wordcard">
      <div className="wc-head">
        <strong className="wc-word">{w.colloquial ?? w.text}</strong>
        <span className="jp">{w.jyutping}</span>
        <button className="icon" onClick={() => speak(w.colloquial ?? w.text)} title="Hear it">
          🔊
        </button>
        <button className="icon" onClick={() => speak(w.colloquial ?? w.text, { slow: true })} title="Say it slower">
          🐢
        </button>
      </div>
      <p>{w.meaning}</p>
      {w.formal && w.colloquial && w.formal !== w.colloquial && (
        <p className="muted">
          口語 {w.colloquial} · 書面語 {w.formal}
        </p>
      )}
      {w.likelyError && <p className="warn">Caption probably meant {w.likelyError}</p>}
      <button className="chip" onClick={() => onAsk(`Tell me more about ${w.colloquial ?? w.text}`)}>
        More about this word
      </button>
    </div>
  )
}
