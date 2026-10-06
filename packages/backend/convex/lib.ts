import type { Doc } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"

/**
 * Every function takes the deployment's shared secret. Set it once with
 * `npx convex env set SYNC_TOKEN <secret>` and give the same value to each client.
 */
export function checkToken(token: string) {
  const want = process.env.SYNC_TOKEN
  if (!want) throw new Error("SYNC_TOKEN isn't set on this Convex deployment")
  if (token !== want) throw new Error("Wrong sync token")
}

type Counter = "words" | "encounters"

const counter = (ctx: QueryCtx, name: Counter) =>
  ctx.db
    .query("counters")
    .withIndex("by_name", (q) => q.eq("name", name))
    .unique()

/** Numeric ids, so words and encounters look the same as in the local store. */
export async function nextNum(ctx: MutationCtx, name: Counter) {
  const row = await counter(ctx, name)
  const value = (row?.value ?? 0) + 1
  if (row) await ctx.db.patch(row._id, { value })
  else await ctx.db.insert("counters", { name, value })
  return value
}

/** Moves a counter past ids that were imported. */
export async function bumpCounter(ctx: MutationCtx, name: Counter, atLeast: number) {
  const row = await counter(ctx, name)
  if (row && row.value >= atLeast) return
  if (row) await ctx.db.patch(row._id, { value: atLeast })
  else await ctx.db.insert("counters", { name, value: atLeast })
}

export const wordByNum = (ctx: QueryCtx, num: number) =>
  ctx.db
    .query("words")
    .withIndex("by_num", (q) => q.eq("num", num))
    .unique()

export const lineAt = (ctx: QueryCtx, videoId: string, idx: number) =>
  ctx.db
    .query("lines")
    .withIndex("by_video_idx", (q) => q.eq("videoId", videoId).eq("idx", idx))
    .unique()

export const videoById = (ctx: QueryCtx, videoId: string) =>
  ctx.db
    .query("videos")
    .withIndex("by_videoId", (q) => q.eq("videoId", videoId))
    .unique()

/** The `Word` shape from @pna/shared. */
export const toWord = ({ _id, _creationTime, num, createdAt: _c, updatedAt: _u, ...w }: Doc<"words">) => ({ id: num, ...w })

/** The `StoredLine` shape from @pna/shared. */
export const toLine = ({ _id, _creationTime, videoId: _v, ...l }: Doc<"lines">) => l
