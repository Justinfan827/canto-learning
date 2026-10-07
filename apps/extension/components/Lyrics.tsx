import type { LineWord } from "@pna/shared"
import { memo, useEffect, useLayoutEffect, useRef, type ReactNode } from "react"

import { Ruby } from "./Ruby"

export interface LyricLine {
  idx: number
  startMs: number
  endMs: number
  words: LineWord[]
}

/** Where the current line sits, as a share of the panel's height. */
const ANCHOR = 0.36
/** After the user scrolls, leave the list alone for this long. */
const USER_SCROLL_MS = 4000

/**
 * The read-along transcript: the current line large with Jyutping, past lines faded above, upcoming
 * lines grey below. Click a line to jump there. Highlighting is per line, not per word: caption and
 * Whisper timings are only reliable at the line level.
 */
export function Lyrics(props: {
  lines: LyricLine[]
  current: number
  showJyutping: boolean
  onSeek: (line: LyricLine) => void
  head?: ReactNode
  tail?: ReactNode
  empty?: ReactNode
}) {
  const { lines, current } = props
  const box = useRef<HTMLDivElement>(null)
  const userScrolledAt = useRef(0)

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
          showJyutping={props.showJyutping}
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
  showJyutping: boolean
  onSeek: (line: LyricLine) => void
}) {
  const { line, state } = props
  return (
    <div className={"ln " + state} data-idx={line.idx} role="button" tabIndex={-1} onClick={() => props.onSeek(line)}>
      <span className="ln-text" lang="yue-Hant">
        {line.words.map((w, i) => (
          <span key={i} className="w">
            {/* Only the current line gets Jyutping; the others stay plain so they're easy to scan. */}
            <Ruby text={w.text} jyutping={w.jyutping} show={props.showJyutping && state === "now"} />
          </span>
        ))}
      </span>
    </div>
  )
})
