import { rubyPairs } from "@pna/shared"

/**
 * A word with Jyutping over each character, or plain text when Jyutping is off or unknown.
 * DESIGN.md › Typography: Jyutping sits small and bold above each character, in muted brown.
 * The size comes from where it's used (the read-along line, or a word tile, which also recolours it).
 */
export function Ruby({ text, jyutping, show }: { text: string; jyutping: string; show: boolean }) {
  if (!show || !jyutping || jyutping.includes("?")) return <>{text}</>
  return (
    <>
      {rubyPairs(text, jyutping).map(([c, r], i) => (
        <ruby key={i}>
          {c}
          <rt className="font-sans font-bold tracking-normal text-muted-foreground">{r}</rt>
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
