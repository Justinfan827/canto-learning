import type { StudySnapshot, StudySource } from "@pna/shared/src/study"
import { v } from "convex/values"

import { mutation, query } from "./_generated/server"
import { checkToken, lineAt, toWord } from "./lib"

// What the phone study app calls: the same two routes the local helper serves
// (GET /study and POST /study/reviews in apps/transcriber/server.mjs).

const videoUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`

/** Saved words with their source lines and videos: `StudySnapshot` in packages/shared/src/study.ts. */
export const snapshot = query({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<StudySnapshot> => {
    checkToken(token)
    const [words, encs, videos] = await Promise.all([ctx.db.query("words").collect(), ctx.db.query("encounters").collect(), ctx.db.query("videos").collect()])
    const byWord = new Map<number, StudySource[]>()
    const used = new Set<string>()
    for (const e of encs.sort((a, b) => b.createdAt - a.createdAt)) {
      const line = await lineAt(ctx, e.videoId, e.lineIdx)
      if (!line) continue
      used.add(e.videoId)
      const list = byWord.get(e.wordNum) ?? []
      list.push({
        videoId: e.videoId,
        lineIdx: e.lineIdx,
        startMs: line.startMs,
        endMs: line.endMs,
        text: line.text,
        textColloquial: line.textColloquial,
        textFormal: line.textFormal,
        textEnglish: line.textEnglish ?? null,
        createdAt: e.createdAt
      })
      byWord.set(e.wordNum, list)
    }
    return {
      version: 1,
      exportedAt: Date.now(),
      videos: videos
        .filter((v) => used.has(v.videoId))
        .map((v) => ({ id: v.videoId, title: v.title, channel: v.channel ?? null, url: videoUrl(v.videoId), firstSeenAt: v.createdAt })),
      words: words.map((w) => ({ ...toWord(w), createdAt: w.createdAt, updatedAt: w.updatedAt, sources: byWord.get(w.num) ?? [] }))
    }
  }
})

/** Flashcard answers from the phone, kept for the extension to apply later. */
export const addReviews = mutation({
  args: { token: v.string(), reviews: v.array(v.object({ wordId: v.number(), colloquial: v.string(), correct: v.boolean(), at: v.number() })) },
  handler: async (ctx, { token, reviews }) => {
    checkToken(token)
    for (const r of reviews) await ctx.db.insert("phoneReviews", r)
    return { ok: true, added: reviews.length }
  }
})
