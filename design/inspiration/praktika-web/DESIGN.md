---
version: alpha
name: Praktika
description: AI-tutor language app. Electric violet #7429FF on white and lilac-grey, Aeonik Pro 500 headings over Inter, flat pills, big soft cards and a cast of stylised-3D tutors.
colors:
  primary: "#7429FF"
  on-primary: "#FFFFFF"
  primary-soft: "#F7F2FF"
  secondary: "#4E0DC7"
  tertiary: "#0D0D0D"
  warning: "#FF9602"
  warning-soft: "#FFF2E1"
  error: "#FF2D55"
  background: "#FFFFFF"
  surface: "#FFFFFF"
  surface-muted: "#F7F6FA"
  on-surface: "#0D0D0D"
  on-surface-muted: "#4B4458"
  on-surface-faint: "#A7A4AE"
  border: "#E8E4EE"
  dark-primary: "#754CF0"
  dark-on-primary: "#FFFFFF"
  dark-primary-soft: "#1F0060"
  dark-warning: "#FF9602"
  dark-warning-soft: "#2E1B00"
  dark-error: "#FF2D55"
  dark-background: "#000000"
  dark-surface: "#000000"
  dark-surface-muted: "#171717"
  dark-on-surface: "#ECECEC"
  dark-on-surface-muted: "#8F8F8F"
  dark-on-surface-faint: "#565656"
  dark-border: "#2A2A2A"
  primary-tint: "#D9C5FF"
  primary-deep: "#1F0060"
  bubble-lilac: "#E7DAFF"
  canvas-lilac: "#F7F6FA"
  success: "#33C75A"
  fix-green: "#00A806"
  mistake-red: "#FF1F1B"
  tone-soft: "#6DD688"
  tone-balanced: "#6CC4EC"
  tone-strict: "#FEB248"
  gradient-pink: "#FFADB9"
typography:
  display-lg:
    fontFamily: Aeonik Pro
    fontSize: 60px
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Aeonik Pro
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Aeonik Pro
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
  body-sm:
    fontFamily: Inter
    fontSize: 12.5px
    fontWeight: 400
    lineHeight: 1.4
  label-md:
    fontFamily: Aeonik Pro
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1
  label-sm:
    fontFamily: Inter
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
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.4
  jyutping:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1
rounded:
  sm: 8px
  md: 16px
  lg: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 12px 20px
  button-secondary:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.background}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 10px 16px
  chip:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  word-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    rounded: 6px
  card:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 16px
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: 28px
    padding: 20px
  tab-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: 6px 12px
  user-bubble:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: 18px
    padding: 10px 14px
  correction-bubble:
    backgroundColor: "{colors.bubble-lilac}"
    textColor: "{colors.on-surface}"
    typography: "{typography.headline-md}"
    rounded: "{rounded.lg}"
    padding: 12px 16px
  fix-highlight:
    backgroundColor: "{colors.fix-green}"
    textColor: "{colors.on-primary}"
    typography: "{typography.headline-md}"
    rounded: "{rounded.sm}"
    padding: 0px 6px
  hero-card:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: 40px
    padding: 48px
---

# Praktika

Reskin preset for Canto, based on the Praktika marketing site (praktika.ai, captured 2026-10-10) and the "Praktika 4.0" rebrand post (Feb 2026). Colours come from the site's CSS custom properties (`--brand-*`, `--grayscale-*`, `--black-1000`) and from pixel samples of the captures; values marked *derived* below were not seen directly and were worked out from neighbouring brand colours. Sources: `README.md`, `palette.json`, the `0*-home-*.png` screenshots and `assets/` in this folder, and the Praktika row of `../landscape.md`.

## Overview

