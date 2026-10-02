# Pause & Ask

A Chrome extension that turns Cantonese YouTube videos into lessons. Pause, ask by voice or text, and a tutor in the side panel explains what was just said, with Jyutping and both registers (口語 / 書面語). Words you ask about are saved automatically with the moment they came from.

Spec and plan: [Pause & Ask: YouTube Cantonese Tutor](https://claude.ai/code/artifact/8b284da8-9709-463c-a14f-6a596a41abc0) · [MVP Implementation Plan](https://claude.ai/code/artifact/2d241c97-a195-4fe1-9e23-553a541ec742)

## Run it

```sh
pnpm install
pnpm dev:ext          # Plasmo dev build in apps/extension/build/chrome-mv3-dev
# or
pnpm build:ext        # production build in apps/extension/build/chrome-mv3-prod
```

In Chrome, open `chrome://extensions`, turn on Developer mode, and **Load unpacked** the build folder. The setup page opens on install:

1. Allow the microphone (the side panel can't show Chrome's mic prompt itself).
2. Paste a Claude API key from the Claude Console. It's stored only in this browser profile.

Open a YouTube video with Cantonese or Chinese captions and click the toolbar icon to open the side panel.

## How it works

| Piece | File | Job |
|---|---|---|
| Caption hook | `apps/extension/contents/caption-hook.ts` | Runs in the page (MAIN world); copies every `/api/timedtext` caption file the player downloads and reports the caption tracks |
| Player bridge | `apps/extension/contents/bridge.ts` | Picks the best Cantonese track and turns it on, watches play/pause/seek, falls back to reading on-screen captions |
| Side panel | `apps/extension/sidepanel.tsx` | Transcript, 口語 / 書面語 switch, focus card with tappable words, chat, voice input |
| Tutor | `apps/extension/lib/tutor.ts` | App logic: save captions, convert registers, split lines into words, stream answers, log taught words |
| Claude calls | `apps/extension/lib/ai.ts` | Haiku 4.5 for conversion, word splitting and word extraction (structured outputs); Sonnet 5.5 for streamed answers |
| Local database | `apps/extension/lib/localStore.ts` | IndexedDB: videos, caption lines, words, encounters, questions, reviews |
| Shared | `packages/shared` | Types, caption parsing, the `Store` interface, spaced-repetition scheduling, register diff |

**Storage is local for now.** Everything goes through the `Store` interface in `packages/shared/src/store.ts`. A remote implementation (for example a Cloudflare Worker over D1, as in the plan) can implement the same interface later so the phone app shares the data, and the Claude calls can move behind that backend at the same time.

## Test

```sh
pnpm test                                   # unit tests (shared + extension)
pnpm build:ext && xvfb-run -a pnpm --filter extension smoke
```

The smoke test loads the built extension in Chromium against a mock YouTube page and a mock Claude API, then pauses, asks a question and checks the word lands in IndexedDB.
