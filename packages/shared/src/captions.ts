import type { CaptionLine, CaptionTrack } from "./types"

interface Json3Event {
  tStartMs?: number
  dDurationMs?: number
  segs?: { utf8?: string }[]
  aAppend?: number
}

/**
 * Parse YouTube's timedtext `fmt=json3` payload into caption lines.
 * Skips empty events and the newline-only "append" events auto-captions emit.
 */
export function parseJson3(payload: { events?: Json3Event[] }): CaptionLine[] {
  const lines: CaptionLine[] = []
  for (const ev of payload.events ?? []) {
    if (ev.aAppend || !ev.segs || ev.tStartMs == null) continue
    const text = ev.segs
      .map((s) => s.utf8 ?? "")
      .join("")
      .replace(/\s*\n\s*/g, " ")
      .trim()
    if (!text) continue
    const startMs = ev.tStartMs
    const endMs = startMs + (ev.dDurationMs ?? 0)
    lines.push({ idx: lines.length, startMs, endMs, text })
  }
  // Auto-captions overlap; clip each line so it ends when the next begins.
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].endMs > lines[i + 1].startMs) lines[i].endMs = lines[i + 1].startMs
  }
  return lines
}

const PREFERRED = ["yue", "yue-HK", "zh-HK", "zh-Hant-HK", "zh-TW", "zh-Hant", "zh"]

/** Manual Cantonese first, then HK/TW Chinese, then anything auto-generated in those. */
export function pickTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  const rank = (t: CaptionTrack) => {
    const lang = PREFERRED.findIndex((p) => t.languageCode === p || t.languageCode.startsWith(p + "-"))
    const langRank = lang === -1 ? PREFERRED.length : lang
    return (t.kind === "asr" ? 100 : 0) + langRank
  }
  const candidates = tracks.filter((t) => rank(t) % 100 < PREFERRED.length)
  if (!candidates.length) return null
  return [...candidates].sort((a, b) => rank(a) - rank(b))[0]
}

/** Index of the line playing at `timeMs`, or the last line before it. -1 if none yet. */
export function lineAt(lines: CaptionLine[], timeMs: number): number {
  let lo = 0
  let hi = lines.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lines[mid].startMs <= timeMs) {
      ans = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  return ans
}
