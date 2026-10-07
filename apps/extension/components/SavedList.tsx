import { senses, type Dict, type NewWord, type Word } from "@pna/shared"
import { useState } from "react"

import type { SavedWord } from "~lib/useSaved"

import { AddWord } from "./AddWord"
import { Icon } from "./Icon"
import { formatTime } from "./Ruby"

function ago(ms: number) {
  const s = (Date.now() - ms) / 1000
  if (s < 60) return "now"
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

const when = (s: SavedWord) => s.at?.createdAt ?? s.word.createdAt

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
  const shown = tab === "video" ? props.list.filter((s) => s.at?.videoId === props.videoId) : props.list
  return (
    <>
      <header className="bar">
        <div className="grow">
          <button className="pill" onClick={props.onBack}>
            <Icon name="back" />
            {props.videoId ? "Back to video" : "Back"}
          </button>
        </div>
        {!adding && (
          <button className="pill" onClick={() => setAdding(true)}>
            <Icon name="plus" />
            Add word
          </button>
        )}
      </header>
      <div className="lh">
        <h1>Saved words</h1>
        <span>
          {props.list.length} {props.list.length === 1 ? "word" : "words"}
        </span>
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
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "all"} className={tab === "all" ? "on" : ""} onClick={() => setTab("all")}>
          All
        </button>
        <button role="tab" aria-selected={tab === "video"} className={tab === "video" ? "on" : ""} onClick={() => setTab("video")} disabled={!props.videoId}>
          This video
        </button>
      </div>
      <ul className="list">
        {shown.length === 0 && (
          <li className="muted list-empty">{tab === "video" ? "No words saved from this video yet." : "Tap a word in a paused line, then Save, or add one with Add word."}</li>
        )}
        {shown.map((s) => (
          <li key={s.word.id} className="row-w">
            <button className="item" onClick={() => props.onOpen(s)}>
              <span className="hz" lang="yue-Hant">
                {s.word.colloquial}
              </span>
              <span className="m">
                <i>{s.word.jyutping}</i>
                {s.word.meaning || (props.dict ? senses(s.word.colloquial, props.dict, 3).map((x) => x.gloss).join("; ") : "")}
              </span>
              <span className="t">{when(s) ? ago(when(s)!) : ""}</span>
              <span className="from">
                {s.at ? `${s.at.videoTitle || "Video"} · ${formatTime(s.at.startMs)}` : s.word.source === "manual" ? "Added by hand" : "From a video"}
              </span>
            </button>
            <button className="ib small" aria-label={`Hear ${s.word.colloquial}`} title="Hear it" onClick={() => props.onHear(s)}>
              <Icon name="sound" />
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
