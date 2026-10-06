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
