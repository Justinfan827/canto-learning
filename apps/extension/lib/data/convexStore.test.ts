import "fake-indexeddb/auto"

import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins"
import { createAuthClient } from "better-auth/client"
import { beforeAll, describe, expect, it } from "vitest"

import { copyLocalToConvex, createConvexStore } from "./convexStore"
import { createLocalStore } from "./localStore"

// Runs against a real deployment with DEV_LOGIN=1 (packages/backend/convex/auth.ts), e.g.
// CONVEX_TEST_URL=https://<name>.convex.cloud pnpm --filter extension test
// Each run signs up its own user, so runs don't see each other's data.
const url = process.env.CONVEX_TEST_URL
const EXTENSION_ORIGIN = "chrome-extension://anhlhljekeokoaobmdgkekjmlfdmohii"
const siteUrl = url?.replace(/\.convex\.cloud\/?$/, ".convex.site").replace(/:3210\/?$/, ":3211")

/** Signs a new user up and returns a token source for them, as lib/auth.ts does in the extension. */
async function newUser(email: string) {
  const mem = new Map<string, string>()
  const auth = createAuthClient({
    baseURL: siteUrl,
    plugins: [convexClient(), crossDomainClient({ storage: { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) } })],
    // Better Auth only answers trusted origins: the extension's pages.
    fetchOptions: { headers: { origin: EXTENSION_ORIGIN } }
  })
  const r = await auth.signUp.email({ email, password: "test-password-123", name: "Test" })
  if (r.error) throw new Error(`Sign-up failed (is DEV_LOGIN=1 set on the deployment?): ${r.error.message}`)
  return async () => (await auth.convex.token()).data!.token
}

describe.skipIf(!url)("convex store", () => {
  // The deployment keeps data between runs, so every run uses its own ids.
  const run = Date.now().toString(36)
  const lines = [
    { idx: 0, startMs: 0, endMs: 2000, text: "他沒有看到" },
    { idx: 1, startMs: 2000, endMs: 4000, text: "這麼古怪" }
  ]
  let token: () => Promise<string>
  beforeAll(async () => {
    token = await newUser(`test-${run}@canto-learning.local`)
  })
  const s = () => createConvexStore({ url: url!, token })

  it("refuses calls without a signed-in user, and keeps each user's words to themselves", async () => {
    await expect(createConvexStore({ url: url!, token: async () => "" }).knownWords()).rejects.toThrow()
    await s().addWord({ colloquial: `私${run}`, jyutping: "si1", meaning: "private" })
    const other = createConvexStore({ url: url!, token: await newUser(`other-${run}@canto-learning.local`) })
    expect(await other.listWords()).toEqual([])
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

  it("adds words by hand, tagged manual, and sends them to the phone", async () => {
    const colloquial = `傾偈${run}`
    const { word, created } = await s().addWord({ colloquial: ` ${colloquial} `, jyutping: "king1 gai2", meaning: "" })
    expect(created).toBe(true)
    expect(word).toMatchObject({ colloquial, jyutping: "king1 gai2", meaning: null, source: "manual", timesAsked: 0 })
    const again = await s().addWord({ colloquial, jyutping: "ignored", meaning: "to chat" })
    expect(again).toMatchObject({ created: false, word: { id: word.id, jyutping: "king1 gai2", meaning: "to chat" } })
    const snap = await s().exportStudy()
    expect(snap.words.find((w) => w.id === word.id)).toMatchObject({ source: "manual", sources: [] })
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
