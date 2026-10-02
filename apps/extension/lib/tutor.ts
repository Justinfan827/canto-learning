import { splitLine, type CaptionKind, type CaptionLine, type ConvertedLine, type Dict, type LineWord, type Store, type TaughtWord, type VideoInfo } from "@pna/shared"

import type { AskContext, ChatTurn } from "./ai"
import * as claude from "./ai"
import { openAiCompat } from "./openaiCompat"
import { isConfigured, type Settings } from "./settings"

/** The AI calls the tutor needs; swapped for fakes in tests. */
export interface TutorAi {
  convertLines(args: { title: string; targets: { idx: number; text: string }[]; neighbours: { idx: number; text: string }[] }): Promise<
    Pick<ConvertedLine, "idx" | "sourceRegister" | "textFormal" | "textColloquial" | "colloquialInferred">[]
  >
  streamAnswer(args: { ctx: AskContext; question: string; history: ChatTurn[] }): AsyncIterable<string>
  extractWords(args: { question: string; answer: string; knownWords: string[] }): Promise<TaughtWord[]>
}

export function claudeAi(apiKey: string): TutorAi {
  const c = claude.createClient(apiKey)
  return {
    convertLines: (a) => claude.convertLines(c, a),
    streamAnswer: (a) => claude.streamAnswer(c, a),
    extractWords: (a) => claude.extractWords(c, a)
  }
}

/** The AI for the provider chosen in settings, or null when none is set up. */
export function aiFor(s: Settings): TutorAi | null {
  if (!isConfigured(s)) return null
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

/**
 * App logic over a Store, the offline dictionary and an optional AI: what the side panel calls.
 * Without AI you still get word splits, definitions and saved words.
 */
export function createTutor(store: Store, ai: TutorAi | null, getDict: () => Promise<Dict>) {
  const needAi = () => {
    if (!ai) throw new Error("Choose a model in settings to use the tutor.")
    return ai
  }
  return {
    hasAi: !!ai,
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
      if (targets.length) await store.saveConversions(video.id, await needAi().convertLines({ title: video.title, targets, neighbours }))
      return (await store.getLines(video.id, idxs)).filter((l) => l.textColloquial)
    },

    /** Splits a line into dictionary words with Jyutping and meanings. */
    async explain(text: string): Promise<LineWord[]> {
      return splitLine(text, await getDict())
    },

    /** Saves a word the user doesn't know, with the moment it came from. */
    saveWord(w: LineWord, at: { videoId: string; lineIdx: number | null }) {
      const colloquial = w.colloquial ?? w.text
      return store.logTaughtWord({ colloquial, formal: w.formal, jyutping: w.jyutping, meaning: w.meaning, notes: null }, at)
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
      const ai = needAi()
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
