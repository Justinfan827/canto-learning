---
version: alpha
name: Babbel
description: Editorial "personal language coach". Feature Text serif in regular weight, Graphik UI, ink pills, one orange accent on white and warm cream, real photography instead of illustration.
colors:
  primary: "#FE4D01"
  on-primary: "#FFFFFF"
  primary-soft: "#FFEDE6"
  secondary: "#FFD966"
  tertiary: "#151515"
  warning: "#8F6A00"
  warning-soft: "#FFEEBA"
  error: "#E61C26"
  background: "#FFFFFF"
  surface: "#FFFFFF"
  surface-muted: "#F6F4EF"
  on-surface: "#151515"
  on-surface-muted: "#46443F"
  on-surface-faint: "#76746F"
  border: "#EAE8E5"
  dark-primary: "#FE4D01"
  dark-on-primary: "#151515"
  dark-primary-soft: "#330F00"
  dark-warning: "#FFD966"
  dark-warning-soft: "#383221"
  dark-error: "#FF6A5E"
  dark-background: "#151515"
  dark-surface: "#151515"
  dark-surface-muted: "#252524"
  dark-on-surface: "#F6F4EF"
  dark-on-surface-muted: "#A7A6A3"
  dark-on-surface-faint: "#646361"
  dark-border: "#323231"
  orange-600: "#CB3E01"
  orange-100: "#FFDBCC"
  brown: "#330F00"
  cream: "#F6F4EF"
  butter: "#FFD966"
  peach: "#FFD6C4"
  salmon: "#FE9567"
  lilac: "#E0C3FD"
  purple: "#671EB0"
  forest: "#3E522D"
  mint: "#45C688"
typography:
  headline-lg:
    fontFamily: Feature Text
    fontSize: 40px
    fontWeight: 400
    lineHeight: 1.15
  headline-md:
    fontFamily: Feature Text
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.2
  body-md:
    fontFamily: Graphik Babbel
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Graphik Babbel
    fontSize: 12.5px
    fontWeight: 400
    lineHeight: 1.45
  label-md:
    fontFamily: Graphik Babbel
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1
  label-sm:
    fontFamily: Graphik Babbel
    fontSize: 11.5px
    fontWeight: 400
    lineHeight: 1.3
  transcript-current:
    fontFamily: Noto Serif HK
    fontSize: 23px
    fontWeight: 400
    lineHeight: 1.6
  transcript-line:
    fontFamily: Noto Serif HK
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.65
  word-card:
    fontFamily: Noto Serif HK
    fontSize: 22px
    fontWeight: 400
    lineHeight: 1.4
  jyutping:
    fontFamily: Graphik Babbel
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1
rounded:
  sm: 4px
  md: 8px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 20px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 10px 20px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 10px 18px
  chip:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: 3px 8px
  word-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.brown}"
    rounded: 2px
  card:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 16px
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 20px
  tab-active:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.background}"
    rounded: "{rounded.full}"
    padding: 4px 12px
  button-signup:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 10px 18px
  lesson-card:
    backgroundColor: "{colors.butter}"
    textColor: "{colors.on-surface}"
    typography: "{typography.headline-md}"
    rounded: "{rounded.md}"
    padding: 16px
  language-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 12px 16px
---

# Babbel

Reskin preset for Canto, based on babbel.com (captured 2026-10-10) and the 2024 Koto rebrand material in `assets/blog/`. Token names match Canto's `DESIGN.md` one for one. Values come from `palette.json` (computed CSS) or were sampled from the screenshots and design-system board. Values marked *derived* below have no direct source.

## Overview

Babbel presents itself as a "personal language coach". It looks like a magazine, not a game. Headlines use a high-contrast serif in **regular** weight, body copy and UI a neutral grotesque, and the colours are ink on white and warm cream with one hot orange. There is no mascot and no drawn illustration: people appear only in photography, and objects as photographed cut-outs. The tone is grown-up, outcome-focused and lightly witty ("It's like having a private tutor in your pocket"), and claims carry study footnotes. On Canto the skin should feel like reading a well-set print feature: calm, warm and adult, with orange used sparingly.

## Colors

Ink and paper, with one orange and a few print-like tile colours.

