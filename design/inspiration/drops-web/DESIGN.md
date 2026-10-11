---
version: alpha
name: Drops
description: Lime on purple, one saturated colour field per mode, one-colour word pictograms. TT Norms Pro, flat pills, no mascot.
colors:
  primary: "#712BB5"
  on-primary: "#DAEB3F"
  primary-soft: "#F0E7FF"
  secondary: "#DAEB3F"
  tertiary: "#29093D"
  warning: "#AD540B"
  warning-soft: "#FCEEE2"
  error: "#C90B6F"
  background: "#FFFFFF"
  surface: "#FFFFFF"
  surface-muted: "#F5F0FF"
  on-surface: "#29093D"
  on-surface-muted: "#6E5A86"
  on-surface-faint: "#B9ACCB"
  border: "#E6DCF7"
  dark-primary: "#DAEB3F"
  dark-on-primary: "#29093D"
  dark-primary-soft: "#561E92"
  dark-warning: "#F7CC51"
  dark-warning-soft: "#55315A"
  dark-error: "#FF6FB0"
  dark-background: "#36135C"
  dark-surface: "#36135C"
  dark-surface-muted: "#4E1B8A"
  dark-on-surface: "#FFFFFF"
  dark-on-surface-muted: "#937CA8"
  dark-on-surface-faint: "#6E5590"
  dark-border: "#4B2475"
  purple-350: "#712BB5"
  deep-purple: "#261453"
  night-purple: "#29093D"
  lime: "#DBE65B"
  lime-cta: "#DAEB3F"
  premium-yellow: "#FFFF00"
  banana: "#F7CC51"
  lilac: "#DFA5F7"
  lavender-wash: "#F5F0FF"
  blue-500: "#217AD1"
  turquoise: "#0AB1B4"
  magenta: "#C90B6F"
  mode-setup: "#36135C"
  mode-new-words: "#E9720F"
  mode-matching: "#12A8AC"
typography:
  headline-lg:
    fontFamily: TT Norms Pro
    fontSize: 22px
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: 0.5px
  headline-md:
    fontFamily: TT Norms Pro
    fontSize: 17px
    fontWeight: 700
    lineHeight: 1.3
  body-md:
    fontFamily: TT Norms Pro
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: TT Norms Pro
    fontSize: 12.5px
    fontWeight: 400
    lineHeight: 1.4
  label-md:
    fontFamily: TT Norms Pro
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1
  label-sm:
    fontFamily: TT Norms Pro
    fontSize: 11.5px
    fontWeight: 600
    lineHeight: 1.3
  transcript-current:
    fontFamily: Chiron Hei HK
    fontSize: 23px
    fontWeight: 700
    lineHeight: 1.6
  transcript-line:
    fontFamily: Chiron Hei HK
    fontSize: 17px
    fontWeight: 500
    lineHeight: 1.6
  word-card:
    fontFamily: Chiron Hei HK
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.4
  jyutping:
    fontFamily: TT Norms Pro
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1
rounded:
  sm: 8px
  md: 14px
  lg: 18px
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
    padding: 8px 16px
  button-secondary:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.background}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 8px 14px
  chip:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: 4px 10px
  word-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    rounded: 4px
  card:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 14px
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: 20px
    padding: 16px
  tab-active:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.background}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  button-lime-cta:
    backgroundColor: "{colors.lime-cta}"
    textColor: "{colors.night-purple}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 10px 20px
  premium-pill:
    backgroundColor: "{colors.premium-yellow}"
    textColor: "{colors.night-purple}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  option-row-dark:
    backgroundColor: "{colors.dark-primary-soft}"
    textColor: "{colors.dark-on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 14px 20px
  mode-field-new-words:
    backgroundColor: "{colors.mode-new-words}"
    textColor: "{colors.dark-on-surface}"
    typography: "{typography.word-card}"
    rounded: "{rounded.lg}"
    padding: 16px
  mode-field-matching:
    backgroundColor: "{colors.mode-matching}"
    textColor: "{colors.dark-on-surface}"
    typography: "{typography.word-card}"
    rounded: "{rounded.lg}"
    padding: 16px
---

# Drops

Reskin preset for Canto in the Drops style. Token names match Canto's root `DESIGN.md`, so `pnpm design:reskin drops` can swap them in. Sources: [`README.md`](README.md) and [`palette.json`](palette.json) (live CSS on languagedrops.com, 2026-10-10), the iPhone captures in [`../drops`](../drops), and the Drops sections of [`../README.md`](../README.md) and [`../landscape.md`](../landscape.md). Values marked *derived* below are not in Drops' own CSS or screens.

## Overview

Drops (PlanB Labs, a Kahoot! company) is a five-minutes-a-day vocabulary app with no mascot. The brand has three parts: a **saturated purple world**, **lime-yellow** type and buttons on it, and a large library of **one-colour word pictograms** that replace translations ("100% illustrated"). In the app, **colour tells you the mode**: setup and celebration screens are a deep purple field (`#36135C`), new-word cards are full-screen tangerine (`#E9720F`), and the matching game is full-screen turquoise (`#12A8AC`). Interaction is gestural: you swipe a word up to "I know it" or down to "Learn", and drag a word onto its picture. The voice is short, cheerful and benefit-first ("Language learning made easy", "Look at you go!").

