---
version: alpha
name: Duolingo
description: Loud, playful, game-like. Owl green on white (charcoal in the app's dark mode), heavy rounded type, ALL-CAPS labels and chunky buttons with a solid 4px lip.
colors:
  primary: "#58CC02"
  on-primary: "#FFFFFF"
  primary-soft: "#D7FFB8"
  secondary: "#1CB0F6"
  tertiary: "#CE82FF"
  warning: "#FF9600"
  warning-soft: "#FFF4E5"
  error: "#FF4B4B"
  background: "#FFFFFF"
  surface: "#FFFFFF"
  surface-muted: "#F7F7F7"
  on-surface: "#4B4B4B"
  on-surface-muted: "#777777"
  on-surface-faint: "#AFAFAF"
  border: "#E5E5E5"
  dark-primary: "#8ACD2D"
  dark-on-primary: "#131D21"
  dark-primary-soft: "#253723"
  dark-warning: "#FFA12D"
  dark-warning-soft: "#363123"
  dark-error: "#EC4B4B"
  dark-background: "#131D21"
  dark-surface: "#131D21"
  dark-surface-muted: "#1E2A30"
  dark-on-surface: "#F0F5FC"
  dark-on-surface-muted: "#D8E2EA"
  dark-on-surface-faint: "#485A63"
  dark-border: "#313D46"
  primary-lip: "#58A700"
  secondary-lip: "#1899D6"
  error-lip: "#EA2B2B"
  error-soft: "#FFDFE0"
  selected-soft: "#DDF4FF"
  selected-border: "#84D8FF"
  reward-gold: "#FFC800"
  streak-orange: "#FF9600"
  super-navy: "#000437"
  super-violet: "#3F22EC"
  ink: "#3C3C3C"
  dark-primary-lip: "#6EB02E"
  dark-secondary: "#3FB8F7"
  dark-secondary-lip: "#198ED0"
  dark-error-lip: "#D23F3F"
  dark-tertiary: "#C374FB"
  dark-selected-border: "#367A9D"
  dark-locked: "#627883"
typography:
  display-lg:
    fontFamily: feather
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
  headline-md:
    fontFamily: duolingo-sans
    fontSize: 19px
    fontWeight: 700
    lineHeight: 1.3
  body-md:
    fontFamily: duolingo-sans
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.45
  body-sm:
    fontFamily: duolingo-sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
  label-md:
    fontFamily: duolingo-sans
    fontSize: 15px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.8px
  label-sm:
    fontFamily: duolingo-sans
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0.8px
  transcript-current:
    fontFamily: Noto Sans HK
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.6
  transcript-line:
    fontFamily: Noto Sans HK
    fontSize: 17px
    fontWeight: 500
    lineHeight: 1.6
  word-card:
    fontFamily: Noto Sans HK
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.4
  jyutping:
    fontFamily: duolingo-sans
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1
rounded:
  sm: 8px
  md: 12px
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
    rounded: "{rounded.md}"
    padding: 0 16px
    height: 50px
  button-primary-lip:
    backgroundColor: "{colors.primary-lip}"
    rounded: "{rounded.md}"
    height: 4px
  button-primary-pressed:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 0 16px
    height: 50px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 0 16px
    height: 50px
  button-secondary-lip:
    backgroundColor: "{colors.border}"
    rounded: "{rounded.md}"
    height: 2px
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 6px 12px
  word-selected:
    backgroundColor: "{colors.selected-soft}"
    textColor: "{colors.secondary-lip}"
    rounded: "{rounded.sm}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 16px
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: 0px
    padding: 16px
  tab-active:
    backgroundColor: "{colors.selected-soft}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.md}"
    padding: 4px 10px
  feedback-correct:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-lip}"
    typography: "{typography.headline-md}"
    rounded: 0px
    padding: 16px
  feedback-incorrect:
    backgroundColor: "{colors.error-soft}"
    textColor: "{colors.error-lip}"
    typography: "{typography.headline-md}"
    rounded: 0px
    padding: 16px
  progress-bar:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.full}"
    height: 16px
  progress-track:
    backgroundColor: "{colors.border}"
    rounded: "{rounded.full}"
    height: 16px
  streak-badge:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.streak-orange}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  pinyin-hint:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.tertiary}"
    typography: "{typography.jyutping}"
