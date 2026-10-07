import type { CaptionKind, CaptionLine, LineWord, Store, VideoInfo } from "@pna/shared"

/** Saving words over a Store: the video's captions, then each word with the moment it came from. */
export function createWords(store: Store) {
  return {
    saveVideo: (video: VideoInfo, lines: CaptionLine[], kind: CaptionKind) => store.putVideo(video, lines, kind),

    /** Saves a word the user doesn't know, with the moment it came from. */
    saveWord(w: LineWord, at: { videoId: string; lineIdx: number | null }) {
      const colloquial = w.colloquial ?? w.text
      return store.logTaughtWord({ colloquial, formal: w.formal, jyutping: w.jyutping, meaning: w.meaning, notes: null }, at)
    }
  }
}

export type Words = ReturnType<typeof createWords>
