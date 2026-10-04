import type { Store } from "@pna/shared"

import { TRANSCRIBER_URL } from "../transcriber"

const PUSH_DELAY_MS = 1500

/**
 * Pushes saved words to the local helper so the phone study app can pull
 * them. Wraps the store so every change to words schedules a push; pushes
 * are best-effort and skipped quietly when the helper isn't running.
 */
export function withStudySync(store: Store, url = `${TRANSCRIBER_URL}/study`): Store {
  let timer: ReturnType<typeof setTimeout> | null = null
  const push = async () => {
    timer = null
    try {
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
