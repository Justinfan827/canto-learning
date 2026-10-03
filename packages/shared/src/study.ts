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
  createdAt: number
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
