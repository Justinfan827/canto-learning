import { expect, it } from "vitest"
import { diffSegments } from "./diff"

it("highlights the changed characters", () => {
  expect(diffSegments("佢冇睇到", "他沒有看到")).toEqual([
    { text: "佢冇睇", changed: true },
    { text: "到", changed: false },
  ])
  expect(diffSegments("咁古怪", "這麼古怪")).toEqual([
    { text: "咁", changed: true },
    { text: "古怪", changed: false },
  ])
  expect(diffSegments("", "abc")).toEqual([])
})
