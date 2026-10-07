import { schedule } from "@pna/shared/src/schedule"
import { cleanNewWord } from "@pna/shared/src/store"
import { v } from "convex/values"

import { mutation, query } from "./_generated/server"
import { lineAt, nextNum, signedIn, toLine, toWord, videoById, wordByNum, wordByText } from "./lib"
import { captionKind, lineWord, nullable, register, wordStatus } from "./schema"

// One function per method of `Store` in packages/shared/src/store.ts, with the
// same behaviour as the IndexedDB store in apps/extension/lib/localStore.ts.

const DAY = 86_400_000

const captionLine = v.object({ idx: v.number(), startMs: v.number(), endMs: v.number(), text: v.string() })
const videoInfo = v.object({ id: v.string(), title: v.string(), channel: v.optional(v.string()), captionKind: v.optional(captionKind) })

export const putVideo = mutation({
  args: { video: videoInfo, lines: v.array(captionLine), captionKind },
  handler: async (ctx, { video, lines, captionKind }) => {
    const owner = await signedIn(ctx)
    const prev = await videoById(ctx, owner, video.id)
    const row = { owner, videoId: video.id, title: video.title, channel: video.channel, captionKind }
    if (prev) await ctx.db.patch(prev._id, row)
    else await ctx.db.insert("videos", { ...row, createdAt: Date.now() })

    const needsConversion: number[] = []
    for (const l of lines) {
      const old = await lineAt(ctx, owner, video.id, l.idx)
      // A changed caption text drops its cached conversion and word split.
      if (old && old.text === l.text) {
        await ctx.db.patch(old._id, { startMs: l.startMs, endMs: l.endMs })
        if (!old.textColloquial) needsConversion.push(l.idx)
        continue
      }
      const fresh = { ...l, owner, videoId: video.id, sourceRegister: null, textFormal: null, textColloquial: null, colloquialInferred: false, words: null }
      if (old) await ctx.db.replace(old._id, fresh)
      else await ctx.db.insert("lines", fresh)
      needsConversion.push(l.idx)
    }
    return { needsConversion }
  }
})

export const getVideo = query({
  args: { videoId: v.string() },
  handler: async (ctx, { videoId }) => {
    const owner = await signedIn(ctx)
    const video = await videoById(ctx, owner, videoId)
    if (!video) return null
    const lines = await ctx.db
      .query("lines")
      .withIndex("by_video_idx", (q) => q.eq("owner", owner).eq("videoId", videoId))
      .collect()
    return {
      video: { id: video.videoId, title: video.title, channel: video.channel, captionKind: video.captionKind },
      lines: lines.map(toLine)
    }
  }
})

export const getLines = query({
  args: { videoId: v.string(), idxs: v.array(v.number()) },
  handler: async (ctx, { videoId, idxs }) => {
    const owner = await signedIn(ctx)
    const rows = await Promise.all(idxs.map((i) => lineAt(ctx, owner, videoId, i)))
    return rows.filter((r) => r !== null).map(toLine)
  }
})

export const saveConversions = mutation({
  args: {
    videoId: v.string(),
    lines: v.array(
      v.object({
        idx: v.number(),
        sourceRegister: nullable(register),
        textFormal: nullable(v.string()),
        textColloquial: nullable(v.string()),
        colloquialInferred: v.boolean(),
        textEnglish: v.optional(nullable(v.string()))
      })
    )
  },
  handler: async (ctx, { videoId, lines }) => {
    const owner = await signedIn(ctx)
    for (const { idx, ...l } of lines) {
      const row = await lineAt(ctx, owner, videoId, idx)
      if (row) await ctx.db.patch(row._id, l)
    }
  }
})

export const saveLineWords = mutation({
  args: { videoId: v.string(), idx: v.number(), words: v.array(lineWord) },
  handler: async (ctx, { videoId, idx, words }) => {
    const owner = await signedIn(ctx)
    const row = await lineAt(ctx, owner, videoId, idx)
    if (row) await ctx.db.patch(row._id, { words })
  }
})

export const saveQuestion = mutation({
  args: { videoId: v.string(), lineIdx: nullable(v.number()), atMs: v.number(), question: v.string(), answer: v.string() },
  handler: async (ctx, q) => {
    const owner = await signedIn(ctx)
    await ctx.db.insert("questions", { ...q, owner, createdAt: Date.now() })
  }
})

export const logTaughtWord = mutation({
  args: {
    word: v.object({ colloquial: v.string(), formal: nullable(v.string()), jyutping: v.string(), meaning: v.string(), notes: nullable(v.string()) }),
    at: v.object({ videoId: v.string(), lineIdx: nullable(v.number()) })
  },
  handler: async (ctx, { word: w, at }) => {
    const owner = await signedIn(ctx)
    const now = Date.now()
    const existing = await wordByText(ctx, owner, w.colloquial)
    let num: number
    if (existing) {
      // Asking about a word again counts as a miss.
      const { intervalDays, ease, timesMissed, dueAt } = schedule(existing, false, now)
      await ctx.db.patch(existing._id, {
        intervalDays,
        ease,
        timesMissed,
        dueAt,
        status: "learning",
        timesAsked: existing.timesAsked + 1,
        formal: existing.formal ?? w.formal,
        jyutping: existing.jyutping ?? w.jyutping,
        meaning: existing.meaning ?? w.meaning,
        notes: existing.notes ?? w.notes,
        updatedAt: now
      })
      num = existing.num
    } else {
      num = await nextNum(ctx, owner, "words")
      await ctx.db.insert("words", {
        owner,
        num,
        ...w,
        status: "learning",
        timesAsked: 1,
        timesMissed: 0,
        intervalDays: 1,
        ease: 2.5,
        dueAt: now + DAY,
        createdAt: now,
        updatedAt: now
      })
    }
    if (at.lineIdx != null)
      await ctx.db.insert("encounters", { owner, num: await nextNum(ctx, owner, "encounters"), wordNum: num, videoId: at.videoId, lineIdx: at.lineIdx, kind: "asked", createdAt: now })
    return toWord((await wordByNum(ctx, owner, num))!)
  }
})

