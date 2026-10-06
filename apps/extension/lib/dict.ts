import { lookup, type Dict, type Examples, type NewWord } from "@pna/shared"
import dictUrl from "url:~assets/dict.dat"
import examplesUrl from "url:~assets/examples.dat"

let loading: Promise<Dict> | null = null

/** The bundled CC-Canto + CC-CEDICT dictionary, fetched and parsed once per page. */
export function loadDict(): Promise<Dict> {
  loading ??= fetch(dictUrl).then((r) => {
    if (!r.ok) throw new Error(`Couldn't load the dictionary (${r.status})`)
    return r.json()
  })
  return loading
}

let loadingExamples: Promise<Examples> | null = null

/** The bundled example sentences, fetched when the first word sheet opens. */
export function loadExamples(): Promise<Examples> {
  loadingExamples ??= fetch(examplesUrl).then((r) => {
    if (!r.ok) throw new Error(`Couldn't load the example sentences (${r.status})`)
    return r.json()
  })
  return loadingExamples
}

/** Fills a word's blank Jyutping and meaning from the dictionary, when it knows the word. */
export async function fillFromDict(w: NewWord): Promise<NewWord> {
  const hit = lookup(w.colloquial.trim(), await loadDict().catch(() => ({}) as Dict))
  const jyutping = hit.jyutping && !hit.jyutping.includes("?") ? hit.jyutping : null
  return { ...w, jyutping: w.jyutping || jyutping, meaning: w.meaning || hit.meaning || null }
}
