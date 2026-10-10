import type { Example, LineWord, Sense } from "@pna/shared"
import { cn } from "cn"
import { Check, CircleAlert } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "~components/ui/button"
import { Kbd } from "~components/ui/kbd"

import { Icon } from "./Icon"
import { formatTime, Ruby } from "./Ruby"

const isWord = (w: LineWord) => /[\p{L}\p{N}]/u.test(w.text)

/*
 * These components also render inside the pause popup (tabs/passive.tsx, under `.pp`), which
 * hides the card's header and actions and puts the word sheet inline under the line. Those
 * popup rules use `in-[.pp]:` here, since utilities outrank the legacy `.pp …` rules in style.css.
 */

/** Word tiles (DESIGN.md › Card / word tile): 2px border, 4px lip, harbour-blue Jyutping. */
const tile = {
  base: "chip-w inline-block cursor-pointer rounded-md border-2 border-b-4 px-1.5 pt-0.5 font-[inherit] leading-[inherit] transition-[background-color,border-color,transform] duration-75 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&_rt]:pb-0.5 [&_rt]:text-[11px] [&_rt]:leading-none",
  tap: "tap border-border bg-card text-foreground hover:bg-muted [&_rt]:text-harbour-ink",
  saved: "saved border-jade/60 bg-card text-jade-pressed hover:bg-jade-soft dark:text-jade [&_rt]:text-jade-pressed dark:[&_rt]:text-jade",
  sel: "sel border-jade bg-jade-soft text-jade-pressed dark:text-jade [&_rt]:text-jade-pressed dark:[&_rt]:text-jade",
  drag: "drag border-gold bg-gold-soft text-gold-ink [&_rt]:text-gold-ink",
}

