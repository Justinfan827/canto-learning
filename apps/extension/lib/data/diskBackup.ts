import type { Store } from "@pna/shared"

import { TRANSCRIBER_URL } from "../transcriber"
import { dumpLocalStore, restoreLocalStore } from "./localStore"

const BACKUP_DELAY_MS = 3000

/**
 * Keeps a copy of the local database on disk through the helper, which writes it under
 * ~/.cache/canto-learning/backups. Chrome ties IndexedDB to the extension's ID, so moving the
 * extension's folder starts it with an empty database; on startup the backup is merged back in,
 * which adds only what's missing. Best-effort, like study sync: skipped when the helper isn't running.
 */
export function withDiskBackup(store: Store, opts: { url?: string; name?: string } = {}): Store {
  const url = opts.url ?? `${TRANSCRIBER_URL}/backup`
  const name = opts.name ?? "pause-and-ask"
  let timer: ReturnType<typeof setTimeout> | null = null

  const restored = (async () => {
    try {
      const r = await fetch(url)
      if (r.ok) await restoreLocalStore(await r.json(), name)
    } catch {
      // No helper, or no backup yet.
    }
  })()

  const backup = async () => {
    timer = null
    try {
      await restored
      const dump = await dumpLocalStore(name)
      // A fresh, empty database must never replace a good backup.
      if (!dump.words.length) return
      await fetch(url, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(dump) })
    } catch {
      // Helper not running; the next change tries again.
    }
  }
  const scheduleBackup = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(backup, BACKUP_DELAY_MS)
  }
  const after =
    <A extends unknown[], R>(fn: (...a: A) => Promise<R>) =>
    async (...a: A) => {
      const r = await fn(...a)
      scheduleBackup()
      return r
    }

  restored.then(scheduleBackup)
  return {
    ...store,
    putVideo: after(store.putVideo),
    saveConversions: after(store.saveConversions),
    saveLineWords: after(store.saveLineWords),
    logTaughtWord: after(store.logTaughtWord),
    addWord: after(store.addWord),
    setStatus: after(store.setStatus),
    recordReview: after(store.recordReview)
  }
}
