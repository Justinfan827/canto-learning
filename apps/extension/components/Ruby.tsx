import { rubyPairs } from "@pna/shared"

/** A word with Jyutping over each character, or plain text when Jyutping is off or unknown. */
export function Ruby({ text, jyutping, show }: { text: string; jyutping: string; show: boolean }) {
  if (!show || !jyutping || jyutping.includes("?")) return <>{text}</>
  return (
    <>
      {rubyPairs(text, jyutping).map(([c, r], i) => (
        <ruby key={i}>
          {c}
          <rt>{r}</rt>
        </ruby>
      ))}
    </>
  )
}

export function formatTime(ms: number) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, "0")
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`
}
