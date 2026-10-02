import type { Encounter, Store, Word } from "@pna/shared"
import { useCallback, useEffect, useMemo, useState } from "react"

export interface SavedWord {
  word: Word
  /** The latest moment it was saved from. */
  at: Encounter | null
}

/** Saved words, newest first, with where each came from. */
export function useSaved(store: Store) {
  const [list, setList] = useState<SavedWord[]>([])
  const refresh = useCallback(async () => {
    const words = await store.listWords()
    const rows = await Promise.all(words.map(async (word) => ({ word, at: (await store.getWord(word.id))?.encounters[0] ?? null })))
    rows.sort((a, b) => (b.at?.createdAt ?? 0) - (a.at?.createdAt ?? 0))
    setList(rows)
  }, [store])
  useEffect(() => {
    refresh()
  }, [refresh])
  const words = useMemo(() => new Set(list.map((s) => s.word.colloquial)), [list])
  return { list, words, refresh }
}
