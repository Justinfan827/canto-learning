import type { CaptionLine, CaptionTrack } from "./types"

/** Pairs each character of a word with its syllable, for ruby text. Falls back to one reading over the whole word. */
export function rubyPairs(word: string, jyutping: string): [text: string, reading: string][] {
  const chars = [...word]
  const syl = jyutping.trim().split(/\s+/).filter(Boolean)
  if (syl.length === chars.length) return chars.map((c, i) => [c, syl[i]])
  return [[word, jyutping]]
}

const CANTONESE = /^(yue|zh-HK|zh-Hant-HK)(-|$)/

/** The label for the caption-source pill, e.g. "YouTube captions · 粵語". */
export function trackLabel(track: CaptionTrack | null): string {
  if (!track) return "YouTube captions"
  const lang = CANTONESE.test(track.languageCode) ? "粵語" : "中文"
  return `YouTube captions · ${lang}${track.kind === "asr" ? " (auto)" : ""}`
}

/**
 * How far a local transcription has got. The helper transcribes from `fromMs` to the end first
 * (`frontierMs` is how far that has reached), then from the start up to `fromMs` (`fillMs`).
 */
export function transcriptCoverage(lines: CaptionLine[], job: { fromMs: number; durationMs: number; pass: 1 | 2; done: boolean }) {
  const { fromMs, durationMs, pass, done } = job
  let frontier = fromMs
  let frontier2 = 0
  for (const l of lines) {
    if (l.startMs >= fromMs) frontier = Math.max(frontier, l.endMs)
    else frontier2 = Math.max(frontier2, l.endMs)
  }
  if (done || !durationMs) return { frontierMs: done ? durationMs : frontier, fillMs: done ? fromMs : frontier2, fraction: done ? 1 : 0 }
  const covered = (pass === 2 ? durationMs - fromMs : frontier - fromMs) + (pass === 2 ? frontier2 : 0)
  return { frontierMs: pass === 2 ? durationMs : frontier, fillMs: frontier2, fraction: Math.max(0, Math.min(1, covered / durationMs)) }
}

/** Lines sorted by time and renumbered, for transcripts that arrive out of order. */
export function sortLines(lines: CaptionLine[]): CaptionLine[] {
  return [...lines].sort((a, b) => a.startMs - b.startMs).map((l, idx) => ({ ...l, idx }))
}

/**
 * Lines from a second transcript of the same audio, matched to `lines` by time: each other line
 * goes to the line it overlaps most. Used to pair SenseVoice's spoken Cantonese with Whisper's
 * written Chinese.
 */
export function alignByTime(lines: CaptionLine[], other: CaptionLine[]): Map<number, string> {
  const out = new Map<number, string>()
  if (!lines.length) return out
  for (const o of other) {
    let best = -1
    let bestOverlap = 0
    for (const l of lines) {
      const overlap = Math.min(l.endMs, o.endMs) - Math.max(l.startMs, o.startMs)
      if (overlap > bestOverlap) {
        bestOverlap = overlap
        best = l.idx
      }
    }
    if (best >= 0) out.set(best, (out.get(best) ?? "") + o.text)
  }
  return out
}
