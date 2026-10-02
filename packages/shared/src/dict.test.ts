import { expect, it } from "vitest"

import { lookup, regroup, segment, type Dict } from "./dict"

const dict: Dict = {
  佢: [["keoi5", "he; she; it", "他", 1]],
  冇: [["mou5", "to not have", "沒有", 1]],
  睇: [["tai2", "to look at", "看", 1]],
  睇到: [["tai2 dou2", "to see", "", 1]],
  古怪: [["gu2 gwaai3", "strange", "", 0]],
  咁: [["gam3", "so", "這樣", 1]],
  这样: "這樣",
  這樣: [["ze5 joeng6", "like this", "", 0]],
  也: [["jaa5", "also", "", 0]],
  也不: [["jaa5 bat1", "nor", "", 0]],
  不知道: [["bat1 zi1 dou3", "don't know", "", 0]],
  知道: [["zi1 dou3", "to know", "", 0]]
}

it("splits by longest match, keeping English and dropping punctuation", () => {
  expect(segment("佢冇睇到，咁古怪 OK!", dict)).toEqual(["佢", "冇", "睇到", "咁", "古怪", "OK"])
  expect(segment("佢喺度", dict)).toEqual(["佢", "喺", "度"])
  expect(segment("也不知道", dict)).toEqual(["也", "不知道"])
})

it("looks up words, following Simplified aliases and marking register pairs", () => {
  expect(lookup("冇", dict)).toMatchObject({ jyutping: "mou5", meaning: "to not have", colloquial: "冇", formal: "沒有" })
  expect(lookup("这样", dict)).toMatchObject({ jyutping: "ze5 joeng6", formal: null })
  expect(lookup("佢冇", dict)).toMatchObject({ jyutping: "keoi5 mou5", meaning: "" })
})

it("regroups a line by character range", () => {
  const words = ["也不", "知道", "為什麼"]
  expect(regroup(words, 1, 4)).toEqual(["也", "不知道", "為什麼"]) // merge across a boundary
  expect(regroup(words, 4, 5)).toEqual(["也不", "知道", "為", "什麼"]) // split a word
  expect(regroup(words, 0, 7)).toEqual(["也不知道為什麼"])
  expect(regroup(words, 2, 2)).toEqual(words)
})
