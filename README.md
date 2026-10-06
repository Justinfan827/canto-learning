# Pause & Ask

A Chrome extension that turns Cantonese YouTube videos into lessons. While the video plays, the side panel shows the captions like lyrics, with Jyutping over the current line. Pause, tap any word for its meaning and example sentences from a bundled offline dictionary, and save the words you don't know with the moment they came from. No API key needed for that.

AI is an add-on: with a model set up, the paused line gets an English translation and an Explain button, the tutor answers questions by voice or text right under the line, and the Aa menu can switch the captions between spoken (口語) and written (書面語) Chinese. The model can be a free one on OpenRouter (default `qwen/qwen3.8-27b:free`), a local OpenAI-compatible server such as Ollama, or Claude.

Spec and plan: [Pause & Ask: YouTube Cantonese Tutor](https://claude.ai/code/artifact/8b284da8-9709-463c-a14f-6a596a41abc0) · [MVP Implementation Plan](https://claude.ai/code/artifact/2d241c97-a195-4fe1-9e23-553a541ec742)

## Run it

```sh
pnpm install
pnpm dev:ext          # Plasmo dev build in apps/extension/build/chrome-mv3-dev (first run downloads the dictionary data)
# or
pnpm build:ext        # production build in apps/extension/build/chrome-mv3-prod
```

In Chrome, open `chrome://extensions`, turn on Developer mode, and **Load unpacked** the build folder. The settings page opens on install; everything on it is optional:

- **Captions**: whether the local transcriber helper is running, and its quality (Auto picks the best installed engine).
- **AI tutor**: a free OpenRouter key (openrouter.ai/keys), a local server URL, or a Claude API key. Keys are stored only in this browser profile.
- **Microphone**: allow it here (the side panel can't show Chrome's mic prompt itself), and choose whether spoken questions are in Cantonese or English.

**Pause popup.** With the side panel closed, pausing a video shows the paused line in a small card over YouTube's sidebar (or over the player's right edge in theater mode). Tap a word for its meaning and save it, step to the previous or next line with ↑ ↓, and press Space to carry on watching. The panel icon in the card opens the full transcript. Turn it off in the Aa menu or in settings.

Open a YouTube video and click the toolbar icon to open the side panel. The panel header shows where the captions came from; the star opens saved words, **Aa** has display options (Jyutping, 口語 / 書面語, English, text size) and **⋯** opens settings. Press Space in the panel to play or pause.

## Videos without captions

The panel picks captions in this order: the video's Cantonese track, then a Chinese track, then the captions YouTube draws on screen, then local transcription. When a video has no Chinese track it starts transcribing on its own, from where you are in the video; it then fills in the start. The pill says "Transcribing on this computer" and a thin bar shows progress.

Transcription runs in a small local helper. Start it with `pnpm transcriber` (port 8787) and leave it running; if it isn't running, the pill offers to set it up. It downloads the audio with `yt-dlp`, converts it with `ffmpeg`, and streams lines back as the model produces them. Results are cached in `~/.cache/canto-learning`. The engine is set in settings under Captions; Auto uses the first one installed of:

