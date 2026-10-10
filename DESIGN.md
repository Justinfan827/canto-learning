---
version: alpha
name: CantoBro
description: A playful Cantonese study companion for YouTube, in a Chrome side panel and an iPhone app. Duolingo's chunky, gamified feel, in Hong Kong colours.
colors:
  primary: "#DE3127"
  primary-pressed: "#B02219"
  primary-soft: "#FFE4DF"
  on-primary: "#FFFFFF"
  jade: "#14A374"
  jade-pressed: "#0B7A5C"
  jade-soft: "#DDF5EA"
  gold: "#FFB81C"
  gold-pressed: "#D99100"
  gold-soft: "#FFF1CC"
  gold-ink: "#8A5A00"
  harbour: "#1D8FD8"
  harbour-pressed: "#1570AB"
  harbour-ink: "#1878BC"
  harbour-soft: "#DDF0FC"
  neon: "#F0478F"
  neon-soft: "#FFE0EE"
  neon-ink: "#C2185B"
  milk-tea: "#C08A55"
  danger: "#A3172E"
  ink: "#2A211C"
  body: "#4A403A"
  muted: "#7A6F68"
  faint: "#C2B8B0"
  border: "#EDE4DA"
  surface: "#FBF6EF"
  background: "#FFFFFF"
  primary-dark: "#FF5A4E"
  primary-pressed-dark: "#C2322A"
  on-primary-dark: "#1A1512"
  jade-dark: "#34C08E"
  gold-dark: "#FFC53D"
  harbour-dark: "#45A9EC"
  ink-dark: "#F6EFE8"
  body-dark: "#DCD2C9"
  muted-dark: "#A0958D"
  faint-dark: "#5E544E"
  border-dark: "#3A322C"
  surface-dark: "#231D19"
  background-dark: "#1A1512"
typography:
  display:
    fontFamily: Nunito
    fontSize: 26px
    fontWeight: 900
    lineHeight: 1.15
    letterSpacing: -0.3px
  title:
    fontFamily: Nunito
    fontSize: 19px
    fontWeight: 800
    lineHeight: 1.2
  body:
    fontFamily: Nunito
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.45
  body-sm:
    fontFamily: Nunito
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.35
  button:
    fontFamily: Nunito
    fontSize: 14px
    fontWeight: 800
    lineHeight: 1
    letterSpacing: 0.8px
  eyebrow:
    fontFamily: Nunito
    fontSize: 12px
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: 0.6px
  line-now:
    fontFamily: Noto Sans HK
    fontSize: 23px
    fontWeight: 700
    lineHeight: 1.3
  line:
    fontFamily: Noto Sans HK
    fontSize: 17px
    fontWeight: 500
    lineHeight: 1.3
  card-word:
    fontFamily: Noto Sans HK
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.3
  jyutping:
    fontFamily: Nunito
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  lip: 4px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.lg}"
    height: 46px
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
  button-secondary:
    backgroundColor: "{colors.background}"
    textColor: "{colors.harbour-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.lg}"
    height: 46px
  button-ghost:
    textColor: "{colors.harbour-ink}"
    typography: "{typography.button}"
  icon-button:
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    size: 34px
  card:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  card-selected:
    backgroundColor: "{colors.jade-soft}"
    textColor: "{colors.jade-pressed}"
  menu:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 6px
  badge-count:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.eyebrow}"
    rounded: "{rounded.full}"
  feedback-correct:
    backgroundColor: "{colors.jade-soft}"
    textColor: "{colors.jade-pressed}"
  feedback-reward:
    backgroundColor: "{colors.gold-soft}"
    textColor: "{colors.gold-ink}"
  feedback-error:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.danger}"
  progress:
    backgroundColor: "{colors.gold}"
    rounded: "{rounded.full}"
    height: 12px
  surface-page:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.body}"
  milk-tea-accent:
    textColor: "{colors.milk-tea}"
  neon-accent:
    backgroundColor: "{colors.neon-soft}"
    textColor: "{colors.neon-ink}"
  harbour-chip:
    backgroundColor: "{colors.harbour-soft}"
    textColor: "{colors.harbour-pressed}"
  text-faint:
    textColor: "{colors.faint}"
---

# CantoBro design

## Overview

Learning Cantonese from real Hong Kong video should feel like a game you want to come back to. We borrow Duolingo's structure (chunky, pressable buttons, bold rounded type, one loud action colour, cheerful feedback) and dress it in Hong Kong: lai see red, jade, lantern gold, harbour blue, the pink of Mong Kok neon, and the warm browns of milk tea and rice paper.

