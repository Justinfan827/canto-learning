import "fake-indexeddb/auto"

import { splitLine, type Dict } from "@pna/shared"
import { expect, it } from "vitest"

import { createLocalStore } from "./data/localStore"
import { createWords } from "./words"

const dict = { 這麼: [["ze2 mo1", "so", "", 0]], 古怪: [["gu2 gwaai3", "strange", "", 0]] } as Dict

const video = { id: "v1", title: "Vlog" }
const lines = ["大家好", "他沒有看到", "這麼古怪", "我們走吧"].map((text, idx) => ({ idx, startMs: idx * 2000, endMs: idx * 2000 + 2000, text }))

it("saves words with the moment they came from", async () => {
  const store = createLocalStore("words")
  const words = createWords(store)
  await words.saveVideo(video, lines, "manual")
  const [w] = splitLine("古怪", dict)
  await words.saveWord(w, { videoId: video.id, lineIdx: 2 })
  const [saved] = await store.listWords()
  expect([saved.colloquial, saved.jyutping, saved.meaning]).toEqual(["古怪", "gu2 gwaai3", "strange"])
  expect((await store.getWord(saved.id))?.encounters[0]).toMatchObject({ lineIdx: 2, startMs: 4000 })
})
