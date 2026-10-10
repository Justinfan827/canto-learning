import { lookup, type Dict, type NewWord, type Word } from "@pna/shared"
import { cn } from "cn"
import { CircleCheck, Info, X } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"

import { Button } from "~components/ui/button"
import { Field, FieldGroup, FieldLabel } from "~components/ui/field"
import { Input } from "~components/ui/input"

const HAN = /\p{Script=Han}/u

const label = "type-eyebrow text-xs font-extrabold text-muted-foreground"

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
  const id = useId()

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
      document.getElementById(id + "-yue")?.focus()
    } catch (err) {
      setNote({ kind: "warn", text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="add mx-4 mb-4 flex flex-col gap-3.5 rounded-xl border-2 border-b-4 border-border bg-card p-4 font-sans text-body"
      onSubmit={submit}
      aria-label="Add a word">
      <div className="add-head -mt-1 -mr-2 flex items-center justify-between gap-2">
        <b className="type-title text-foreground">Add a word</b>
        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground" aria-label="Close" title="Close" onClick={props.onClose}>
          <X className="size-5" strokeWidth={2.5} />
        </Button>
      </div>
      <FieldGroup className="gap-3">
        <Field className="gap-1.5">
          <FieldLabel htmlFor={id + "-yue"} className={label}>
            Cantonese
          </FieldLabel>
          <Input
            id={id + "-yue"}
            autoFocus
            lang="yue-Hant"
            className="hz h-12 font-zh text-[22px] font-bold md:text-[22px]"
            value={colloquial}
            placeholder="傾偈"
            onChange={(e) => {
              setColloquial(e.target.value)
              setNote(null)
            }}
          />
        </Field>
        {word && props.saved.has(word) && (
          <p className="add-note warn m-0 flex items-start gap-2 rounded-md bg-gold-soft px-3 py-2 type-body-sm text-gold-ink">
            <Info className="mt-px size-4 shrink-0" strokeWidth={2.5} />
            Already saved. Adding it again fills in anything missing.
          </p>
        )}
        <div className="add-row grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2.5">
          <Field className="gap-1.5">
            <FieldLabel htmlFor={id + "-jp"} className={label}>
              Jyutping
            </FieldLabel>
            <Input
              id={id + "-jp"}
              className="font-bold text-harbour-ink"
              value={jyutping}
              placeholder="optional"
              onChange={(e) => {
                edited.current.jyutping = true
                setJyutping(e.target.value)
              }}
            />
          </Field>
          <Field className="gap-1.5">
            <FieldLabel htmlFor={id + "-en"} className={label}>
              Meaning
            </FieldLabel>
            <Input
              id={id + "-en"}
              value={meaning}
              placeholder="optional"
              onChange={(e) => {
                edited.current.meaning = true
                setMeaning(e.target.value)
              }}
            />
          </Field>
        </div>
      </FieldGroup>
      <div className="add-foot flex items-center justify-between gap-3">
        {note ? (
          <span
            className={cn(
              "add-note flex min-w-0 items-center gap-1.5 type-body-sm font-extrabold",
              note.kind,
              note.kind === "ok" ? "text-jade-pressed dark:text-jade" : "text-gold-ink"
            )}>
            {note.kind === "ok" ? <CircleCheck className="size-4 shrink-0" strokeWidth={2.5} /> : <Info className="size-4 shrink-0" strokeWidth={2.5} />}
            {note.text}
          </span>
        ) : (
          <span className="add-note muted min-w-0 type-body-sm text-muted-foreground">{props.dict ? "Filled from the dictionary when it knows the word." : ""}</span>
        )}
        <Button className="primary shrink-0 px-6" type="submit" disabled={!word || busy}>
          Save
        </Button>
      </div>
    </form>
  )
}