/** The paused line, lifted into a card with tappable dictionary words. */
export function MomentCard(props: {
  words: LineWord[]
  startMs: number
  showJyutping: boolean
  saved: Set<string>
  selected: number | null
  looping: boolean
  onWord: (i: number) => void
  /** True when the user has fixed this line's word grouping. */
  regrouped: boolean
  /** Make characters [a, b) of the line one word. */
  onRegroup: (a: number, b: number) => void
  onResetGrouping: () => void
  onHear: (slow: boolean) => void
  onLoop: () => void
}) {
  const { words, saved, selected } = props
  // Character offset where each word starts, for drag-to-regroup.
  const starts: number[] = []
  words.reduce((n, w) => (starts.push(n), n + [...w.text].length), 0)
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null)

  /** The character under the pointer: the word under it, then how far across that word. */
  const charAt = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-wi]")
    if (!el) return null
    const wi = Number(el.dataset.wi)
    const len = [...words[wi].text].length
    const r = el.getBoundingClientRect()
    return starts[wi] + Math.min(len - 1, Math.max(0, Math.floor(((x - r.left) / r.width) * len)))
  }
  const range = drag ? [Math.min(drag.from, drag.to), Math.max(drag.from, drag.to) + 1] : null
  const dragged = range ? [...words.map((w) => w.text).join("")].slice(range[0], range[1]).join("") : ""

  return (
    <section
      className="moment m-0 grid gap-3 rounded-xl border-2 border-b-4 border-border bg-card p-4 font-sans text-card-foreground *:min-w-0 in-[.pp]:gap-2.5 in-[.pp]:border-0 in-[.pp]:bg-transparent in-[.pp]:px-2.5 in-[.pp]:pt-2 in-[.pp]:pb-1"
      aria-label="Paused line">
      <div
        className={cn(
          "top flex items-center gap-2 type-eyebrow in-[.pp]:hidden",
          props.looping ? "text-jade-pressed dark:text-jade" : "text-muted-foreground"
        )}>
        <span
          className={cn(
            "grid size-6 place-items-center rounded-md [&_svg]:size-3",
            props.looping ? "bg-jade-soft text-jade-pressed dark:text-jade" : "bg-primary-soft text-primary"
          )}>
          <Icon name={props.looping ? "loop" : "pause"} />
        </span>
        <span className="tabular-nums">
          {props.looping ? "Looping" : "Paused at"} {formatTime(props.startMs)}
        </span>
      </div>
      <div
        className="big flex touch-none flex-wrap items-end gap-x-1.5 gap-y-2 font-zh text-[length:var(--card-size)] leading-[1.3] font-bold select-none"
        data-anchor
        lang="yue-Hant"
        onPointerDown={(e) => {
          const c = charAt(e.clientX, e.clientY)
          if (c == null) return
          e.currentTarget.setPointerCapture(e.pointerId)
          setDrag({ from: c, to: c })
        }}
        onPointerMove={(e) => {
          if (!drag) return
          const c = charAt(e.clientX, e.clientY)
          if (c != null && c !== drag.to) setDrag({ ...drag, to: c })
        }}
        onPointerUp={() => {
          if (!drag || !range) return
          setDrag(null)
          const wi = starts.findIndex((s, i) => s === range[0] && s + [...words[i].text].length === range[1])
          // A tap, or a drag over exactly one word, opens it; anything else regroups.
          if (drag.from === drag.to) {
            const i = starts.findLastIndex((s) => s <= drag.from)
            props.onWord(i)
          } else if (wi >= 0) props.onWord(wi)
          else props.onRegroup(range[0], range[1])
        }}
        onPointerCancel={() => setDrag(null)}>
        {words.map((w, i) =>
          isWord(w) ? (
            <button
              key={i}
              data-wi={i}
              className={cn(
                tile.base,
                range && starts[i] < range[1] && starts[i] + [...w.text].length > range[0]
                  ? tile.drag
                  : selected === i
                    ? tile.sel
                    : saved.has(w.colloquial ?? w.text)
                      ? tile.saved
                      : tile.tap
              )}
              aria-pressed={selected === i}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), props.onWord(i))}>
              <Ruby text={w.text} jyutping={w.jyutping} show={props.showJyutping} />
            </button>
          ) : (
            <span key={i} className="pb-1.5 text-muted-foreground">
              {w.text}
            </span>
          )
        )}
      </div>
      {drag && dragged.length > 1 ? (
        <div className="regroup-hint -mt-1 type-body-sm text-gold-ink">
          Group as{" "}
          <b className="font-zh font-bold text-foreground" lang="yue-Hant">
            {dragged}
          </b>
        </div>
      ) : props.regrouped ? (
        <div className="regroup-hint -mt-1 type-body-sm text-muted-foreground">
          You regrouped this line.{" "}
          <button className="link cursor-pointer font-extrabold text-harbour-ink hover:underline" onClick={props.onResetGrouping}>
            Undo
          </button>
        </div>
      ) : (
        <div className="regroup-hint muted-hint -mt-1 type-body-sm text-muted-foreground/80 in-[.pp]:hidden">
          Drag across characters to group them differently.
        </div>
      )}
      <div className="acts flex flex-wrap gap-2 pb-1 in-[.pp]:hidden">
        <Button variant="outline" size="sm" className="act flex-1" onClick={() => props.onHear(false)}>
          <Icon name="sound" />
          Hear
        </Button>
        <Button variant="outline" size="sm" className="act flex-1" onClick={() => props.onHear(true)}>
          <Icon name="slow" />
          Slower
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "act flex-1",
            props.looping && "on border-jade bg-jade-soft text-jade-pressed [--lip:var(--brand-jade)] hover:bg-jade-soft dark:text-jade"
          )}
          aria-pressed={props.looping}
          onClick={props.onLoop}>
          <Icon name="loop" />
          {props.looping ? "Stop loop" : "Loop"}
        </Button>
      </div>
    </section>
  )
}

