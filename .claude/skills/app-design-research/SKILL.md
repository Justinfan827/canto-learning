---
name: app-design-research
description: Design and brand research on the user's real iPhone. Drive other apps (Duolingo, Drops, Ling, Pleco, or any app the user names) through iPhone Mirroring with the phone-harness skill, capture their screens at full resolution, crop mascots, illustrations and signature components into PNG assets, and write a brand-identity analysis with suggestions for Canto. Use when the user asks to collect screens, research competitors' UI or branding, gather design inspiration or assets from apps, or add to design/inspiration.
---

# App design research on the iPhone

The output lives in `design/inspiration/`:

```
design/inspiration/
  README.md               # brand findings per app + takeaways for Canto (keep adding)
  <app>/NN-<what>.png     # screens in the order visited, 652x1436
  <app>/assets.json       # crop boxes for the assets, as screen fractions
  <app>/assets/<name>.png # mascots, characters, illustrations, signature components
```

Load the `phone-harness` skill first and follow its rules: one line to the user before and after each script, `# task:`/`# step:` comments, act then verify with `ocr()`.

## 1. Connect and set up

- `ensure_mirroring()`; if it raises or shows **iPhone in Use**, stop and ask the user to lock the phone. Never tap Connect. Unlocking the phone ends mirroring mid-run, so check for "iPhone in Use" in every loop and delete any capture of that screen.
- Load the helpers in each script: `exec(open("<repo>/.claude/skills/app-design-research/scripts/phone_helpers.py").read())`. They give `hires(path)` (full Retina capture; the harness's `screenshot()` is only 326x718) and `walk(folder, prefix, start, answers)`, which captures and presses through onboarding until a screen that needs the user.
- Don't save screens that show the user's own data (calendar, Home Screen, mail).

## 2. Get the apps

- Check with `open_app("<App>")`: if Spotlight shows an App Store "Top Hit" instead, it isn't installed.
- Installing is a download the user must approve. Ask which apps, then either the user installs them or you tap Get/the cloud icon and **Install**; when the App Store asks for a password or Face ID, stop and hand it to the user. Never type a password.
- App Store search: tap the field with `tap_image_point` and type with `type_text(..., keystrokes=True)`; the paste path often doesn't land.

## 3. Walk each app

Order: welcome → onboarding questions → first lesson (every exercise type, plus a correct and an **incorrect** answer on purpose) → lesson end / streak / rewards → home → each tab.

- Answer onboarding neutrally (`"I'm new"`, `"Travel"`, `"10 min / day"`). Pick the target language: Cantonese where offered, otherwise Chinese.
- **Stop and ask the user** at: account creation or sign-in, payment or free trials, age, real name or other personal data. A placeholder name like "Learner" is fine. Many apps block further screens behind an account; note where.
- **Decline** notification prompts ("Don't Allow"), skip widgets ("Not now", "Skip widget"), close paywalls with the X (top left, `tap_image_point(30-36, 105)`).
- Name files by what they show: `18-exercise-selected.png`, `24-exercise-incorrect.png`, `43-home-path.png`. Delete duplicates when a screen didn't change (compare OCR or `md5`).

### iPhone Mirroring gotchas (learned the hard way)
- **Vertical swipes are dropped.** `scroll()` works for lists only sometimes; some lists (Ling's language list) don't scroll at all, so use the app's search box. For "swipe up" moments, try `swipe("up")` then `scroll("down")`.
- **Drag-and-drop works** with `drag(x1, y1, x2, y2, duration=0.8, steps=30)` (convert with `image_point`). Drops' word matching needs it; a tap does nothing.
- **Buttons that look tappable may need a selection first** (Duolingo's streak goal). If a tap changes nothing, select an option, then retry.
- **A focused search field eats the next tap.** `press("enter")` to dismiss the keyboard, then tap the row.
- **Pasting Chinese is garbled** in some apps (Pleco); search in English with `keystrokes=True`. `cmd+a` then `delete` clears a field when the clear button doesn't.
- **There's no `back()` on iPhone.** Use the app's back arrow via `tap_image_point`.
- `tap_text` matches the first box containing the text, which can be the search field itself; prefer the full label or a coordinate.

## 4. Review and crop assets

```sh
uv run --with pillow python .claude/skills/app-design-research/scripts/contact_sheet.py design/inspiration/<app> --out <scratchpad>/sheet-<app>.png
```

Read the sheet, then list assets in `<app>/assets.json`: mascot poses, recurring characters, illustration samples, logo/wordmark, and signature components (word card, stats tiles, home path, chips, tone-coloured lists). Boxes are fractions of the screen, `[x0, y0, x1, y1]`.

```sh
uv run --with pillow python .claude/skills/app-design-research/scripts/crop_assets.py design/inspiration/<app> --review <scratchpad>/assets.png
```

Read the review sheet; fix boxes that cut off a figure or include the mirroring tab at the left edge (start x at 0.1), and re-run.

## 5. Write it up

Add a section per app to `design/inspiration/README.md` using `references/brand-analysis.md`, update the table at the top (screens, assets, where it stopped), and revise **Takeaways for Canto**. Compare against Canto's current look (jade `--jade`, Noto Sans HK, Jyutping above the current line, minimal, no mascot): suggestions should add character around the edges without crowding the transcript.

Finish by telling the user what was collected, what's blocked on them (age, account, sign-in), and the top takeaways.
