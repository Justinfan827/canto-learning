import { expect, it } from "vitest"

import { pickEngine, type Engine } from "./transcriber"

const e = (id: string, unavailable: string | null = null): Engine => ({ id, label: id, languages: "", unavailable })

it("Auto picks the best installed Cantonese engine", () => {
  expect(pickEngine([e("parakeet-v3"), e("whisper-turbo"), e("whisper-cpp-turbo", "not installed")], "auto")?.id).toBe("whisper-turbo")
  expect(pickEngine([e("whisper-cpp-turbo"), e("sensevoice")], "auto")?.id).toBe("sensevoice")
  expect(pickEngine([e("parakeet-v3")], "auto")).toBeNull()
})

it("uses a chosen engine when it's ready, else falls back to Auto", () => {
  const engines = [e("whisper-cpp-turbo"), e("parakeet-v3"), e("whisper-medium", "missing")]
  expect(pickEngine(engines, "parakeet-v3")?.id).toBe("parakeet-v3")
  expect(pickEngine(engines, "whisper-medium")?.id).toBe("whisper-cpp-turbo")
})
