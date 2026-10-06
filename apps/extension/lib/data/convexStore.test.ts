import "fake-indexeddb/auto"

import { describe, expect, it } from "vitest"

import { copyLocalToConvex, createConvexStore } from "./convexStore"
import { createLocalStore } from "./localStore"

// Runs against a real deployment: start one with `pnpm --filter @pna/backend dev`
// (a local backend works), set SYNC_TOKEN on it, then
// CONVEX_TEST_URL=http://127.0.0.1:3210 CONVEX_TEST_TOKEN=<token> pnpm --filter extension test
const url = process.env.CONVEX_TEST_URL
const token = process.env.CONVEX_TEST_TOKEN ?? ""

describe.skipIf(!url)("convex store", () => {
  // The deployment keeps data between runs, so every run uses its own ids.
  const run = Date.now().toString(36)
  const lines = [
    { idx: 0, startMs: 0, endMs: 2000, text: "他沒有看到" },
    { idx: 1, startMs: 2000, endMs: 4000, text: "這麼古怪" }
  ]
  const s = () => createConvexStore({ url: url!, token })

  it("rejects a wrong token", async () => {
    await expect(createConvexStore({ url: url!, token: "wrong" }).knownWords()).rejects.toThrow(/Wrong sync token/)
  })

  it("keeps conversions unless the caption text changes", async () => {
    const video = { id: `v-${run}`, title: "Vlog" }
    expect(await s().putVideo(video, lines, "manual")).toEqual({ needsConversion: [0, 1] })
    await s().saveConversions(video.id, [{ idx: 0, sourceRegister: "formal", textFormal: "他沒有看到", textColloquial: "佢冇睇到", colloquialInferred: true }])
    await s().saveLineWords(video.id, 0, [])
    expect(await s().putVideo(video, lines, "manual")).toEqual({ needsConversion: [1] })
    expect(await s().putVideo(video, [{ ...lines[0], text: "他沒看到" }], "manual")).toEqual({ needsConversion: [0] })
    const got = await s().getVideo(video.id)
    expect(got?.video).toMatchObject({ id: video.id, title: "Vlog", captionKind: "manual" })
    expect(got?.lines[0]).toMatchObject({ text: "他沒看到", textColloquial: null, words: null })
  })

  it("logs taught words, counts repeat asks as misses, links encounters, exports for the phone", async () => {
    const video = { id: `w-${run}`, title: "Vlog" }
    const kam = { colloquial: `咁${run}`, formal: "這麼", jyutping: "gam3", meaning: "so", notes: null }
    await s().putVideo(video, lines, "manual")
    const first = await s().logTaughtWord(kam, { videoId: video.id, lineIdx: 1 })
    expect(first).toMatchObject({ colloquial: kam.colloquial, timesAsked: 1, timesMissed: 0, status: "learning" })
    await s().setStatus(first.id, "known")
    expect(await s().knownWords()).toContain(kam.colloquial)
    const again = await s().logTaughtWord({ ...kam, meaning: "ignored" }, { videoId: video.id, lineIdx: 0 })
    expect(again).toMatchObject({ id: first.id, timesAsked: 2, timesMissed: 1, status: "learning", meaning: "so", ease: 2.3 })
    const detail = await s().getWord(first.id)
    expect(detail?.encounters.map((e) => [e.lineIdx, e.startMs, e.videoTitle])).toEqual([
      [0, 0, "Vlog"],
      [1, 2000, "Vlog"]
    ])
    const reviewed = await s().recordReview(first.id, "meaning", true)
    expect(reviewed.intervalDays).toBeCloseTo(2.3)
    expect((await s().listWords({ status: "learning" })).map((w) => w.id)).toContain(first.id)

    const snap = await s().exportStudy()
    const w = snap.words.find((x) => x.id === first.id)
    expect(w?.sources.map((x) => x.lineIdx)).toEqual([0, 1])
    expect(snap.videos.map((v) => v.id)).toContain(video.id)
  })

  it("copies local data across, keeping word ids", async () => {
    const local = createLocalStore()
    const video = { id: `c-${run}`, title: "Copied" }
    await local.putVideo(video, lines, "auto")
    const word = await local.logTaughtWord({ colloquial: `乜${run}`, formal: "甚麼", jyutping: "mat1", meaning: "what", notes: null }, { videoId: video.id, lineIdx: 0 })
    const r = await copyLocalToConvex({ url: url!, token })
    expect(r).toMatchObject({ words: 1, alreadyOnConvex: 0 })
    // Earlier runs may hold this local id, so look the word up by its text.
    const onConvex = (await s().listWords()).find((w) => w.colloquial === word.colloquial)!
    const copied = await s().getWord(onConvex.id)
    expect(copied?.encounters).toHaveLength(1)
    expect(copied?.encounters[0]).toMatchObject({ videoId: video.id, lineIdx: 0, videoTitle: "Copied" })
    // Running it again matches the word instead of adding it twice.
    expect(await copyLocalToConvex({ url: url!, token })).toMatchObject({ words: 1, alreadyOnConvex: 1 })
    expect((await s().getWord(onConvex.id))?.encounters).toHaveLength(1)
    expect((await s().getVideo(video.id))?.lines).toHaveLength(2)
  })
})