One rule keeps it usable: **the video and its captions stay calm.** The read-along transcript is quiet, readable text; the playfulness lives in the controls, cards, menus and feedback around it (saving a word, reviewing, streaks). The extension's side panel and the iPhone app (`apps/ios/DESIGN.md`) share these tokens and read as one product.

## Colors

- **Lai see red (`primary`)** is the one action colour: the main button on a screen, the saved-words count, the current-line marker. Red is luck and celebration in Chinese culture, so it reads as "go", not "error". Pressed and the button lip use `primary-pressed`.
- **Jade** means success and knowledge: a saved word, "Know it", correct answers, words learned.
- **Lantern gold** is reward: streaks, combos, progress bars, "new word" moments.
- **Harbour blue** is for listening and secondary actions: play/hear buttons, links, the secondary button's label and outline. Text uses `harbour-ink`; the brighter `harbour` is for icons and fills.
- **Gold, neon and harbour text** use their `*-ink` shades so they pass WCAG AA (4.5:1) on white and on their soft tints.
- **Neon pink** is a rare accent for fun moments (Squads, celebrations). **Milk tea** is for illustrations and warm details, never text.
- **Ink, body, muted, faint** are warm browns, not grey: ink for headings and the current line, body for text, muted for help, faint for upcoming caption lines.
- **Surface** is warm rice-paper cream behind white cards. **Danger** (deep crimson) is only for real failures, and always comes with words, since it sits close to red.
- **Dark mode** uses the `*-dark` tokens: a deep warm brown page, brighter accents, cream text, and near-black text on the red button. Follow the system setting.

## Typography

- UI text is **Nunito** (a free rounded face standing in for Duolingo's Feather/DIN Round) at heavy weights: 600 for body, 800 for titles and buttons, 900 for display.
- Button labels and eyebrows are **UPPERCASE** with a little letter-spacing ("CONTINUE WITH GOOGLE", "NEW WORD").
- Chinese is **Noto Sans HK** (Hong Kong forms), bold for the current line and word cards. Always mark it `lang="yue"` or `lang="zh-HK"`.
- **Jyutping** sits small and bold above each character, in muted brown (in harbour blue on word tiles, like Duolingo's coloured pinyin).
- The Aa menu scales caption sizes; never shrink Chinese below 15px.

## Layout

- The side panel is one narrow column (360–420px). Design for 360px first.
- Panel padding is 14–16px; gaps between controls 8–12px; cards 16px inside.
- Full screens (welcome, settings, empty states) centre a column up to 320px wide in the panel and 640px on a page, with a big friendly heading and one primary button.

## Elevation & Depth

Depth comes from **solid lips, not blurry shadows**. Pressable things (buttons, selectable cards, word tiles) have a 4px solid bottom edge in a darker shade of their colour (`box-shadow: 0 4px 0 <pressed colour>`); on press they move down 4px and the lip disappears. Cards and tiles use a 2px border with a 4px bottom border in `border`. Only things that truly float over content (menus, the word sheet, the pause popup) get one soft shadow.

## Shapes

- Buttons and cards are rounded rectangles at `rounded.lg` (16px), not pills. Small chips and inputs use `rounded.md`. Count badges and progress bars are full pills.
- Icon buttons are 34px squares at `rounded.md`.
- Shapes are generous and soft; no sharp corners anywhere.

## Components

- **Primary button:** red, white uppercase label, 46px tall, 16px corners, 4px darker red lip. One per screen.
- **Secondary button:** white with a 2px border and 4px border-coloured lip, harbour-blue uppercase label.
- **Ghost button:** harbour-blue uppercase label, no box, for "Continue as guest"-level choices.
- **Card / word tile:** white, 2px border plus 4px bottom lip in `border`, 16px corners. Selected: jade-soft fill, jade border and lip, jade text.
- **Feedback sheet:** slides up from the bottom; jade-soft with a jade heading for good news ("Saved!", "Nice!"), gold-soft for rewards (streaks), and primary-soft with danger text for problems.
- **Menu:** white, 16px corners, soft shadow, bold rows.
- **Count badge:** red pill with white bold number.
- **Progress bar:** 12px full pill, gold fill on a `border`-coloured track.

## Do's and Don'ts

- Do give each screen one red button. Don't put two primary buttons side by side.
- Do use colour to say what something means (jade = learned, gold = reward, harbour = listen). Don't use them as decoration.
- Do celebrate small wins with short, warm copy ("Saved!", "3-day streak!"). Don't nag or guilt the learner.
- Do keep the transcript calm: no lips, badges or bright colours on caption lines except the current-line marker.
- Do write labels as plain sentences in the UI; uppercase only for button labels and eyebrows.
- Don't use red for errors on its own; pair danger with words and an icon.
- Don't add mascots or illustrations until there's one consistent style for them (see `design/inspiration/README.md`).
