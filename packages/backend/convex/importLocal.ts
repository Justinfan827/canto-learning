import { v } from "convex/values"

import { mutation } from "./_generated/server"
import { bumpCounter, lineAt, nextNum, signedIn, videoById, wordByNum, wordByText } from "./lib"
import schema from "./schema"

// Copies the extension's local IndexedDB data in, in batches. Safe to run again:
// rows are matched by their natural keys. A word keeps its local id when that id
// is free, so on a fresh deployment the phone's flashcard progress (keyed by word
// id) still lines up; a word Convex already has is matched by its text instead.

const { tables } = schema
// Rows arrive without `owner`: they always go to the signed-in user, whatever the client sends.
const { owner: _v, ...videoFields } = tables.videos.validator.fields
const { owner: _l, ...lineFields } = tables.lines.validator.fields
const { owner: _w, ...wordFields } = tables.words.validator.fields
const { owner: _e, num: _num, ...encounterFields } = tables.encounters.validator.fields
const { owner: _q, ...questionFields } = tables.questions.validator.fields
const { owner: _r, ...reviewFields } = tables.reviews.validator.fields

export const importBatch = mutation({
  args: {
    videos: v.optional(v.array(v.object(videoFields))),
    lines: v.optional(v.array(v.object(lineFields))),
    /** Each word with the id it has in the browser. */
    words: v.optional(v.array(v.object({ localId: v.number(), word: v.object(wordFields) }))),
    /** `wordNum` already mapped through the ids `words` returned. */
    encounters: v.optional(v.array(v.object(encounterFields))),
    questions: v.optional(v.array(v.object(questionFields))),
    reviews: v.optional(v.array(v.object(reviewFields)))
  },
  handler: async (ctx, batch) => {
    const owner = await signedIn(ctx)
    for (const video of batch.videos ?? []) {
      const row = { ...video, owner }
      const old = await videoById(ctx, owner, row.videoId)
      if (old) await ctx.db.replace(old._id, row)
      else await ctx.db.insert("videos", row)
    }
    for (const line of batch.lines ?? []) {
      const row = { ...line, owner }
      const old = await lineAt(ctx, owner, row.videoId, row.idx)
      if (old) await ctx.db.replace(old._id, row)
      else await ctx.db.insert("lines", row)
    }

    const ids: [number, number][] = []
    let matched = 0
    for (const { localId, word: input } of batch.words ?? []) {
      const word = { ...input, owner }
      const same = await wordByText(ctx, owner, word.colloquial)
      if (same) {
        // Already on Convex (saved there, or copied before): keep the newer copy.
        if (word.updatedAt > same.updatedAt) await ctx.db.replace(same._id, { ...word, num: same.num })
        ids.push([localId, same.num])
        matched++
        continue
      }
      const num = (await wordByNum(ctx, owner, localId)) ? await nextNum(ctx, owner, "words") : localId
      await ctx.db.insert("words", { ...word, num })
      await bumpCounter(ctx, owner, "words", num)
      ids.push([localId, num])
    }

    for (const row of batch.encounters ?? []) {
      const dupe = await ctx.db
        .query("encounters")
        .withIndex("by_word", (q) => q.eq("owner", owner).eq("wordNum", row.wordNum))
        .filter((q) => q.and(q.eq(q.field("createdAt"), row.createdAt), q.eq(q.field("videoId"), row.videoId), q.eq(q.field("lineIdx"), row.lineIdx)))
        .first()
      if (!dupe) await ctx.db.insert("encounters", { ...row, owner, num: await nextNum(ctx, owner, "encounters") })
    }
    for (const row of batch.questions ?? []) {
      const dupe = await ctx.db
        .query("questions")
        .withIndex("by_createdAt", (q) => q.eq("owner", owner).eq("createdAt", row.createdAt))
        .filter((q) => q.eq(q.field("question"), row.question))
        .first()
      if (!dupe) await ctx.db.insert("questions", { ...row, owner })
    }
    for (const row of batch.reviews ?? []) {
      const dupe = await ctx.db
        .query("reviews")
        .withIndex("by_createdAt", (q) => q.eq("owner", owner).eq("createdAt", row.createdAt))
        .filter((q) => q.eq(q.field("wordNum"), row.wordNum))
        .first()
      if (!dupe) await ctx.db.insert("reviews", { ...row, owner })
    }
    return { ids, matched }
  }
})
