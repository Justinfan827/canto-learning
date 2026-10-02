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

export async function listEngines(): Promise<Engine[] | null> {
  try {
    const r = await fetch(`${TRANSCRIBER_URL}/engines`)
    return r.ok ? (await r.json()).engines : null
  } catch {
    return null
  }
}

export type TranscribeEvent = { type: "progress"; stage: string } | { type: "line"; line: CaptionLine } | { type: "done" } | { type: "error"; message: string }

/** Streams a video's transcript from the helper; resumes a job already running for the same video and engine. */
export async function* transcribe(videoId: string, engine: string, signal?: AbortSignal): AsyncGenerator<TranscribeEvent> {
  const r = await fetch(`${TRANSCRIBER_URL}/transcribe?v=${encodeURIComponent(videoId)}&engine=${encodeURIComponent(engine)}`, { signal })
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