---

# Duolingo

A reskin preset for Canto built from Duolingo's live web CSS (duolingo.com, captured 2026-10-10, see `palette.json`) and the iPhone app screens in `../duolingo/` (the app was captured in its dark charcoal theme, which supplies every `dark-*` token). Token names follow Canto's `DESIGN.md` exactly so `pnpm design:reskin duolingo` can swap them in.

## Overview

Duolingo looks like a game, on purpose. One loud green owl, a recurring cast of flat cartoon characters, chunky buttons that look like physical keys, heavy rounded type and constant reward colour (gold XP, an orange streak flame, red hearts). The product UI is itself the toy: the website's illustrations show characters riding lesson cards and leaping between streak cards. Every screen is a single clear task with one big button at the bottom. The tone is upbeat and a little cheeky ("A streak is born!", "Protect your 1 day streak"), carried by Duo, who appears on nearly every screen and speaks from a speech bubble.

## Colors

Duolingo's CSS has about 60 tokens, each named after an animal, with strict roles. The values here are the CSS names in brackets.

- **Owl green (`primary` #58CC02, owl):** the brand, the logo and every primary action. The darker **tree-frog (`primary-lip` #58A700)** is the 4px solid bottom edge of green buttons. In the app's dark theme the button green is lighter and yellower, sampled at #8ACD2D with a #6EB02E lip.
- **Macaw blue (`secondary` #1CB0F6):** secondary actions and links ("I ALREADY HAVE AN ACCOUNT"), the speaker button and the *selected* state. A selected answer is blue (iguana #DDF4FF fill, blue-jay #84D8FF border). Green is kept for *correct*. Whale #1899D6 is its lip.
- **Beetle purple (`tertiary` #CE82FF):** pinyin above characters, "NEW WORD" tags and the dotted hint underline in the Chinese course. Sampled in dark mode at #C374FB.
- **Bee gold and fox orange (`reward-gold` #FFC800, `streak-orange`/`warning` #FF9600):** XP, coins, combos and the streak flame. They are reward colours, never error colours. Canto's amber role (saved words, attention) maps to fox.
- **Cardinal red (`error` #FF4B4B):** wrong answers and hearts, with fire-ant #EA2B2B as the button lip.
- **Neutrals:** text is eel #4B4B4B, never black. Secondary text is wolf #777777 and disabled text is hare #AFAFAF. Borders are swan #E5E5E5 and the muted surface is polar #F7F7F7 on snow white.
- **Dark theme (sampled from the iPhone captures):** background #131D21 (a blue-green charcoal, not grey), raised sheets and selected cards #1E2A30, hairlines and empty progress tracks #313D46. Text is #F0F5FC, body copy #D8E2EA, inactive labels #485A63, locked path icons #627883.
- **Super/Max:** the paid tier lives in its own colour world: eclipse navy #000437 with a beetle → nebula #3F22EC → quasar gradient. Don't use it in the free UI.
- **Inferred values:** `primary-soft` #D7FFB8 and `error-soft` #FFDFE0 are the light green and pink correct/incorrect sheet fills from Duolingo's light theme. They are not in the captured CSS token list. `warning-soft`, `dark-primary-soft` (#8ACD2D at 15% over the charcoal) and `dark-warning-soft` are derived, because Duolingo has no soft amber or dark green-tint surface.

## Typography

- **Display: Feather Bold (`feather`)**, a custom, very heavy, rounded face. The website sets it at 48–64px, always **lowercase** ("free. fun. effective."). It is used only for marketing headlines.
- **UI: duolingo-sans** (DIN Next Rounded lineage), 400 and 700. Headings in the app ("Select the correct image") are 700. Button and tag labels are 700, **ALL CAPS**, with 0.8px tracking (`label-md`, `label-sm`). Body copy is regular weight in plain short sentences. On the web the CSS falls back to PingFang SC for Chinese.
- **Cantonese read-along:** Duolingo has no rounded Traditional Chinese face, so in its Chinese course the hanzi come from the system CJK font, set heavy in prompts. For Canto, `transcript-current` and `word-card` use **Noto Sans HK at 700** (and `transcript-line` at 500), which keeps Hong Kong glyph forms and matches the weight of duolingo-sans Bold beside it. The current line is slightly larger than Canto's (24px) to suit the brand's big, confident text. jf open Huninn would be a rounded alternative, but it uses Taiwanese glyph forms, so it is not the default.
- **Romanisation** sits small and regular above the characters, as pinyin does in Duolingo's word tiles. The brand's own colour for it is beetle purple (`pinyin-hint`).

## Layout

The app is a single column. Each exercise has a bold instruction, the prompt (often a character in a speech bubble), answer tiles in a grid or word bank, then a full-width 50px button docked at the bottom with 16px side margins. A progress bar runs across the top with the settings cog. The website alternates one claim and one illustration per screen, with lots of white space. Spacing is generous and works on 4/8/12/16/24px steps. Tap targets are big (tiles around 130px tall, buttons 50px).

## Elevation & Depth

Depth is solid and offset, never blurred. Buttons, answer tiles, word tiles, speaker buttons and the round lesson nodes on the path all sit on a **hard bottom edge**: `box-shadow: 0 4px 0` in a darker shade of the fill for coloured buttons, or `0 2px 0` swan with a 2px swan border for white controls. Pressing moves the element down by its lip, so it reads like a physical key. The lip *is* the brand's elevation system. There are no soft drop shadows. Feedback sheets slide up from the bottom as flat colour slabs.

## Shapes

Rounded rectangles, not pills: 12px on buttons (from the live CSS), about 16px on answer cards and course cards, about 8px on small word tiles and badges. Lesson nodes on the home path are circles with a lip, which makes them look like coins or pucks. Progress bars are full pills. Feedback sheets are full-bleed with square corners. The characters use the same vocabulary: circles, pills and rounded rectangles.

## Components

- **Primary button** (`button-primary` + `button-primary-lip`): owl fill, white 15px bold ALL-CAPS label with 0.8px tracking, 12px radius, 50px tall, with a 4px tree-frog lip drawn as `box-shadow: 0 4px 0 #58A700` (no blur, no spread). `button-primary-lip` is that lip as a token: its background colour is the shadow colour. **Pressed** (`button-primary-pressed`): translate down 4px and drop the shadow. In the dark app the label colour is the charcoal background (#131D21), not white.
- **Secondary button:** white with a 2px swan border, a 2px swan lip and a macaw ALL-CAPS label.
- **Feedback buttons:** after Check, the button recolours to match the result. It turns green on a correct answer, and cardinal with a fire-ant lip on a wrong one (`GOT IT`).
- **Feedback sheet** (`feedback-correct`, `feedback-incorrect`): a full-width slab from the bottom with an icon and "Correct!" / "Incorrect" in bold. It is green-tinted or pink-tinted in light mode and #1E2A30 in dark mode, where only the text and button carry the colour.
- **Word tile / chip:** white tile, 2px swan border and lip, 8–12px radius, with pinyin small above the hanzi. Selected options turn macaw: blue text, iguana fill and blue-jay border (`word-selected`). Tappable hint words get a dotted beetle underline.
- **Card:** answer cards and the unit header. Cards are bordered rather than filled, with a 16px radius. Unit headers are a solid owl slab with white text.
- **Tabs** (`tab-active`): the bottom bar uses colourful icons. The active one sits in a rounded square with a blue-jay outline and an iguana fill. Any text label in it uses eel, because the icon carries the colour.
- **Progress bar:** an owl pill on a swan (or #313D46) track with a lighter highlight stripe, and an ALL-CAPS "COMBO x1" label in green above it.
- **Stats bar:** flag, streak flame (fox), gems (macaw) and energy (pink), each an icon with a bold number.

## Do's and Don'ts

- Do give every pressable thing a solid lip in a darker shade of its fill, and collapse it on press.
- Do keep green for "go / correct", blue for "selected / secondary", gold and orange for rewards, and red only for mistakes and hearts.
- Do write labels in ALL CAPS with tracking, and headlines short and lowercase on marketing surfaces.
- Do use eel #4B4B4B for text, never pure black.
- Don't use soft blurred shadows or gradients in the free UI. Gradients belong to Super/Max.
- Don't put green on white text: owl #58CC02 as text on white is only 2.1:1. The real white-on-owl button label is also 2.1:1 (the linter flags it), and macaw-on-white secondary labels are 2.4:1. Duolingo gets away with this because labels are 15px bold caps on large, high-saturation buttons. Small text in Canto needs eel or the darker lips (tree-frog 3.0:1, whale 3.2:1) and still falls short of 4.5:1.
- Don't use fox #FF9600 for small text on white (2.2:1). Use it for icons, underlines and fills. The streak number is the one place the brand sets fox as text (the linter flags `streak-badge`), and only at a large, bold size.
- Don't rely on the brand's tinted pairs for small text. These are real Duolingo pairings, kept as they are, and all fail WCAG AA: whale on iguana for a selected option is 2.8:1, tree-frog on sea-sponge in the correct sheet is 2.7:1, fire-ant on pink in the incorrect sheet is 3.5:1, and beetle pinyin on white is 2.5:1. They work in the app only as large bold text or alongside an icon.

## Illustration & Imagery

- **Mascot:** Duo the owl, a lime-green bean-shaped body with no neck, huge white eyes with large black pupils, a tiny orange beak and orange feet. He *acts* in every scene: waving, holding a pencil and clipboard, cheering next to the streak flame, peeking over dialogs. The logo is his silhouette.
- **Cast:** Lily (purple hair, deadpan), Zari (pink hijab), Eddy (headband), Bea, Vikram, Oscar, Lin, Junior and Lucy. Each one reads from silhouette and speaks the exercise sentences in a speech bubble.
- **Style:** flat vector built from circles, pills and rounded rectangles. There are no outlines and no gradients, only one darker shade per colour for form. Proportions are chunky with big heads and expressive faces. Scenes are tilted, isometric-ish slabs where characters ride or tumble out of the product's own UI (lesson cards, streak cards, coins, chests, gems). Backgrounds are plain white or a single colour field.
- **Style DNA prompt (paste into an image model):** "Flat vector illustration built only from circles, pills and rounded rectangles, no outlines, no gradients, no texture; each shape is a single flat colour with one slightly darker shade of the same hue for form and a short solid offset shadow directly beneath objects. Chunky, rounded, toy-like proportions: big heads, oversized eyes with large black pupils, tiny features, stubby tube limbs. Palette: lime green #58CC02 with darker green #58A700, sky blue #1CB0F6 with #1899D6, gold #FFC800, orange #FF9600, red #FF4B4B, lilac #CE82FF, warm skin tones, charcoal #4B4B4B for hair and details, on a plain white #FFFFFF or dark slate #131D21 background. Objects look like physical game pieces: coins, flames, gems, cards with thick rounded corners, all slightly tilted in a playful isometric view. Cheerful, energetic, a little mischievous; generous empty space around a single centred subject."

## Reskinning Canto

- **Contrast is the main risk.** `--jade` becomes owl #58CC02, which Canto also uses for link text, Jyutping in the word card and the selected-word text (owl on #D7FFB8 is 1.9:1). Expect those to look washed out in light mode. The dark theme (#8ACD2D on #131D21) reads much better and is the safer showcase.
- **Primary buttons turn white-on-green and stay pills.** Canto hard-codes `border-radius: 999px` and has no lip, so the reskin only reaches the radius tokens on other controls. To feel like Duolingo the primary button also needs the 4px tree-frog `box-shadow` and caps label, which the script does not apply.
- **Transcript readability:** the brand pull is toward heavy text, but keep the 700 weight to the current line only. Non-current lines at 500 and Noto Sans HK keep long Cantonese passages legible mid-video. Saved-word underlines become fox orange, which is fine as a 2px dotted line.
- The UI font becomes duolingo-sans, which is not publicly available. The stack falls back to system-ui, so the rounded feel mostly comes from the colours and radii.
