/**
 * What the phone study app reads: every saved word with the moments it came
 * from, and the videos those moments belong to. The extension builds it from
 * its local database and pushes it to the local helper; the app pulls it from
 * there. A remote backend can serve the same shape later.
 */
export interface StudySnapshot {
  version: 1
  exportedAt: number
  videos: StudyVideo[]
  words: StudyWord[]
}

export interface StudyVideo {
  id: string
  title: string
  channel: string | null
  url: string
  /** When the extension first saw this video. */
  firstSeenAt: number
}

export interface StudyWord {
  /** Stable across exports: the extension's word id. */
  id: number
  colloquial: string
  formal: string | null
  jyutping: string | null
  meaning: string | null
  notes: string | null
  status: "learning" | "known"
  timesAsked: number
  timesMissed: number
  intervalDays: number
  ease: number
  dueAt: number
  createdAt: number
  updatedAt: number
  /** "manual" for words typed in by hand; missing means saved from a video. */
  source?: "video" | "manual"
  sources: StudySource[]
}

/** One moment a word was saved from, with the caption line around it. */
export interface StudySource {
  videoId: string
  lineIdx: number
  startMs: number
  endMs: number
  text: string
  textColloquial: string | null
  textFormal: string | null
  textEnglish: string | null
  /** The line's Jyutping, word by word from the dictionary; missing until the extension has filled it in. */
  jyutping?: string | null
  createdAt: number
}

/** A line's Jyutping from its dictionary words, or null when it hasn't been split yet. */
export function lineJyutping(words: { jyutping: string }[] | null | undefined): string | null {
  const s = (words ?? []).map((w) => w.jyutping.trim()).filter(Boolean).join(" ")
  return s || null
}

/** A word typed in on the phone, queued for the extension when syncing through the local helper. */
export interface StudyNewWord {
  colloquial: string
  jyutping: string | null
  meaning: string | null
  at: number
}

/** A flashcard answer from the phone, sent back so another client can apply it later. */
export interface StudyReview {
  wordId: number
  colloquial: string
  correct: boolean
  at: number
}

export const videoUrl = (id: string, startMs = 0) =>
  `https://www.youtube.com/watch?v=${id}${startMs >= 1000 ? `&t=${Math.floor(startMs / 1000)}s` : ""}`
