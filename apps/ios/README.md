# Canto (iPhone study app)

Your study guide for the words you save in Pause & Ask. It lists the videos you watched with the words you saved from each, shows each word with its Jyutping, meaning and the line it came from, turns them into flashcards with spaced repetition, and reads them aloud hands-free for listening on the go.

## Run it

```sh
pnpm transcriber                 # the helper on your Mac, port 8787 (also serves study data)
open apps/ios/Canto.xcodeproj    # then Run on an iPhone simulator
```

The Simulator reaches the helper at `http://127.0.0.1:8787`, the default. With no helper running, the empty Library offers **Try sample words**: 23 words saved from three real Cantonese YouTube videos.

On a real iPhone, start the helper so it listens on your Wi-Fi with `HOST=0.0.0.0 pnpm transcriber`, then enter your Mac's address (for example `http://192.168.1.20:8787`) under Library > Settings. Words stay cached on the phone, so the app works away from home; it syncs whenever it opens.

The project is generated from `project.yml` with [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`xcodegen generate`); the generated `Canto.xcodeproj` is checked in so Xcode alone is enough. iOS 26 or later.

## How sync works

| Step | Where |
|---|---|
| The extension exports saved words, their source lines and videos | `Store.exportStudy()` in `apps/extension/lib/localStore.ts`, shape in `packages/shared/src/study.ts` |
| …and pushes them to the helper after every change | `withStudySync` in `apps/extension/lib/studySync.ts` → `PUT /study` |
| The helper keeps the latest copy | `~/.cache/canto-learning/study.json` (`apps/transcriber/server.mjs`) |
| The app pulls and caches it | `GET /study`, `HelperBackend` + `StudyStore` |
| Flashcard answers go back | `POST /study/reviews` → `study-reviews.json` |
| Words you add on the phone (Library > +) go back | `POST /study/words` → `study-words.json`; the extension adds them on its next sync, filling blank Jyutping and meaning from its dictionary, then clears them |

Everything stays on your own machines. To sync from anywhere instead, pick **Convex** under Library > Settings and enter the same deployment URL and sync token as the extension. `ConvexBackend` calls `study:snapshot`, `study:addReviews` and `store:addWord` over Convex's HTTP API; views only ever talk to `StudyStore`, which picks the backend. The extension doesn't apply phone reviews yet; they're stored for when it does.

## Pieces

| File | Job |
|---|---|
| `Model/StudyStore.swift` | Cached snapshot, the phone's review schedule, the upload queue, which backend to sync with |
| `Model/StudyBackend.swift`, `Model/ConvexBackend.swift` | The helper and Convex backends behind one protocol |
| `Model/Scheduler.swift` | The same simplified SM-2 as `packages/shared/src/schedule.ts` |
| `Views/LibraryView.swift` | Videos with their words, or all words with search |
| `Views/WordDetailView.swift` | Characters, Jyutping with tone contours, meaning, written form, source lines with "watch at" links |
| `Views/FlashcardSession.swift` | Tap to flip, swipe right if you knew it and left if you're still learning; misses come back a few cards later |
| `Views/ListenView.swift`, `Audio/ListenSession.swift` | Word, meaning, then the source line, read aloud with lock-screen and headphone controls |
| `Views/ToneMarks.swift` | Draws each syllable's pitch so tones read as shapes |

Speech uses the phone's built-in Cantonese voice (zh-HK). If none is installed, add Chinese (Hong Kong) under Settings > Accessibility > Spoken Content > Voices.

## Test

```sh
cd apps/ios && xcodebuild test -project Canto.xcodeproj -scheme Canto -destination 'platform=iOS Simulator,name=iPhone 17'
```

Screenshot shortcuts (launch arguments): `-tab review`, `-tab listen`, `-autostart YES` (opens the review), `-flipped YES`, `-video <id>`, `-word <id>`, `-add YES` (opens Add a word), `-serverURL <url>`, `-backend convex -convexURL <url> -convexToken <token>`.
