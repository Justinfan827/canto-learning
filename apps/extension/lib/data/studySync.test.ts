import "fake-indexeddb/auto"

import { afterEach, describe, expect, it, vi } from "vitest"

import { createLocalStore } from "./localStore"
import { withStudySync } from "./studySync"

describe("study sync", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("adds words queued on the phone, fills blanks, clears them from the helper, then pushes", async () => {
    let queue = [
      { colloquial: "傾偈", jyutping: null, meaning: null, at: 1 },
      { colloquial: "冇問題", jyutping: "mou5 man6 tai4", meaning: "no problem", at: 2 }
    ]
    const pushed: { words: { colloquial: string; source?: string; jyutping: string | null }[] }[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith("/study/words") && !init?.method) return new Response(JSON.stringify({ words: queue }))
        if (url.endsWith("/study/words") && init?.method === "DELETE") {
          const { at } = JSON.parse(String(init.body))
          queue = queue.filter((w) => !at.includes(w.at))
          return new Response("{}")
        }
        if (init?.method === "PUT") pushed.push(JSON.parse(String(init.body)))
        return new Response("{}")
      })
    )
    const store = withStudySync(createLocalStore("t-sync"), {
      url: "http://helper/study",
      fill: async (w) => ({ ...w, jyutping: w.jyutping ?? "king1 gai2", meaning: w.meaning ?? "to chat" })
    })
    // The first sync runs shortly after the store is created.
    await vi.waitFor(() => expect(pushed).toHaveLength(1), { timeout: 4000 })
    expect(queue).toEqual([])
    const words = await store.listWords()
    expect(words.map((w) => [w.colloquial, w.jyutping, w.meaning, w.source])).toEqual(
      expect.arrayContaining([
        ["傾偈", "king1 gai2", "to chat", "manual"],
        ["冇問題", "mou5 man6 tai4", "no problem", "manual"]
      ])
    )
    expect(pushed.at(-1)?.words.map((w) => w.colloquial).sort()).toEqual(["傾偈", "冇問題"].sort())
  })
})
