import { pickTrack, sortLines, type CaptionLine } from "@pna/shared"
import { useEffect, useRef, useState } from "react"

import { listEngines, pickEngine, transcribe } from "./transcriber"
import type { PlayerState } from "./usePlayer"

export interface TranscribeJob {
  engine: string
  stage: string
  pass: 1 | 2
  fromMs: number
  durationMs: number
}

export type TranscriberStatus =
  | { kind: "off" }
  | { kind: "checking" }
  /** The helper isn't running. */
  | { kind: "missing" }
  /** The helper runs but has no speech model for Cantonese. */
  | { kind: "no-engine" }
  | ({ kind: "running" } & TranscribeJob)
  | { kind: "done"; engine: string }
  | { kind: "error"; message: string }

/** How long to wait for a caption track before deciding there is none. */
const SETTLE_MS = 1500
const RECHECK_MS = 8000
const FLUSH_MS = 300

/**
 * The last step of the caption-source order: when a video has no Cantonese or Chinese track,
 * transcribe it on this computer from the playhead, without being asked.
 */
export function useTranscriber(player: PlayerState, engineSetting: string, setLocalCaptions: (videoId: string, lines: CaptionLine[]) => void) {
  const [status, setStatus] = useState<TranscriberStatus>({ kind: "off" })
  const [attempt, setAttempt] = useState(0)
  const videoId = player.video?.id ?? null
  const needed = !!videoId && !pickTrack(player.tracks) && player.captionSource !== "track" && player.captionSource !== "screen"
  const timeRef = useRef(player.timeMs)
  timeRef.current = player.timeMs
  const sendRef = useRef(setLocalCaptions)
  sendRef.current = setLocalCaptions

  useEffect(() => {
    if (!needed || !videoId) {
      setStatus({ kind: "off" })
      return
    }
    const ctl = new AbortController()
    let timer: number | undefined
    let flushTimer: number | undefined

    const run = async () => {
      setStatus({ kind: "checking" })
      const engines = await listEngines()
      if (ctl.signal.aborted) return
      if (!engines) {
        setStatus({ kind: "missing" })
        timer = window.setTimeout(run, RECHECK_MS)
        return
      }
      const engine = pickEngine(engines, engineSetting)
      if (!engine) return setStatus({ kind: "no-engine" })

      const lines: CaptionLine[] = []
      const flush = () => {
        flushTimer = undefined
        sendRef.current(videoId, sortLines(lines))
      }
      let job: TranscribeJob = { engine: engine.label, stage: "Starting", pass: 1, fromMs: 0, durationMs: 0 }
      setStatus({ kind: "running", ...job })
      let finished = false
      try {
        for await (const ev of transcribe(videoId, engine.id, timeRef.current, ctl.signal)) {
          if (ev.type === "progress") {
            job = { ...job, stage: ev.stage, pass: ev.pass ?? job.pass, fromMs: ev.fromMs ?? job.fromMs, durationMs: ev.durationMs ?? job.durationMs }
            setStatus({ kind: "running", ...job })
          } else if (ev.type === "line") {
            lines.push(ev.line)
            flushTimer ??= window.setTimeout(flush, FLUSH_MS)
          } else if (ev.type === "error") throw new Error(ev.message)
          else if (ev.type === "done") finished = true
        }
        if (!finished) throw new Error("The transcriber stopped before finishing.")
        if (!lines.length) throw new Error(`${engine.label} returned no lines for this video. Try another model in settings.`)
        clearTimeout(flushTimer)
        flush()
        setStatus({ kind: "done", engine: engine.label })
      } catch (e) {
        if (!ctl.signal.aborted) setStatus({ kind: "error", message: e instanceof Error ? e.message : String(e) })
      }
    }
    timer = window.setTimeout(run, SETTLE_MS)
    return () => {
      ctl.abort()
      clearTimeout(timer)
      clearTimeout(flushTimer)
    }
  }, [needed, videoId, engineSetting, attempt])

  return { status, retry: () => setAttempt((n) => n + 1) }
}
