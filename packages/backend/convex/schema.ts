import { defineSchema, defineTable } from "convex/server"
import { v, type Validator } from "convex/values"

export const nullable = <T extends Validator<any, "required", any>>(t: T) => v.union(t, v.null())

export const lineWord = v.object({
  text: v.string(),
  jyutping: v.string(),
  meaning: v.string(),
  formal: nullable(v.string()),
  colloquial: nullable(v.string()),
  likelyError: nullable(v.string())
})

export const captionKind = v.union(v.literal("manual"), v.literal("auto"))
export const register = v.union(v.literal("formal"), v.literal("colloquial"))
export const wordStatus = v.union(v.literal("learning"), v.literal("known"))
export const wordSource = v.union(v.literal("video"), v.literal("manual"))

/**
 * Mirrors the extension's IndexedDB stores (apps/extension/lib/localStore.ts).
 * Words and encounters keep a numeric id (`num`) so clients see the same
 * shapes as the local store and the phone's StudySnapshot.
 */
export default defineSchema({
  videos: defineTable({
    videoId: v.string(),
    title: v.string(),
    channel: v.optional(v.string()),
    captionKind: v.optional(captionKind),
    createdAt: v.number()
  }).index("by_videoId", ["videoId"]),

  lines: defineTable({
    videoId: v.string(),
    idx: v.number(),
    startMs: v.number(),
    endMs: v.number(),
    text: v.string(),
    sourceRegister: nullable(register),
    textFormal: nullable(v.string()),
    textColloquial: nullable(v.string()),
    colloquialInferred: v.boolean(),
    textEnglish: v.optional(nullable(v.string())),
    words: nullable(v.array(lineWord))
  }).index("by_video_idx", ["videoId", "idx"]),

  words: defineTable({
    num: v.number(),
    colloquial: v.string(),
    formal: nullable(v.string()),
    jyutping: nullable(v.string()),
    meaning: nullable(v.string()),
    notes: nullable(v.string()),
    status: wordStatus,
    timesAsked: v.number(),
    timesMissed: v.number(),
    intervalDays: v.number(),
    ease: v.number(),
    dueAt: v.number(),
    /** "manual" for words typed in by hand; missing means saved from a video. */
    source: v.optional(wordSource),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_num", ["num"])
    .index("by_colloquial", ["colloquial"])
    .index("by_status", ["status"]),

  encounters: defineTable({
    num: v.number(),
    wordNum: v.number(),
    videoId: v.string(),
    lineIdx: v.number(),
    kind: v.union(v.literal("asked"), v.literal("seen")),
    createdAt: v.number()
  }).index("by_word", ["wordNum"]),

  questions: defineTable({
    videoId: v.string(),
    lineIdx: nullable(v.number()),
    atMs: v.number(),
    question: v.string(),
    answer: v.string(),
    createdAt: v.number()
  }).index("by_createdAt", ["createdAt"]),

  reviews: defineTable({
    wordNum: v.number(),
    quizType: v.string(),
    correct: v.boolean(),
    createdAt: v.number()
  }).index("by_createdAt", ["createdAt"]),

  /** Flashcard answers from the phone, kept for the extension to apply later (same as the helper's study-reviews.json). */
  phoneReviews: defineTable({
    wordId: v.number(),
    colloquial: v.string(),
    correct: v.boolean(),
    at: v.number()
  }),

  counters: defineTable({ name: v.string(), value: v.number() }).index("by_name", ["name"]),

  // Squads (convex/squads.ts). Users are anonymous: a display name plus the
  // sessions of the devices signed in as them. Nothing here is sensitive.

  users: defineTable({
    name: v.string(),
    /** Counts each app reports from its own saved words. */
    learned: v.number(),
    saved: v.number(),
    progressAt: nullable(v.number()),
    createdAt: v.number()
  }),

  /** One per signed-in device. Only a SHA-256 of the secret is kept. */
  sessions: defineTable({ userId: v.id("users"), secretHash: v.string(), createdAt: v.number() }).index("by_hash", ["secretHash"]),

  squads: defineTable({ name: v.string(), code: v.string(), createdBy: v.id("users"), createdAt: v.number() }).index("by_code", ["code"]),

  memberships: defineTable({ squadId: v.id("squads"), userId: v.id("users"), joinedAt: v.number() })
    .index("by_squad", ["squadId"])
    .index("by_user", ["userId", "squadId"]),

  /** Short-lived, single-use codes that sign another device in as the same user. */
  linkCodes: defineTable({ code: v.string(), userId: v.id("users"), expiresAt: v.number() }).index("by_code", ["code"])
})