| Engine | Needs | Notes |
|---|---|---|
| SenseVoice Small (sherpa-onnx) | `uv`, plus the model and VAD in `~/.cache/canto-learning/models` (see below) | Writes spoken Cantonese (佢哋, 嘅, 咗); about 60× real time on an M2 |
| Whisper large-v3-turbo (whisper.cpp) | `brew install whisper-cpp` and `ggml-large-v3-turbo.bin` (found in OpenSuperWhisper's model folder, or set `WHISPER_CPP_MODEL`) | Fastest on Apple Silicon; Cantonese (`yue`) |
| Whisper turbo / medium (openai-whisper) | `whisper` CLI | Turbo downloads 1.5 GB on first use; medium has no separate Cantonese option |
| Parakeet TDT 0.6B v3 (MLX) | `parakeet-mlx` | English and European languages only, for comparison |

Whisper tends to write Cantonese speech as formal written Chinese, so Auto prefers SenseVoice. To install SenseVoice's model (about 240 MB):

```sh
mkdir -p ~/.cache/canto-learning/models && cd ~/.cache/canto-learning/models
curl -L https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17.tar.bz2 | tar xj
curl -LO https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx
```

## How it works

| Piece | File | Job |
|---|---|---|
| Caption hook | `apps/extension/contents/caption-hook.ts` | Runs in the page (MAIN world); copies every `/api/timedtext` caption file the player downloads and reports the caption tracks |
| Player bridge | `apps/extension/contents/bridge.ts` | Picks the best Cantonese track and turns it on, watches play/pause/seek, falls back to reading on-screen captions |
| Side panel | `apps/extension/sidepanel.tsx`, `apps/extension/components/` | Read-along transcript (`Lyrics`), paused card, word sheet and tutor answers (`Moment`), saved words (`SavedList`), header and Aa menu (`Header`) |
| Tutor | `apps/extension/lib/tutor.ts` | App logic: save captions, convert registers, split lines into words, stream answers, log taught words |
| Dictionary | `packages/shared/src/dict.ts`, `apps/extension/scripts/build-dict.mjs` | Longest-match word splitting and lookups over CC-Canto + CC-CEDICT with Cantonese readings, built into `assets/dict.dat` |
| Example sentences | `packages/shared/src/examples.ts`, `apps/extension/scripts/build-examples.mjs` | Tatoeba's Cantonese sentences with English, Jyutping filled in from the dictionary, indexed by the words they use; built into `assets/examples.dat` and `apps/ios/Canto/Resources/examples.json` |
| Claude calls | `apps/extension/lib/ai.ts` | Prompts and schemas; Haiku 4.5 for conversion and word extraction (structured outputs), Sonnet 5.5 for streamed answers |
| Other models | `apps/extension/lib/openaiCompat.ts` | The same prompts over any OpenAI-compatible endpoint (OpenRouter, Ollama, LM Studio) |
| Transcriber | `apps/transcriber/server.mjs`, `apps/extension/lib/useTranscriber.ts` | Local speech-to-text for videos without captions, started automatically from the playhead; lines go to the bridge as `local` captions |
| Data layer | `apps/extension/lib/data` | The one `store` the app uses; settings pick the backend. `localStore.ts` (IndexedDB, the default) or `convexStore.ts` (Convex) |
| Local database | `apps/extension/lib/data/localStore.ts` | IndexedDB: videos, caption lines, words, encounters, questions, reviews |
| Study sync | `apps/extension/lib/data/studySync.ts`, `packages/shared/src/study.ts` | Pushes saved words with their source lines to the helper for the phone app, and adds words typed in on the phone |
| Convex backend | `packages/backend/convex` | Schema and functions mirroring `Store`, plus the phone's `study:snapshot` and `study:addReviews` (the phone adds words with `store:addWord`) |
| Shared | `packages/shared` | Types, caption parsing, the `Store` interface, spaced-repetition scheduling, register diff |

**Storage is local by default.** The app imports `store` from `apps/extension/lib/data` and never touches IndexedDB or Convex directly. Both backends implement the `Store` interface in `packages/shared/src/store.ts`. To share words with the phone from anywhere, connect a Convex deployment under Settings > Saved words; see [packages/backend/README.md](packages/backend/README.md).

## Phone study app

`apps/ios` is an iPhone app for studying your saved words away from the computer: videos with their words, word pages, flashcards with spaced repetition, and a hands-free Listen mode. The extension pushes saved words to the local helper (`PUT /study`) and the app pulls them from there; see [apps/ios/README.md](apps/ios/README.md).

## Test

```sh
pnpm test                                   # unit tests (shared + extension)
pnpm build:ext && pnpm --filter extension smoke     # headless; HEADED=1 to watch
```

The smoke test loads the built extension in Chromium against a mock YouTube page, a mock Claude API and a mock transcriber helper. It reads along, pauses, looks up and saves a word with no model, then with Claude asks a question and saves a taught word, tries the display options and saved words list, and finally opens a video with no Chinese captions to check it transcribes on its own. Screenshots of each state are written to `apps/extension/e2e/screenshots/`. It runs headless (set `HEADED=1` to see the window); set `CHROMIUM_PATH` to a Chromium or Chrome for Testing binary.

## Dictionary data

The dictionary is built from [CC-Canto](https://cantonese.org) and its Cantonese readings for CC-CEDICT (© Pleco Inc.), and [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) (© MDBG), all under [CC BY-SA](https://creativecommons.org/licenses/by-sa/3.0/). Example sentences are Cantonese sentences from [Tatoeba](https://tatoeba.org) with their English translations, under [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/); about 6,000 sentences covering 5,000 words. Their Jyutping is built word by word from the dictionary, so a character with several readings can occasionally get the wrong one. Words with no bundled example get an "Ask the tutor for examples" button when a model is set up. `pnpm --filter extension dict` rebuilds both.
