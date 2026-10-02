import Anthropic from "@anthropic-ai/sdk"
import type { CaptionLine, ConvertedLine, LineWord, TaughtWord } from "@pna/shared"
import { useCallback, useEffect, useRef, useState } from "react"

import { ProviderError } from "./openaiCompat"
import { CONVERT_BATCH, type Tutor } from "./tutor"
import type { PlayerState } from "./usePlayer"

const CONTEXT_LINES = 5

export interface ChatMessage {
  id: number
  role: "user" | "assistant"
  content: string
  /** The line the question was about; answers show under that line's card. */
  lineIdx: number
  pending?: boolean
  error?: boolean
  /** Words the answer taught, offered as Save chips. */
  taught?: TaughtWord[]
}

function describe(e: unknown) {
  if (e instanceof Anthropic.AuthenticationError) return "Your Claude API key was rejected. Check it in settings."
  if (e instanceof Anthropic.RateLimitError) return "Claude is rate limiting requests. Try again in a moment."
  if (e instanceof Anthropic.APIConnectionError) return "Couldn't reach Claude. Check your connection."
  if (e instanceof ProviderError) {
    if (e.status === 401) return "Your API key was rejected. Check it in settings."
    if (e.status === 429) return "The model is rate limiting requests (free models have low limits). Try again in a moment, or pick another model in settings."
    if (e.status === 0) return `${e.message}. Check your connection or server.`
    return `Model error: ${e.message}`
  }
  return e instanceof Error ? e.message : String(e)
}

/** Per-video tutor state for the side panel: conversions and the tutor's answers. */
export function useTutor(tutor: Tutor | null, player: PlayerState) {
  const [converted, setConverted] = useState<Record<number, ConvertedLine>>({})
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const savedCount = useRef(0)
  const nextId = useRef(0)
  const video = player.video
  const videoId = video?.id ?? null

  useEffect(() => {
    setConverted({})
    setChat([])
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

  // A new tutor (e.g. a model was just set up) re-checks which lines still need converting.
  useEffect(() => {
    savedCount.current = 0
  }, [tutor])

  // A full caption file: load cached conversions, then convert the rest in batches from the current position.
  const trackLines = player.captionSource === "track" && player.lines.length ? player.lines : null
  useEffect(() => {
    if (!tutor || !video || !trackLines) return
    let cancelled = false
    if (!tutor.hasAi) return
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
      if (!tutor?.hasAi || !video) return
      const todo = (await save()).filter((i) => i > idx - CONTEXT_LINES && i <= idx)
      if (todo.length) addConverted(await tutor.convert(video, todo))
    },
    [tutor, video, save]
  )

  const saveWord = useCallback(
    async (w: LineWord, lineIdx: number) => {
      if (!tutor || !video) return
      try {
        await save()
        await tutor.saveWord(w, { videoId: video.id, lineIdx })
      } catch (e) {
        report(e)
      }
    },
    [tutor, video, save]
  )

  const saveTaught = useCallback(
    async (w: TaughtWord, lineIdx: number) => {
      if (!tutor || !video) return
      try {
        await save()
        await tutor.saveTaught(w, { videoId: video.id, lineIdx })
      } catch (e) {
        report(e)
      }
    },
    [tutor, video, save]
  )

  const ask = useCallback(
    async (question: string, lineIdx: number, onDone?: (answer: string) => void) => {
      if (!tutor?.hasAi || !video) return
      const context: CaptionLine[] = lineIdx >= 0 ? player.lines.slice(Math.max(0, lineIdx - CONTEXT_LINES + 1), lineIdx + 1) : []
      const history = chat.filter((m) => !m.error && !m.pending).map(({ role, content }) => ({ role, content }))
      const id = ++nextId.current
      setChat((c) => [...c, { id: id - 0.5, role: "user", content: question, lineIdx }, { id, role: "assistant", content: "", lineIdx, pending: true }])
      const update = (m: Partial<ChatMessage>) => setChat((c) => c.map((x) => (x.id === id ? { ...x, ...m } : x)))
      let answer = ""
      try {
        await save()
        const onTaught = (r: { words: TaughtWord[] } | { error: unknown }) => {
          if ("words" in r) update({ taught: r.words })
          else console.warn("Couldn't pick out taught words", r.error)
        }
        for await (const chunk of tutor.ask({ video, lineIdx: lineIdx >= 0 ? lineIdx : null, atMs: player.timeMs, question, context, history }, onTaught)) {
          answer += chunk
          update({ content: answer })
        }
        update({ content: answer, pending: false })
        onDone?.(answer)
      } catch (e) {
        update({ content: "Couldn't get an answer. Try again.", pending: false, error: true })
        report(e)
      }
    },
    [tutor, video, player.lines, player.timeMs, chat, save]
  )

  return { converted, chat, error, clearError: () => setError(null), saveWord, saveTaught, convertAround, ask }
}
