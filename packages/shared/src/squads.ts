// Squads: small groups of learners who see each other's progress. There is no
// login: the first time an app needs a squad it creates an anonymous user and
// keeps that user's session secret on the device. Another device joins the
// same user with a one-time link code. Words themselves stay wherever they
// already live; each app reports its own counts.

/** A word counts as learned once it's marked known or its review interval reaches this many days. */
export const LEARNED_INTERVAL_DAYS = 21

export const isLearned = (w: { status: "learning" | "known"; intervalDays: number }) => w.status === "known" || w.intervalDays >= LEARNED_INTERVAL_DAYS

/** What a leaderboard counts, from any list of saved words. */
export function progressOf(words: { status: "learning" | "known"; intervalDays: number }[]): SquadProgress {
  return { learned: words.filter(isLearned).length, saved: words.length }
}

export interface SquadProgress {
  learned: number
  saved: number
}

/** A device's sign-in: the user it belongs to and the secret that proves it. Not a password; the device makes it. */
export interface SquadSession {
  userId: string
  secret: string
}

export interface SquadMember extends SquadProgress {
  name: string
  /** This is the signed-in user. */
  isMe: boolean
  /** When the counts were last reported, or null if never. */
  updatedAt: number | null
}

export interface Squad {
  id: string
  name: string
  /** Six letters and digits; anyone with it can join. */
  code: string
  /** Most learned first. */
  members: SquadMember[]
}

/** The squad backend each app talks to. The Convex one lives in packages/backend/convex/squads.ts. */
export interface SquadApi {
  /** Makes an anonymous user with this display name and returns a session for this device. */
  signUp(name: string): Promise<SquadSession>
  me(session: SquadSession): Promise<{ name: string }>
  rename(session: SquadSession, name: string): Promise<void>
  report(session: SquadSession, progress: SquadProgress): Promise<void>
  mySquads(session: SquadSession): Promise<Squad[]>
  create(session: SquadSession, name: string): Promise<Squad>
  join(session: SquadSession, code: string): Promise<Squad>
  leave(session: SquadSession, squadId: string): Promise<void>
  /** A short code another device can redeem, once, within a few minutes, to sign in as this user. */
  linkCode(session: SquadSession): Promise<{ code: string; expiresAt: number }>
  redeemLinkCode(code: string): Promise<SquadSession & { name: string }>
}

/** Invite and link codes: no 0/O or 1/I/L, so they read aloud and type cleanly. */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

/** Uppercases and drops spaces and dashes, so "ab2 c-d3" matches "AB2CD3". */
export const normalizeCode = (code: string) => code.toUpperCase().replace(/[\s-]/g, "")

/** Trims and checks a display name. Returns the name, or throws a message to show. */
export function cleanName(name: string) {
  const n = name.trim().replace(/\s+/g, " ")
  if (!n) throw new Error("Pick a name for the leaderboard")
  if ([...n].length > 24) throw new Error("Keep the name under 25 characters")
  return n
}
