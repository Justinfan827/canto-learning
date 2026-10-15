---
version: alpha
name: Pleco
description: A dense, dark, utilitarian Chinese dictionary. Charcoal lists, hairline rows, one iOS-style blue accent, and per-tone colours on every character.
colors:
  primary: "#0072BB"
  on-primary: "#FFFFFF"
  primary-soft: "#E3F1FB"
  secondary: "#C93400"
  tertiary: "#1A1A1A"
  warning: "#C93400"
  warning-soft: "#FFF0E5"
  error: "#D70015"
  background: "#FFFFFF"
  surface: "#FFFFFF"
  surface-muted: "#F2F2F2"
  on-surface: "#1A1A1A"
  on-surface-muted: "#666666"
  on-surface-faint: "#8C8C8C"
  border: "#CCCCCC"
  dark-primary: "#00A1FF"
  dark-on-primary: "#2C2C2C"
  dark-primary-soft: "#1B577A"
  dark-warning: "#FF9F0A"
  dark-warning-soft: "#3D2E1A"
  dark-error: "#FF453A"
  dark-background: "#2C2C2C"
  dark-surface: "#2C2C2C"
  dark-surface-muted: "#383838"
  dark-on-surface: "#E8E8E8"
  dark-on-surface-muted: "#A4A4A4"
  dark-on-surface-faint: "#787878"
  dark-border: "#555555"
  tone-1: "#E30000"
  tone-2: "#02B31C"
  tone-3: "#1510F0"
  tone-4: "#8900BF"
  tone-5: "#007A7E"
  tone-6: "#9E6A00"
  tone-neutral: "#777777"
  toolbar: "#F7F7F7"
  dark-tone-1: "#FF7576"
  dark-tone-2: "#74FF76"
  dark-tone-3: "#7674FF"
  dark-tone-4: "#DB74FF"
  dark-tone-5: "#74FFE0"
  dark-tone-6: "#FFD674"
  dark-tone-neutral: "#AFAFAF"
  dark-toolbar: "#2F2F2F"
  dark-key: "#585858"
typography:
  headline-lg:
    fontFamily: Noto Sans HK
    fontSize: 34px
    fontWeight: 400
    lineHeight: 1.2
  headline-md:
    fontFamily: system-ui
    fontSize: 17px
    fontWeight: 700
    lineHeight: 1.3
  body-md:
    fontFamily: system-ui
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.4
  body-sm:
    fontFamily: system-ui
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.35
  label-md:
    fontFamily: system-ui
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.3px
  label-sm:
    fontFamily: system-ui
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.2
  transcript-current:
    fontFamily: Noto Sans HK
    fontSize: 23px
    fontWeight: 400
    lineHeight: 1.5
  transcript-line:
    fontFamily: Noto Sans HK
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.5
  word-card:
    fontFamily: Noto Sans HK
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.3
  jyutping:
    fontFamily: system-ui
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1
rounded:
  sm: 4px
  md: 6px
  lg: 14px
  full: 9999px
spacing:
  xs: 2px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  button-secondary:
    backgroundColor: "{colors.background}"
    textColor: "{colors.primary}"
    typography: "{typography.body-md}"
    rounded: 0px
    padding: 8px 12px
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.label-sm}"
    rounded: 0px
    padding: 0px
  word-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.on-surface}"
    rounded: 0px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: 0px
    padding: 6px 12px
  sheet:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 16px
  tab-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 3px 8px
  tab-inactive:
    backgroundColor: "{colors.background}"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    padding: 3px 8px
  list-row:
    backgroundColor: "{colors.background}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: 0px
    padding: 6px 12px
  search-field:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 6px 10px
  example-rule:
    backgroundColor: "{colors.primary}"
    width: 2px
  word-tone-1:
    backgroundColor: "{colors.background}"
    textColor: "{colors.tone-1}"
    typography: "{typography.transcript-line}"
  word-tone-2:
    backgroundColor: "{colors.background}"
    textColor: "{colors.tone-2}"
    typography: "{typography.transcript-line}"
  word-tone-3:
    backgroundColor: "{colors.background}"
    textColor: "{colors.tone-3}"
    typography: "{typography.transcript-line}"
  word-tone-4:
    backgroundColor: "{colors.background}"
    textColor: "{colors.tone-4}"
    typography: "{typography.transcript-line}"
  word-tone-5:
    backgroundColor: "{colors.background}"
    textColor: "{colors.tone-5}"
    typography: "{typography.transcript-line}"
  word-tone-6:
    backgroundColor: "{colors.background}"
    textColor: "{colors.tone-6}"
    typography: "{typography.transcript-line}"
---

# Pleco

A reskin preset for Canto based on the Pleco Chinese dictionary for iOS. There is no web capture. Every `dark-*` value is sampled with Pillow from the four iPhone screens in this folder (`01-launch`, `02-search-results`, `03-entry`, `04-entry-stroke`), which show Pleco's dark theme. **Pleco is natively dark here, so the light tokens are a faithful light adaptation**, not a capture. They keep the same structure, the same single blue accent and Pleco's light-theme tone colours. Token names follow Canto's `DESIGN.md` exactly so `pnpm design:reskin pleco` can swap them in.

