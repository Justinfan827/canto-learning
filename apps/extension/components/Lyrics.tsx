import { wordIndexAt, type LineWord } from "@pna/shared"
import { memo, useEffect, useLayoutEffect, useRef, type ReactNode } from "react"

import { Ruby } from "./Ruby"

export interface LyricLine {
  idx: number
  startMs: number
  endMs: number
  words: LineWord[]
  english: string | null
}

/** Where the current line sits, as a share of the panel's height. */
const ANCHOR = 0.36
/** After the user scrolls, leave the list alone for this long. */
const USER_SCROLL_MS = 4000

/**
 * The read-along transcript: the current line large with Jyutping and the spoken word in the accent
 * colour, past lines faded above, upcoming lines grey below. Click a line to jump there.
 */
export function Lyrics(props: {
  lines: LyricLine[]
  current: number
  timeMs: number
  showJyutping: boolean
  showEnglish: boolean
  onSeek: (line: LyricLine) => void
  head?: ReactNode
  tail?: ReactNode
  empty?: ReactNode
}) {
  const { lines, current } = props
  const box = useRef<HTMLDivElement>(null)
  const userScrolledAt = useRef(0)

  const now = lines[current]
  const curWord = now
    ? wordIndexAt(
        now.words.map((w) => w.text),
        now.startMs,
        now.endMs,
        props.timeMs
      )
    : -1

  const scrollToCurrent = (smooth: boolean) => {
    const el = box.current?.querySelector<HTMLElement>(`[data-idx="${current}"]`)
    if (!el || !box.current) return
    const top = el.offsetTop - box.current.clientHeight * ANCHOR
    box.current.scrollTo({ top, behavior: smooth ? "smooth" : "auto" })
  }
  const first = useRef(true)
  useLayoutEffect(() => {
    if (Date.now() - userScrolledAt.current < USER_SCROLL_MS) return
    scrollToCurrent(!first.current)
    first.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, lines.length, props.showJyutping])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const mark = () => (userScrolledAt.current = Date.now())
    el.addEventListener("wheel", mark, { passive: true })
    el.addEventListener("touchmove", mark, { passive: true })
    return () => {
      el.removeEventListener("wheel", mark)
      el.removeEventListener("touchmove", mark)
    }
  }, [])

  return (
    <div className="lyrics" ref={box}>
      <div className="lyrics-pad" />
      {props.head}
      {lines.length === 0 && props.empty}
      {lines.map((l) => (
        <Line
          key={l.idx}
          line={l}
          state={l.idx === current ? "now" : current >= 0 && l.idx < current ? "past" : "next"}
          cur={l.idx === current ? curWord : -1}
          showJyutping={props.showJyutping}
          english={l.idx === current && props.showEnglish ? l.english : null}
          onSeek={props.onSeek}
        />
      ))}
      {props.tail}
      <div className="lyrics-pad" />
    </div>
  )
}

const Line = memo(function Line(props: {
  line: LyricLine
  state: "past" | "now" | "next"
  cur: number
  showJyutping: boolean
  english: string | null
  onSeek: (line: LyricLine) => void
}) {
  const { line, state, cur } = props
  return (
    <div className={"ln " + state} data-idx={line.idx} role="button" tabIndex={-1} onClick={() => props.onSeek(line)}>
      <span className="ln-text" lang="yue-Hant">
        {line.words.map((w, i) => (
          <span key={i} className={"w" + (i === cur ? " cur" : "")}>
            {/* Only the current line gets Jyutping; the others stay plain so they're easy to scan. */}
            <Ruby text={w.text} jyutping={w.jyutping} show={props.showJyutping && state === "now"} />
          </span>
        ))}
      </span>
      {props.english && <span className="en">{props.english}</span>}
    </div>
  )
})
