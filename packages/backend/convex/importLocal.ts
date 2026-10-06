import { v } from "convex/values"

import { mutation } from "./_generated/server"
import { bumpCounter, checkToken, lineAt, nextNum, videoById, wordByNum } from "./lib"
import schema from "./schema"

// Copies the extension's local IndexedDB data in, in batches. Safe to run again:
// rows are matched by their natural keys. A word keeps its local id when that id
// is free, so on a fresh deployment the phone's flashcard progress (keyed by word
// id) still lines up; a word Convex already has is matched by its text instead.

const { tables } = schema
const { num: _num, ...encounterFields } = tables.encounters.validator.fields

export const importBatch = mutation({
  args: {
    token: v.string(),
    videos: v.optional(v.array(tables.videos.validator)),
    lines: v.optional(v.array(tables.lines.validator)),
    /** Each word with the id it has in the browser. */
    words: v.optional(v.array(v.object({ localId: v.number(), word: tables.words.validator }))),
    /** `wordNum` already mapped through the ids `words` returned. */
    encounters: v.optional(v.array(v.object(encounterFields))),
    questions: v.optional(v.array(tables.questions.validator)),
    reviews: v.optional(v.array(tables.reviews.validator))
  },
  handler: async (ctx, { token, ...batch }) => {
    checkToken(token)
    for (const row of batch.videos ?? []) {
      const old = await videoById(ctx, row.videoId)
      if (old) await ctx.db.replace(old._id, row)
      else await ctx.db.insert("videos", row)
    }
    for (const row of batch.lines ?? []) {
      const old = await lineAt(ctx, row.videoId, row.idx)
      if (old) await ctx.db.replace(old._id, row)
      else await ctx.db.insert("lines", row)
    }

    const ids: [number, number][] = []
    let matched = 0
    for (const { localId, word } of batch.words ?? []) {
      const same = await ctx.db
        .query("words")
        .withIndex("by_colloquial", (q) => q.eq("colloquial", word.colloquial))
        .unique()
      if (same) {
        // Already on Convex (saved there, or copied before): keep the newer copy.
        if (word.updatedAt > same.updatedAt) await ctx.db.replace(same._id, { ...word, num: same.num })
        ids.push([localId, same.num])
        matched++
        continue
      }
      const num = (await wordByNum(ctx, localId)) ? await nextNum(ctx, "words") : localId
      await ctx.db.insert("words", { ...word, num })
      await bumpCounter(ctx, "words", num)
      ids.push([localId, num])
    }

    for (const row of batch.encounters ?? []) {
      const dupe = await ctx.db
        .query("encounters")
        .withIndex("by_word", (q) => q.eq("wordNum", row.wordNum))
        .filter((q) => q.and(q.eq(q.field("createdAt"), row.createdAt), q.eq(q.field("videoId"), row.videoId), q.eq(q.field("lineIdx"), row.lineIdx)))
        .first()
      if (!dupe) await ctx.db.insert("encounters", { ...row, num: await nextNum(ctx, "encounters") })
    }
    for (const row of batch.questions ?? []) {
      const dupe = await ctx.db
        .query("questions")
        .withIndex("by_createdAt", (q) => q.eq("createdAt", row.createdAt))
        .filter((q) => q.eq(q.field("question"), row.question))
        .first()
      if (!dupe) await ctx.db.insert("questions", row)
    }
    for (const row of batch.reviews ?? []) {
      const dupe = await ctx.db
        .query("reviews")
        .withIndex("by_createdAt", (q) => q.eq("createdAt", row.createdAt))
        .filter((q) => q.eq(q.field("wordNum"), row.wordNum))
        .first()
      if (!dupe) await ctx.db.insert("reviews", row)
    }
    return { ids, matched }
  }
})
