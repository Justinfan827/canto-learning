import { expect, it } from "vitest"

import { senses, type Dict } from "./dict"
import { alignByTime, rubyPairs, sortLines, trackLabel, transcriptCoverage } from "./reading"

it("pairs characters with syllables, or keeps the word whole when counts differ", () => {
  expect(rubyPairs("好正", "hou2 zeng3")).toEqual([
    ["好", "hou2"],
    ["正", "zeng3"]
  ])
  expect(rubyPairs("OK", "")).toEqual([["OK", ""]])
  expect(rubyPairs("三十幾年", "saam1 sap6")).toEqual([["三十幾年", "saam1 sap6"]])
})

it("labels caption tracks", () => {
  expect(trackLabel({ baseUrl: "", languageCode: "yue" })).toBe("YouTube captions · 粵語")
  expect(trackLabel({ baseUrl: "", languageCode: "zh-TW", kind: "asr" })).toBe("YouTube captions · 中文 (auto)")
})

it("measures transcription coverage across both passes", () => {
  const line = (startMs: number, endMs: number) => ({ idx: 0, startMs, endMs, text: "x" })
  const job = { fromMs: 60_000, durationMs: 120_000, pass: 1 as const, done: false }
  expect(transcriptCoverage([], job)).toEqual({ frontierMs: 60_000, fillMs: 0, fraction: 0 })
  expect(transcriptCoverage([line(60_000, 90_000)], job)).toEqual({ frontierMs: 90_000, fillMs: 0, fraction: 0.25 })
  expect(transcriptCoverage([line(0, 30_000)], { ...job, pass: 2 })).toEqual({ frontierMs: 120_000, fillMs: 30_000, fraction: 0.75 })
  expect(transcriptCoverage([], { ...job, done: true }).fraction).toBe(1)
})

it("sorts out-of-order lines and renumbers them", () => {
  const lines = sortLines([
    { idx: 0, startMs: 5000, endMs: 6000, text: "b" },
    { idx: 1, startMs: 1000, endMs: 2000, text: "a" }
  ])
  expect(lines.map((l) => [l.idx, l.text])).toEqual([
    [0, "a"],
    [1, "b"]
  ])
})

it("lists senses for the word sheet", () => {
  const dict: Dict = {
    好正: [["hou2 zeng3", "really great; awesome", "很好", 1]],
    正: [
      ["zeng3", "upright", "", 0],
      ["zing3", "exactly", "", 0]
    ]
  }
  expect(senses("好正", dict)).toEqual([
    { jyutping: "hou2 zeng3", gloss: "really great", formal: "很好" },
    { jyutping: "hou2 zeng3", gloss: "awesome", formal: "很好" }
  ])
  expect(senses("正", dict).map((s) => s.gloss)).toEqual(["upright", "exactly"])
  expect(senses("無", dict)).toEqual([])
})

it("pairs a second transcript's lines with the lines they overlap most", () => {
  const l = (idx: number, startMs: number, endMs: number, text: string) => ({ idx, startMs, endMs, text })
  const spoken = [l(0, 0, 3000, "我而家咧"), l(1, 3000, 7000, "係坐咗喺入邊")]
  const written = [l(0, 100, 2800, "我現在呢"), l(1, 2900, 5000, "是坐在"), l(2, 5000, 7200, "裡面"), l(3, 9000, 9500, "好")]
  expect([...alignByTime(spoken, written)]).toEqual([
    [0, "我現在呢"],
    [1, "是坐在裡面"]
  ])
})
