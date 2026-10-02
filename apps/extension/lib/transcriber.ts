import type { CaptionLine } from "@pna/shared"

/** The local helper in apps/transcriber, which runs speech models on this computer. */
export const TRANSCRIBER_URL = "http://127.0.0.1:8787"

export interface Engine {
  id: string
  label: string
  languages: string
  /** Why it can't run, or null when ready. */
  unavailable: string | null
}

/** Best first. Parakeet has no Chinese, so Auto never picks it. */
const AUTO_ORDER = ["sensevoice", "whisper-cpp-turbo", "whisper-turbo", "whisper-medium"]

export async function listEngines(): Promise<Engine[] | null> {
  try {
    const r = await fetch(`${TRANSCRIBER_URL}/engines`)
    return r.ok ? (await r.json()).engines : null
  } catch {
    return null
  }
}

/** The engine to run for a setting: the chosen one if it's ready, else the best installed one for Cantonese. */
export function pickEngine(engines: Engine[], setting: string): Engine | null {
  const ready = (id: string) => engines.find((e) => e.id === id && !e.unavailable) ?? null
  if (setting !== "auto" && ready(setting)) return ready(setting)
  for (const id of AUTO_ORDER) if (ready(id)) return ready(id)
  return null
}

export type TranscribeEvent =
  | { type: "progress"; stage: string; pass?: 1 | 2; fromMs?: number; durationMs?: number }
  | { type: "line"; line: CaptionLine }
  | { type: "done" }
  | { type: "error"; message: string }

/**
 * Streams a video's transcript from the helper, starting at `fromMs` and then filling in the start.
 * Resumes a job already running for the same video and engine.
 */
export async function* transcribe(videoId: string, engine: string, fromMs: number, signal?: AbortSignal): AsyncGenerator<TranscribeEvent> {
  const q = new URLSearchParams({ v: videoId, engine, from: String(Math.max(0, Math.round(fromMs))) })
  const r = await fetch(`${TRANSCRIBER_URL}/transcribe?${q}`, { signal })
  if (!r.ok || !r.body) throw new Error((await r.text().catch(() => "")) || `Transcriber error ${r.status}`)
  const reader = r.body.pipeThrough(new TextDecoderStream()).getReader()
  let buf = ""
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    buf += value
    let nl: number
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (line) yield JSON.parse(line)
    }
  }
}
