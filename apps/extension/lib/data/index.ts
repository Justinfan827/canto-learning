import type { Store } from "@pna/shared"

import { fillFromDict } from "../dict"
import { loadSettings, type Settings } from "../settings"
import { copyLocalToConvex, createConvexStore, type ConvexConfig } from "./convexStore"
import { createLocalStore } from "./localStore"
import { withStudySync } from "./studySync"

// The extension's data layer. Everything else imports `store` from here and
// never touches IndexedDB or Convex directly; settings pick the backend.

export type { ConvexConfig }
export { copyLocalToConvex }

const BACKEND_KEYS = ["dataBackend", "convexUrl", "convexToken"] as const

/** The Convex settings, when Convex is chosen and filled in; otherwise the local store is used. */
export function convexConfig(s: Pick<Settings, (typeof BACKEND_KEYS)[number]>): ConvexConfig | null {
  const url = s.convexUrl.trim()
  return s.dataBackend === "convex" && url && s.convexToken ? { url, token: s.convexToken } : null
}

let local: Store | null = null
// The local helper relays local data to the phone; with Convex the phone reads Convex itself.
const localStore = () => (local ??= withStudySync(createLocalStore(), { fill: fillFromDict }))

async function pick(): Promise<Store> {
  const cfg = convexConfig(await loadSettings())
  return cfg ? createConvexStore(cfg) : localStore()
}

/** Checks a Convex URL and token by making one read. Throws with the server's message when they don't work. */
export async function checkConvex(cfg: ConvexConfig) {
  await createConvexStore(cfg).knownWords()
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
