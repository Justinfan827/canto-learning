export interface Segment {
  text: string
  changed: boolean
}

/**
 * Character-level diff of `text` against `other`: marks the characters of
 * `text` that aren't part of their longest common subsequence. Used to
 * highlight which words change between 口語 and 書面語 (佢 ↔ 他).
 */
export function diffSegments(text: string, other: string): Segment[] {
  const a = [...text]
  const b = [...other]
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const keep = new Array(a.length).fill(false)
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      keep[i] = true
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }
  const out: Segment[] = []
  a.forEach((ch, k) => {
    const changed = !keep[k]
    const last = out[out.length - 1]
    if (last && last.changed === changed) last.text += ch
    else out.push({ text: ch, changed })
  })
  return out
}