/** A bottom sheet with a word's dictionary senses, example sentences and a Save button. */
export function WordSheet(props: {
  word: LineWord
  senses: Sense[]
  /** Example sentences that use the word, or null while they load. */
  examples: Example[] | null
  onHearExample: (text: string) => void
  saved: boolean
  /** Where the word was heard: a timestamp, or a link back to the video when opened from Saved words. */
  from: { ms: number; title?: string; onOpen?: () => void } | null
  onSave: () => void
  onHear: () => void
  onClose: () => void
}) {
  const { word, senses } = props
  const head = word.colloquial ?? word.text
  const formal = word.formal ?? senses.find((s) => s.formal)?.formal ?? null
  const sheet = useRef<HTMLDivElement>(null)
  // The word saved from this sheet, for the "Saved!" moment (not shown for words saved earlier).
  const [justSaved, setJustSaved] = useState<string | null>(null)
  // preventScroll: focusing would otherwise scroll the view behind the sheet.
  useEffect(() => sheet.current?.focus({ preventScroll: true }), [word])
  const cheer = props.saved && justSaved === head
  return (
    <>
      <div
        className="scrim absolute inset-0 z-3 bg-[linear-gradient(transparent_30%,rgb(42_33_28/0.18))] [animation:fade_0.12s_ease-out] in-[.pp]:hidden"
        onClick={props.onClose}
      />
      <div
        className="sheet absolute inset-x-0 bottom-0 z-4 grid max-h-[70vh] gap-3.5 overflow-y-auto rounded-t-2xl border-t-2 border-border bg-popover px-4 pt-2 pb-4 font-sans text-popover-foreground shadow-[0_-14px_32px_-12px_rgb(42_33_28/0.28)] outline-none [animation:fade_0.12s_ease-out] in-[.pp]:static in-[.pp]:max-h-none in-[.pp]:gap-3 in-[.pp]:overflow-visible in-[.pp]:rounded-none in-[.pp]:border-0 in-[.pp]:bg-transparent in-[.pp]:px-2.5 in-[.pp]:pt-1 in-[.pp]:pb-0 in-[.pp]:shadow-none in-[.pp]:[animation:none]"
        role="dialog"
        aria-label={`${head} in the dictionary`}
        tabIndex={-1}
        ref={sheet}>
        <button className="grab mx-auto h-1.5 w-10 cursor-pointer rounded-full bg-border hover:bg-faint in-[.pp]:hidden" aria-label="Close" onClick={props.onClose} />
        <div className="dhead flex items-center gap-3">
          <Button
            size="icon"
            className="size-11 rounded-lg bg-harbour text-white [--lip:var(--harbour-pressed)] dark:text-background [&_svg]:size-5"
            aria-label="Hear it"
            title="Hear it"
            onClick={props.onHear}>
            <Icon name="sound" />
          </Button>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="jp pb-0 font-sans text-sm leading-none font-extrabold text-harbour-ink">{word.jyutping}</span>
            <span className="hz font-zh text-[34px] leading-none font-bold break-all text-foreground" lang="yue-Hant">
              {head}
            </span>
          </div>
          <Button
            variant={props.saved ? "jade" : "default"}
            className={cn("save ml-auto self-center disabled:opacity-100 [&_svg]:size-4", props.saved && "done")}
            disabled={props.saved}
            onClick={() => {
              setJustSaved(head)
              props.onSave()
            }}>
            <Icon name={props.saved ? "starFill" : "star"} />
            {props.saved ? "Saved" : "Save"}
          </Button>
        </div>
        {cheer && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl bg-jade-soft px-3.5 py-3 text-jade-pressed [animation:fade_0.2s_ease-out] dark:text-jade">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-jade text-white shadow-[0_3px_0_var(--brand-jade-pressed)] dark:text-background">
              <Check className="size-5" strokeWidth={3.5} aria-hidden />
            </span>
            <div className="grid gap-0.5">
              <b className="type-title">Saved!</b>
              <span className="type-body-sm text-body">Nice find. It's in your saved words to review.</span>
            </div>
          </div>
        )}
        {senses.length ? (
          <ol className="senses m-0 grid list-decimal gap-1 pl-6 type-body text-foreground marker:font-sans marker:text-sm marker:font-extrabold marker:text-muted-foreground">
            {senses.map((s, i) => (
              <li key={i} className="pl-1">
                {s.gloss}
                {s.jyutping !== word.jyutping && <span className="sj font-sans text-xs font-bold text-muted-foreground"> {s.jyutping}</span>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted m-0 type-body text-muted-foreground">Not in the dictionary.</p>
        )}
        {formal && (
          <div className="reg flex flex-wrap gap-2 type-body-sm text-muted-foreground" lang="yue-Hant">
            <span className="rounded-md border-2 border-border px-2.5 py-1 font-sans">
              Spoken <b className="font-zh font-bold text-foreground">{head}</b>
            </span>
            <span className="rounded-md border-2 border-border px-2.5 py-1 font-sans">
              Written <b className="font-zh font-bold text-foreground">{formal}</b>
            </span>
          </div>
        )}
        {!!props.examples?.length && (
          <section className="examples grid gap-2" aria-label="Examples">
            <h3 className="m-0 type-eyebrow text-muted-foreground">Examples</h3>
            {props.examples.map((ex) => (
              <div className="ex grid grid-cols-[auto_1fr] items-start gap-2.5 rounded-xl bg-surface p-3 in-[.pp]:bg-muted" key={ex.yue}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="-mt-0.5 bg-harbour-soft text-harbour-ink hover:bg-harbour-soft hover:brightness-95"
                  aria-label="Hear the example"
                  title="Hear it"
                  onClick={() => props.onHearExample(ex.yue)}>
                  <Icon name="sound" />
                </Button>
                <div className="grid min-w-0 gap-0.5">
                  <p className="ex-yue m-0 font-zh text-[17px] leading-snug font-medium text-foreground [&_b]:font-bold [&_b]:text-jade-pressed dark:[&_b]:text-jade" lang="yue-Hant">
                    {markWord(ex.yue, head)}
                  </p>
                  <p className="ex-jp m-0 font-sans text-xs leading-snug font-bold text-muted-foreground">{ex.jyutping}</p>
                  {ex.english && <p className="ex-en m-0 type-body-sm text-body">{ex.english}</p>}
                </div>
              </div>
            ))}
          </section>
        )}
        {props.from?.onOpen && (
          <button
            className="from-link flex max-w-full cursor-pointer items-center gap-2 justify-self-start rounded-md bg-harbour-soft py-1.5 pr-3 pl-2.5 type-body-sm font-bold text-harbour-ink hover:brightness-95 [&_svg]:size-3.5 [&_svg]:shrink-0"
            onClick={props.from.onOpen}
            title="Open the video at this moment">
            <Icon name="play" />
            <span className="ft min-w-0 truncate">{props.from.title || "Video"}</span>
            <span className="fm shrink-0 font-sans text-xs font-bold tabular-nums opacity-80">{formatTime(props.from.ms)}</span>
          </button>
        )}
        <div className="src flex font-sans items-start justify-between gap-3 pt-0.5 text-[11px] leading-snug font-semibold text-muted-foreground">
          <span className="min-w-0">
            {props.examples?.length ? `CC-Canto · examples ${[...new Set(props.examples.map((e) => e.source))].join(", ")} · offline` : "CC-Canto · offline"}
          </span>
          {props.from && !props.from.onOpen && <span className="shrink-0 tabular-nums">from {formatTime(props.from.ms)}</span>}
        </div>
      </div>
    </>
  )
}

/** The sentence with each use of the word in bold. */
function markWord(text: string, word: string) {
  const parts = text.split(word)
  return parts.flatMap((p, i) => (i ? [<b key={i}>{word}</b>, p] : [p]))
}

/** Bottom of the panel: a pause hint while playing, and any error. */
export function Dock(props: { watching: boolean; error: string | null; onClearError: () => void }) {
  return (
    <div className="dock grid flex-none gap-2 px-3 pt-2.5 pb-3 font-sans">
      {props.error && (
        <button
          className="inline-error flex cursor-pointer items-start gap-2 rounded-md bg-primary-soft px-3 py-2 text-left type-body-sm text-destructive"
          onClick={props.onClearError}>
          <CircleAlert className="mt-px size-4 shrink-0" aria-hidden />
          <span>{props.error}</span>
        </button>
      )}
      {props.watching && (
        <div className="hint flex items-center justify-center gap-1.5 text-center type-body-sm text-muted-foreground">
          Pause the video to look up words <Kbd className="border border-b-2 border-border bg-background font-bold text-body">Space</Kbd>
        </div>
      )}
    </div>
  )
}
