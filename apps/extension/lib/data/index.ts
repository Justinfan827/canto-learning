import type { Store } from "@pna/shared"

import { CONVEX_URL, convexToken, getAccount } from "../auth"
import { fillFromDict } from "../dict"
import { LOCAL_HELPER } from "../features"
import { copyLocalToConvex as copyTo, createConvexStore, type ConvexConfig } from "./convexStore"
import { withDiskBackup } from "./diskBackup"
import { createLocalStore, restoreLocalStore } from "./localStore"
import { withStudySync } from "./studySync"

// The extension's data layer. Everything else imports `store` from here and
// never touches IndexedDB or Convex directly. Signed in (lib/auth.ts), words go
// to the Convex deployment this build points at; signed out, they stay in this browser.

export type { ConvexConfig }

/** The signed-in user's deployment, or null when this build doesn't sync. */
const convexConfig = (): ConvexConfig | null => (CONVEX_URL ? { url: CONVEX_URL, token: convexToken } : null)

/** Copies this browser's saved words into the signed-in account. Safe to run twice. */
export function copyLocalToConvex(onProgress?: (done: number, total: number) => void) {
  const cfg = convexConfig()
  if (!cfg) throw new Error("This build doesn't sync")
  return copyTo(cfg, onProgress)
}

/**
 * Restores a backup file into this browser's database: either a raw dump, or a
 * `{ data: { "pause-and-ask": dump } }` export of the extension's IndexedDB.
 */
export async function restoreBackup(text: string) {
  const json = JSON.parse(text)
  const dump = json?.data?.["pause-and-ask"] ?? json
  if (!Array.isArray(dump?.words)) throw new Error("This file has no saved words in it.")
  return restoreLocalStore(dump)
}

const BACKEND_KEYS = ["account"] as const

let local: Store | null = null
// The local helper relays local data to the phone (with Convex the phone reads Convex itself)
// and keeps a backup of the whole database on disk.
const localStore = () => (local ??= LOCAL_HELPER ? withStudySync(withDiskBackup(createLocalStore()), { fill: fillFromDict }) : createLocalStore())

async function pick(): Promise<Store> {
  const cfg = convexConfig()
  return cfg && (await getAccount()) ? createConvexStore(cfg) : localStore()
}

const METHODS = [
  "putVideo",
  "getVideo",
  "getLines",
  "saveConversions",
  "saveLineWords",
  "saveQuestion",
  "logTaughtWord",
  "addWord",
  "listWords",
  "getWord",
  "setStatus",
  "knownWords",
  "recordReview",
  "exportStudy"
] as const satisfies readonly (keyof Store)[]

/** A Store that forwards to whichever backend settings choose, switching when they change. */
function switching(choose: () => Promise<Store>): Store {
  let current: Promise<Store> | null = null
  chrome.storage?.onChanged.addListener((changes) => {
    if (BACKEND_KEYS.some((k) => k in changes)) current = null
  })
  const forward =
    <K extends keyof Store>(name: K) =>
    async (...args: Parameters<Store[K]>) => {
      const s = await (current ??= choose())
      return (s[name] as (...a: Parameters<Store[K]>) => ReturnType<Store[K]>)(...args)
    }
  return Object.fromEntries(METHODS.map((name) => [name, forward(name)])) as unknown as Store
}

/** The app's one store. */
export const store: Store = switching(pick)
