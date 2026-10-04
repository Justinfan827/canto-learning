import { api } from "@pna/backend/convex/_generated/api"
import type { SquadApi, SquadSession } from "@pna/shared"
import { ConvexHttpClient } from "convex/browser"

/** `SquadApi` on a Convex deployment (packages/backend/convex/squads.ts). Squads need no sync token. */
export function createConvexSquads(url: string, client = new ConvexHttpClient(url)): SquadApi {
  const q = client.query.bind(client)
  const m = client.mutation.bind(client)
  const s = ({ userId, secret }: SquadSession) => ({ userId, secret })
  const done = () => {}
  return {
    signUp: (name) => m(api.squads.signUp, { name }),
    me: (session) => q(api.squads.me, { session: s(session) }),
    rename: (session, name) => m(api.squads.rename, { session: s(session), name }).then(done),
    report: (session, { learned, saved }) => m(api.squads.report, { session: s(session), learned, saved }).then(done),
    mySquads: (session) => q(api.squads.mySquads, { session: s(session) }),
    create: (session, name) => m(api.squads.create, { session: s(session), name }),
    join: (session, code) => m(api.squads.join, { session: s(session), code }),
    leave: (session, squadId) => m(api.squads.leave, { session: s(session), squadId }).then(done),
    linkCode: (session) => m(api.squads.linkCode, { session: s(session) }),
    redeemLinkCode: (code) => m(api.squads.redeemLinkCode, { code })
  }
}

/** Convex prefixes thrown messages with a request id and "Uncaught Error:"; keep the message. */
export function squadError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  const m = /Uncaught Error: (.*?)(?:\n|$|\s+at )/.exec(msg)
  return m ? m[1] : msg
}

// This Chrome profile's squad identity. It lives in chrome.storage.sync so it
// follows the person to their other computers signed in to the same profile.

export interface SquadIdentity extends SquadSession {
  /** The deployment the session belongs to. */
  url: string
  name: string
}

const KEY = "squadIdentity"

export async function loadIdentity(): Promise<SquadIdentity | null> {
  const got = await chrome.storage.sync.get(KEY)
  return (got[KEY] as SquadIdentity | undefined) ?? null
}

export async function saveIdentity(id: SquadIdentity | null) {
  if (id) await chrome.storage.sync.set({ [KEY]: id })
  else await chrome.storage.sync.remove(KEY)
}
