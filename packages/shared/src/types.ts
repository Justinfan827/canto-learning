export type CaptionKind = "manual" | "auto"
export type Register = "formal" | "colloquial"

/** One caption line as captured from YouTube. */
export interface CaptionLine {
  idx: number
  startMs: number
  endMs: number
  text: string
}

/** A caption line after register conversion. */
export interface ConvertedLine extends CaptionLine {
  sourceRegister: Register | null
  textFormal: string | null
  textColloquial: string | null
  /** True when the 口語 text was guessed from a formal caption. */
  colloquialInferred: boolean
  /** A short English translation, when a model converted the line. */
  textEnglish?: string | null
}

export interface VideoInfo {
  id: string
  title: string
  channel?: string
  captionKind?: CaptionKind
}

export interface CaptionTrack {
  baseUrl: string
  languageCode: string
  kind?: string // "asr" for auto-generated
  name?: string
}

export interface LineWord {
  text: string
  jyutping: string
  meaning: string
  formal: string | null
  colloquial: string | null
  /** Probable intended word when the caption looks like a sound-alike error. */
  likelyError: string | null
}

export interface Word {
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
}

export interface Encounter {
  id: number
  videoId: string
  videoTitle: string
  lineIdx: number
  startMs: number
  endMs: number
  kind: "asked" | "seen"
  createdAt: number
}

export interface AskRequest {
  videoId: string
  lineIdx: number | null
  atMs: number
  question: string
  /** The last few caption lines before the pause, oldest first. */
  context: CaptionLine[]
  /** Prior turns in this video's chat, for follow-ups. */
  history?: { role: "user" | "assistant"; content: string }[]
}

/** Where caption lines came from: YouTube's caption file, on-screen captions, or local speech-to-text. */
export type CaptionSource = "track" | "screen" | "local"

/** Messages between content scripts, background and side panel. */
export type PanelMessage =
  | { type: "video"; video: VideoInfo; tracks: CaptionTrack[] }
  | { type: "captions"; videoId: string; lines: CaptionLine[]; kind: CaptionKind; source: CaptionSource }
  | { type: "screen-line"; videoId: string; line: CaptionLine }
  | { type: "player"; videoId: string; state: "play" | "pause" | "seek" | "time"; timeMs: number }

export type QuizType = "meaning" | "colloquial" | "jyutping"

export interface Clip {
  videoId: string
  videoTitle: string
  lineIdx: number
  startMs: number
  endMs: number
  text: string
  textFormal: string | null
  textColloquial: string | null
}

export interface ReviewItem {
  word: Word
  clip: Clip | null
  quizType: QuizType
  /** What the card shows: the clip for "meaning", the formal caption for "colloquial", the word for "jyutping". */
  prompt: string
  options: string[]
  answer: string
}
