---
version: alpha
name: Ling
description: Bright and friendly. One orange (#FF9900) on white and sky blue, slate text, Poppins + Noto Sans, 16px rounded-rectangle buttons, a monkey and a globe.
colors:
  primary: "#FF9900"
  on-primary: "#FFFFFF"
  primary-soft: "#FFEDBD"
  secondary: "#009DFF"
  tertiary: "#3D505C"
  warning: "#A36200"
  warning-soft: "#FFF6E6"
  error: "#ED5C3B"
  background: "#FFFFFF"
  surface: "#FFFFFF"
  surface-muted: "#EAF3FC"
  on-surface: "#3D505C"
  on-surface-muted: "#5C788A"
  on-surface-faint: "#ADBEC9"
  border: "#DDE4EA"
  dark-primary: "#FF9900"
  dark-on-primary: "#17232B"
  dark-primary-soft: "#4A3418"
  dark-warning: "#FFD970"
  dark-warning-soft: "#3B3420"
  dark-error: "#FF7A5C"
  dark-background: "#17232B"
  dark-surface: "#17232B"
  dark-surface-muted: "#22313B"
  dark-on-surface: "#EEF3F6"
  dark-on-surface-muted: "#9AB0BE"
  dark-on-surface-faint: "#566B79"
  dark-border: "#2C3C47"
  brand-orange: "#FF9900"
  butter-yellow: "#FFEDBD"
  sun-yellow: "#FFD970"
  bluish-cyan: "#009DFF"
  sky-wash: "#EAF3FC"
  app-header-blue: "#E3F4FF"
  mascot-circle: "#BDD9F8"
  heading-slate: "#3D505C"
  body-slate: "#5C788A"
  green: "#26D968"
  purple: "#913BDD"
  red: "#ED5C3B"
  fur-brown: "#A36200"
  cap-black: "#281E11"
  face-cream: "#FFF6E6"
  wordmark-black: "#131313"
typography:
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
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Noto Sans
    fontSize: 12.5px
    fontWeight: 400
    lineHeight: 1.45
  label-md:
    fontFamily: Noto Sans
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1
  label-sm:
    fontFamily: Noto Sans
    fontSize: 11.5px
    fontWeight: 600
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
    fontSize: 21px
    fontWeight: 600
    lineHeight: 1.4
  jyutping:
    fontFamily: Noto Sans
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1
rounded:
  sm: 10px
  md: 14px
  lg: 16px
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
    rounded: "{rounded.lg}"
    padding: 10px 18px
  button-secondary:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.background}"
    typography: "{typography.label-md}"
    rounded: "{rounded.lg}"
    padding: 10px 16px
  chip:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: 4px 10px
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
    rounded: 24px
    padding: 16px
  tab-active:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.background}"
    rounded: "{rounded.sm}"
    padding: 5px 12px
  option-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 14px 16px
  speech-bubble:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 16px 20px
  language-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.body-slate}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: 16px
  hero-band:
    backgroundColor: "{colors.butter-yellow}"
    textColor: "{colors.heading-slate}"
    typography: "{typography.headline-lg}"
    padding: 24px
---

# Ling

Reskin preset for Canto in the Ling style. Token names match Canto's root `DESIGN.md`, so `pnpm design:reskin ling` can swap them in. Sources: [`README.md`](README.md) and [`palette.json`](palette.json) (live CSS and the official branding guidelines, ling-app.com, 2026-10-10), the iPhone captures in [`../ling`](../ling), the logo and scene SVGs in `assets/svg/`, and the Ling sections of [`../README.md`](../README.md) and [`../landscape.md`](../landscape.md). Values marked *derived* are not in Ling's own CSS, SVGs or screens.

## Overview

Ling (Simya Solutions) is a gamified language app that leans into "languages others overlook": Cantonese, Taiwanese Hokkien, Khmer, Lao. Its promise is "the easy path to hard languages". The brand is a **character duo**: **Ling**, a brown monkey in a black cap with an orange brim, and **Gaia**, a blue Earth-globe sidekick. They live in a **flat, geometric, warm world**. The UI itself is plain and light: white screens, pale sky-blue headers, slate text, and a single **orange** for every action, selection outline and checkbox. The monkey asks the onboarding questions from a speech bubble ("We will ask you a few questions to prepare your learning journey.") and then stays as a small round avatar in the corner. The tone is personal and reassuring ("86% of our users are beginners!").

## Colors

