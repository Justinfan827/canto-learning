import Anthropic from "@anthropic-ai/sdk"
import type { CaptionLine, ConvertedLine, LineWord } from "@pna/shared"
import { useCallback, useEffect, useRef, useState } from "react"

import { CONVERT_BATCH, type Tutor } from "./tutor"
import type { PlayerState } from "./usePlayer"

const CONTEXT_LINES = 5

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  pending?: boolean
  error?: boolean
}

function describe(e: unknown) {
  if (e instanceof Anthropic.AuthenticationError) return "Your Claude API key was rejected. Check it in settings."
  if (e instanceof Anthropic.RateLimitError) return "Claude is rate limiting requests. Try again in a moment."
  if (e instanceof Anthropic.APIConnectionError) return "Couldn't reach Claude. Check your connection."
  return e instanceof Error ? e.message : String(e)
}

/** Per-video tutor state for the side panel: conversions, word splits, chat. */
export function useTutor(tutor: Tutor | null, player: PlayerState) {
  const [converted, setConverted] = useState<Record<number, ConvertedLine>>({})
  const [explained, setExplained] = useState<Record<number, LineWord[] | "loading" | "error">>({})
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [logged, setLogged] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const savedCount = useRef(0)
  const video = player.video
  const videoId = video?.id ?? null

  useEffect(() => {
    setConverted({})
    setExplained({})
    setChat([])
    setLogged([])
    setError(null)
    savedCount.current = 0
  }, [videoId])

  const report = (e: unknown) => setError(describe(e))
  const addConverted = (lines: ConvertedLine[]) => setConverted((c) => ({ ...c, ...Object.fromEntries(lines.map((l) => [l.idx, l])) }))

  /** Saves lines the store hasn't seen; returns those still needing conversion. */
  const save = useCallback(async (): Promise<number[]> => {
    if (!tutor || !video || !player.lines.length || savedCount.current === player.lines.length) return []
    const { needsConversion } = await tutor.saveVideo(video, player.lines, player.captionKind ?? "manual")
    savedCount.current = player.lines.length
    return needsConversion
  }, [tutor, video, player.lines, player.captionKind])

  // A full caption file: load cached conversions, then convert the rest in batches from the current position.
  const trackLines = player.captionSource === "track" && player.lines.length ? player.lines : null
  useEffect(() => {
    if (!tutor || !video || !trackLines) return
    let cancelled = false
    ;(async () => {
      try {
        const todo = await save()
        const cached = await tutor.loadVideo(video.id)
        if (!cancelled && cached) addConverted(cached.lines.filter((l) => l.textColloquial))
        const start = todo.findIndex((i) => trackLines[i]?.endMs >= player.timeMs)
        const ordered = start > 0 ? [...todo.slice(start), ...todo.slice(0, start)] : todo
        for (let i = 0; i < ordered.length && !cancelled; i += CONVERT_BATCH) {
          const lines = await tutor.convert(video, ordered.slice(i, i + CONVERT_BATCH))
          if (!cancelled) addConverted(lines)
        }
      } catch (e) {
        if (!cancelled) report(e)
      }
    })()
    return () => {
      cancelled = true
    }
    // Runs once per caption file; timeMs only picks the starting batch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutor, videoId, trackLines])

  /** Screen-read captions arrive line by line, so convert just the lines around a pause. */
  const convertAround = useCallback(
    async (idx: number) => {
      if (!tutor || !video) return
      const todo = (await save()).filter((i) => i > idx - CONTEXT_LINES && i <= idx)
      if (todo.length) addConverted(await tutor.convert(video, todo))
    },
    [tutor, video, save]
  )

  const explain = useCallback(
    async (idx: number, retry = false) => {
      if (!tutor || !video || idx < 0 || (explained[idx] && !retry)) return
      setExplained((x) => ({ ...x, [idx]: "loading" }))
      try {
        await save()
        const words = await tutor.explain(video, idx)
        setExplained((x) => ({ ...x, [idx]: words }))
      } catch (e) {
        setExplained((x) => ({ ...x, [idx]: "error" }))
        report(e)
      }
    },
    [tutor, video, explained, save]
  )

  const ask = useCallback(
    async (question: string, lineIdx: number, onDone?: (answer: string) => void) => {
      if (!tutor || !video) return
      const context: CaptionLine[] = lineIdx >= 0 ? player.lines.slice(Math.max(0, lineIdx - CONTEXT_LINES + 1), lineIdx + 1) : []
      const history = chat.filter((m) => !m.error && !m.pending).map(({ role, content }) => ({ role, content }))
      setChat((c) => [...c, { role: "user", content: question }, { role: "assistant", content: "", pending: true }])
      let answer = ""
      try {
        await save()
        const onLogged = (r: { words: { colloquial: string }[] } | { error: unknown }) => {
          if ("words" in r) setLogged((l) => [...l, ...r.words.map((w) => w.colloquial)])
          else console.warn("Couldn't log words", r.error)
        }
        for await (const chunk of tutor.ask({ video, lineIdx: lineIdx >= 0 ? lineIdx : null, atMs: player.timeMs, question, context, history }, onLogged)) {
          answer += chunk
          setChat((c) => [...c.slice(0, -1), { role: "assistant", content: answer, pending: true }])
        }
        setChat((c) => [...c.slice(0, -1), { role: "assistant", content: answer }])
        onDone?.(answer)
      } catch (e) {
        setChat((c) => [...c.slice(0, -1), { role: "assistant", content: "Couldn't get an answer. Try again.", error: true }])
        report(e)
      }
    },
    [tutor, video, player.lines, player.timeMs, chat, save]
  )

  return { converted, explained, chat, logged, error, clearError: () => setError(null), explain, convertAround, ask }
}