## Overview

Pleco is a reference tool, not a brand. There is no mascot, no illustration and no marketing voice. The screen is a dense list on flat charcoal: a search field at the top, then row after row of headword, reading and definition separated by hairlines. Colour does work, not decoration. Characters are coloured **by tone**, so a long results list can be scanned by sound. A single bright blue marks everything you can tap, and search matches are highlighted in a dark blue block. It feels like a well-used paper dictionary that has become software: information first, every pixel used, trusted by serious learners.

## Colors

- **Accent blue (`dark-primary` #00A1FF):** the only UI colour. It is used for the menu and nav icons, the back link, `+` (add to flashcards), the tab labels (DICT, STROKE, CHARS, WORDS, SENTS), speaker icons, example-sentence hanzi, the dictionary source labels (▼ PLC, ▼ CC) and the left rule beside examples. The active tab is a blue pill with the label knocked out in the background colour (#2C2C2C).
- **Match highlight (`dark-primary-soft` #1B577A):** a square dark-blue block behind the search term wherever it appears in a definition ("thank you"), with normal light text on top.
- **Charcoal and ink:** background #2C2C2C (flat, neutral, no tint), toolbar #2F2F2F, the bottom key bar #383838 with #585858 keys, row hairlines #555555. Text is #E8E8E8. Part-of-speech labels ("VERB") and secondary text are #A4A4A4, and the search placeholder is #787878.
- **Tone colours** (sampled on dark, pastel at the same saturation): tone 1 red #FF7576, tone 2 green #74FF76, tone 3 blue #7674FF, tone 4 purple #DB74FF, neutral tone grey #AFAFAF (the second 谢 in 谢谢). In the light theme Pleco's defaults are the saturated #E30000, #02B31C, #1510F0 and #8900BF with grey #777777. The light values are not captured here; they are the commonly cited Pleco defaults.
- **Cantonese tones 5 and 6 (inferred):** Pleco colours Jyutping by tone too, but these captures only show Mandarin (tones 1–4 + neutral). For Cantonese's six tones, `tone-5` teal (#007A7E / dark #74FFE0) and `tone-6` ochre (#9E6A00 / dark #FFD674) extend the set with the two hue families Pleco's four don't use. The dark versions match the sampled pastels' saturation and brightness, and both light versions stay near 4.5:1 on white. The Mandarin neutral grey stays as `tone-neutral` and is never a Cantonese tone.
- **Warning and error (inferred):** Pleco shows neither in these screens. As a native iOS app it uses system colours (its alert's OK button is the iOS blue), so warning is iOS system orange (#FF9F0A dark, the increased-contrast #C93400 light) and error is iOS system red (#FF453A dark, #D70015 light). `secondary` repeats the warning orange, as in Canto's template, so that only one extra hue exists. Warning-soft tints are derived.
- **Light adaptation:** white background, #F2F2F2 for fields and sheets, #1A1A1A ink, #666666 secondary text, #8C8C8C placeholders, #CCCCCC hairlines. The accent is darkened to #0072BB at the same hue so it passes 4.5:1 on white with white text. The match highlight becomes pale blue #E3F1FB.

## Typography

- **UI:** the iOS system font (SF Pro) throughout: 15px regular definitions, bold small caps-style labels ("VERB", "NOUN", "POLITE EXPRESSION") and bold ALL-CAPS tab labels. Readings are set **bold** next to the headword ("xièxie"), and example romanisation is bold too. Sizes are compact so that about 13 results fit on a phone screen.
- **Chinese:** a plain, regular-weight sans for headwords (large: about 34pt on the entry screen, about 22pt in the list) and examples. Pleco lets users pick their Chinese font, and the stroke-order screen shows a Ming/Song serif glyph. Weight never goes up for emphasis. Colour (tone) does that job.
- **Cantonese read-along:** **Noto Sans HK at 400** for every transcript size. A neutral, light HK sans fits Pleco's plain dictionary look, keeps Hong Kong glyph forms, and leaves room for tone colour to be the emphasis instead of weight. The current line stays at Canto's 23px. Jyutping is 12px **bold**, like Pleco's readings, so the romanisation reads as data.

## Layout

Dense, edge-to-edge lists. Rows run full width with about 12px side padding and very little vertical padding (about 6px). Each row stacks a headword line (hanzi + bracketed traditional form + bold reading, with a tiny source tag such as PLC or CC at the right) above a single truncated definition line ending in "…". Entry screens stack the headword, the reading with a speaker icon, a tab strip, then numbered senses and examples, each example indented behind a 2px blue rule. Spacing is tight, on a 2/4/8/12/16px scale. Pleco uses about half of Canto's whitespace.

## Elevation & Depth

Flat. Hierarchy comes from hairline dividers and the slightly lighter toolbar and key bar, not shadows. The only raised element is the iOS system alert (the stroke-order demo popup): a translucent rounded panel over a dimmed screen. Canto's sheets and popovers should borrow that: a surface-muted panel with a 14px radius and a dimmed backdrop, and no visible drop shadow.

## Shapes

Mostly square. List rows, the match highlight and the content area have 0 radius. Small radii appear only on controls: the search field and keyboard keys are about 6px, the tone-number keys likewise. The active tab is a full pill and the iOS alert is about 14px. Icons are thin-stroke line icons (hamburger, chevrons, plus, speaker, brush, microphone).

## Components

- **Primary button / active tab** (`button-primary`, `tab-active`): a small blue pill with a bold ALL-CAPS label in the background colour (white in light mode). Pleco has almost no filled buttons. This pill is the strongest control it draws.
- **Secondary button:** plain blue text or a blue line icon with no fill or border, e.g. the "‹ thank you" back link, `+`, ˄ ˅ and the inactive tabs (`tab-inactive`).
- **Chip / source tag:** tiny bold grey text ("PLC", "CC") with no background. Part-of-speech labels use the same style.
- **Word chips coloured by tone** (`word-tone-1` … `word-tone-6`): every character is coloured by the tone of its syllable, with each colour applied per character, not per word (致谢 is purple + purple, 同喜 is green + blue). In Canto this is the signature move: transcript words and word-card headwords take their tone colour, and Jyutping can follow the same colour.
- **Word selected / match:** a square `primary-soft` block behind the word, with ink text on top. There is no underline and no radius.
- **Card / list row:** there are no cards. Content sits in full-width rows divided by 1px hairlines, so `card` is a flat row with 0 radius.
- **Example block:** blue hanzi with a speaker icon, then bold romanisation, then the English, all indented behind a 2px blue left rule (`example-rule`).
- **Sheet:** iOS alert style, a surface-muted panel with a 14px radius, a centred bold title, small centred body text and a full-width text button divided by a hairline.
- **Search field:** a borderless field slightly off the background colour, with grey placeholder, a round clear button, and a square blue mode toggle (C/E) at the right.

## Do's and Don'ts

- Do let tone colour be the only colour on Chinese text, and keep the accent blue for things you can tap.
- Do keep rows dense and full-width with hairlines. Do truncate with "…" rather than wrapping definitions in lists.
- Do set romanisation bold and the hanzi regular.
- Don't add shadows, gradients, illustrations or rounded cards. They are foreign to Pleco.
- Don't make the tone palette carry meaning other than tone (no red errors on characters). Errors stay in UI text and icons.
- Don't use the light tone-2 green #02B31C for small text on white. It is Pleco's real default but only 2.8:1 (the linter flags `word-tone-2`), so it needs character sizes of 17px and up. On dark, tone-3 blue #7674FF is the weakest at 3.8:1. Accent blue on the match highlight in dark mode is 2.8:1, which is why Pleco keeps light text, not blue, on the highlight.

## Illustration & Imagery

- **None.** Pleco has no mascot, characters or illustration style. Its imagery is the writing itself: large headword glyphs, animated stroke-order diagrams (a grey Ming-style character drawn stroke by stroke on a dark field) and thin line icons. The app icon and any marketing assets are secondary to the tool.
- **If Canto needs on-brand assets in this skin**, make them glyph-centred and typographic: a single large character, tone-coloured, on a flat charcoal field, never a scene or a figure.
- **Style DNA prompt (paste into an image model):** "Minimal typographic artwork on a flat matte charcoal background #2C2C2C, no texture, no gradient, no shadow, no people, no objects. One or a few large Traditional Chinese characters in a plain regular-weight sans or a classic Ming serif, each character in a single flat colour by tone: soft red #FF7576, soft green #74FF76, periwinkle #7674FF, orchid #DB74FF, aqua #74FFE0, ochre #FFD674, with neutral glyphs in light grey #AFAFAF. Optional fine details: thin 1px hairlines in #555555, small bold sans romanisation in #E8E8E8, a single thin-stroke line icon or arrow in bright blue #00A1FF, a pale grey stroke-order ghost of the character behind it. Precise, quiet, reference-book feel, generous negative space, everything aligned to a strict grid."

## Reskinning Canto

- **Canto becomes cooler and denser in tone, but its spacing does not change.** The reskin swaps colours, fonts and radii (6px / 14px), not padding, so the panel keeps Canto's airy layout with Pleco's charcoal and blue. In dark mode the background moves from green-tinted #1A1F1D to neutral #2C2C2C.
- **Selected words get weaker in dark mode.** Canto colours the selected word with `--jade` on `--jade-soft`, which becomes #00A1FF on #1B577A at 2.8:1. Pleco itself puts light text on that highlight. Check readability, or override `.chip-w.sel` text to `on-surface` for this skin.
- **Tone colours are extra tokens.** The script does not apply `tone-*` today. To get Pleco's signature, colour each character (and optionally its Jyutping) by tone in the transcript and word card. Test the current line against the light background, where tone-2 green is weak.
- **Primary buttons become small blue pills with white (light) or charcoal (dark) labels,** which suits Pleco. Saved-word underlines become iOS orange.
