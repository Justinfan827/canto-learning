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

/**
 * Splits a caption into dictionary words; non-Chinese runs stay whole and punctuation is dropped.
 * Chinese runs use bidirectional longest match: forward and backward passes, choosing between them
 * wherever they disagree (也不知道 → 也 / 不知道, not 也不 / 知道).
 */
export function segment(text: string, dict: Dict): string[] {
  const chars = [...text]
  const out: string[] = []
  let i = 0
  while (i < chars.length) {
    const han = HAN.test(chars[i])
    let j = i
    while (j < chars.length && HAN.test(chars[j]) === han) j++
    if (han) out.push(...splitHan(chars.slice(i, j), dict))
    else {
      const run = chars.slice(i, j).join("").trim()
      if (/[\p{L}\p{N}]/u.test(run)) out.push(...run.split(/[^\p{L}\p{N}'-]+/u).filter(Boolean))
    }
    i = j
  }
  return out
}

function splitHan(chars: string[], dict: Dict): string[] {
  const has = (a: number, b: number) => !!dict[chars.slice(a, b).join("")]
  // Word lengths from a forward and a backward longest-match pass.
  const fwd: number[] = []
  for (let i = 0; i < chars.length; ) {
    let len = Math.min(MAX_WORD, chars.length - i)
    while (len > 1 && !has(i, i + len)) len--
    fwd.push(len)
    i += len
  }
  const bwd: number[] = []
  for (let j = chars.length; j > 0; ) {
    let len = Math.min(MAX_WORD, j)
    while (len > 1 && !has(j - len, j)) len--
    bwd.unshift(len)
    j -= len
  }
  // Where the passes disagree, choose per stretch between shared cut points.
  const out: string[] = []
  let fi = 0
  let bi = 0
  let pos = 0
  while (fi < fwd.length) {
    const f: number[] = [fwd[fi++]]
    const b: number[] = [bwd[bi++]]
    let fEnd = pos + f[0]
    let bEnd = pos + b[0]
    while (fEnd !== bEnd) {
      if (fEnd < bEnd) fEnd += f[f.push(fwd[fi++]) - 1]
      else bEnd += b[b.push(bwd[bi++]) - 1]
    }
    for (const len of better(f, b)) {
      out.push(chars.slice(pos, pos + len).join(""))
      pos += len
    }
  }
  return out
}

/** Fewer words, then the longer longest word, then fewer single characters, else the backward split. */
function better(f: number[], b: number[]) {
  if (f.length !== b.length) return f.length < b.length ? f : b
  if (Math.max(...f) !== Math.max(...b)) return Math.max(...f) > Math.max(...b) ? f : b
  const singles = (ls: number[]) => ls.filter((l) => l === 1).length
  return singles(f) < singles(b) ? f : b
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