Praktika sells conversation practice with **AI tutors**, and the tutors are the brand: a named cast (Skye, Tama, Raven, Noah) rendered as stylised, animated-film 3D people who appear as video-call faces inside phone frames. Around them the UI is clean consumer-tech: an **electric violet** (#7429FF) hero card and pill CTAs, white cards on a cool lilac-grey canvas, near-black text, and **Aeonik Pro** headings set at medium weight with tight tracking. The tone is warm and anxiety-reducing ("Practice freely. No judgement, ever", "instant, gentle corrections"). The signature interaction is the **correction**: the learner's sentence in a violet bubble, then "It is better to say" (green tick) and "Explanation" (amber question mark). The app's dark mode is pure black with charcoal bubbles and violet accents; the 4.0 cover and tutor room sit in deep violet (#1F0060 to black) with frosted glass.

For Canto this means: violet replaces jade as the one accent, the panel gets roomier and rounder, and the dark theme becomes black-and-violet.

## Colors

- **Violet (`primary` #7429FF, CSS `--brand-600`):** the hero card, every CTA, the logo, the user's chat bubble and highlight chips. White on it is 6.0:1. Pressed and gradient ends use **Brand 700** #4E0DC7 (`secondary`).
- **Violet wash (`primary-soft` #F7F2FF, `--brand-50`):** selected-word fill and the active tab. The brighter **Brand 200** #D9C5FF (`primary-tint`) is the site's "selected chip" tint, but violet text on it is only 3.8:1, so it is kept as an extra token for fills without text.
- **Lilac bubble (`bubble-lilac` #E7DAFF, sampled):** the frosted correction bubble in the hero ("I'm bad to speak English").
- **Ink and canvas:** text is `--black-1000` #0D0D0D (also `tertiary` and the black store buttons); secondary text is purple-grey `--grayscale-800` #4B4458; the faded "05 / 05" step text samples at #A7A4AE (`on-surface-faint`). The page canvas is lilac-grey `--grayscale-50` #F7F6FA. In Canto it becomes `surface-muted`, the colour of cards and chips on a white panel, which is how Praktika uses it inside its white cards (the Soft / Balanced / Strict tone tiles). Hairlines sample at #E8E4EE (footer divider).
- **Feedback:** the "It is better to say" tick is green #33C75A (`success`), the "Explanation" mark is amber #FF9602 (`warning`), and the pain-point crosses and alert accents are pink #FF2D55 (`error`). The hero marks a fix with a green #00A806 highlight (`fix-green`) and a mistake with a red #FF1F1B one (`mistake-red`). `warning-soft` #FFF2E1 is *derived* (12% amber on white).
- **Tone faces:** soft green #6DD688, balanced blue #6CC4EC, strict amber #FEB248. These are the only flat, playful colours on the site.
- **Dark mode:** taken from the 4.0 dark-mode app screens. The background is true black #000000 (sampled), bubbles and icon buttons are #171717 (sampled, `dark-surface-muted`), text #ECECEC, icons #8F8F8F, inactive tab labels #565656, and the violet card and active tab are a softer #754CF0 (sampled, `dark-primary`; white on it is 5.2:1). `dark-primary-soft` is **Brand 1000** #1F0060, which the CSS reserves for dark mode and cover gradients. *Derived:* `dark-border` #2A2A2A (one step above the bubble grey) and `dark-warning-soft` #2E1B00 (18% amber on black). Amber and pink are unchanged in the dark; both pass on black (8.9:1 and 5.3:1).

## Typography

- **Display and headings: Aeonik Pro 500** (licensed; fallback Inter or system-ui). The h1 is 60px/500 with −0.02em tracking. It is always medium weight, never bold, and always sentence case. `headline-md` scales it to 18px for panel titles.
- **Body: Inter 400** (700 for rare emphasis), 14px in the panel. Button labels are 14px/500 (measured).
- **Cantonese (inferred; the site shows no Chinese):** **Noto Sans HK**, so traditional Hong Kong glyph forms are used. Its open, even-stroked Hei forms match the neutral, screen-first feel of Inter. The current line is set at **500** to echo Aeonik's medium-weight headings, at Canto's sizes (23px current, 17px other lines, 22px in the word card). Jyutping is Inter 11px/500 in `on-surface-muted` purple-grey, above the characters.
- Uppercase appears only in tiny overlines ("LEARNERS LOVE PRAKTIKA", the tone labels). Avoid it elsewhere.

## Layout

Generous and airy. The site uses big rounded tiles with ~32px inner padding, a floating pill-shaped nav bar, and phone mockups as the main imagery. In a narrow side panel that becomes 16px side padding, 16–24px between blocks, and an 8px rhythm (4, 8, 16, 24, 32). The steps are roomier than Canto's 12px middle step. Keep one violet focal element per view (the primary button or the current line), as the site keeps one violet card per screen.

## Elevation & Depth

Mostly flat with soft, wide, lilac-tinted shadows. The nav bar and floating QR card have a very diffuse shadow, and the "balanced" tone tile lifts off the row with a soft drop. Depth otherwise comes from the 3D artwork and from **frosted glass** (the correction bubble, the 4.0 cover lettering). Buttons have no shadow. In Canto, keep in-flow content flat and give popovers and the bottom sheet a soft violet-tinted shadow (`0 12px 32px -12px` in #4E0DC7 at ~15%).

## Shapes

Large and soft. The CTA is a full pill (50px radius). Store buttons are 16px rounded rectangles. Content cards are ~24–32px, and the violet hero card is ~40px. Chat bubbles are ~18–20px. Highlight chips inside a sentence are ~8px. The phone sheet has ~28px top corners. Tone faces are irregular rounded squircles. Nothing is sharp-cornered.

## Components

- **Primary button:** flat violet pill, white Aeonik 14px/500 label, sentence case, ~40px tall, no border or shadow ("Try Praktika now").
- **Secondary button:** ink #0D0D0D rounded rectangle (16px) with white label, the App Store / Google Play style.
- **Chips:** lilac-grey fill, purple-grey text, pill.
- **Selected word:** violet wash fill with violet text. A saved word gets an amber dotted underline (Canto behaviour, recoloured).
- **Card:** lilac-grey #F7F6FA, 24px radius, 16px padding.
- **Sheet:** white, 28px top corners, grab handle, as in the app's chat sheet under the tutor video.
- **Tabs:** the app's bottom bar colours the active tab violet. Here that is a violet-wash pill with violet label.
- **Signature: user bubble** in solid violet with white text. **Correction bubble** in frosted lilac with a green `fix-highlight` on the corrected words. **Feedback rows** use a green tick for "It is better to say" and an amber "?" for "Explanation", in bold Aeonik over Inter body.

## Do's and Don'ts

- Do keep violet as the only saturated UI colour. Green, amber and pink are for feedback only.
- Do set headings at Aeonik Pro **500** with slight negative tracking. Don't bold them.
- Do keep corners generous (pills, 16–24px cards). Don't mix in sharp or 4px corners outside inline word highlights.
- Don't use amber #FF9602 or pink #FF2D55 for small text on white: they are 2.2:1 and 3.7:1. Use them for icons, underlines and fills, with ink text beside them.
- Don't put white text on `fix-green` #00A806 below ~18px bold: it is 3.2:1, readable only because the hero sets it large and bold. Lint flags it, and the real value is kept on purpose.
- In dark mode, use violet #754CF0 as a **fill** (white label 5.2:1). As text on black it is only 3.75:1, and on #1F0060 only 3.3:1, so selected words in dark mode should keep light text on the deep-violet fill.
- Don't put tutors or 3D art inside the transcript. The site never lets characters overlap the text they correct.

## Illustration & Imagery

Praktika's imagery is **all 3D**. The tutors are stylised, Pixar-like human characters with big expressive eyes, soft subsurface skin, glossy sculpted hair and real clothing (Skye: red curls, freckles, white brand tee; Tama: glasses, purple tropical shirt; Raven: black bob with a violet streak; Noah: round glasses, cardigan). Wardrobe is always colour-matched to brand violet. They are lit like an animated film: soft key light, warm rim light, shallow depth of field, set against blurred bookshelf rooms or a pink-to-violet gradient (#FFADB9 → #E085BE → #782DFA, sampled). Props are 3D too: a gold laurel, a gold star, a hand holding a QR card. The only flat art is the three tone faces: soft blobs with dot eyes in green, blue and amber. The brand moved from photoreal game-engine avatars (2024) to this stylised look in the 4.0 rebrand.

For Canto, a Praktika-style asset would be a friendly 3D Hong Kong tutor or a 3D prop (a speech bubble, a laurel, a pair of chopsticks), never a mascot animal.

**Style DNA prompt (paste into an image model):**

> Stylised 3D character render in the look of a modern animated feature film: a friendly young adult language tutor with large expressive eyes, soft rounded features, gently exaggerated proportions, glossy sculpted hair and subtle skin subsurface scattering. Warm natural smile, relaxed pose, waist-up framing, looking at the viewer as if on a video call. Clothing in soft white with electric-violet #7429FF and deep violet #4E0DC7 accents. Soft cinematic key light from the front-left, warm rim light, shallow depth of field. Background is either a softly blurred cosy room with bookshelves in violet-tinted shadow, or a smooth vertical gradient from blush pink #FFADB9 through orchid #E085BE to violet #782DFA. Clean, optimistic, premium; high detail, no text, no logos, no photorealism, no harsh shadows.

For props, replace the first two sentences with "a single glossy 3D object (e.g. a rounded speech bubble) with soft bevels, floating with a gentle shadow". For a Hong Kong setting, put the tutor in a window seat with a softly blurred tram or harbour view behind, still violet-tinted.

## Reskinning Canto

- **What changes:** jade becomes violet #7429FF. Cards and chips turn lilac-grey #F7F6FA. Headings and button labels switch to Aeonik Pro 500 (fall back to Inter if unlicensed). Radii grow (cards 24px, sheet 28px). The active tab becomes a violet-wash pill instead of an ink pill. The dark theme becomes true black with #171717 cards and #754CF0 violet.
- **Transcript readability:** violet text on the violet wash is 5.45:1, fine for the selected word. In dark mode, violet on #1F0060 is 3.3:1. Override the dark selected-word text to `dark-on-surface` (#ECECEC) or keep the light violet only as an underline.
- **Warning and error are brighter than Canto's:** amber #FF9602 and pink #FF2D55 are designed for icons. Anything Canto renders as small amber or red *text* (setup hints, inline errors) loses contrast on white, so pair it with an icon and ink text.
- **Jyutping** stays small Inter in purple-grey #4B4458 (9.3:1 on white). Don't tint it violet, or it will compete with the selected word.
