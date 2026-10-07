# Convex backend

Shared storage for the extension and the phone app. The extension's `Store` interface (`packages/shared/src/store.ts`) maps one to one onto `convex/store.ts`; the phone reads `study:snapshot` and sends flashcard answers to `study:addReviews` (`convex/study.ts`) and words typed in by hand to `store:addWord`. Every row belongs to a signed-in user (`owner`), and every function only reads and writes the caller's rows.

## Accounts

Sign-in runs inside the deployment with [Better Auth](https://www.better-auth.com) and the [Convex component](https://labs.convex.dev/better-auth) (`convex/auth.ts`, `convex/auth.config.ts`, `convex/http.ts`). Clients sign in, get a short-lived Convex token for that user, and send it with each call; `ctx.auth.getUserIdentity()` gives the user (`signedIn` in `convex/lib.ts`). Nothing secret ships in the extension.

- **Google:** the extension opens Google's sign-in in a Chrome window (`chrome.identity.launchWebAuthFlow`). After the callback on this deployment, Better Auth sends the window back to `https://<extension id>.chromiumapp.org/?ott=…`, and the extension swaps that one-time code for a session (`apps/extension/lib/auth.ts`).
- **Dev user:** with `DEV_LOGIN=1`, email and password sign-in is on, which the dev build's **Sign in as dev user** button and the tests use. Never set it on a production deployment.

## Set up a deployment

```sh
cd packages/backend
npx convex dev --once                                    # first run: log in and create the project
npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
npx convex env set EXTENSION_ID anhlhljekeokoaobmdgkekjmlfdmohii   # pinned by `key` in apps/extension/package.json
npx convex env set DEV_LOGIN 1                           # dev deployments only
```

Google sign-in: create an OAuth client (type **Web application**) in Google Cloud Console with the redirect URI `https://<deployment>.convex.site/api/auth/callback/google`, then `npx convex env set GOOGLE_CLIENT_ID …` and `GOOGLE_CLIENT_SECRET …`.

Point the extension's builds at the deployment in `apps/extension/.env.dev` (or `.env.prod` for production, from `npx convex deploy`): `PLASMO_PUBLIC_CONVEX_URL` and `PLASMO_PUBLIC_CONVEX_SITE_URL`.

## Notes

- Words and encounters keep numeric ids per user (`num`, from the `counters` table) so both clients see the same shapes as the local store.
- "Copy this browser's words to your account" in the extension's settings moves what you saved before signing in; words keep their ids where they can, so phone progress lines up, and running it twice is safe.
- `admin:clearAll` is internal (CLI or dashboard only) and empties every app table, for every user.
- Integration tests for the adapter, against a deployment with `DEV_LOGIN=1` (each run signs up its own user): `CONVEX_TEST_URL=https://<deployment>.convex.cloud pnpm --filter extension test`.
- The phone app still signs in with the old shared token and needs the same sign-in before it can sync with Convex again; until then it syncs through the local helper.

## Squads

`convex/squads.ts` holds squads and their words-learned leaderboard. There's no login: the extension's Squads view creates an anonymous user (a display name) and keeps that device's session secret in `chrome.storage.sync`, so it follows the Chrome profile. The phone joins as the same user with a one-time link code from the extension (Squads > Use squads on your phone). Only a SHA-256 of each session secret is stored.

- Squads have their own anonymous device sessions, separate from accounts; friends can share a deployment for squads without access to your words. Build the extension with `PLASMO_PUBLIC_SQUADS_URL=<deployment url>` to prefill it; otherwise it suggests the Convex URL from settings.
- Each app reports its own counts (`squads:report`): learned is words marked known or with a review interval of 21 days or more, out of words saved. Last report wins between devices; a device with no words doesn't report.
- Per-user words and real accounts (e.g. Convex Auth, or a username and password for recovery) are the follow-up.
- Tests: `CONVEX_TEST_URL=http://127.0.0.1:3210 pnpm --filter extension test`, and `pnpm --filter extension build && CONVEX_URL=http://127.0.0.1:3210 node apps/extension/e2e/squads.mjs` (headless Chromium).
