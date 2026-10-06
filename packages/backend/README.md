# Convex backend

Shared storage for the extension and the phone app. The extension's `Store` interface (`packages/shared/src/store.ts`) maps one to one onto `convex/store.ts`; the phone reads `study:snapshot` and sends flashcard answers to `study:addReviews` (`convex/study.ts`) and words typed in by hand to `store:addWord`. Local storage stays the default until you connect a deployment in each app.

## Set up a deployment

```sh
cd packages/backend
npx convex dev            # first run: log in and create the project (or pick "local" to try it without the cloud)
npx convex env set SYNC_TOKEN "$(openssl rand -hex 24)"
npx convex env get SYNC_TOKEN
```

For production, `npx convex deploy` and set `SYNC_TOKEN` on that deployment too (`npx convex env set --prod ...`).

Then give each app the deployment URL (`CONVEX_URL` in `.env.local`, like `https://happy-otter-123.convex.cloud`) and the token:

- **Extension:** Settings > Saved words > Convex. Connect checks the token. "Copy this browser's words to Convex" moves what you already saved; words keep their ids where they can, so phone progress lines up, and running it twice is safe.
- **Phone:** Library > Settings > Sync with Convex.

## Notes

- Every function checks `token` against `SYNC_TOKEN`. It's one shared secret for a personal deployment, not per-user auth; swap in Convex Auth if more people use it.
- Words and encounters keep numeric ids (`num`, from the `counters` table) so both clients see the same shapes as the local store.
- `admin:clearAll` is internal (CLI or dashboard only). The smoke test calls it on a local deployment: `CONVEX_URL=http://127.0.0.1:3210 CONVEX_TOKEN=<token> node apps/extension/e2e/smoke.mjs`.
- Integration tests for the adapter: `CONVEX_TEST_URL=http://127.0.0.1:3210 CONVEX_TEST_TOKEN=<token> pnpm --filter extension test`.

## Squads

`convex/squads.ts` holds squads and their words-learned leaderboard. There's no login: the extension's Squads view creates an anonymous user (a display name) and keeps that device's session secret in `chrome.storage.sync`, so it follows the Chrome profile. The phone joins as the same user with a one-time link code from the extension (Squads > Use squads on your phone). Only a SHA-256 of each session secret is stored.

- Squad functions don't take `SYNC_TOKEN`, so friends can share a deployment for squads without access to your words. Build the extension with `PLASMO_PUBLIC_SQUADS_URL=<deployment url>` to prefill it; otherwise it suggests the Convex URL from settings.
- Each app reports its own counts (`squads:report`): learned is words marked known or with a review interval of 21 days or more, out of words saved. Last report wins between devices; a device with no words doesn't report.
- Per-user words and real accounts (e.g. Convex Auth, or a username and password for recovery) are the follow-up.
- Tests: `CONVEX_TEST_URL=http://127.0.0.1:3210 pnpm --filter extension test`, and `pnpm --filter extension build && CONVEX_URL=http://127.0.0.1:3210 node apps/extension/e2e/squads.mjs` (headless Chromium).