Drops lives on dark colour, not on white. This preset therefore uses Drops' real in-app look as the **dark** theme (purple field, white type, lime actions). The **light** theme is a derived reading version: white paper, night-purple ink, and purple-350 + lime as the accent pair. The only light surface Drops itself uses is the lavender testimonial card (`#F5F0FF`, indigo text), and the light theme is built from it.

## Colors

- **Purple 350 (`primary` #712BB5):** the website's page field (`--purple-350`). In the light theme it is the action colour and link colour (7.7:1 on white).
- **Lime (`on-primary`, `secondary`, `dark-primary` #DAEB3F):** the filled CTA colour (`GET STARTED`). Headings and the logo use the near-identical `--lime` #DBE65B. Lime-on-purple is Drops' signature pairing (5.9:1 on #712BB5), so light-theme buttons are purple pills with lime labels. In the dark theme lime becomes the primary fill with a night-purple label, which is exactly the app's "Continue" button.
- **Night purple (`on-surface`, `tertiary` #29093D):** Drops' darkest band and the label colour on lime buttons. It serves as the light theme's ink.
- **Lavender wash (`surface-muted` #F5F0FF):** testimonial card background. Used for cards, chips and segmented controls. `primary-soft` #F0E7FF is the lavender of the testimonial-card edge, used for selected words. `border` #E6DCF7 is *derived* from it.
- **Purple field (`dark-background` #36135C):** sampled from the app's setup, interests and celebration screens. `dark-surface-muted` #4E1B8A is the interest-chip fill, `dark-primary-soft` #561E92 the answer-row fill ("Nonexistent / I know some"), and `dark-on-surface-muted` #937CA8 the "Select all that apply" subtitle.
- **Mode colours:** tangerine `mode-new-words` #E9720F (sampled), turquoise `mode-matching` #12A8AC (sampled; the CSS token is `--turquoise` #0AB1B4), blue-500 #217AD1 (alternate web band), banana #F7CC51 (golden drop and the selected-chip outline, sampled #FBD95E), premium yellow #FFFF00, lilac #DFA5F7 (pictogram tint), magenta #C90B6F (celebration confetti blob).
- **Status:** `error` is Drops' magenta (#C90B6F, 5.6:1 on white). In dark mode it is lifted to #FF6FB0 (*derived*). `warning` is tangerine darkened to #AD540B (*derived*) so that saved-word text passes AA on white; raw tangerine is 3.05:1. In dark mode `dark-warning` is the real banana #F7CC51 (9.8:1 on the purple field).
- Every required colour has a `dark-` twin. Dark values are Drops' own, apart from the `dark-error`, `dark-warning-soft`, `dark-on-surface-faint` and `dark-border` hairline tints (*derived*).

## Typography

- **Latin:** **TT Norms Pro**, a geometric sans, used for everything on the site and in the app. Headlines are 800 weight with +0.5px tracking in sentence case (web h1 38px; `headline-lg` scales it to 22px for a side panel). Body copy is 400 weight. Labels are 700. The CTA is written in capitals in the copy ("GET STARTED"), but the in-app buttons are in title case ("Continue", "Create Account"). The 2017 identity used Montserrat and Mouse Memoirs, both now retired.
- **Chinese:** Drops sets the word on a card as a heavy white sans character (嗨, 多謝) with Jyutping in bold TT Norms Pro tinted toward the field colour (#FACCA3 on tangerine, #A1E0E1 on turquoise). The app uses the system CJK face. For this preset we pick **Chiron Hei HK**, an open-source Hong Kong-standard sans: its wide, low-contrast, geometric strokes sit well beside TT Norms Pro, and it keeps HK glyph forms (fall back to Noto Sans HK / PingFang HK). The current line is set at **700** to echo Drops' bold word cards, and other lines at 500.
- **Jyutping:** TT Norms Pro 700 at 11px. Drops places it *below* the character on cards; Canto keeps it above in the transcript, and the word card can follow Drops and put it underneath.

## Layout

The app has a single centred column with generous vertical air: the picture, the English word, the character and the Jyutping are stacked in the middle of a full-bleed field, and the gesture targets ("I know it", "Learn") sit above and below. Setup screens use a left-aligned bold question, a lime progress bar, a vertical stack of full-width answer rows about 8px apart, and a large docked CTA (about 56pt tall in the app, 66px on the web). In Canto, keep the narrow-panel column, the 4px base and the 8/12/16/24 steps. Drops' extra air comes from setting cards with 14–16px padding.

## Elevation & Depth

Flat. Buttons have no shadow and no "lip", and depth comes from tonal steps of purple (field #36135C → chips #4E1B8A → answer rows #561E92). The marketing illustrations carry soft shading, but the UI never does. Canto's floating layers (popover, sheet) may keep a soft shadow. In dark mode, tint it with night purple (#1E0D2E, the progress-track colour) rather than black.

## Shapes

- **Web:** buttons are full pills (`border-radius: 100px`), and the outline variant uses a 2px lime border.
- **App:** the large CTA is a rounded rectangle of about 18pt (`lg`), answer rows about 14pt (`md`), and interest chips about 8pt (`sm`). These were measured from the iPhone captures at 1.58 px/pt.
- The logo's drop shape (the O in DR**O**PS, and the flag drops) is the one signature form.

## Components

- **Primary button:** purple pill with a lime 13px bold label (light). In dark mode it becomes a lime pill with a night-purple label, the app's "Continue".
- **Lime CTA (`button-lime-cta`):** the web's flat lime pill with a night-purple label. Use it for one hero action per view, on purple only.
- **Secondary button:** night-purple pill with a white label (dark: white pill, purple label). This mirrors the 2px lime-outline "Get Started" in spirit.
- **Chips:** 8px-radius tiles, emoji + label, filled in the muted surface. When selected they get a 2px banana outline (#F7CC51), and the fill does not change.
- **Answer row (`option-row-dark`):** full-width purple row, white 14px text, 14px radius.
- **Word selected:** lavender fill with purple text (light), or answer-row purple with lime text (dark), plus a lime or purple underline.
- **Mode fields:** a whole card or sheet in tangerine (new words) or turquoise (matching), with a white bold character and field-tinted Jyutping.
- **Premium pill:** pure #FFFF00 with a night-purple label.
- **Tabs:** the active tab is an ink pill.

## Do's and Don'ts

- Do use lime only on purple or night purple. Lime on white is 1.3:1 and unusable.
- Do treat colour as a signal of mode. One field colour per state, never mixed on the same surface.
- Do keep the transcript on the calm `background` (white, or the purple field), never on tangerine or turquoise.
- Don't put white body text on the mode colours: white on tangerine is 3.05:1 and on turquoise 2.9:1. Drops gets away with it because only large bold words sit there, so do the same: 20px+ bold only. Tangerine then passes AA-large (3:1), but turquoise still falls just short at 2.9:1. The lint flags both `mode-field-*` components, and the values are kept because they are Drops' real ones.
- Don't use raw tangerine #E9720F for saved-word text on white (3.05:1). Use `warning` #AD540B.
- Don't add drop shadows, gradients or 3D lips to controls.
- Don't introduce a mascot. Drops' marketing learner is unnamed and never speaks.

## Illustration & Imagery

- **No mascot.** The site has a recurring, unnamed brown-haired young man in a white T-shirt who acts out each benefit (teacher, superhero, scientist, runner) in semi-flat shaded vector. He is marketing-only and never speaks.
- **Product pictograms** carry the brand. Each one is a one-word picture (a waving person, a dog, a bank with a piggy bank, a person with hands on heart for "thank you") drawn as a **single-colour silhouette with two or three tonal steps of the field colour plus white**, with no outlines and no text. On purple they are lilac and white; on tangerine, peach and white; on turquoise, mint and white. The colour always comes from the screen behind.
- **Flag drops:** every language sits inside the logo's teardrop shape; Cantonese uses the Hong Kong bauhinia. The golden drop is premium.
- **Style DNA (paste into an image model):** "A single flat vector pictogram of one everyday object or person, centred on a solid saturated field of deep purple #36135C. Draw the subject only in tints of the field colour: pure white #FFFFFF for lit planes, pale lilac #DFA5F7 and mid lavender #937CA8 for shaded planes, no other hues. No outlines, no gradients, no texture, no text, no background scenery. Simple geometric construction, friendly rounded forms, slight three-quarter view, crisp edges, generous empty space around the subject. People are drawn waist-up with minimal faces: two dots for eyes and a small curved smile. Variants: the same style on tangerine #E9720F with peach #FACCA3 shading, or on turquoise #12A8AC with mint #A1E0E1 shading. Optional single accent of lime #DAEB3F for one small detail."

## Reskinning Canto

- **Light theme** turns Canto purple-and-lavender: purple links and progress, purple pills with lime labels, a lavender-wash moment card, and night-purple ink. The transcript stays on white, so reading comfort is the same as Canto's. **Dark theme** is the full Drops look: the transcript sits directly on the app's purple field in white Chiron Hei HK, and actions are lime. Contrast is 15:1 for text and 11:1 for lime.
- **Colour = mode:** keep `background` fixed behind the transcript. If you want Drops' mode signal, apply `mode-new-words` (tangerine) to the word sheet or moment card while paused or studying, and `mode-matching` (turquoise) to review, using large bold type only on those fields. A thin top band in the mode colour on the header bar is the low-risk version.
- **Watch:** muted text in dark mode (#937CA8 is 4.05:1 on the field, fine for metadata but not for body copy). Bold 700 current-line characters are heavier than Canto's 500; at the 28px size, check that dense lines don't clot. On-primary is lime, not white, so any CSS that assumes `--on-accent` is white (icons, spinners) will turn lime on purple, which is intended.
