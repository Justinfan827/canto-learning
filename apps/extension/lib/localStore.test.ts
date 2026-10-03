import "fake-indexeddb/auto"

import { describe, expect, it } from "vitest"

import { createLocalStore } from "./localStore"

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
})
