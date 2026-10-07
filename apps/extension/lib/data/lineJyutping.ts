import type { LineWord, Store } from "@pna/shared"

/**
 * Splits each saved word's source line into dictionary words, so the phone can show
 * the line's Jyutping under it. Only lines that aren't split yet; safe to run often.
 */
export async function fillLineJyutping(store: Store, split: (text: string) => LineWord[]) {
  const snap = await store.exportStudy()
  const todo = new Map<string, { videoId: string; lineIdx: number; text: string }>()
  for (const w of snap.words)
    for (const s of w.sources) if (!s.jyutping) todo.set(`${s.videoId}:${s.lineIdx}`, { videoId: s.videoId, lineIdx: s.lineIdx, text: s.text })
  for (const l of todo.values()) await store.saveLineWords(l.videoId, l.lineIdx, split(l.text))
  return todo.size
}
