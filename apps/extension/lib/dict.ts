import type { Dict } from "@pna/shared"
import dictUrl from "url:~assets/dict.dat"

let loading: Promise<Dict> | null = null

/** The bundled CC-Canto + CC-CEDICT dictionary, fetched and parsed once per page. */
export function loadDict(): Promise<Dict> {
  loading ??= fetch(dictUrl).then((r) => {
    if (!r.ok) throw new Error(`Couldn't load the dictionary (${r.status})`)
    return r.json()
  })
  return loading
}
