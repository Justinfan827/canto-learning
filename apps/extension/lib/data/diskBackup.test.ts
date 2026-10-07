import "fake-indexeddb/auto"

import { afterEach, describe, expect, it, vi } from "vitest"

import { withDiskBackup } from "./diskBackup"
import { createLocalStore, dumpLocalStore, type LocalDump } from "./localStore"

const video = { id: "v1", title: "Vlog" }
const lines = [{ idx: 0, startMs: 0, endMs: 2000, text: "這麼古怪" }]
const kam = { colloquial: "咁", formal: "這麼", jyutping: "gam3", meaning: "so", notes: null }

function helper(saved: LocalDump | null) {
  const puts: LocalDump[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        puts.push(JSON.parse(String(init.body)))
        return new Response("{}")
      }
      return saved ? new Response(JSON.stringify(saved)) : new Response("{}", { status: 404 })
    })
  )
  return puts
}

describe("disk backup", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("refills an empty database from the helper's backup, then backs up changes", async () => {
    const old = createLocalStore("t-backup-old")
    await old.putVideo(video, lines, "manual")
    await old.logTaughtWord(kam, { videoId: "v1", lineIdx: 0 })
    const puts = helper(await dumpLocalStore("t-backup-old"))

    const store = withDiskBackup(createLocalStore("t-backup-new"), { url: "http://helper/backup", name: "t-backup-new" })
    await vi.waitFor(async () => expect((await store.listWords()).map((w) => w.colloquial)).toEqual(["咁"]))
    await store.addWord({ colloquial: "傾偈", jyutping: "king1 gai2", meaning: "to chat" })
    await vi.waitFor(() => expect(puts.at(-1)?.words.map((w) => w.colloquial).sort()).toEqual(["咁", "傾偈"].sort()), { timeout: 8000 })
  }, 10000)

  it("never backs up an empty database", async () => {
    const puts = helper(null)
    const store = withDiskBackup(createLocalStore("t-backup-empty"), { url: "http://helper/backup", name: "t-backup-empty" })
    await store.putVideo(video, lines, "manual")
    await new Promise((r) => setTimeout(r, 3500))
    expect(puts).toEqual([])
  }, 10000)
})