export const addWord = mutation({
  args: {
    word: v.object({ colloquial: v.string(), jyutping: nullable(v.string()), meaning: nullable(v.string()), formal: v.optional(nullable(v.string())), notes: v.optional(nullable(v.string())) })
  },
  handler: async (ctx, { word: input }) => {
    const owner = await signedIn(ctx)
    const w = cleanNewWord(input)
    if (!w) throw new Error("Enter the word in Cantonese")
    const now = Date.now()
    const existing = await wordByText(ctx, owner, w.colloquial)
    if (existing) {
      // Already saved: keep its schedule, fill in what was blank.
      await ctx.db.patch(existing._id, {
        formal: existing.formal ?? w.formal ?? null,
        jyutping: existing.jyutping || w.jyutping,
        meaning: existing.meaning || w.meaning,
        notes: existing.notes ?? w.notes ?? null,
        updatedAt: now
      })
      return { word: toWord((await ctx.db.get(existing._id))!), created: false }
    }
    const num = await nextNum(ctx, owner, "words")
    await ctx.db.insert("words", {
      owner,
      num,
      colloquial: w.colloquial,
      formal: w.formal ?? null,
      jyutping: w.jyutping,
      meaning: w.meaning,
      notes: w.notes ?? null,
      status: "learning",
      timesAsked: 0,
      timesMissed: 0,
      intervalDays: 1,
      ease: 2.5,
      dueAt: now + DAY,
      source: "manual",
      createdAt: now,
      updatedAt: now
    })
    return { word: toWord((await wordByNum(ctx, owner, num))!), created: true }
  }
})

export const listWords = query({
  args: { status: v.optional(wordStatus), sort: v.optional(v.union(v.literal("missed"), v.literal("due"))) },
  handler: async (ctx, { status, sort }) => {
    const owner = await signedIn(ctx)
    const rows = status
      ? await ctx.db
          .query("words")
          .withIndex("by_status", (q) => q.eq("owner", owner).eq("status", status))
          .collect()
      : await ctx.db
          .query("words")
          .withIndex("by_num", (q) => q.eq("owner", owner))
          .collect()
    rows.sort(
      sort === "due"
        ? (a, b) => a.dueAt - b.dueAt
        : (a, b) => b.timesMissed - a.timesMissed || b.timesAsked - a.timesAsked || b.updatedAt - a.updatedAt
    )
    return rows.map(toWord)
  }
})

export const getWord = query({
  args: { id: v.number() },
  handler: async (ctx, { id }) => {
    const owner = await signedIn(ctx)
    const row = await wordByNum(ctx, owner, id)
    if (!row) return null
    const encs = await ctx.db
      .query("encounters")
      .withIndex("by_word", (q) => q.eq("owner", owner).eq("wordNum", id))
      .collect()
    encs.sort((a, b) => b.createdAt - a.createdAt || b.num - a.num)
    const encounters = await Promise.all(
      encs.map(async (e) => {
        const [video, line] = await Promise.all([videoById(ctx, owner, e.videoId), lineAt(ctx, owner, e.videoId, e.lineIdx)])
        return {
          id: e.num,
          videoId: e.videoId,
          videoTitle: video?.title ?? "",
          lineIdx: e.lineIdx,
          startMs: line?.startMs ?? 0,
          endMs: line?.endMs ?? 0,
          kind: e.kind,
          createdAt: e.createdAt
        }
      })
    )
    return { word: toWord(row), encounters }
  }
})

export const setStatus = mutation({
  args: { id: v.number(), status: wordStatus },
  handler: async (ctx, { id, status }) => {
    const owner = await signedIn(ctx)
    const row = await wordByNum(ctx, owner, id)
    if (!row) throw new Error(`No word ${id}`)
    await ctx.db.patch(row._id, { status, updatedAt: Date.now() })
    return toWord((await ctx.db.get(row._id))!)
  }
})

export const knownWords = query({
  args: {},
  handler: async (ctx) => {
    const owner = await signedIn(ctx)
    const rows = await ctx.db
      .query("words")
      .withIndex("by_status", (q) => q.eq("owner", owner).eq("status", "known"))
      .collect()
    return rows
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 300)
      .map((w) => w.colloquial)
  }
})

export const recordReview = mutation({
  args: { wordId: v.number(), quizType: v.string(), correct: v.boolean() },
  handler: async (ctx, { wordId, quizType, correct }) => {
    const owner = await signedIn(ctx)
    const now = Date.now()
    const row = await wordByNum(ctx, owner, wordId)
    if (!row) throw new Error(`No word ${wordId}`)
    const { intervalDays, ease, timesMissed, dueAt } = schedule(row, correct, now)
    await ctx.db.patch(row._id, { intervalDays, ease, timesMissed, dueAt, updatedAt: now })
    await ctx.db.insert("reviews", { owner, wordNum: wordId, quizType, correct, createdAt: now })
    return toWord((await ctx.db.get(row._id))!)
  }
})
