import "fake-indexeddb/auto"

import { describe, expect, it } from "vitest"

import { createLocalStore, dumpLocalStore, restoreLocalStore } from "./localStore"

const video = { id: "v1", title: "Vlog" }
const lines = [
  { idx: 0, startMs: 0, endMs: 2000, text: "他沒有看到" },
  { idx: 1, startMs: 2000, endMs: 4000, text: "這麼古怪" }
]
const kam = { colloquial: "咁", formal: "這麼", jyutping: "gam3", meaning: "so", notes: null }

describe("local store", () => {
  it("keeps conversions unless the caption text changes", async () => {
    const s = createLocalStore("t1")
    expect(await s.putVideo(video, lines, "manual")).toEqual({ needsConversion: [0, 1] })
    await s.saveConversions("v1", [{ idx: 0, sourceRegister: "formal", textFormal: "他沒有看到", textColloquial: "佢冇睇到", colloquialInferred: true }])
    await s.saveLineWords("v1", 0, [])
    expect(await s.putVideo(video, lines, "manual")).toEqual({ needsConversion: [1] })
    expect(await s.putVideo(video, [{ ...lines[0], text: "他沒看到" }], "manual")).toEqual({ needsConversion: [0] })
    const got = await s.getVideo("v1")
    expect(got?.video).toMatchObject({ id: "v1", title: "Vlog", captionKind: "manual" })
    expect(got?.lines[0]).toMatchObject({ text: "他沒看到", textColloquial: null, words: null })
  })

  it("logs taught words, counts repeat asks as misses, links encounters", async () => {
    const s = createLocalStore("t2")
    await s.putVideo(video, lines, "manual")
    const first = await s.logTaughtWord(kam, { videoId: "v1", lineIdx: 1 })
    expect(first).toMatchObject({ colloquial: "咁", timesAsked: 1, timesMissed: 0, status: "learning" })
    await s.setStatus(first.id, "known")
    expect(await s.knownWords()).toEqual(["咁"])
    const again = await s.logTaughtWord({ ...kam, meaning: "ignored" }, { videoId: "v1", lineIdx: 0 })
    expect(again).toMatchObject({ id: first.id, timesAsked: 2, timesMissed: 1, status: "learning", meaning: "so", ease: 2.3 })
    const detail = await s.getWord(first.id)
    expect(detail?.encounters.map((e) => [e.lineIdx, e.startMs, e.videoTitle])).toEqual([
      [0, 0, "Vlog"],
      [1, 2000, "Vlog"]
    ])
    const reviewed = await s.recordReview(first.id, "meaning", true)
    expect(reviewed.intervalDays).toBeCloseTo(2.3)
    expect((await s.listWords({ status: "learning" })).length).toBe(1)
  })

  it("exports saved words with their source lines for the study app", async () => {
    const s = createLocalStore("t-study")
    await s.putVideo({ id: "v9", title: "Vlog", channel: "Chan" }, lines, "manual")
    await s.putVideo({ id: "unused", title: "No words" }, lines, "manual")
    await s.saveConversions("v9", [{ idx: 1, sourceRegister: "formal", textFormal: "這麼古怪", textColloquial: "咁古怪", colloquialInferred: true, textEnglish: "So weird" }])
    await s.logTaughtWord(kam, { videoId: "v9", lineIdx: 1 })
    const snap = await s.exportStudy()
    expect(snap.version).toBe(1)
    expect(snap.videos).toEqual([{ id: "v9", title: "Vlog", channel: "Chan", url: "https://www.youtube.com/watch?v=v9", firstSeenAt: expect.any(Number) }])
    expect(snap.words).toHaveLength(1)
    expect(snap.words[0]).toMatchObject({ colloquial: "咁", jyutping: "gam3", status: "learning" })
    expect(snap.words[0].sources).toEqual([
      { videoId: "v9", lineIdx: 1, startMs: 2000, endMs: 4000, text: "這麼古怪", textColloquial: "咁古怪", textFormal: "這麼古怪", textEnglish: "So weird", createdAt: expect.any(Number) }
    ])
  })

  it("adds words by hand, tagged manual, without touching an existing word's schedule", async () => {
    const s = createLocalStore("t-add")
    await expect(s.addWord({ colloquial: "  ", jyutping: null, meaning: null })).rejects.toThrow()
    const { word, created } = await s.addWord({ colloquial: " 傾偈 ", jyutping: "king1 gai2", meaning: " " })
    expect(created).toBe(true)
    expect(word).toMatchObject({ colloquial: "傾偈", jyutping: "king1 gai2", meaning: null, source: "manual", timesAsked: 0, status: "learning" })
    const again = await s.addWord({ colloquial: "傾偈", jyutping: "ignored", meaning: "to chat" })
    expect(again).toMatchObject({ created: false, word: { id: word.id, jyutping: "king1 gai2", meaning: "to chat", timesMissed: 0 } })

    await s.putVideo(video, lines, "manual")
    const taught = await s.logTaughtWord(kam, { videoId: "v1", lineIdx: 1 })
    const kept = await s.addWord({ colloquial: "咁", jyutping: null, meaning: null })
    expect(kept.word).toMatchObject({ id: taught.id, timesAsked: 1, timesMissed: 0, dueAt: taught.dueAt })
    expect(kept.word.source).toBeUndefined()

    const snap = await s.exportStudy()
    expect(snap.words.find((w) => w.colloquial === "傾偈")).toMatchObject({ source: "manual", sources: [] })
  })

  it("restores a backup into a database that already has words, keeping both", async () => {
    const old = createLocalStore("t-old")
    await old.putVideo(video, lines, "manual")
    await old.logTaughtWord(kam, { videoId: "v1", lineIdx: 1 })
    await old.logTaughtWord({ ...kam, colloquial: "古怪", formal: null }, { videoId: "v1", lineIdx: 1 })
    const backup = await dumpLocalStore("t-old")

    const now = createLocalStore("t-new")
    await now.putVideo({ id: "v2", title: "Other" }, lines, "manual")
    await now.logTaughtWord({ ...kam, colloquial: "傾偈", formal: null }, { videoId: "v2", lineIdx: 0 })
    await now.logTaughtWord(kam, { videoId: "v2", lineIdx: 0 })

    expect(await restoreLocalStore(backup, "t-new")).toEqual({ videos: 1, lines: 2, words: 1, encounters: 2 })
    expect((await now.listWords({})).map((w) => w.colloquial).sort()).toEqual(["古怪", "咁", "傾偈"].sort())
    const kamNow = (await now.listWords({})).find((w) => w.colloquial === "咁")!
    expect((await now.getWord(kamNow.id))?.encounters.map((e) => e.videoId).sort()).toEqual(["v1", "v2"])
    expect((await now.getVideo("v1"))?.lines).toHaveLength(2)

    expect(await restoreLocalStore(backup, "t-new")).toEqual({ videos: 0, lines: 0, words: 0, encounters: 0 })
  })
})
