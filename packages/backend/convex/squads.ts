import { CODE_ALPHABET, cleanName, normalizeCode, type Squad, type SquadSession } from "@pna/shared/src/squads"
import { v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"

// Squads and their leaderboard. These don't need an account (convex/auth.ts):
// friends share this deployment for squads only, and the device session is what
// identifies a user. Shapes match `SquadApi` in packages/shared/src/squads.ts.

const LINK_CODE_MS = 10 * 60_000
const MAX_SQUADS = 20

const session = v.object({ userId: v.string(), secret: v.string() })

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

function randomCode(length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("")
}

const randomSecret = () => [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("")

/** The user a device session belongs to. Throws when the session isn't known, e.g. after the deployment was reset. */
async function userFor(ctx: QueryCtx, s: SquadSession): Promise<Doc<"users">> {
  const secretHash = await sha256(s.secret)
  const row = await ctx.db
    .query("sessions")
    .withIndex("by_hash", (q) => q.eq("secretHash", secretHash))
    .unique()
  const user = row && row.userId === s.userId ? await ctx.db.get(row.userId) : null
  if (!user) throw new Error("This device isn't signed in to squads anymore")
  return user
}

async function newSession(ctx: MutationCtx, userId: Id<"users">): Promise<SquadSession> {
  const secret = randomSecret()
  await ctx.db.insert("sessions", { userId, secretHash: await sha256(secret), createdAt: Date.now() })
  return { userId, secret }
}

async function unusedCode(ctx: MutationCtx, table: "squads" | "linkCodes") {
  for (;;) {
    const code = randomCode(6)
    const taken = await ctx.db
      .query(table)
      .withIndex("by_code", (q) => q.eq("code", code))
      .first()
    if (!taken) return code
  }
}

async function squadView(ctx: QueryCtx, squad: Doc<"squads">, me: Id<"users">): Promise<Squad> {
  const members = await ctx.db
    .query("memberships")
    .withIndex("by_squad", (q) => q.eq("squadId", squad._id))
    .collect()
  const users = (await Promise.all(members.map((m) => ctx.db.get(m.userId)))).filter((u) => u !== null)
  return {
    id: squad._id,
    name: squad.name,
    code: squad.code,
    members: users
      .map((u) => ({ name: u.name, learned: u.learned, saved: u.saved, isMe: u._id === me, updatedAt: u.progressAt }))
      .sort((a, b) => b.learned - a.learned || b.saved - a.saved || a.name.localeCompare(b.name))
  }
}

async function membership(ctx: QueryCtx, squadId: Id<"squads">, userId: Id<"users">) {
  return ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", userId).eq("squadId", squadId))
    .unique()
}

export const signUp = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }): Promise<SquadSession> => {
    const userId = await ctx.db.insert("users", { name: cleanName(name), learned: 0, saved: 0, progressAt: null, createdAt: Date.now() })
    return newSession(ctx, userId)
  }
})

export const me = query({
  args: { session },
  handler: async (ctx, args) => ({ name: (await userFor(ctx, args.session)).name })
})

export const rename = mutation({
  args: { session, name: v.string() },
  handler: async (ctx, args) => {
    const user = await userFor(ctx, args.session)
    await ctx.db.patch(user._id, { name: cleanName(args.name) })
  }
})

export const report = mutation({
  args: { session, learned: v.number(), saved: v.number() },
  handler: async (ctx, { session, learned, saved }) => {
    const user = await userFor(ctx, session)
    const clamp = (n: number) => Math.max(0, Math.min(1_000_000, Math.floor(n)))
    await ctx.db.patch(user._id, { learned: clamp(learned), saved: clamp(saved), progressAt: Date.now() })
  }
})

export const mySquads = query({
  args: { session },
  handler: async (ctx, args): Promise<Squad[]> => {
    const user = await userFor(ctx, args.session)
    const rows = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect()
    const squads = (await Promise.all(rows.sort((a, b) => a.joinedAt - b.joinedAt).map((m) => ctx.db.get(m.squadId)))).filter((s) => s !== null)
    return Promise.all(squads.map((s) => squadView(ctx, s, user._id)))
  }
})

async function checkRoom(ctx: QueryCtx, userId: Id<"users">) {
  const count = (
    await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()
  ).length
  if (count >= MAX_SQUADS) throw new Error(`You can be in up to ${MAX_SQUADS} squads`)
}

export const create = mutation({
  args: { session, name: v.string() },
  handler: async (ctx, args): Promise<Squad> => {
    const user = await userFor(ctx, args.session)
    await checkRoom(ctx, user._id)
    const name = args.name.trim().replace(/\s+/g, " ")
    if (!name) throw new Error("Give the squad a name")
    if ([...name].length > 40) throw new Error("Keep the squad name under 41 characters")
    const now = Date.now()
    const squadId = await ctx.db.insert("squads", { name, code: await unusedCode(ctx, "squads"), createdBy: user._id, createdAt: now })
    await ctx.db.insert("memberships", { squadId, userId: user._id, joinedAt: now })
    return squadView(ctx, (await ctx.db.get(squadId))!, user._id)
  }
})

export const join = mutation({
  args: { session, code: v.string() },
  handler: async (ctx, args): Promise<Squad> => {
    const user = await userFor(ctx, args.session)
    const code = normalizeCode(args.code)
    const squad = await ctx.db
      .query("squads")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique()
    if (!squad) throw new Error(`No squad has the code ${code || "you entered"}`)
    if (!(await membership(ctx, squad._id, user._id))) {
      await checkRoom(ctx, user._id)
      await ctx.db.insert("memberships", { squadId: squad._id, userId: user._id, joinedAt: Date.now() })
    }
    return squadView(ctx, squad, user._id)
  }
})

export const leave = mutation({
  args: { session, squadId: v.string() },
  handler: async (ctx, args) => {
    const user = await userFor(ctx, args.session)
    const squadId = ctx.db.normalizeId("squads", args.squadId)
    const row = squadId && (await membership(ctx, squadId, user._id))
    if (row) await ctx.db.delete(row._id)
  }
})

export const linkCode = mutation({
  args: { session },
  handler: async (ctx, args) => {
    const user = await userFor(ctx, args.session)
    const expiresAt = Date.now() + LINK_CODE_MS
    const code = await unusedCode(ctx, "linkCodes")
    await ctx.db.insert("linkCodes", { code, userId: user._id, expiresAt })
    return { code, expiresAt }
  }
})

export const redeemLinkCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args): Promise<SquadSession & { name: string }> => {
    const code = normalizeCode(args.code)
    const row = await ctx.db
      .query("linkCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique()
    const user = row && row.expiresAt > Date.now() ? await ctx.db.get(row.userId) : null
    if (row) await ctx.db.delete(row._id)
    if (!user) throw new Error("That link code didn't work. Make a new one in the extension")
    return { ...(await newSession(ctx, user._id)), name: user.name }
  }
})
