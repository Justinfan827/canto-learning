import { describe, expect, it } from "vitest"
import { lineAt, parseJson3, pickTrack } from "./captions"
import { schedule } from "./schedule"

describe("parseJson3", () => {
  it("parses events, skips appends and empties, clips overlaps", () => {
    const lines = parseJson3({
      events: [
        { tStartMs: 0, dDurationMs: 3000, segs: [{ utf8: "他沒有" }, { utf8: "看到" }] },
        { tStartMs: 2000, aAppend: 1, segs: [{ utf8: "\n" }] },
        { tStartMs: 2500, dDurationMs: 2000, segs: [{ utf8: "這麼\n古怪" }] },
        { tStartMs: 5000, dDurationMs: 1000, segs: [{ utf8: "  " }] },
      ],
    })
    expect(lines).toEqual([
      { idx: 0, startMs: 0, endMs: 2500, text: "他沒有看到" },
      { idx: 1, startMs: 2500, endMs: 4500, text: "這麼 古怪" },
    ])
  })
})

describe("pickTrack", () => {
  const t = (languageCode: string, kind?: string) => ({ baseUrl: languageCode + (kind ?? ""), languageCode, kind })
  it("prefers manual Cantonese over manual zh-HK over auto", () => {
    expect(pickTrack([t("zh-HK"), t("yue", "asr"), t("yue")])?.baseUrl).toBe("yue")
    expect(pickTrack([t("yue", "asr"), t("zh-TW")])?.baseUrl).toBe("zh-TW")
    expect(pickTrack([t("en"), t("yue", "asr")])?.baseUrl).toBe("yueasr")
    expect(pickTrack([t("en")])).toBeNull()
  })
})

describe("lineAt", () => {
  const lines = [0, 1000, 2000].map((s, idx) => ({ idx, startMs: s, endMs: s + 1000, text: "" }))
  it("finds the current line", () => {
    expect(lineAt(lines, -1)).toBe(-1)
    expect(lineAt(lines, 0)).toBe(0)
    expect(lineAt(lines, 1500)).toBe(1)
    expect(lineAt(lines, 9999)).toBe(2)
  })
})

describe("schedule", () => {
  it("grows on correct, resets on miss", () => {
    const w = { intervalDays: 2, ease: 2.5, timesMissed: 0 }
    expect(schedule(w, true, 0)).toMatchObject({ intervalDays: 5, ease: 2.5, dueAt: 5 * 86400000 })
    expect(schedule({ ...w, ease: 1.4 }, false, 0)).toMatchObject({ intervalDays: 1, ease: 1.3, timesMissed: 1 })
  })
})
