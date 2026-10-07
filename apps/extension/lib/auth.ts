import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins"
import { createAuthClient } from "better-auth/client"

// Signing in to the Convex deployment this build points at (.env.dev / .env.prod), through
// Better Auth running in that deployment (packages/backend/convex/auth.ts). The session lives
// in this extension's localStorage, shared by the side panel, settings and popup pages; the
// signed-in account is mirrored to chrome.storage so pages can react when it changes.

/** The deployment this build syncs with; unset means saved words stay in this browser. */
export const CONVEX_URL = process.env.PLASMO_PUBLIC_CONVEX_URL || ""
const CONVEX_SITE_URL = process.env.PLASMO_PUBLIC_CONVEX_SITE_URL || ""
/** Dev builds sign in as a fixed dev user, with no Google window. */
export const DEV_LOGIN = !!process.env.PLASMO_PUBLIC_DEV_LOGIN_PASSWORD

export interface Account {
  email: string
  name: string
}

const client = CONVEX_SITE_URL ? createAuthClient({ baseURL: CONVEX_SITE_URL, plugins: [convexClient(), crossDomainClient()] }) : null

const auth = () => {
  if (!client) throw new Error("This build doesn't sync: set PLASMO_PUBLIC_CONVEX_URL and PLASMO_PUBLIC_CONVEX_SITE_URL")
  return client
}

export async function getAccount(): Promise<Account | null> {
  return ((await chrome.storage.local.get("account")).account as Account | undefined) ?? null
}

const setAccount = (account: Account | null) => chrome.storage.local.set({ account })

const fail = (what: string, error: { message?: string; status?: number } | null) => {
  if (error) throw new Error(`${what}: ${error.message || `error ${error.status}`}`)
}

/** Opens Google's sign-in in a Chrome window; it returns to the extension with a one-time code for the session. */
export async function signInWithGoogle() {
  const a = auth()
  const r = await a.signIn.social({ provider: "google", callbackURL: chrome.identity.getRedirectURL(), disableRedirect: true })
  fail("Couldn't start Google sign-in", r.error)
  const back = await chrome.identity.launchWebAuthFlow({ url: r.data!.url!, interactive: true })
  const ott = back && new URL(back).searchParams.get("ott")
  if (!ott) throw new Error("Google sign-in didn't finish")
  fail("Couldn't finish signing in", (await a.crossDomain.oneTimeToken.verify({ token: ott })).error)
  await refreshAccount()
}

/** Dev builds only: signs in as the dev user, creating it the first time. Needs DEV_LOGIN=1 on the deployment. */
export async function signInAsDev() {
  const a = auth()
  const dev = { email: "dev@canto-learning.local", password: process.env.PLASMO_PUBLIC_DEV_LOGIN_PASSWORD!, name: "Dev" }
  const signedIn = await a.signIn.email({ email: dev.email, password: dev.password })
  if (signedIn.error) fail("Couldn't sign in as the dev user", (await a.signUp.email(dev)).error)
  await refreshAccount()
}

export async function signOut() {
  await client?.signOut()
  token = null
  await setAccount(null)
}

/** Re-reads the session, e.g. after signing in, and records who's signed in. */
export async function refreshAccount() {
  const { data } = await auth().getSession()
  token = null
  await setAccount(data?.user ? { email: data.user.email, name: data.user.name } : null)
}

let token: { jwt: string; expiresAt: number } | null = null

/** A Convex auth token for the signed-in user, fetched again shortly before it expires. */
export async function convexToken(): Promise<string> {
  if (token && token.expiresAt - 60_000 > Date.now()) return token.jwt
  const r = await auth().convex.token()
  if (r.error || !r.data?.token) {
    // The session ended (signed out elsewhere, or expired).
    await setAccount(null)
    throw new Error("Sign in again to sync your words")
  }
  const { exp } = JSON.parse(atob(r.data.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
  token = { jwt: r.data.token, expiresAt: exp * 1000 }
  return token.jwt
}
