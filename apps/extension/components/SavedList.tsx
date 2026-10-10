import { senses, type Dict, type NewWord, type Word } from "@pna/shared"
import { cn } from "cn"
import { ChevronLeft, PenLine, Plus, Star, Video, Volume2 } from "lucide-react"
import { useState } from "react"

import { Badge } from "~components/ui/badge"
import { Button } from "~components/ui/button"
import type { SavedWord } from "~lib/useSaved"

import { AddWord } from "./AddWord"
import { formatTime } from "./Ruby"

function ago(ms: number) {
  const s = (Date.now() - ms) / 1000
  if (s < 60) return "now"
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

const when = (s: SavedWord) => s.at?.createdAt ?? s.word.createdAt

/** The bar at the top of the collection screens: a way back, and an optional action on the right. */
export function BackBar(props: { label: string; onBack: () => void; children?: React.ReactNode }) {
  return (
    <header className="bar flex flex-none items-center gap-2 px-3 pt-3 pb-1">
      <div className="grow min-w-0">
        <Button variant="ghost" size="sm" className="pill -ml-1 max-w-full bg-transparent px-2 text-[13px]" onClick={props.onBack}>
          <ChevronLeft className="size-5" strokeWidth={3} />
          {props.label}
        </Button>
      </div>
      {props.children}
    </header>
  )
}

/** Saved words, newest first. A row opens the word's details; the speaker plays it. */
export function SavedList(props: {
  list: SavedWord[]
  videoId: string | null
  dict: Dict | null
  onBack: () => void
  onOpen: (w: SavedWord) => void
  onHear: (w: SavedWord) => void
  onAdd: (w: NewWord) => Promise<{ word: Word; created: boolean }>
}) {
  const [tab, setTab] = useState<"all" | "video">("all")
  const [adding, setAdding] = useState(false)
  const fromVideo = props.list.filter((s) => s.at?.videoId === props.videoId)
  const shown = tab === "video" ? fromVideo : props.list
  const tabs = [
    { key: "all" as const, label: "All", count: props.list.length, disabled: false },
    { key: "video" as const, label: "This video", count: fromVideo.length, disabled: !props.videoId }
  ]
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface font-sans text-body">
      <BackBar label={props.videoId ? "Back to video" : "Back"} onBack={props.onBack}>
        {!adding && (
          <Button variant="outline" size="sm" className="pill bg-background px-3 text-[13px]" onClick={() => setAdding(true)}>
            <Plus className="size-4" strokeWidth={3} />
            Add word
          </Button>
        )}
      </BackBar>
      <div className="flex items-center justify-between gap-3 px-4 pt-2 pb-3">
        <h1 className="type-display m-0 text-foreground">Saved words</h1>
        <Badge className="h-7 bg-jade-soft px-2.5 text-[13px] text-jade-pressed dark:text-jade">
          <Star className="fill-current" />
          {props.list.length} {props.list.length === 1 ? "word" : "words"}
        </Badge>
      </div>
      {adding && (
        <AddWord
          dict={props.dict}
          saved={new Set(props.list.map((s) => s.word.colloquial))}
          onAdd={async (w) => {
            const r = await props.onAdd(w)
            setTab("all")
            return r
          }}
          onClose={() => setAdding(false)}
        />
      )}
      <div className="tabs flex gap-2 px-4 pb-3" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md border-2 border-b-4 border-border bg-card px-3 type-body-sm font-extrabold text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50",
              tab === t.key && "on border-harbour bg-harbour-soft text-harbour-ink hover:bg-harbour-soft"
            )}
            onClick={() => setTab(t.key)}
            disabled={t.disabled}>
            {t.label}
            <span className={cn("rounded-full px-1.5 text-[11px] leading-[18px] tabular-nums", tab === t.key ? "bg-harbour text-white dark:text-background" : "bg-muted text-muted-foreground")}>
              {t.count}
            </span>
          </button>
        ))}
      </div>
      <ul className="list m-0 flex min-h-0 flex-1 list-none flex-col gap-2.5 overflow-y-auto px-4 pt-0.5 pb-4">
        {shown.length === 0 && (
          <li className="list-empty flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border px-6 py-8 text-center">
            <span aria-hidden className="grid size-14 place-items-center rounded-xl bg-jade-soft text-jade">
              <Star className="size-7 fill-current" />
            </span>
            <p className="type-body m-0 max-w-[260px] text-muted-foreground">
              {tab === "video" ? "No words saved from this video yet." : "Tap a word in a paused line, then Save, or add one with Add word."}
            </p>
          </li>
        )}
        {shown.map((s) => (
          <li
            key={s.word.id}
            className="flex items-center gap-1 rounded-xl border-2 border-b-4 border-border bg-card pr-2.5 transition-[transform,border-width] duration-75 has-[.item:hover]:bg-muted has-[.item:active]:translate-y-0.5 has-[.item:active]:border-b-2">
            <button
              className="item grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 rounded-l-[14px] bg-transparent py-3 pr-1 pl-3.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={() => props.onOpen(s)}>
              <span lang="yue-Hant" className="row-span-2 min-w-12 font-zh text-[22px] leading-tight font-bold text-foreground">
                {s.word.colloquial}
              </span>
              <span className="type-body-sm min-w-0 truncate text-body">
                {s.word.jyutping && <i className="mr-1.5 font-sans font-extrabold text-harbour-ink not-italic">{s.word.jyutping}</i>}
                {s.word.meaning || (props.dict ? senses(s.word.colloquial, props.dict, 3).map((x) => x.gloss).join("; ") : "")}
              </span>
              <span className="row-span-2 self-start pt-0.5 text-[11px] font-bold text-faint tabular-nums">{when(s) ? ago(when(s)!) : ""}</span>
              <span className="flex min-w-0 items-center gap-1 text-xs font-semibold text-muted-foreground">
                {s.at ? <Video className="size-3.5 shrink-0" /> : <PenLine className="size-3.5 shrink-0" />}
                <span className="truncate">
                  {s.at ? `${s.at.videoTitle || "Video"} · ${formatTime(s.at.startMs)}` : s.word.source === "manual" ? "Added by hand" : "From a video"}
                </span>
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full bg-harbour-soft text-harbour-ink hover:bg-harbour-soft hover:brightness-95"
              aria-label={`Hear ${s.word.colloquial}`}
              title="Hear it"
              onClick={() => props.onHear(s)}>
              <Volume2 className="size-[18px]" strokeWidth={2.5} />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