- **Brand orange (`primary` #FF9900):** CTAs, the cap brim, chat bubbles, selected-option outlines and checkboxes. It is the only saturated UI colour. Ling labels it in white, which is only **2.1:1**, so this file keeps the real value and flags it.
- **Butter yellow (`primary-soft` #FFEDBD):** the web hero field. Here it is the selected-word wash. Sun yellow #FFD970 is the scalloped cloud border.
- **Bluish cyan (`secondary` #009DFF):** Gaia's colour and the "See Ling in Action" band. Mascot circle #BDD9F8 and app header #E3F4FF are the soft blues behind the monkey (sampled).
- **Slate, not black (`on-surface` #3D505C, `on-surface-muted` #5C788A):** heading and body text on the web (the app's text samples at #36464F, the same family). `on-surface-faint` #ADBEC9 is the language-row border, `border` #DDE4EA the app's hairline above the docked button, and `tertiary` the heading slate.
- **Sky wash (`surface-muted` #EAF3FC):** the footer and world-map band, close to the app's header blue. It is used for cards, chips and segmented controls.
- **Status:** `warning` is Ling's **fur brown** #A36200 (from the logo SVG, 4.9:1 on white), and `warning-soft` is the monkey's face cream #FFF6E6. Saved words get a warm brown that never competes with orange. `error` is Ling's red #ED5C3B (3.4:1 on white, flagged below).
- **Illustration accents:** green #26D968, purple #913BDD, cap black #281E11, wordmark black #131313. These come from the brand guide's ten illustration ramps.
- **Dark mode (derived):** Ling's captures show no dark theme. The dark twins are built from Ling's own hues: a deep slate (#17232B) taken from the heading-slate hue, a slate-tinted ramp for text and borders, and **unchanged brand orange** as `dark-primary`, where it gets 7.5:1 and finally passes. On orange, the dark label is the background slate. `dark-warning` is the real sun yellow #FFD970. `dark-error` (#FF7A5C) and the two `-soft` tints are derived.

## Typography

- **Display:** **Poppins** 700, in sentence case or title case, with normal tracking (web h1 48px; `headline-lg` 24px for the panel). In the app, "Welcome to Ling" and section titles ("I want to learn") are Poppins; onboarding questions are bold slate.
- **UI and body:** **Noto Sans**, chosen by Ling because it covers Thai, Cyrillic and other scripts. Button labels are Noto Sans bold ("Continue", "Start learning").
- **Chinese:** **Noto Sans HK** is the natural CJK member of the same superfamily, so the transcript matches Ling's body face stroke-for-stroke and keeps Hong Kong glyph forms. Sizes stay at Canto's 23/17px. The word card goes up to 600 to match Ling's bold option labels.
- **Jyutping:** Noto Sans 600 at 11px, in body slate. Ling's marketing shows no romanisation, so placement follows Canto: above the character.

## Layout

The app uses a single column with 24pt side margins. A slate Poppins question sits top-left with the round monkey avatar top-right. Below it is a stack of full-width option cards about 12pt apart, then a hairline and a docked full-width orange button. Screens can open with a pale-blue header band with a white sheet rounded over it ("Choose your course"). On the web, sections alternate white, butter yellow, cyan and sky wash, separated by the scalloped cloud border. For Canto, keep the narrow column and the 4/8/12/16/24 scale, with 16px card padding.

## Elevation & Depth

Flat. Buttons have no shadow and a 1px border in their own colour; option cards are white with a 2px border (grey at rest, orange when selected) rather than a shadow. Depth comes from colour bands (white over sky blue), and the white "sheet" overlaps the header band. The only glossy objects are the small 3D-ish skill icons. Canto's popovers and sheet can keep a light shadow, tinted slate (#3D505C at 8–16%).

## Shapes

- **Buttons are rounded rectangles, not pills:** 16px on the web (53px tall), about 14pt in the app (measured from the captures). This is the one thing that sets Ling's controls apart from Drops, Speak and Babbel.
- **Option cards:** 14pt. **Language rows and inputs:** 10px. **FAQ panel:** a very soft 48px. **Sheets:** large top corners over a header band (24px here).
- **Circles** frame the mascot (a light-blue disc), and speech bubbles have a small triangular tail pointing at him.

## Components

- **Primary button:** flat orange 16px-radius rectangle, white bold sentence-case label. It runs full width in the app and is compact on the web.
- **Secondary button:** slate rectangle with a white label (Canto's Save). Ling's own secondary actions are a slate text link ("I have an account") or a white rectangle with a pale border ("Load More").
- **Option card:** white, 14px radius, colourful round icon on the left, slate label, orange square checkbox on the right. When selected it gets a 2px orange outline.
- **Speech bubble:** white with a 2px pale-grey border, 16px radius, tail up to the monkey, slate Noto Sans 16px.
- **Language row:** white, 10px radius, 1px #ADBEC9 border, flag, body-slate label, chevron.
- **Word selected:** butter-yellow wash with **slate** text and an orange underline. Orange text on butter is only 1.85:1, so the orange goes into the underline.
- **Chips / tabs:** sky-wash 10px tiles with heading-slate text. Body slate on sky wash is only 4.15:1, so chips step up to #3D505C (7.5:1). The active tab is a slate 10px rectangle, not a pill.

## Do's and Don'ts

- Do use orange for actions and selection only, one job at a time per view.
- Do use slate (#3D505C / #5C788A) for all text, never pure black (the black is reserved for the "Ling" wordmark).
- Do use 16px rounded rectangles for buttons. Pills read as another brand.
- **Flag:** white on #FF9900 is 2.14:1 (the lint warns on `button-primary`). It is Ling's real button, so the value is kept. Make labels 16px bold or larger if possible, or use the dark theme (slate on orange, 7.5:1) where contrast matters.
- **Flag:** orange as link or "ok" text on white is 2.1:1. Use bold weight and an icon or underline, never orange for running text.
- **Flag:** error red #ED5C3B is 3.4:1 on white. Pair it with an icon and keep error copy in slate.
- Don't put the mascot inside the transcript, and don't let butter yellow fill large reading areas; it is a hero colour.
- Don't add outlines to illustrations, and don't use gradients in the UI.

## Illustration & Imagery

- **Mascot:** **Ling** (he/him), a brown (#A36200) monkey with a cream face (#FFF6E6), a black cap (#281E11) and an orange (#FF9900) brim. His traits are curious, eager and loyal; the name is Thai ลิง, "monkey". He *acts*: he swings around a phone, plants a flag on a hill, holds a pencil and a blue notebook, and asks questions in speech bubbles. His head is the logo, and the app icon has per-language variants with a flag on the cap. **Gaia** (she/her), a cyan-blue globe with green continents and a big open-mouthed smile, cheers him on. Points are bananas.
- **Illustration rules (from the brand guidelines):** strictly flat and geometric, built only from circles, rectangles and squares, **10–20 shapes per illustration**, no outlines, subtle shading at most. Warm colours mean friendliness, cool colours calm. Recurring motifs: speech-bubble flags with emoji faces, a scalloped cloud border, island maps, rolling green hills, a dashed learning path of tilted cards.
- **Style DNA (paste into an image model):** "A flat geometric vector illustration built only from circles, rounded rectangles and squares, using 10 to 20 shapes in total. No outlines, no gradients, no texture, at most one subtle flat shade per shape. Palette: warm orange #FF9900, sun yellow #FFD970, butter yellow #FFEDBD, warm brown #A36200, cream #FFF6E6, near-black #281E11, bright sky blue #009DFF, pale blue #BDD9F8, fresh green #26D968, slate #3D505C for any small dark detail. Friendly, rounded, cheerful proportions with big heads and dot eyes. Characters sit inside or in front of a solid light-blue circle on a white background, with generous empty space. Optional props: a small speech bubble with a triangular tail, a tiny flag, scalloped cloud shapes at the bottom edge."

## Reskinning Canto

- **What changes:** orange replaces jade for primary actions, progress and the focus ring. Buttons and tabs become 16px rounded rectangles instead of pills. Text turns blue-slate, cards and chips turn sky blue, and saved words get a warm brown dotted underline. The transcript stays on white in Noto Sans HK, so reading is essentially unchanged.
- **Watch contrast:** `on-primary` is white on orange (2.1:1), and orange is used as text by `.link` and `.ok`. Consider bolding those, or keeping `--on-accent` white but raising primary-button labels to 14px bold. The dark theme is the accessible variant (slate on orange). Canto's pills put `--muted` on `--soft`, which is body slate on sky wash at 4.15:1. That is acceptable for 12px metadata, but use `on-surface` for anything that has to be read.
- **Selected word:** the template's `word-selected` uses `primary` as text colour. With Ling, override it to `on-surface` (as specified above), or the selected character becomes unreadable on butter yellow.
- **Character:** if the skin is meant to feel like Ling, add a small round monkey-style avatar in the empty states and setup speech bubbles. Keep it out of the transcript and the video controls.
