---
version: alpha
name: HelloChinese
description: Game-style Mandarin app. Mint green #00CA72 on white with candy pastel washes, Poppins from 400 to 900, glossy soft-3D blob icons, romanisation above hanzi.
colors:
  primary: "#00CA72"
  on-primary: "#222222"
  primary-soft: "#DFFFF3"
  secondary: "#937AFF"
  tertiary: "#222222"
  warning: "#FF9C42"
  warning-soft: "#FFF4EB"
  error: "#FF4D49"
  background: "#FFFFFF"
  surface: "#FFFFFF"
  surface-muted: "#F3F2FF"
  on-surface: "#222222"
  on-surface-muted: "#6E6E6E"
  on-surface-faint: "#BDBDBD"
  border: "#ECECEC"
  dark-primary: "#00CA72"
  dark-on-primary: "#222222"
  dark-primary-soft: "#1C4030"
  dark-warning: "#FF9C42"
  dark-warning-soft: "#4A3828"
  dark-error: "#FF6574"
  dark-background: "#222222"
  dark-surface: "#222222"
  dark-surface-muted: "#2E2E2E"
  dark-on-surface: "#F5F5F5"
  dark-on-surface-muted: "#A0A0A0"
  dark-on-surface-faint: "#5E5E5E"
  dark-border: "#3A3A3A"
  mint-teal: "#00DEA9"
  site-green: "#00C898"
  reader-green: "#1EC580"
  hero-violet: "#937AFF"
  hero-violet-deep: "#6647FF"
  coral: "#FF6574"
  mic-cyan: "#27BCF4"
  body-grey: "#444444"
  wash-butter: "#FFF9E5"
  wash-lilac: "#F3F2FF"
  wash-pink: "#FFEFF4"
  wash-peach: "#FFF4EB"
  wash-sky: "#E3F9FF"
  wash-mint: "#DFFFF3"
  wash-aqua: "#EAFFFB"
typography:
  display-lg:
    fontFamily: Poppins
    fontSize: 128px
    fontWeight: 900
    lineHeight: 1
  headline-lg:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.25
  headline-md:
    fontFamily: Poppins
    fontSize: 17px
    fontWeight: 700
    lineHeight: 1.3
  body-md:
    fontFamily: Poppins
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Poppins
    fontSize: 12.5px
    fontWeight: 400
    lineHeight: 1.45
  label-md:
    fontFamily: Poppins
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1
  label-sm:
    fontFamily: Poppins
    fontSize: 11.5px
    fontWeight: 500
    lineHeight: 1.3
  transcript-current:
    fontFamily: Noto Sans HK
    fontSize: 23px
    fontWeight: 500
    lineHeight: 1.6
  transcript-line:
    fontFamily: Noto Sans HK
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.6
  word-card:
    fontFamily: Noto Sans HK
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1.35
  jyutping:
    fontFamily: Poppins
    fontSize: 11.5px
    fontWeight: 400
    lineHeight: 1
rounded:
  sm: 8px
  md: 14px
  lg: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 9px 16px
  button-secondary:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.background}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: 8px 14px
  chip:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: 3px 10px
  word-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.on-surface}"
    rounded: 6px
  card:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 16px
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 16px
  tab-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    padding: 4px 12px
  word-card-romanised:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.word-card}"
    rounded: "{rounded.md}"
    padding: 10px 16px
  feature-card-butter:
    backgroundColor: "{colors.wash-butter}"
    textColor: "{colors.on-surface}"
    typography: "{typography.headline-lg}"
    rounded: 40px
    padding: 32px
  chat-bubble:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.transcript-line}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  mic-button:
    backgroundColor: "{colors.mic-cyan}"
    rounded: "{rounded.full}"
    size: 56px
  stats-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: 20px
    padding: 24px
---

# HelloChinese