- **Babbel orange (`primary` #FE4D01):** the logo, Sign up, the "Over 25 million subscriptions sold!" strip, the closing CTA band, the active tab in the app's bottom nav, progress bars, and *one italic word per headline* ("Which *language*…", "Babbel and *beyond*"). In the design-system board it is `orange500 / brand.default`. Its 600 step (#CB3E01) and 100 step (#FFDBCC) are sampled from the same board's orange ramp.
- **Orange tint (`primary-soft` #FFEDE6):** orange 50 from the ramp, used here as the selected-word fill. The selected word's text uses **brown #330F00** (orange 900). Babbel draws all its line icons in this colour (`icon-medal.svg` etc.).
- **Ink (`on-surface`, `tertiary` #151515):** text, and the **primary button**. Babbel's main CTA ("Start learning") is black, not orange. The board names it `gray950 / accent.default`.
- **White (`background`, `surface`):** the board labels white `neutral.app-background`, and the redesigned app home is white with cream chips. The marketing site instead sits on **warm cream #F6F4EF**, which here becomes `surface-muted` (chips, cards, the "A1" level tag).
- **Warm greys:** `on-surface-muted` #46443F is the site's secondary text, `on-surface-faint` #76746F the inactive bottom-nav label in the app, and `border` #EAE8E5 the footer hairline.
- **Butter yellow (`secondary` #FFD966):** the full-width Method and Reviews bands, "Newcomer" tiles and the word-of-the-day card. Its paler form #FFEEBA (the "Today's vocab" card) is `warning-soft`.
- **Warning #8F6A00 (derived):** Babbel has no amber text colour. This is the butter-yellow hue darkened to 4.97:1 on white, so saved-word underlines and hints stay readable.
- **Error #E61C26:** sampled from the red count badge on the app's Review tab (a tiny sample). It is a true red, so errors don't read as brand orange.
- **Tile colours (extras):** salmon #FE9567, peach #FFD6C4, lilac #E0C3FD, purple #671EB0, forest #3E522D and mint #45C688, all from the skill tiles, the lesson-card library and the hero collage. They belong to content and imagery, never to UI chrome.
- **Dark mode (all derived):** Babbel shows no dark UI. The dark set is built from the brand's own black panel on the design-system board (#151515 as the canvas), with cream #F6F4EF as text. Orange stays #FE4D01 (5.46:1 on ink) with ink text on orange buttons, `dark-primary-soft` is orange 900 #330F00, `dark-warning` is the real butter yellow, and the greys are cream mixed into ink at 7/13/35/65%.

## Typography

- **Display / headline: Feature Text** (Commercial Type), **weight 400**, sentence case, normal tracking: 40px on the site (`headline-lg`) and 20px for panel titles (`headline-md`). Babbel is the only brand in our landscape whose headlines are not heavy, so the serif's contrast carries the hierarchy. An accent word may be set *italic* in orange.
- **UI and body: Graphik Babbel**, a custom Graphik cut, at 400/500: 14px body, 13px/500 labels. Buttons on the site are 16px **regular**, and the language pills are medium.
- **Cantonese:** Babbel teaches no Chinese, so this part is inferred. Its voice is the editorial serif, and the nearest CJK equivalent to Feature Text is a Song/Ming-style serif with Hong Kong glyph forms: **Noto Serif HK** (falling back to Source Han Serif TC and PMingLiU). The current line is 23px at 400, matching Babbel's regular-weight headings. Other lines also use the serif at 17px, so a line keeps its face when it becomes current and only its size and colour change. Line height is 1.65 because Ming strokes need air. The word card is 22px serif. **Jyutping** uses Graphik Babbel 11px regular: a sans for romanisation, the same serif/sans split Babbel uses between headings and labels.
- No all-caps. One italic accent word per view at most.

## Layout

The site uses a wide editorial grid: centred serif headings, photo-and-text rows, and full-bleed colour bands (butter yellow, orange) that divide the page into chapters. Everything is generously spaced. For Canto's single side-panel column, keep that air: spacing steps of 4, 8, 12, **20** and **32**px (wider than Canto's 16/24), 16–20px side padding, and a slightly taller line gap in the transcript. Footnotes and sources sit small and muted at the bottom, as Babbel does with its efficacy-study asterisks.

## Elevation & Depth

Flat, like print. Buttons and cards have no shadows. Hierarchy comes from surface colour: white cards on cream, cream chips on white, and full-bleed yellow or orange bands. The one soft shadow is on the floating card on the design-system board (the dialog with Button pills), so keep shadows to floating layers (popover, bottom sheet) and make them soft and low-opacity.

## Shapes

There are two shape families. **Pills** (`border-radius: 4000px`, 44px tall on the site) are used for every button, language picker and segmented "Pill" control. **Gently rounded rectangles** are used for content: about 4px for FAQ rows, skill tiles and inline word chips (`sm`), about 8px for lesson and photo cards (`md`), and about 14–16px for the "Babbel and beyond" photo cards and design-system panels (`lg`). Corners are never bubbly, and pills are never combined with heavy borders.

## Components

- **Primary button:** **ink pill** (#151515) with a white label, flat, 1px ink border, sentence case ("Start learning", "Start lesson").
- **Secondary button:** white pill with a 1px ink outline and ink label ("Repeat" on the design-system board).
- **Sign-up button (`button-signup`):** orange pill with a white label. Use it for one action per screen, like Babbel's single orange Sign up.
- **Chip:** small cream rectangle with a 4px radius (the "A1" level tag, the "Ich / Zürich / aus" word tiles).
- **Word selected:** orange-50 fill, brown text, and a 2px orange underline, echoing the orange rule under "I'm from Zürich" on the board.
- **Card:** cream on white, 8px radius, 16px padding. **Lesson card:** butter-yellow tile with a serif title (the "Talk about your favorite food" photo label).
- **Language pill:** white pill with a 1px cream-grey border (#E8E6E3), a round flag icon and a medium label.
- **Sheet:** white, 16px top radius, soft shadow.
- **Tabs:** text labels; the active tab is an ink pill (the black Design / Build / Learn pills on the board). The app's bottom nav marks the active tab with an orange icon and label.

## Do's and Don'ts

- Do use the ink pill for the main action and keep orange to one element per view (selected word, progress or Sign up).
- Do set headings in Feature Text at 400. Never bold the serif; hierarchy comes from size.
- Do keep the Cantonese transcript in one serif family (Noto Serif HK) so the current line only grows and darkens.
- Don't put small white text on orange: #FFFFFF on #FE4D01 is only **3.35:1**. Babbel does it on Sign up and the banner strip at 16px+ medium, and `button-signup` keeps that real pairing (the linter flags it). Keep its label ≥16px or bold, or switch to orange 600 #CB3E01 (4.97:1).
- Don't use orange text for body copy or Jyutping (3.35:1 on white). Use it only for large italic accent words or underlines.
- Don't add drawn illustration, mascots or gamified badges. Use photography, cut-outs and silhouettes.
- Don't use tile colours (lilac, purple, forest, salmon) for UI states. They belong to lesson content.

## Illustration & Imagery

Babbel uses **no drawn illustration at all**. The 2024 rebrand replaced it with three devices:

1. **Lifestyle photography of real adults:** learners at a café table, on a sofa with a phone, on stairs. Warm natural light, shallow depth of field, slightly film-like colour. Product labels are overlaid as flat colour cards with a serif title ("Introduce yourself" on forest green).
2. **Cut-out photographed objects** (coffee cup, picnic basket, moka pot, saxophone, bicycle) placed on flat colour blocks of butter, salmon, lilac or forest. They are crisp studio product shots with a soft contact shadow.
3. **Monochrome orange silhouettes** of the same objects, used as pattern.

Video features a real teacher on camera in a home setting ("Babbel Videos"). Line icons are thin (about 1.5px), round-capped and drawn in brown #330F00. Babbel's design team wrote that AI-generated lesson images "fell short" on consistency and art-directed its top lessons by hand, so brief any generated asset tightly and check it against real photos.

**Style DNA (paste into an image model):**
> Editorial lifestyle photograph for a premium adult language-learning magazine. Warm natural daylight, shallow depth of field, gentle film grain, true-to-life skin tones, candid not posed. One crisp studio cut-out object (for example a teacup, a folded newspaper, a bowl of noodles) isolated on a flat solid colour block in butter yellow #FFD966, salmon #FE9567, lilac #E0C3FD or deep forest #3E522D, with a soft contact shadow. Background paper tone warm cream #F6F4EF; text ink near-black #151515; a single accent in vivid orange #FE4D01, never more than one orange element. No drawn illustration, no cartoon characters, no 3D renders, no gradients, no glossy effects, no lettering inside the image.

For a Cantonese context, brief Hong Kong objects (a milk-tea glass, a 茶餐廳 menu card, a minibus seat) as cut-outs, and Hong Kong street or home scenes as photography.

## Reskinning Canto

- **Primary action changes from colour to ink.** Canto's jade pill becomes Babbel's black pill. `primary` (orange) moves to the selected word, progress and focus rings. If Canto's CSS fills primary buttons with `--primary` directly, map them to `--on-surface` for this skin, or the panel ends up with several orange pills.
- **The transcript becomes a serif.** Noto Serif HK at 17/23px with 400 weight reads as print. Check Ming-style hairlines at 17px on non-retina screens, and check that Jyutping in Graphik still aligns over each glyph (serif CJK glyphs sit a little lower in the em box).
- **Cream is a surface, not the page.** Babbel's own app background is white, with cream for chips and cards. For a more "magazine" feel, set `background` to cream #F6F4EF and `surface-muted` to white, a real Babbel pairing taken from the website.
- **The dark mode is invented.** Babbel has no dark UI to copy. The ink/cream/orange dark set is derived and should be checked on real video pages before shipping.
