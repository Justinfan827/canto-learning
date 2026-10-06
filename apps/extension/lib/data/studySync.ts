import type { NewWord, Store, StudyNewWord } from "@pna/shared"

import { TRANSCRIBER_URL } from "../transcriber"

const PUSH_DELAY_MS = 1500
const PULL_EVERY_MS = 60_000

/**
 * Pushes saved words to the local helper so the phone study app can pull
 * them, and adds words typed in on the phone (queued on the helper). Wraps the
 * store so every change to words schedules a push; syncing is best-effort and
 * skipped quietly when the helper isn't running. `fill` completes a phone
 * word's blank Jyutping and meaning, from the dictionary.
 */
export function withStudySync(store: Store, opts: { url?: string; fill?: (w: NewWord) => Promise<NewWord> } = {}): Store {
  const url = opts.url ?? `${TRANSCRIBER_URL}/study`
  let timer: ReturnType<typeof setTimeout> | null = null
  /** Adds the phone's queued words; true when there were any. */
  const pull = async () => {
    const r = await fetch(`${url}/words`)
    if (!r.ok) return false
    const { words } = (await r.json()) as { words: StudyNewWord[] }
    if (!words?.length) return false
    for (const w of words) {
      const word: NewWord = { colloquial: w.colloquial, jyutping: w.jyutping, meaning: w.meaning }
      await store.addWord(opts.fill && (!w.jyutping || !w.meaning) ? await opts.fill(word) : word).catch(() => {})
    }
    await fetch(`${url}/words`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ at: words.map((w) => w.at) }) })
    return true
  }
  const push = async () => {
    timer = null
    try {
      await pull()
      const snap = await store.exportStudy()
      await fetch(url, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(snap) })
    } catch {
      // Helper not running; the next change or panel open tries again.
    }
  }
  const schedulePush = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(push, PUSH_DELAY_MS)
  }
  const after =
    <A extends unknown[], R>(fn: (...a: A) => Promise<R>) =>
    async (...a: A) => {
      const r = await fn(...a)
      schedulePush()
      return r
    }

  schedulePush()
  // Catch words added on the phone while the panel stays open.
  setInterval(() => pull().then((got) => got && schedulePush(), () => {}), PULL_EVERY_MS)
  return {
    ...store,
    logTaughtWord: after(store.logTaughtWord),
    addWord: after(store.addWord),
    setStatus: after(store.setStatus),
    recordReview: after(store.recordReview),
    // Line conversions add English and 口語 text to the sources.
    saveConversions: after(store.saveConversions)
  }
}
