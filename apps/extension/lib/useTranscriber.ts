import { pickTrack, sortLines, type CaptionLine } from "@pna/shared"
import { useEffect, useRef, useState } from "react"

import { listEngines, pickEngine, transcribe, type Engine } from "./transcriber"
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

/** Engines that write spoken Cantonese, and the ones whose written-Chinese output pairs with them. */
const SPOKEN_ENGINES = ["sensevoice"]
const WRITTEN_ENGINES = ["whisper-cpp-turbo"]

/** How long to wait for a caption track before deciding there is none. */
const SETTLE_MS = 1500
const RECHECK_MS = 8000
const FLUSH_MS = 300

/**
 * Local transcription: the fallback when a video has no Cantonese or Chinese track, or the user's
 * pick over YouTube's captions (`preferLocal`). Starts from the playhead without being asked.
 */
export function useTranscriber(
  player: PlayerState,
  engineSetting: string,
  preferLocal: boolean,
  setLocalCaptions: (videoId: string, lines: CaptionLine[]) => void,
  /** False while another page (the side panel) is already transcribing this video. */
  enabled = true
) {
  const [status, setStatus] = useState<TranscriberStatus>({ kind: "off" })
  const [attempt, setAttempt] = useState(0)
  /** A second, written-Chinese transcript of the same audio, for the 書面語 view. */
  const [written, setWritten] = useState<CaptionLine[] | null>(null)
  const videoId = player.video?.id ?? null
  const needed = enabled && !!videoId && (preferLocal || (!pickTrack(player.tracks) && player.captionSource !== "track" && player.captionSource !== "screen"))
  /** The helper's engines, for the caption-source menu; null when the helper isn't running. */
  const [engines, setEngines] = useState<Engine[] | null>(null)
  useEffect(() => {
    let live = true
    listEngines().then((e) => live && setEngines(e))
    return () => {
      live = false
    }
  }, [videoId, attempt])
  const timeRef = useRef(player.timeMs)
  timeRef.current = player.timeMs
  const sendRef = useRef(setLocalCaptions)
  sendRef.current = setLocalCaptions
  /** The last run's inputs, to tell a switch of model on the same video from opening a new one. */
  const prev = useRef({ videoId, engineSetting, preferLocal })

  useEffect(() => {
    setWritten(null)
    const switched = prev.current.videoId === videoId && (prev.current.engineSetting !== engineSetting || prev.current.preferLocal !== preferLocal)
    prev.current = { videoId, engineSetting, preferLocal }
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
        // SenseVoice writes what was said; Whisper writes it as standard Chinese. Run Whisper
        // afterwards, quietly, so the 書面語 view works.
        const writer = SPOKEN_ENGINES.includes(engine.id) ? engines.find((e) => WRITTEN_ENGINES.includes(e.id) && !e.unavailable) : null
        if (writer) {
          const out: CaptionLine[] = []
          try {
            for await (const ev of transcribe(videoId, writer.id, timeRef.current, ctl.signal)) {
              if (ev.type === "line") out.push(ev.line)
              else if (ev.type === "done") setWritten(sortLines(out))
              else if (ev.type === "error") break
            }
          } catch (e) {
            // The spoken transcript is what matters; without the written one the switch just stays off.
            if (!ctl.signal.aborted) console.warn("Written transcript failed", e)
          }
        }
      } catch (e) {
        if (!ctl.signal.aborted) setStatus({ kind: "error", message: e instanceof Error ? e.message : String(e) })
      }
    }
    if (switched) {
      // The user picked another source: drop the old transcript and start at once.
      sendRef.current(videoId, [])
      setStatus({ kind: "checking" })
    }
    timer = window.setTimeout(run, switched ? 0 : SETTLE_MS)
    return () => {
      ctl.abort()
      clearTimeout(timer)
      clearTimeout(flushTimer)
    }
  }, [needed, videoId, engineSetting, preferLocal, attempt])

  return { status, written, engines, retry: () => setAttempt((n) => n + 1) }
}
