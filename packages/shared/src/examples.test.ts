import { describe, expect, it } from "vitest"

import { examplesFor, type Examples } from "./examples"

const examples: Examples = {
  sources: [{ name: "Tatoeba", license: "CC BY 2.0 FR", url: "https://tatoeba.org" }],
  sentences: [
    ["我鍾意睇書。", "ngo5 zung1 ji3 tai2 syu1", "I love reading books.", 0],
    ["我哋未食飯。", "ngo5 dei6 mei6 sik6 faan6", "We haven't eaten yet.", 0],
    ["佢鍾意咗佢。", "keoi5 zung1 ji3 zo2 keoi5", "He fell in love with her.", 0]
  ],
  words: { 鍾意: [0, 2], 食飯: [1] }
}

describe("examplesFor", () => {
  it("returns the word's sentences in order with their source", () => {
    expect(examplesFor("鍾意", examples)).toEqual([
      { yue: "我鍾意睇書。", jyutping: "ngo5 zung1 ji3 tai2 syu1", english: "I love reading books.", source: "Tatoeba" },
      { yue: "佢鍾意咗佢。", jyutping: "keoi5 zung1 ji3 zo2 keoi5", english: "He fell in love with her.", source: "Tatoeba" }
    ])
  })

  it("caps the count and handles words with none", () => {
    expect(examplesFor("鍾意", examples, 1)).toHaveLength(1)
    expect(examplesFor("返工", examples)).toEqual([])
  })
})

describe("examplesFor fallback", () => {
  it("finds sentences containing a phrase the index doesn't list", () => {
    expect(examplesFor("睇書", examples).map((e) => e.yue)).toEqual(["我鍾意睇書。"])
    expect(examplesFor("睇", examples)).toEqual([])
  })
})
