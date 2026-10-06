import { api } from "@pna/backend/convex/_generated/api"
import type { LineWord, Store, TaughtWord } from "@pna/shared"
import { ConvexHttpClient } from "convex/browser"

import { dumpLocalStore } from "./localStore"

export interface ConvexConfig {
  /** The deployment URL, like https://happy-otter-123.convex.cloud. */
  url: string
  /** The deployment's SYNC_TOKEN. */
  token: string
}

// Convex rejects fields its validators don't list, and model output can carry
// extras or leave nullable fields out, so rows are rebuilt field by field.
const lineWord = (w: LineWord) => ({
  text: w.text,
  jyutping: w.jyutping ?? "",
  meaning: w.meaning ?? "",
  formal: w.formal ?? null,
  colloquial: w.colloquial ?? null,
  likelyError: w.likelyError ?? null
})
const taughtWord = (w: TaughtWord) => ({
  colloquial: w.colloquial,
  formal: w.formal ?? null,
  jyutping: w.jyutping ?? "",
  meaning: w.meaning ?? "",
  notes: w.notes ?? null
})

/** Store backed by a Convex deployment (packages/backend/convex), shared with the phone. */
export function createConvexStore({ url, token }: ConvexConfig, client = new ConvexHttpClient(url)): Store {
  const q = client.query.bind(client)
  const m = client.mutation.bind(client)
  const done = () => {}
  return {
    putVideo: (video, lines, captionKind) =>
      m(api.store.putVideo, {
        token,
        video: { id: video.id, title: video.title, channel: video.channel ?? undefined, captionKind: video.captionKind },
        lines: lines.map(({ idx, startMs, endMs, text }) => ({ idx, startMs, endMs, text })),
        captionKind
      }),
    getVideo: (videoId) => q(api.store.getVideo, { token, videoId }),
    getLines: (videoId, idxs) => q(api.store.getLines, { token, videoId, idxs }),
    saveConversions: (videoId, lines) => m(api.store.saveConversions, {
        token,
        videoId,
        lines: lines.map((l) => ({
          idx: l.idx,
          sourceRegister: l.sourceRegister ?? null,
          textFormal: l.textFormal ?? null,
          textColloquial: l.textColloquial ?? null,
          colloquialInferred: !!l.colloquialInferred,
          textEnglish: l.textEnglish ?? null
        }))
      }).then(done),
    saveLineWords: (videoId, idx, words) => m(api.store.saveLineWords, { token, videoId, idx, words: words.map(lineWord) }).then(done),
    saveQuestion: ({ videoId, lineIdx, atMs, question, answer }) => m(api.store.saveQuestion, { token, videoId, lineIdx, atMs, question, answer }).then(done),
    logTaughtWord: (word, at) => m(api.store.logTaughtWord, { token, word: taughtWord(word), at: { videoId: at.videoId, lineIdx: at.lineIdx } }),
    listWords: (opts = {}) => q(api.store.listWords, { token, status: opts.status, sort: opts.sort }),
    getWord: (id) => q(api.store.getWord, { token, id }),
    setStatus: (id, status) => m(api.store.setStatus, { token, id, status }),
    knownWords: () => q(api.store.knownWords, { token }),
    recordReview: (wordId, quizType, correct) => m(api.store.recordReview, { token, wordId, quizType, correct }),
    exportStudy: () => q(api.study.snapshot, { token })
  }
}

const BATCH = 200

/**
 * Copies everything in this browser's local database to Convex. Words keep their
 * ids where Convex has them free; words Convex already has are matched by text.
 * Safe to run twice.
 */
export async function copyLocalToConvex({ url, token }: ConvexConfig, onProgress?: (done: number, total: number) => void) {
  const client = new ConvexHttpClient(url)
  const local = await dumpLocalStore()
  const total = Object.values(local).reduce((n, rows) => n + rows.length, 0)
  let done = 0
  const send = async <T>(table: string, rows: T[]) => {
    const results = []
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH)
      results.push(await client.mutation(api.importLocal.importBatch, { token, [table]: chunk }))
      done += chunk.length
      onProgress?.(done, total)
    }
    return results
  }

  await send(
    "videos",
    local.videos.map(({ id, title, channel, captionKind, createdAt }) => ({ videoId: id, title, channel: channel ?? undefined, captionKind, createdAt }))
  )
  await send(
    "lines",
    local.lines.map(({ videoId, idx, startMs, endMs, text, sourceRegister, textFormal, textColloquial, colloquialInferred, textEnglish, words }) => ({
      videoId,
      idx,
      startMs,
      endMs,
      text,
      sourceRegister,
      textFormal,
      textColloquial,
      colloquialInferred,
      textEnglish: textEnglish ?? null,
      words: words?.map(lineWord) ?? null
    }))
  )
  const wordResults = await send(
    "words",
    local.words.map(({ id, ...w }) => ({ localId: id!, word: { num: id!, ...w } }))
  )
  const ids = new Map(wordResults.flatMap((r) => r.ids))
  const matched = wordResults.reduce((n, r) => n + r.matched, 0)
  await send(
    "encounters",
    local.encounters.filter((e) => ids.has(e.wordId)).map(({ id: _id, wordId, ...e }) => ({ wordNum: ids.get(wordId)!, ...e }))
  )
  await send(
    "questions",
    local.questions.map(({ id: _id, ...q }) => q)
  )
  await send(
    "reviews",
    local.reviews.filter((r) => ids.has(r.wordId)).map(({ id: _id, wordId, ...r }) => ({ wordNum: ids.get(wordId)!, ...r }))
  )
  return { copied: done, words: ids.size, alreadyOnConvex: matched }
}
