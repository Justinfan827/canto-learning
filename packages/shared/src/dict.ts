import type { LineWord } from "./types"

/** One dictionary sense group: [jyutping, English gloss, 書面語/Mandarin equivalent or "", 1 if a Cantonese-specific entry]. */
export type DictEntry = [jyutping: string, gloss: string, formal: string, canto: 0 | 1]

/** Traditional headword → entries, Cantonese entries first; a Simplified headword maps to its Traditional form. */
export type Dict = Record<string, DictEntry[] | string>

export function entriesFor(word: string, dict: Dict): DictEntry[] | undefined {
  const e = dict[word]
  return typeof e === "string" ? (dict[e] as DictEntry[] | undefined) : e
}

const MAX_WORD = 8
const HAN = /\p{Script=Han}/u

/** Splits a caption into dictionary words by greedy longest match; non-Chinese runs stay whole and punctuation is dropped. */
export function segment(text: string, dict: Dict): string[] {
  const chars = [...text]
  const out: string[] = []
  let i = 0
  while (i < chars.length) {
    const c = chars[i]
    if (!HAN.test(c)) {
      let j = i
      while (j < chars.length && !HAN.test(chars[j])) j++
      const run = chars.slice(i, j).join("").trim()
      if (/[\p{L}\p{N}]/u.test(run)) out.push(...run.split(/[^\p{L}\p{N}'-]+/u).filter(Boolean))
      i = j
      continue
    }
    let len = Math.min(MAX_WORD, chars.length - i)
    while (len > 1 && !dict[chars.slice(i, i + len).join("")]) len--
    out.push(chars.slice(i, i + len).join(""))
    i += len
  }
  return out
}

export function lookup(word: string, dict: Dict): LineWord {
  const entries = entriesFor(word, dict)
  if (!entries?.length) return { text: word, jyutping: HAN.test(word) ? charReadings(word, dict) : "", meaning: "", formal: null, colloquial: null, likelyError: null }
  const [jp, gloss, formal, canto] = entries[0]
  const more = entries.slice(1).filter((e) => e[1] && e[1] !== gloss).map((e) => e[1])
  return {
    text: word,
    jyutping: jp,
    meaning: [gloss, ...more].filter(Boolean).slice(0, 3).join("; "),
    formal: canto && formal && formal !== word ? formal : null,
    colloquial: canto && formal && formal !== word ? word : null,
    likelyError: null
  }
}

/** Jyutping built character by character, for words the dictionary doesn't have. */
function charReadings(word: string, dict: Dict) {
  return [...word].map((c) => entriesFor(c, dict)?.[0]?.[0] ?? "?").join(" ")
}

export function splitLine(text: string, dict: Dict): LineWord[] {
  return segment(text, dict).map((w) => lookup(w, dict))
}

export interface Sense {
  jyutping: string
  gloss: string
  /** 書面語 equivalent of a Cantonese-only word, or null. */
  formal: string | null
}

/** Numbered senses for the word sheet: one per entry, or the parts of a single entry's gloss. */
export function senses(word: string, dict: Dict, max = 4): Sense[] {
  const entries = entriesFor(word, dict) ?? []
  const out: Sense[] = []
  for (const [jyutping, gloss, formal, canto] of entries) {
    const f = canto && formal && formal !== word ? formal : null
    const parts = entries.length === 1 ? gloss.split(/\s*;\s*/) : [gloss]
    for (const g of parts) if (g && !out.some((s) => s.gloss === g)) out.push({ jyutping, gloss: g, formal: f })
  }
  return out.slice(0, max)
}
