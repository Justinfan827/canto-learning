---
name: e2e-real-chrome
description: End-to-end test the Pause & Ask extension in the user's real, running Chrome with the dev-browser CLI. Rebuild, reload the extension and the YouTube tab, then drive play, pause, transcription, word lookups and saving on a real Cantonese video while the user watches. Use after any change to the extension or transcriber, or when the user asks to "test it in my browser". A separate Chrome for Testing window (e2e/demo.mjs) is the fallback.
---

# End-to-end testing in the user's real Chrome

**Run tests headless by default.** `node apps/extension/e2e/smoke.mjs` runs in headless Chrome for Testing and opens nothing on the user's screen (`HEADED=1` shows it). Use the user's real Chrome only when they ask to watch, or for the final reload after a change. Never loop test runs that open windows, and don't open extra windows or popups in their Chrome: reuse one test tab and close it when done.

**Rule: control the user's Chrome only with the `dev-browser` CLI and `--connect`.** Don't use Claude in Chrome, BrowserSkill (`bsk`), computer use, or Chrome's remote-debugging "Allow" flow from other tools for this. `--connect` attaches to the Chrome that's already running, so the user isn't asked to turn on remote debugging again.

The user prefers to watch changes run in their own Chrome, on a real video, not only in the mock smoke test. Default sample video (no captions, so it exercises local transcription): https://www.youtube.com/watch?v=m9BweWeWD0g

## 0. Before you start

- Build: `pnpm build:ext`. The output in `apps/extension/build/chrome-mv3-prod` is what Chrome has loaded unpacked.
- Transcriber: if you changed `apps/transcriber`, restart it (`pkill -f apps/transcriber/server.mjs`, then `pnpm transcriber` in the background). Check it with `curl -s localhost:8787/engines`.
- Run `pnpm test` and the mock smoke test first (`node apps/extension/e2e/smoke.mjs` with `CHROMIUM_PATH` set to Chrome for Testing, see the end). The real-Chrome pass is for what mocks can't show.

## 1. Connect to the running Chrome

Chrome's remote debugging is on (chrome://inspect/#remote-debugging shows "Server running at: 127.0.0.1:PORT"). Find the port without asking:

```sh
lsof -nP -iTCP -sTCP:LISTEN | grep -i google    # e.g. 127.0.0.1:57720
```

Connect with the WebSocket URL directly, passing the script on stdin:

```sh
dev-browser --connect ws://127.0.0.1:57720/devtools/browser --timeout 60 < script.js
```

```js
// script.js
for (const p of await browser.listPages()) console.log(p.id.slice(0, 8), p.url.slice(0, 90))
```

Gotchas:
- `dev-browser --connect` with no URL (or an http URL) fails with `EPERM ... DevToolsActivePort`: macOS blocks processes started from the Claude app from reading Chrome's profile folder. The `ws://…/devtools/browser` form skips that file. Don't try to work around the macOS block.
- If the connection hangs (`connectOverCDP: Timeout`), Chrome is probably showing an "Allow remote debugging?" prompt. Ask the user to click Allow, then `dev-browser stop` and retry.
- If scripts start timing out on a stale connection, run `dev-browser stop` and reconnect.
- `browser.listPages()` may not list every tab (for example the user's original YouTube tab). Use `chrome.tabs.query` from an extension page instead (below).

## 2. Reload the extension and the YouTube tab

Chrome keeps the old content scripts and manifest until the extension reloads, and reloading orphans the content script in open tabs, so do both. Find the extension id from `listPages()` (any `chrome-extension://<id>/` URL) or chrome://extensions.

```js
const EXT = "chrome-extension://<extension-id>"
const a = await browser.newPage()
await a.goto(`${EXT}/sidepanel.html`)
await a.evaluate(() => { setTimeout(() => chrome.runtime.reload(), 100) })
await new Promise((r) => setTimeout(r, 3000))
const b = await browser.newPage()
await b.goto(`${EXT}/sidepanel.html`)
console.log(await b.evaluate(async () => {
  const tabs = await chrome.tabs.query({ url: "https://www.youtube.com/*" })
  for (const t of tabs) await chrome.tabs.reload(t.id)
  return tabs.map((t) => [t.id, t.url])
}))
await b.close()
```

Settings live in `chrome.storage.local` (for example `transcribeEngine`, `register`), so a test can set them from an extension page. Put back anything you change unless the user asked for it.

## 3. Open the panel and drive the video

Chrome only opens the real side panel on a user gesture (the toolbar icon). Either ask the user to click it, or load the panel page pinned to the YouTube tab in one named test tab (no new windows):

```js
const p = await browser.getPage("pna-test")   // reused across runs; close it at the end
await p.goto(`${EXT}/sidepanel.html`)
const tabId = await p.evaluate(async () => (await chrome.tabs.query({ url: "https://www.youtube.com/watch*" }))[0]?.id)
await p.goto(`${EXT}/sidepanel.html?tab=${tabId}`)
```

Then drive the player through the extension's own bridge. This works even when the YouTube tab isn't in `listPages()`:

```js
const cmd = (m) => panel.evaluate((m) => chrome.tabs.sendMessage(Number(new URLSearchParams(location.search).get("tab")), m).catch(() => {}), m)
await cmd({ type: "seek", timeMs: 95000 })
await cmd({ type: "play" })
await new Promise((r) => setTimeout(r, 7000))
await cmd({ type: "pause" })
```

Useful selectors (check `sidepanel.tsx` and `components/` if they've changed): `.lyrics .ln.now` (current line), `.moment .chip-w` (words on the paused card), `.sheet` (word drawer), `.sheet .save`, `.regroup-hint`. Log what each step shows, and save a screenshot to send the user: `await saveScreenshot(await panel.screenshot(), "name.png")` writes to `~/.dev-browser/tmp/`.

Keep scripts small: one step per run, ending with a log of the state you need next.

## 4. Clean up

Close the test tab (`browser.closePage("pna-test")`) and anything else you opened unless the user wants to keep looking. Leave the user's own tabs alone apart from the reloads above.

## Alternative: a separate, visible browser

Only when the user's Chrome isn't reachable (for example from a cloud session, which can't see their laptop) or the user says not to touch it.

Opening a fresh tab in the user's Chrome (`browser.newPage()`, still through `dev-browser --connect`) is fine for an isolated run, as long as you close it afterwards.

Otherwise run the visible walkthrough in its own Chrome for Testing window with the extension preloaded:

```sh
CHROMIUM_PATH="$HOME/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" \
  node apps/extension/e2e/demo.mjs m9BweWeWD0g
```
