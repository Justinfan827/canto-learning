import "fake-indexeddb/auto"

import type { Dict } from "@pna/shared"
import { expect, it } from "vitest"

import { createLocalStore } from "./localStore"
import { createTutor, type TutorAi } from "./tutor"

const dict = async () => ({ 這麼: [["ze2 mo1", "so", "", 0]], 古怪: [["gu2 gwaai3", "strange", "", 0]] }) as Dict

const video = { id: "v1", title: "Vlog" }
const lines = ["大家好", "他沒有看到", "這麼古怪", "我們走吧"].map((text, idx) => ({ idx, startMs: idx * 2000, endMs: idx * 2000 + 2000, text }))

function fakeAi(calls: string[]): TutorAi {
  return {
    async convertLines({ targets, neighbours }) {
      calls.push(`convert ${targets.map((t) => t.idx)} ctx ${neighbours.map((n) => n.idx)}`)
      return targets.map((t) => ({ idx: t.idx, sourceRegister: "formal", textFormal: t.text, textColloquial: t.text.replace("這麼", "咁"), colloquialInferred: true }))
    },
    async *streamAnswer({ ctx, question }) {
      calls.push(`ask ${question} ${ctx.lines.map((l) => l.colloquial ?? l.text).join("|")}`)
      yield "咁 (gam3) "
      yield "means so."
    },
    async extractWords({ answer }) {
      calls.push(`extract ${answer}`)
      return [{ colloquial: "咁", formal: "這麼", jyutping: "gam3", meaning: "so", notes: null }]
    }
  }
}

it("converts with neighbours, caches explanations, streams answers and logs words", async () => {
  const calls: string[] = []
  const store = createLocalStore("tutor")
  const tutor = createTutor(store, fakeAi(calls), dict)
  await tutor.saveVideo(video, lines, "manual")

  const converted = await tutor.convert(video, [2])
  expect(converted.map((l) => l.textColloquial)).toEqual(["咁古怪"])
  expect(await tutor.convert(video, [2])).toHaveLength(1) // cached, no second AI call

  expect((await tutor.explain("這麼古怪")).map((w) => [w.text, w.jyutping])).toEqual([["這麼", "ze2 mo1"], ["古怪", "gu2 gwaai3"]])

  let answer = ""
  const logged = new Promise((resolve) => {
    ;(async () => {
      for await (const c of tutor.ask({ video, lineIdx: 2, atMs: 4500, question: "what's 咁?", context: lines.slice(0, 3), history: [] }, resolve)) answer += c
    })()
  })
  expect(await logged).toMatchObject({ words: [{ colloquial: "咁" }] })
  expect(answer).toBe("咁 (gam3) means so.")
  expect(calls).toEqual([
    "convert 2 ctx 0,1,3",
    "ask what's 咁? 大家好|他沒有看到|咁古怪",
    "extract 咁 (gam3) means so."
  ])
  const [word] = await store.listWords()
  expect((await store.getWord(word.id))?.encounters[0]).toMatchObject({ lineIdx: 2, startMs: 4000 })
})

it("works without AI: looks up and saves words, but won't ask", async () => {
  const store = createLocalStore("no-ai")
  const tutor = createTutor(store, null, dict)
  await tutor.saveVideo(video, lines, "manual")
  const [w] = await tutor.explain("古怪")
  await tutor.saveWord(w, { videoId: video.id, lineIdx: 2 })
  expect((await store.listWords()).map((x) => [x.colloquial, x.jyutping, x.meaning])).toEqual([["古怪", "gu2 gwaai3", "strange"]])
  await expect(tutor.convert(video, [1])).rejects.toThrow(/model/)
})
