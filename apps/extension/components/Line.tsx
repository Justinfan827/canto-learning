import { diffSegments, type CaptionLine, type ConvertedLine } from "@pna/shared"

export type RegisterView = "colloquial" | "formal"

/** One caption line in the chosen register, with words that differ from the other register highlighted. */
export function LineText({ line, conv, view }: { line: CaptionLine; conv?: ConvertedLine; view: RegisterView }) {
  if (!conv) return <span>{line.text}</span>
  const shown = (view === "colloquial" ? conv.textColloquial : conv.textFormal) ?? line.text
  const other = (view === "colloquial" ? conv.textFormal : conv.textColloquial) ?? line.text
  return (
    <span>
      {diffSegments(shown, other).map((s, i) => (s.changed ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>))}
      {view === "colloquial" && conv.colloquialInferred && (
        <span className="tag" title="Guessed from a formal-Chinese caption, not heard">
          inferred
        </span>
      )}
    </span>
  )
}

export function formatTime(ms: number) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, "0")
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`
}
