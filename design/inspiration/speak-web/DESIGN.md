---
version: alpha
name: Speak
description: Tech-minimal speaking coach. One electric blue on white, navy Axiforma with tight tracking, flat pills, product UI and filmed humans instead of illustration.
colors:
  primary: "#1C49FF"
  on-primary: "#FFFFFF"
  primary-soft: "#E8EDFF"
  secondary: "#29C195"
  tertiary: "#12205A"
  warning: "#FF8400"
  warning-soft: "#FFF3E0"
  error: "#FF4242"
  background: "#FFFFFF"
  surface: "#FFFFFF"
  surface-muted: "#F5F5F5"
  on-surface: "#12205A"
  on-surface-muted: "#677095"
  on-surface-faint: "#CED1DD"
  border: "#E1E1E1"
  dark-primary: "#6A88FF"
  dark-on-primary: "#12205A"
  dark-primary-soft: "#1E2F71"
  dark-warning: "#FF9900"
  dark-warning-soft: "#3D364A"
  dark-error: "#FF6B6B"
  dark-background: "#12205A"
  dark-surface: "#12205A"
  dark-surface-muted: "#253267"
  dark-on-surface: "#FFFFFF"
  dark-on-surface-muted: "#B8BCCE"
  dark-on-surface-faint: "#656E94"
  dark-border: "#364173"
  band-blue: "#3748F7"
  deep-blue: "#013BC5"
  waveform-navy: "#021F59"
  hover-blue: "#6A88FF"
  ink-soft: "#8990AD"
  card-grey: "#F8F8F8"
  app-canvas: "#F5F8FE"
  progress-track: "#D5DADF"
  mint-soft: "#D2F0E7"
  streak-orange: "#FF9900"
  gold: "#F9CB78"
  lime: "#C4F06E"
typography:
  headline-lg:
    fontFamily: Axiforma
    fontSize: 56px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.04em
  headline-md:
    fontFamily: Axiforma
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.02em
  body-md:
    fontFamily: Axiforma
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Axiforma
    fontSize: 12.5px
    fontWeight: 400
    lineHeight: 1.45
  label-md:
    fontFamily: Axiforma
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: -0.02em
  label-sm:
    fontFamily: Axiforma
    fontSize: 11.5px
    fontWeight: 500
    lineHeight: 1.3
  transcript-current:
    fontFamily: Noto Sans HK
    fontSize: 23px
    fontWeight: 600
    lineHeight: 1.55
  transcript-line:
    fontFamily: Noto Sans HK
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.6
  word-card:
    fontFamily: Noto Sans HK
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.4
  jyutping:
    fontFamily: Axiforma
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
  md: 12px
  lg: 16px
  xl: 24px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 10px 18px
  button-secondary:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 10px 16px
  chip:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
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
    rounded: "{rounded.lg}"
    padding: 16px
  tab-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    padding: 4px 12px
  phrase-highlight:
    backgroundColor: "{colors.mint-soft}"
    textColor: "{colors.on-surface}"
    rounded: 6px
  feedback-bubble:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: 12px 16px
  blue-band:
    backgroundColor: "{colors.band-blue}"
    textColor: "{colors.on-primary}"
    typography: "{typography.headline-lg}"
    padding: 48px 24px
  nav-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 8px 8px 8px 16px
---

# Speak

Reskin preset for Canto, based on speak.com (captured 2026-10-10) and Speak's own blog imagery in `assets/blog/`, which shows the app. Token names match Canto's `DESIGN.md` one for one. Values come from `palette.json` (computed CSS and CSS custom properties) or were sampled from the screenshots and blog images. Values marked *derived* below have no direct source.

## Overview

Speak looks like a confident tech product, not a game: one electric blue, one geometric sans with tight tracking, a white canvas, and product UI and filmed people where other brands use illustration. The voice is calm and adult ("Real conversation. No pressure.", "Repeat it until you feel confident"), and its makers talk about giving learners "room to think". There is no mascot on the website. In the app, a small glossy blue blob with two eyes shows that the AI tutor is present. On Canto the skin should feel crisp, focused and quietly technical, with blue for the one thing happening now.

## Colors

Essentially one colour, plus navy text and feedback accents.