Reskin preset for Canto, based on the HelloChinese marketing site (hellochinese.cc, captured 2026-10-10), its App Store screenshots and the in-app screens it shows (graded reader, chat lesson, course path). Colours are computed CSS values from `palette.json` or pixel samples of the captures. Values marked *derived* were not seen directly: HelloChinese shows **no dark mode**, so every `dark-*` token is derived. Sources: `README.md`, `palette.json`, the `0*-home-*.png` screenshots and `assets/` in this folder, and the HelloChinese row of `../landscape.md`.

**HelloChinese teaches Mandarin.** Its romanisation is pinyin and its characters are simplified (汉堡, 北京, 龙大). A Cantonese skin must use **traditional Hong Kong glyphs (Noto Sans HK) and Jyutping**: 漢堡 hon3 bou2, not 汉堡 hànbǎo. Only the visual language transfers, not the content conventions.

## Overview

HelloChinese is the most visible Chinese-specific learning brand, and it presents itself as a **cheerful game skin over a textbook**. **Mint/emerald green** (#00CA72 wordmark, #00C898 in CSS, a #00DEA9 → #00ED9B footer gradient) is the brand colour, but the site reads as multi-coloured candy. It has a periwinkle-violet hero (#937AFF → #6647FF), feature cards each washed in a different pastel (butter, lilac, pink, peach, sky, mint), and **glossy soft-3D icons sitting on blurred colour blobs**. Type is **Poppins**, from a 128px/900 "No. 1" down to light-grey 400 body. Two unnamed characters carry personality: a smiling old sage (the app icon) and a kung-fu panda in a straw hat (the tone game). The footer is a skyline of pagodas and an arched bridge. The voice is superlative and benefit-led ("No. 1 Chinese Learning App", "anytime, anywhere").

Its most useful precedent for Canto is the **graded reader**: pinyin over every word, the current sentence in green, and an audio scrubber with a mint thumb. It is essentially a read-along in a candy skin.

## Colors

- **Hello green (`primary` #00CA72):** wordmark, accent words ("anytime, anywhere", "4.9+"), quote marks, the active tab, the reader's current line and the progress thumb (#00E184 in the screenshot). It is a light, bright green: **white on it is only 2.2:1**, so `on-primary` is the brand's ink #222222 (7.3:1). The site itself puts white on green only in the large-type footer.
- **Mint wash (`primary-soft` #DFFFF3, computed):** the spaced-repetition card wash, and here the selected-word fill. The review section's aqua #EAFFFB and the mint-teal #00DEA9 splash are extra tokens.
- **Hero violet (`secondary` #937AFF):** the hero gradient field (sampled #9C82FF top to #6647FF bottom-right). It doesn't recur below the fold.
- **Candy washes:** each feature card has its own pastel. Butter #FFF9E5 (game), lilac #F3F2FF (all-in-one), pink #FFEFF4 (speech), peach #FFF4EB (handwriting), sky #E3F9FF (video), mint #DFFFF3 (SRS). Canto uses **lilac as `surface-muted`** so that cards stay visibly different from the mint word selection. Peach doubles as `warning-soft`.
- **Accents:** orange stars #FF9C42 (`warning`, sampled), coral #FF6574 (speech card), the red flag counter #FF4D49 in the course path (`error`; the site shows no error state, so this is *inferred*), and mic-button cyan #27BCF4.
- **Ink:** headings #222222, body #444444, pinyin and secondary grey ~#6E6E6E (sampled in the chat lesson; `on-surface-muted`). `on-surface-faint` #BDBDBD is *derived* from the faded lines at the bottom of the reader. The nav hairline is #ECECEC (sampled; `border`).
- **Dark mode (all derived):** the background is the brand ink #222222 rather than black, so the candy colours stay soft. Muted surfaces are #2E2E2E, text #F5F5F5 / #A0A0A0 / #5E5E5E, and hairlines #3A3A3A. Green stays #00CA72 (7.7:1 on dark, ink label on it). Selection is #1C4030 (18% green over ink), the warning wash is #4A3828, and error moves to coral #FF6574 (5.6:1 on #222).

## Typography

- **UI: Poppins** for everything Latin. Display is 128px/900 for "No. 1", section heads are ~24px/700, card titles bold, body 400 in grey. In the panel: 17px/700 headlines, 14px/400 body, 13px/600 labels. Poppins's round geometric forms are a large part of the friendly look.
- **Chinese on the site** is a system CJK sans (PingFang / Noto-like) in simplified forms, regular weight, with pinyin in light grey Latin above each word, centred over the word rather than over each character.
- **Cantonese skin:** **Noto Sans HK** for every character, for traditional HK forms. Use 500 for the current line and 400 for others, at Canto's sizes (23 / 17px). The word card goes to 24px to match the chunky `汉堡` word cards. **Jyutping** is Poppins 11.5px/400 in grey #6E6E6E above each character, taking the place of pinyin. Poppins handles tone numbers (`hon3 bou2`) cleanly. Never use pinyin diacritics in the Cantonese skin.

## Layout

Centred, generous marketing layout: a 1120px column, two-up feature cards with the icon breaking out of the top edge, and a floating white stats card overlapping the hero. Inside the app, content is a single column of white bubbles or circles on white with plenty of air. For the panel, keep Canto's 4px base (4, 8, 12, 16, 24). Allow 16px between transcript lines because Jyutping sits above, and centre the romanisation over each word group as the reader does.

## Elevation & Depth

Soft and light. White cards (stats card, word cards, chat bubbles, review cards) float on very soft, wide grey shadows (roughly `0 4px 24px` at 6–8% black) with no borders. The nav bar has a faint drop shadow. The 3D feeling comes from the glossy icons and the blurred blobs behind them, not from UI chrome. In Canto: flat transcript, soft shadow on cards only where they float (word card, sheet, popovers).

## Shapes

Round and bubbly. Feature cards are ~40px radius at desktop size, review and stats cards ~20–32px, chat bubbles and word cards ~14px at phone scale, store badges ~8px. Lesson nodes, the mic button, social icons and arrow buttons are full circles. Blobs are organic, irregular shapes. Use `lg` 24px for panel cards and the sheet, `md` 14px for word cards and bubbles, `full` for buttons, chips and tabs.

## Components

- **Primary button:** the site's only CTAs are official store badges, so this is *inferred* from the round mint arrow buttons and the green active tab. It is a green pill with an ink 13px/600 Poppins label.
- **Secondary button:** black rounded rectangle (8px) with white label, the store-badge style.
- **Chips:** lilac wash, grey text, pill.
- **Selected word:** mint wash fill with **ink** text and a green underline. Green text on the mint wash is only 2.0:1.
- **Card:** lilac wash (or rotate through the candy washes), 24px radius.
- **Sheet:** white, 24px top corners, soft shadow.
- **Tabs:** the in-app bottom bar turns the active item green. Here that is a green pill with an ink label.
- **Signature: romanised word card.** A white rounded tile with a soft shadow, romanisation small and grey on top, characters large and black below (`word-card-pinyin-hanbao`). **Chat bubble:** white, 14px, romanisation over each word, a round avatar beside it. **Reader line:** the current sentence and its romanisation turn green; the scrubber is a thin mint track with a green thumb. **Mic button:** cyan #27BCF4 circle with a glow. **Feature card:** pastel wash, 40px radius, glossy blob icon breaking the top edge.

## Do's and Don'ts

- Do use Poppins for all Latin text and Noto Sans HK for all Chinese. Never mix in simplified forms.
- Do put Jyutping (not pinyin) **above** the characters, small and grey, centred over each word.
- Do keep green for "active / current / correct" and let the pastel washes do the decorating.
- Don't put white text on Hello green: it is 2.2:1. Use ink #222222. The real footer uses white only at large sizes.
- Don't set small text in green on white. #00CA72 and the reader's #1EC580 are about 2.2:1. In the reader that works only because the line is large and the rest is near-black. For Canto, prefer an ink current line with a green underline or wash, or accept green only at 23px+ with weight 500.
- Don't use orange #FF9C42 or coral for text (2.1:1 and 2.9:1 on white). They are for stars, icons and blobs.
- Don't import the mainland motifs (pagodas, panda, straw hat, sage) into a Cantonese product.

## Illustration & Imagery

HelloChinese illustrates with **glossy, soft-3D objects on blurred candy blobs**: a purple game controller on a yellow blob, a yellow book on violet, a green mic on hot pink, a cyan brush on orange, an orange camera on cyan, a clipboard on green. Each icon is a simple rounded object with a gloss highlight and saturated gradient, set on an organic blob with a soft glow and a few floating dots in the same hue. Hero props (books, a trophy, a brush, a scroll) appear as large, faded, semi-transparent shapes. Characters are flat vector with gradients: the rosy-cheeked sage on a cyan-green-purple gradient and the kung-fu panda with straw hat, red scarf and bamboo staff. The skyline is a mint silhouette of pagodas, a moon gate and an arched stone bridge. These motifs are **stock mainland "China" clichés** and read as generic for a Hong Kong audience.

For Canto, keep the **technique** (glossy candy object on a colour blob) and swap the **subjects** for everyday Hong Kong ones: a red-and-white minibus, a Ding Ding tram, a milk-tea cup, a pineapple bun, a neon sign shape, a Star Ferry, an Octopus-style card, a dim sum steamer, a bamboo scaffold. No pagodas, pandas, straw hats, sages or Great Wall.

**Style DNA prompt (paste into an image model):**

> A single glossy soft-3D icon of [SUBJECT: e.g. a Hong Kong red-and-white minibus / a double-decker tram / a cup of milk tea / a pineapple bun], simple chunky rounded shapes, smooth plastic-toy material with a bright specular highlight and gentle gradients, saturated candy colours. It sits centred on an organic, softly blurred colour blob with a glowing edge, plus two or three small floating dots in the same hue. Palette: mint green #00CA72, mint teal #00DEA9, periwinkle violet #937AFF, coral #FF6574, sunny orange #FF9C42, sky cyan #27BCF4, sunshine yellow #FFD129, with pastel washes #DFFFF3, #F3F2FF, #FFF9E5. Pure white background, no outline strokes, no text, no characters or animals, contemporary Hong Kong everyday life rather than traditional mainland motifs (no pagodas, pandas, straw hats, bamboo, dragons, lanterns or temples), cheerful, clean, app-icon quality.

For a skyline band, ask for "a soft mint silhouette of the Hong Kong waterfront: high-rise towers, a tram and a ferry", not pagodas and bridges.

## Reskinning Canto

- **What changes:** jade becomes Hello green #00CA72. Fonts become Poppins plus Noto Sans HK. Cards turn lilac #F3F2FF, and the active tab becomes a green pill. Dark mode becomes warm-neutral #222222 with the same green.
- **Contrast is the main risk.** Canto renders selected-word text and some labels in `--primary`. At #00CA72 these are about 2:1 on white and on the mint wash. Override selected-word text to ink (as in the `word-selected` component above), and use ink labels on green buttons (`on-primary` #222222).
- **Close to Canto's own dark jade:** #00CA72 is very close to Canto's dark-mode jade #4CC29B (both read as "mint" on a dark panel). In dark mode the HelloChinese skin will look almost like stock Canto. The differences come from the lilac cards, Poppins and the neutral #222 background, not from the accent.
- **Transcript readability:** keep Jyutping grey #6E6E6E (5.1:1) rather than green. If copying the reader's "whole current line in green", do it only at `transcript-current` size and weight 500, and keep the other lines ink #222222.
