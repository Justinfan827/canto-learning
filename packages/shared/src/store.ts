import type { CaptionKind, CaptionLine, ConvertedLine, Encounter, LineWord, QuizType, VideoInfo, Word } from "./types"

/** A word the tutor taught, as extracted from an answer. */
export interface TaughtWord {
  colloquial: string
  formal: string | null
  jyutping: string
  meaning: string
  notes: string | null
}

export interface StoredLine extends ConvertedLine {
  words: LineWord[] | null
}

export interface QuestionRecord {
  videoId: string
  lineIdx: number | null
  atMs: number
  question: string
  answer: string
}

/**
 * Everything the app persists. The extension ships with a local IndexedDB
 * implementation; a remote one (e.g. an HTTP API over a shared database) can
 * implement the same interface later so the phone app sees the same data.
 */
export interface Store {
  putVideo(video: VideoInfo, lines: CaptionLine[], captionKind: CaptionKind): Promise<{ needsConversion: number[] }>
  getVideo(videoId: string): Promise<{ video: VideoInfo; lines: StoredLine[] } | null>
  getLines(videoId: string, idxs: number[]): Promise<StoredLine[]>
  saveConversions(videoId: string, lines: Pick<ConvertedLine, "idx" | "sourceRegister" | "textFormal" | "textColloquial" | "colloquialInferred" | "textEnglish">[]): Promise<void>
  saveLineWords(videoId: string, idx: number, words: LineWord[]): Promise<void>

  saveQuestion(q: QuestionRecord): Promise<void>
  /** Logs a taught word: new words start learning; asking again counts as a miss. */
  logTaughtWord(w: TaughtWord, at: { videoId: string; lineIdx: number | null }): Promise<Word>

  listWords(opts?: { status?: Word["status"]; sort?: "missed" | "due" }): Promise<Word[]>
  getWord(id: number): Promise<{ word: Word; encounters: Encounter[] } | null>
  setStatus(id: number, status: Word["status"]): Promise<Word>
  knownWords(): Promise<string[]>
  recordReview(wordId: number, quizType: QuizType, correct: boolean): Promise<Word>
}
