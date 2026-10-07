import type { LineWord } from "@pna/shared"
import { useCallback, useEffect, useRef, useState } from "react"

import type { PlayerState } from "./usePlayer"
import type { Words } from "./words"

/** Saves words from the current video, storing its captions first so each word keeps its moment. */
export function useSaveWord(words: Words, player: PlayerState) {
  const [error, setError] = useState<string | null>(null)
  const savedCount = useRef(0)
  const video = player.video

  useEffect(() => {
    setError(null)
    savedCount.current = 0
  }, [video?.id])

  const saveWord = useCallback(
    async (w: LineWord, lineIdx: number) => {
      if (!video) return
      try {
        if (player.lines.length && savedCount.current !== player.lines.length) {
          await words.saveVideo(video, player.lines, player.captionKind ?? "manual")
          savedCount.current = player.lines.length
        }
        await words.saveWord(w, { videoId: video.id, lineIdx })
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [words, video, player.lines, player.captionKind]
  )

  return { saveWord, error, clearError: () => setError(null) }
}
