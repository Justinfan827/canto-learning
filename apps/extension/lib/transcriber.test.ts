import { expect, it } from "vitest"

import { pickEngine, type Engine } from "./transcriber"

const e = (id: string, unavailable: string | null = null): Engine => ({ id, label: id, languages: "", unavailable })

it("Auto picks the best installed Cantonese engine", () => {
  expect(pickEngine([e("sensevoice", "model not downloaded"), e("whisper-cpp-turbo")], "auto")?.id).toBe("whisper-cpp-turbo")
  expect(pickEngine([e("whisper-cpp-turbo"), e("sensevoice")], "auto")?.id).toBe("sensevoice")
  expect(pickEngine([e("sensevoice", "missing"), e("whisper-cpp-turbo", "missing")], "auto")).toBeNull()
})

it("uses a chosen engine when it's ready, else falls back to Auto", () => {
  const engines = [e("sensevoice"), e("whisper-cpp-turbo")]
  expect(pickEngine(engines, "whisper-cpp-turbo")?.id).toBe("whisper-cpp-turbo")
  expect(pickEngine([e("sensevoice"), e("whisper-cpp-turbo", "missing")], "whisper-cpp-turbo")?.id).toBe("sensevoice")
  // A removed engine left in settings falls back to Auto.
  expect(pickEngine(engines, "parakeet-v3")?.id).toBe("sensevoice")
})
