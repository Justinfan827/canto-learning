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
/** Where the paused card moves while the word sheet covers the bottom of the panel. */
const RAISED = 0.1
/** After the user scrolls, leave the list alone for this long. */
const USER_SCROLL_MS = 4000

/**
 * The read-along transcript: the current line large with Jyutping, past lines faded above, upcoming
 * lines grey below. Click a line to jump there. Highlighting is per line, not per word: caption and
 * Whisper timings are only reliable at the line level.
 *
 * When paused, the focused line opens into `card` where it stands, its text kept at the same height,
 * so pausing and playing don't move what you're reading.
 */
export function Lyrics(props: {
  lines: LyricLine[]
  current: number
  showJyutping: boolean
  onSeek: (line: LyricLine) => void
  head?: ReactNode
  tail?: ReactNode
  empty?: ReactNode
  /** The paused line, shown as `card` in place of its line. */
  focus?: number | null
  card?: ReactNode
  /** Move the card up, clear of the word sheet. */
  raised?: boolean
}) {
  const { lines, focus = null, raised = false } = props
  const current = focus ?? props.current
  const box = useRef<HTMLDivElement>(null)
  const userScrolledAt = useRef(0)
  const userScrolled = () => Date.now() - userScrolledAt.current < USER_SCROLL_MS

  /** Scrolls so line `idx` (the card's text, when it's open) sits `anchor` of the way down. */
  const scrollTo = (idx: number, anchor: number, smooth: boolean) => {
    const b = box.current
    const row = b?.querySelector<HTMLElement>(`[data-idx="${idx}"]`)
    const el = row?.querySelector<HTMLElement>("[data-anchor]") ?? row
    if (!b || !el) return
    const top = b.scrollTop + el.getBoundingClientRect().top - b.getBoundingClientRect().top - b.clientHeight * anchor
    b.scrollTo({ top, behavior: smooth ? "smooth" : "auto" })
  }

  // Playing: follow the current line.
  const first = useRef(true)
  useLayoutEffect(() => {
    if (focus != null || userScrolled()) return
    scrollTo(current, ANCHOR, !first.current)
    first.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, lines.length, props.showJyutping])

  // Pausing swaps the line for its card. Nothing above it changes, so the card starts where the line
  // did; scrolling by the card's header keeps the text exactly where it was. Playing undoes it.
  const prev = useRef({ focus, raised })
  /** How far the card's text sits below its top, and the scroll position before the word sheet raised it. */
  const shift = useRef({ header: 0, beforeRaise: 0 })
  useLayoutEffect(() => {
    const b = box.current
    const was = prev.current
    prev.current = { focus, raised }
    if (!b || (was.focus === focus && was.raised === raised)) return
    if (focus != null && was.focus == null) {
      const row = b.querySelector<HTMLElement>(`[data-idx="${focus}"]`)
      const text = row?.querySelector<HTMLElement>("[data-anchor]")
      shift.current.header = row && text ? text.getBoundingClientRect().top - row.getBoundingClientRect().top : 0
      b.scrollTop += shift.current.header
    } else if (focus == null && was.focus != null) {
      b.scrollTop -= shift.current.header
    } else if (focus != null && raised && !was.raised) {
      shift.current.beforeRaise = b.scrollTop
      const row = b.querySelector<HTMLElement>(`[data-idx="${focus}"]`)
      if (row) b.scrollTo({ top: b.scrollTop + row.getBoundingClientRect().top - b.getBoundingClientRect().top - b.clientHeight * RAISED, behavior: "smooth" })
    } else if (focus != null && !raised && was.raised) {
      b.scrollTo({ top: shift.current.beforeRaise, behavior: "smooth" })
    } else if (focus != null) scrollTo(focus, ANCHOR, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, raised])

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
      {lines.map((l) =>
        l.idx === focus && props.card ? (
          <div key={l.idx} className="ln-card" data-idx={l.idx}>
            {props.card}
          </div>
        ) : (
          <Line
            key={l.idx}
            line={l}
            state={l.idx === current ? "now" : current >= 0 && l.idx < current ? "past" : "next"}
            showJyutping={props.showJyutping}
            onSeek={props.onSeek}
          />
        )
      )}
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
