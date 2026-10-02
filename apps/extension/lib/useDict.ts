import { splitLine, type Dict, type LineWord } from "@pna/shared"
import { useCallback, useEffect, useRef, useState } from "react"

import { loadDict } from "./dict"

/** The offline dictionary once loaded, and a cached word splitter over it. */
export function useDict() {
  const [dict, setDict] = useState<Dict | null>(null)
  const cache = useRef(new Map<string, LineWord[]>())
  useEffect(() => {
    loadDict().then(setDict, (e) => console.warn(e))
  }, [])
  useEffect(() => cache.current.clear(), [dict])
  const split = useCallback(
    (text: string): LineWord[] => {
      if (!dict) return [{ text, jyutping: "", meaning: "", formal: null, colloquial: null, likelyError: null }]
      let words = cache.current.get(text)
      if (!words) cache.current.set(text, (words = splitLine(text, dict)))
      return words
    },
    [dict]
  )
  return { dict, split }
}
