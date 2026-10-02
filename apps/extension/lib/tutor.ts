import type { CaptionKind, CaptionLine, ConvertedLine, LineWord, Store, TaughtWord, VideoInfo } from "@pna/shared"

import type { AskContext, ChatTurn } from "./ai"
import * as claude from "./ai"
import { openAiCompat } from "./openaiCompat"
import type { Settings } from "./settings"

/** The AI calls the tutor needs; swapped for fakes in tests. */
export interface TutorAi {
  convertLines(args: { title: string; targets: { idx: number; text: string }[]; neighbours: { idx: number; text: string }[] }): Promise<
    Pick<ConvertedLine, "idx" | "sourceRegister" | "textFormal" | "textColloquial" | "colloquialInferred">[]
  >
  explainLine(args: { title: string; before: string[]; line: string }): Promise<LineWord[]>
  streamAnswer(args: { ctx: AskContext; question: string; history: ChatTurn[] }): AsyncIterable<string>
  extractWords(args: { question: string; answer: string; knownWords: string[] }): Promise<TaughtWord[]>
}

export function claudeAi(apiKey: string): TutorAi {
  const c = claude.createClient(apiKey)
  return {
    convertLines: (a) => claude.convertLines(c, a),
    explainLine: (a) => claude.explainLine(c, a),
    streamAnswer: (a) => claude.streamAnswer(c, a),
    extractWords: (a) => claude.extractWords(c, a)
  }
}

/** The AI for the provider chosen in settings. */
export function aiFor(s: Settings): TutorAi {
  return s.provider === "claude" ? claudeAi(s.apiKey) : openAiCompat({ baseUrl: s.openaiBaseUrl, apiKey: s.openaiKey, model: s.openaiModel })
}

export const CONVERT_BATCH = 40
const NEIGHBOURS = 3

export interface AskArgs {
  video: VideoInfo
  lineIdx: number | null
  atMs: number
  question: string
  /** Caption lines up to the pause, oldest first. */
  context: CaptionLine[]
  history: ChatTurn[]
}

/** App logic over a Store and the AI: what the side panel calls. */
export function createTutor(store: Store, ai: TutorAi) {
  return {
    saveVideo: (video: VideoInfo, lines: CaptionLine[], kind: CaptionKind) => store.putVideo(video, lines, kind),
    loadVideo: (videoId: string) => store.getVideo(videoId),

    /** Converts up to CONVERT_BATCH lines to both registers and stores them. */
    async convert(video: VideoInfo, idxs: number[]): Promise<ConvertedLine[]> {
      if (!idxs.length) return []
      const lo = Math.min(...idxs) - NEIGHBOURS
      const hi = Math.max(...idxs) + NEIGHBOURS
      const range = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((i) => i >= 0)
      const rows = await store.getLines(video.id, range)
      const want = new Set(idxs)
      const targets = rows.filter((r) => want.has(r.idx) && !r.textColloquial).map((r) => ({ idx: r.idx, text: r.text }))
      const neighbours = rows.filter((r) => !want.has(r.idx)).map((r) => ({ idx: r.idx, text: r.text }))
      if (targets.length) await store.saveConversions(video.id, await ai.convertLines({ title: video.title, targets, neighbours }))
      return (await store.getLines(video.id, idxs)).filter((l) => l.textColloquial)
    },

    /** Splits a line into words, cached per line. */
    async explain(video: VideoInfo, idx: number): Promise<LineWord[]> {
      const rows = await store.getLines(video.id, [idx - 2, idx - 1, idx].filter((i) => i >= 0))
      const line = rows.find((r) => r.idx === idx)
      if (!line) throw new Error("Line not saved yet")
      if (line.words) return line.words
      const words = await ai.explainLine({ title: video.title, before: rows.filter((r) => r.idx < idx).map((r) => r.text), line: line.text })
      await store.saveLineWords(video.id, idx, words)
      return words
    },

    /**
     * Streams the answer. When it finishes, the question is saved and the words
     * it taught are logged; `onLogged` reports them (or the error) afterwards.
     */
    async *ask(args: AskArgs, onLogged?: (result: { words: TaughtWord[] } | { error: unknown }) => void): AsyncGenerator<string> {
      const stored = new Map((await store.getLines(args.video.id, args.context.map((l) => l.idx))).map((l) => [l.idx, l]))
      const knownWords = await store.knownWords()
      const ctx: AskContext = {
        title: args.video.title,
        channel: args.video.channel,
        knownWords,
        lines: args.context.map((l) => ({ text: l.text, colloquial: stored.get(l.idx)?.textColloquial, inferred: stored.get(l.idx)?.colloquialInferred }))
      }
      let answer = ""
      for await (const chunk of ai.streamAnswer({ ctx, question: args.question, history: args.history })) {
        answer += chunk
        yield chunk
      }
      ;(async () => {
        await store.saveQuestion({ videoId: args.video.id, lineIdx: args.lineIdx, atMs: args.atMs, question: args.question, answer })
        const words = answer ? await ai.extractWords({ question: args.question, answer, knownWords }) : []
        for (const w of words) await store.logTaughtWord(w, { videoId: args.video.id, lineIdx: args.lineIdx })
        return words
      })().then(
        (words) => onLogged?.({ words }),
        (error) => onLogged?.({ error })
      )
    }
  }
}

export type Tutor = ReturnType<typeof createTutor>
