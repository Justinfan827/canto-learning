import type { CaptionLine } from "@pna/shared"
import { useEffect, useRef, useState } from "react"

import { listEngines, transcribe, type Engine } from "~lib/transcriber"

/** For videos without captions: pick a local speech model and transcribe the audio on this computer. */
export function Transcribe(props: { videoId: string; engine: string; hasLines: boolean; onEngine: (id: string) => void; onLines: (lines: CaptionLine[]) => void }) {
  const [engines, setEngines] = useState<Engine[] | null | "loading">("loading")
  const [stage, setStage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)

  const refresh = () => {
    setEngines("loading")
    listEngines().then(setEngines)
  }
  useEffect(() => {
    refresh()
    return () => abort.current?.abort()
  }, [])
  useEffect(() => () => abort.current?.abort(), [props.videoId])

  const start = async () => {
    abort.current?.abort()
    const ctl = (abort.current = new AbortController())
    setError(null)
    setStage("Starting")
    const lines: CaptionLine[] = []
    try {
      for await (const ev of transcribe(props.videoId, props.engine, ctl.signal)) {
        if (ev.type === "progress") setStage(ev.stage)
        else if (ev.type === "line") {
          lines.push(ev.line)
          props.onLines([...lines])
        } else if (ev.type === "error") throw new Error(ev.message)
        else if (ev.type === "done") setStage(null)
      }
    } catch (e) {
      if (!ctl.signal.aborted) {
        setError(e instanceof Error ? e.message : String(e))
        setStage(null)
      }
    }
  }

  if (engines === "loading") return <p className="muted pad">Looking for the local transcriber…</p>
  if (!engines)
    return (
      <div className="pad">
        <p>This video has no captions. To transcribe it on this computer, start the helper:</p>
        <pre>node apps/transcriber/server.mjs</pre>
        <button className="link" onClick={refresh}>
          Check again
        </button>
      </div>
    )

  const chosen = engines.find((e) => e.id === props.engine) ?? engines.find((e) => !e.unavailable)
  if (props.hasLines && !stage && !error)
    return (
      <div className="transcribe-done muted">
        Transcribed locally.{" "}
        <select value={chosen?.id} onChange={(e) => props.onEngine(e.target.value)}>
          {engines.map((e) => (
            <option key={e.id} value={e.id} disabled={!!e.unavailable}>
              {e.label}
            </option>
          ))}
        </select>{" "}
        <button className="link" onClick={start}>
          Run again
        </button>
      </div>
    )
  return (
    <div className="pad transcribe">
      <p>No captions here. Transcribe the audio with a local model:</p>
      <select value={chosen?.id} onChange={(e) => props.onEngine(e.target.value)} disabled={!!stage}>
        {engines.map((e) => (
          <option key={e.id} value={e.id} disabled={!!e.unavailable}>
            {e.label}
            {e.unavailable ? ` (${e.unavailable})` : ""}
          </option>
        ))}
      </select>
      {chosen && <p className="muted">{chosen.languages}</p>}
      {stage ? (
        <p className="muted">{stage}…</p>
      ) : (
        <button className="primary" disabled={!chosen || !!chosen.unavailable} onClick={start}>
          Transcribe
        </button>
      )}
      {error && <p className="warn">{error}</p>}
    </div>
  )
}
