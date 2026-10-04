import { lookup, type Dict, type NewWord, type Word } from "@pna/shared"
import { useEffect, useRef, useState } from "react"

import { Icon } from "./Icon"

const HAN = /\p{Script=Han}/u

/**
 * A quick form for saving a word you met outside a video. Only the Cantonese is
 * required; jyutping and meaning fill in from the dictionary until you type your own.
 */
export function AddWord(props: {
  dict: Dict | null
  saved: Set<string>
  onAdd: (w: NewWord) => Promise<{ word: Word; created: boolean }>
  onClose: () => void
}) {
  const [colloquial, setColloquial] = useState("")
  const [jyutping, setJyutping] = useState("")
  const [meaning, setMeaning] = useState("")
  // Fields you've typed in yourself; the dictionary leaves those alone.
  const edited = useRef({ jyutping: false, meaning: false })
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ kind: "ok" | "warn"; text: string } | null>(null)
  const first = useRef<HTMLInputElement>(null)

  const word = colloquial.trim()
  useEffect(() => {
    if (!props.dict) return
    const hit = HAN.test(word) ? lookup(word, props.dict) : null
    // A reading with "?" means some character isn't in the dictionary.
    const jp = hit && !hit.jyutping.includes("?") ? hit.jyutping : ""
    if (!edited.current.jyutping) setJyutping(jp)
    if (!edited.current.meaning) setMeaning(hit?.meaning ?? "")
  }, [word, props.dict])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!word || busy) return
    setBusy(true)
    try {
      const { word: w, created } = await props.onAdd({ colloquial: word, jyutping, meaning })
      setNote(created ? { kind: "ok", text: `Added ${w.colloquial}` } : { kind: "warn", text: `${w.colloquial} was already saved` })
      setColloquial("")
      setJyutping("")
      setMeaning("")
      edited.current = { jyutping: false, meaning: false }
      first.current?.focus()
    } catch (err) {
      setNote({ kind: "warn", text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="add" onSubmit={submit} aria-label="Add a word">
      <div className="add-head">
        <b>Add a word</b>
        <button type="button" className="ib" aria-label="Close" title="Close" onClick={props.onClose}>
          <Icon name="close" />
        </button>
      </div>
      <label>
        Cantonese
        <input
          ref={first}
          autoFocus
          lang="yue-Hant"
          className="hz"
          value={colloquial}
          placeholder="傾偈"
          onChange={(e) => {
            setColloquial(e.target.value)
            setNote(null)
          }}
        />
      </label>
      {word && props.saved.has(word) && <p className="add-note warn">Already saved. Adding it again fills in anything missing.</p>}
      <div className="add-row">
        <label>
          Jyutping
          <input
            value={jyutping}
            placeholder="optional"
            onChange={(e) => {
              edited.current.jyutping = true
              setJyutping(e.target.value)
            }}
          />
        </label>
        <label>
          Meaning
          <input
            value={meaning}
            placeholder="optional"
            onChange={(e) => {
              edited.current.meaning = true
              setMeaning(e.target.value)
            }}
          />
        </label>
      </div>
      <div className="add-foot">
        {note ? <span className={"add-note " + note.kind}>{note.text}</span> : <span className="add-note muted">{props.dict ? "Filled from the dictionary when it knows the word." : ""}</span>}
        <button className="primary" type="submit" disabled={!word || busy}>
          Save
        </button>
      </div>
    </form>
  )
}
