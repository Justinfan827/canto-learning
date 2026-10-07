import type { Doc } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"

/**
 * The signed-in user every function works for: the `owner` of the rows it reads and writes.
 * Clients send their Better Auth session as a Convex auth token (convex/auth.ts).
 */
export async function signedIn(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error("Sign in to sync your words")
  return identity.subject
}

type Counter = "words" | "encounters"

const counter = (ctx: QueryCtx, owner: string, name: Counter) =>
  ctx.db
    .query("counters")
    .withIndex("by_name", (q) => q.eq("owner", owner).eq("name", name))
    .unique()

/** Numeric ids, per user, so words and encounters look the same as in the local store. */
export async function nextNum(ctx: MutationCtx, owner: string, name: Counter) {
  const row = await counter(ctx, owner, name)
  const value = (row?.value ?? 0) + 1
  if (row) await ctx.db.patch(row._id, { value })
  else await ctx.db.insert("counters", { owner, name, value })
  return value
}

/** Moves a counter past ids that were imported. */
export async function bumpCounter(ctx: MutationCtx, owner: string, name: Counter, atLeast: number) {
  const row = await counter(ctx, owner, name)
  if (row && row.value >= atLeast) return
  if (row) await ctx.db.patch(row._id, { value: atLeast })
  else await ctx.db.insert("counters", { owner, name, value: atLeast })
}

export const wordByNum = (ctx: QueryCtx, owner: string, num: number) =>
  ctx.db
    .query("words")
    .withIndex("by_num", (q) => q.eq("owner", owner).eq("num", num))
    .unique()

export const wordByText = (ctx: QueryCtx, owner: string, colloquial: string) =>
  ctx.db
    .query("words")
    .withIndex("by_colloquial", (q) => q.eq("owner", owner).eq("colloquial", colloquial))
    .unique()

export const lineAt = (ctx: QueryCtx, owner: string, videoId: string, idx: number) =>
  ctx.db
    .query("lines")
    .withIndex("by_video_idx", (q) => q.eq("owner", owner).eq("videoId", videoId).eq("idx", idx))
    .unique()

export const videoById = (ctx: QueryCtx, owner: string, videoId: string) =>
  ctx.db
    .query("videos")
    .withIndex("by_videoId", (q) => q.eq("owner", owner).eq("videoId", videoId))
    .unique()

/** The `Word` shape from @pna/shared. */
export const toWord = ({ _id, _creationTime, owner: _o, num, updatedAt: _u, ...w }: Doc<"words">) => ({ id: num, ...w })

/** The `StoredLine` shape from @pna/shared. */
export const toLine = ({ _id, _creationTime, owner: _o, videoId: _v, ...l }: Doc<"lines">) => l
