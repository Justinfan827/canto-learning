import { describe, expect, it } from "vitest"

import { cleanName, normalizeCode, progressOf } from "./squads"

describe("squads", () => {
  it("counts words marked known or with a three-week interval as learned", () => {
    expect(
      progressOf([
        { status: "known", intervalDays: 0 },
        { status: "learning", intervalDays: 21 },
        { status: "learning", intervalDays: 6 }
      ])
    ).toEqual({ learned: 2, saved: 3 })
  })

  it("reads codes however they're typed", () => {
    expect(normalizeCode(" ab2 c-d3 ")).toBe("AB2CD3")
  })

  it("trims names and rejects empty or long ones", () => {
    expect(cleanName("  Ka   Yan ")).toBe("Ka Yan")
    expect(() => cleanName("   ")).toThrow(/Pick a name/)
    expect(() => cleanName("x".repeat(25))).toThrow(/under 25/)
  })
})