- **Electric blue (`primary` #1C49FF, CSS `--slate-blue`):** logo mark, every CTA, the blue footer card, the in-app progress bar and the **words being spoken** in the app's phrase cards ("Dos **tacos** de **carne asada**"). White on it is 6.09:1.
- **Blue tint (`primary-soft` #E8EDFF, derived):** the brand blue at 10% on white, used for the selected-word fill. Speak's own app canvas is the faintly blue #F5F8FE (`app-canvas`), and this tint continues that.
- **Navy (`on-surface`, `tertiary` #12205A, CSS `--dark-blue`):** headlines, body and FAQ text. Text is never black.
- **Two-tone greys:** Speak fades the end of a headline from navy through #677095 to #CED1DD ("Three steps **to spoken fluency**"). Here #677095 is `on-surface-muted` (4.85:1 on white) and #CED1DD is `on-surface-faint`. The site's subtitle grey #8990AD is kept as `ink-soft` but is only 3.15:1, so it is not used for UI text.
- **Surfaces:** `background`/`surface` white, `surface-muted` #F5F5F5 (section canvas, the "English" nav pill), `card-grey` #F8F8F8 (FAQ panel), and `border` #E1E1E1 (FAQ hairlines, nav-pill edge).
- **Mint (`secondary` #29C195, CSS `--medium-aquamarine`):** correct answers, "Perfect Line", "Well done, that was perfect!", and the highlighted phrase whose pale fill is `mint-soft` #D2F0E7.
- **Orange (`warning` #FF8400, `streak-orange` #FF9900):** streak checks, the selected goal border and "2x more" in the app. Only feedback and reward use orange; the brand never does.
- **Tomato (`error` #FF4242, CSS `--tomato`):** corrections. **Gold #F9CB78** (CSS `--glod`): rating stars. **Lime #C4F06E:** Learn / Practice / Apply speech-bubble tags on blog headers.
- **Blues for bands:** `band-blue` #3748F7 (the full-bleed "start speaking them" band), `deep-blue` #013BC5 (darker swooshes on the Live Tutor header), `waveform-navy` #021F59 (the waveform pill on blog art), and `hover-blue` #6A88FF (CSS `--hover`).
- **Dark mode (derived):** Speak's site has no dark mode, but its dark moments are blue and navy (bands, the footer card, navy waveform pills), never grey. The dark set therefore uses the real navy #12205A as the canvas with white text, as on the blue bands. `dark-primary` is the real hover blue #6A88FF (4.77:1 on navy), with navy text on it. Muted surfaces and greys mix white into navy at 8/15/35/70%. `dark-warning` is the real streak orange. `dark-primary-soft` #1E2F71 and `dark-error` #FF6B6B are derived.

## Typography

- **Everything is Axiforma**, a geometric sans. The h1 is 56px/600 with **−0.04em tracking** (`headline-lg`), sentence case. Panel titles are 18px/600 at −0.02em. Body is 400, and button labels are 600 with −0.36px tracking at 16px (−0.02em here). Small section labels ("THE SPEAK METHOD", "LEARN") are the brand's one use of uppercase, at 500 weight.
- **CJK:** Speak uses **Pretendard** for Korean and Japanese, a sans whose Hangul and kana derive from Source Han Sans, and runs a 繁體中文 (港) site. The matching Traditional Chinese (Hong Kong) face from the same Source Han family is **Noto Sans HK**, so the Cantonese transcript stays in Noto Sans HK. The current line is **600** (Speak's phrase cards and headlines are semibold), 23px with slightly tighter leading (1.55). Other lines are 17px/400 and the word card 22px/600. **Jyutping** is Axiforma 11px/500, set in the same geometric face as the UI.
- Speak's read-along pattern sets **spoken words in blue and the rest in grey** inside one line. Canto's current line can do the same: words already spoken in `primary`, the rest in `on-surface`.

## Layout

Wide white canvas, a floating white **pill nav bar** with a soft shadow, and content in very large rounded white section cards (about 40px radius) containing grey media panels (about 24px). Full-bleed blue bands break the page. Spacing follows an 8px grid with lots of air around headlines. For Canto's side panel, keep Canto's 4/8/12/16/24 scale. Speak's density is close to Canto's, and the brand's spaciousness comes from type size and colour, not extra padding.

## Elevation & Depth

Mostly flat colour, with soft, wide, low-contrast shadows on floating things: the pill nav bar, the big section cards, and the stacked phrase cards and chat bubbles in the product mockups. Buttons are always flat (no shadow, no border). Dark depth comes from blue (band, footer card) rather than grey.

## Shapes

Full pills for every button and the nav (`border-radius: 128px`, 62px tall on the site; `full`). Content uses large, smooth radii: about 24px for filmed-tutor and media cards and the footer card (`lg`), about 40px for the outer section cards, 16px for in-app buttons and inputs (`md`), and small 6–8px corners on chat bubbles and phrase highlights (`sm`). The logo, four rounded vertical bars like a voice waveform, is the brand's only graphic.

## Components

- **Primary button:** flat electric-blue pill, white 600 label, often with a trailing arrow ("Get Started →").
- **Secondary button:** light-grey pill (#F5F5F5) with navy label and a hairline edge (the "English ▾" language selector).
- **Chip:** grey pill with navy text.
- **Word selected:** blue tint with blue text, 6px radius, matching the blue spoken words in the app.
- **Phrase highlight (`phrase-highlight`):** pale mint fill behind a key phrase ("do you know where"). Speak sets the text in mint #29C195. This preset uses navy for contrast (see below).
- **Feedback bubble:** white card, small radius, soft shadow, a coloured status line above the text: mint check + "Perfect Line", or blue hand + "Could be improved".
- **Card:** grey media panel, 24px radius. **Sheet:** white, 24px top corners, soft shadow (the app's "Listening…" control dock).
- **Tabs:** the active tab is a blue pill. In the app, "Course / Practice" uses navy vs grey text with a blue progress underline.
- **Blue band:** full-bleed #3748F7 with white 56px Axiforma, used once per page. **Nav bar:** floating white pill with logo left and CTA right.

## Do's and Don'ts

- Do give blue exactly one job per view (the current word or the main action), as Speak does.
- Do use navy #12205A for text, never pure black, and use tight negative tracking on Axiforma headings.
- Do use the two-tone fade (navy → #677095 → #CED1DD) for headings and for spoken / not-yet-spoken words.
- Don't use the site's subtitle grey #8990AD for UI text: 3.15:1 on white (2.89:1 on #F5F5F5). `on-surface-muted` uses Speak's darker real grey #677095 instead.
- Don't set mint #29C195 text on white or mint-soft: 2.29:1. Speak does it on phrase cards, but for a reading app keep mint for icons, checks and fills.
- Don't rely on small text in tomato #FF4242 (3.44:1) or orange #FF8400 (2.46:1). Pair them with an icon, or use them for underlines and dots, not body text.
- Don't add illustrated characters or gradients beyond the in-app tutor blob's soft gloss.

## Illustration & Imagery

Speak has **no illustration**. Its visual language is:

1. **Filmed human tutors:** friendly professional actors (cast "not as a school-teacher") seated at a white table against a seamless light-grey backdrop, looking into camera, soft even studio light, mid-gesture. They play in tall rounded cards with a phrase title above ("I'm feeling tired", "Making reservations").
2. **Real lifestyle photography** with product UI layered on top: friends round a café table behind a stack of white phrase cards, a man speaking into a phone with a blue waveform pill over the frame.
3. **Product UI as illustration:** white phrase cards, chat bubbles and a blue bar chart of phrases per day, on grey panels.
4. **Blue brand art** for blog headers: flat electric-blue fields with darker blue swooshes, white Axiforma, lime speech-bubble tags, and a navy waveform pill.

In the app, a small glossy blue blob with two white oval eyes represents the AI tutor. It works as a presence indicator, not a storyteller. 3D emoji (flame, taco) mark reward moments.

**Style DNA (paste into an image model):**
> Clean, contemporary product-marketing image for an AI speaking coach. A real person in their twenties or thirties, friendly and professional, seated at a plain white table against a seamless light-grey #F5F5F5 backdrop, soft even studio lighting, looking into the camera mid-sentence, natural skin tones, casual smart clothing. Optionally a single crisp white rounded UI card floats in front with one short phrase where the key words are electric blue #1C49FF and the rest navy #12205A, or a white pill containing a simple vertical-bar voice waveform in #1C49FF. Palette limited to white, light grey, navy #12205A and electric blue #1C49FF, with mint #29C195 only as a small check mark. No illustration, no cartoon characters, no gradients except a soft blue field, no clutter, generous negative space.

For Cantonese, brief Hong Kong tutors and settings (a cha chaan teng booth, a tram window) in the same studio-clean treatment, with Traditional Chinese characters inside the UI card rather than in the scene.

## Reskinning Canto

- **Jade becomes electric blue and ink becomes navy.** Every grey shifts to Speak's blue-tinted greys. Check that the dark set (navy canvas, hover-blue accent) still reads as calm and not as a bright "tech" panel next to a video.
- **The current line gets heavier.** Noto Sans HK 600 at 23px is noticeably bolder than Canto's 500. If it competes with the video, drop to 500 and let blue do the emphasis.
- **Use the two-tone line.** Speak's signature read-along cue is spoken words in blue and upcoming words in navy or grey. This fits Canto's transcript directly but needs word-level timing; without it, colour the whole current line.
- **Contrast watch-points:** `warning` (#FF8400) and `error` (#FF4242) are real Speak colours that fail AA as small text, and the dark selected word (#6A88FF on #1E2F71, 3.76:1) only passes at large sizes. Use underlines, icons or bold weight with them.
