import { expect, it } from "vitest"

import { parseJsonReply, readDeltas } from "./openaiCompat"

it("parses JSON replies wrapped in fences or text", () => {
  expect(parseJsonReply('```json\n{"words":[]}\n```')).toEqual({ words: [] })
  expect(parseJsonReply("Sure! {\"a\":1} hope that helps")).toEqual({ a: 1 })
  expect(parseJsonReply("no json")).toBeNull()
})

it("reads streamed deltas across chunk boundaries, skipping comments", async () => {
  const sse = ': OPENROUTER PROCESSING\n\ndata: {"choices":[{"delta":{"content":"咁 "}}]}\n\ndata: {"choices":[{"delta":{"content":"(gam3)"}}]}\n\ndata: [DONE]\n\n'
  const bytes = new TextEncoder().encode(sse)
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      for (let i = 0; i < bytes.length; i += 7) c.enqueue(bytes.slice(i, i + 7))
      c.close()
    }
  })
  let out = ""
  for await (const t of readDeltas(body)) out += t
  expect(out).toBe("咁 (gam3)")
})
