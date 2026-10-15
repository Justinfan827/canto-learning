---
version: alpha
name: Canto
description: Calm, minimal Cantonese read-along. Jade on white, Noto Sans HK, Jyutping above the current line.
colors:
  primary: "#0B7A5C"
  on-primary: "#FFFFFF"
  primary-soft: "#E2F2EC"
  secondary: "#B45309"
  tertiary: "#17201C"
  warning: "#B45309"
  warning-soft: "#FDF1DF"
  error: "#B42318"
  background: "#FFFFFF"
  surface: "#FFFFFF"
  surface-muted: "#F3F5F4"
  on-surface: "#17201C"
  on-surface-muted: "#7B8682"
  on-surface-faint: "#B5BDB9"
  border: "#E8ECEA"
  dark-primary: "#4CC29B"
  dark-on-primary: "#0F1412"
  dark-primary-soft: "#173229"
  dark-warning: "#F0A64A"
  dark-warning-soft: "#33240F"
  dark-error: "#F0796D"
  dark-background: "#1A1F1D"
  dark-surface: "#1A1F1D"
  dark-surface-muted: "#232927"
  dark-on-surface: "#EEF2EF"
  dark-on-surface-muted: "#8F9A96"
  dark-on-surface-faint: "#55605B"
  dark-border: "#2C3330"
typography:
  headline-md:
    fontFamily: system-ui
    fontSize: 17px
    fontWeight: 600
    lineHeight: 1.3
  body-md:
    fontFamily: system-ui
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
  body-sm:
    fontFamily: system-ui
    fontSize: 12.5px
    fontWeight: 400
    lineHeight: 1.4
  label-md:
    fontFamily: system-ui
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1
  label-sm:
    fontFamily: system-ui
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
    fontSize: 21px
    fontWeight: 500
    lineHeight: 1.4
  jyutping:
    fontFamily: system-ui
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1
rounded:
  sm: 6px
  md: 10px
  lg: 14px
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
    padding: 8px 14px
  button-secondary:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.background}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 8px 12px
  chip:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: 3px 9px
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
    rounded: 16px
    padding: 16px
  tab-active:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.background}"
    rounded: "{rounded.full}"
    padding: 4px 10px
---

# Canto

This is Canto's current look, and the template for every brand file in `design/inspiration/*/DESIGN.md`. All brand files use **these exact token names**, so any of them can reskin Canto with `pnpm design:reskin <brand>` (see `design/themes/README.md`).

## Overview

Canto is a read-along companion for Cantonese videos: the transcript scrolls beside the video, the current line is large, and Jyutping sits above every character. The UI should feel **calm, quiet and adult**, like good reading software, so that attention stays on the language. Character comes from typography and a single jade accent, not from illustration. There is no mascot today.

## Colors

One accent, many neutrals.

- **Jade (`primary` #0B7A5C):** the only brand colour. Primary actions, the selected word, progress, focus rings. In dark mode it lifts to a lighter jade (#4CC29B) for contrast.
- **Jade mist (`primary-soft`):** the background of a selected word and soft highlights.
- **Amber (`warning`, `secondary`):** saved words (dotted underline), "needs setup" hints, progress while transcribing.
- **Brick (`error`):** inline errors only.
- **Ink and paper (`on-surface`, `background`):** near-black green-tinted ink on white; `surface-muted` (#F3F5F4) for cards, pills and segmented controls; `border` for hairlines.
- Every colour has a `dark-` twin used under `prefers-color-scheme: dark`.

## Typography

- **UI:** the system font (`system-ui`) at 14px, so the chrome disappears.
- **Chinese:** Noto Sans HK (falling back to PingFang HK and Microsoft JhengHei) for every Cantonese character, so traditional Hong Kong glyph forms are used.
- **Transcript:** the current line is set large (`transcript-current`, 23px, user-scalable to 19 or 28px); other lines are 17px. Jyutping (`jyutping`) sits small above each character.
- Weights stay between 400 and 600. No all-caps.

## Layout

A single narrow column (a browser side panel), 12–18px side padding, 14px between transcript lines, and a docked control area at the bottom. Spacing follows a 4px base with 8, 12, 16 and 24px steps.

## Elevation & Depth

Mostly flat. Hierarchy comes from tonal surfaces (`surface-muted` cards on white) and hairline borders. Shadows only on floating layers: popovers and the bottom sheet use a soft two-layer shadow (`0 1px 2px` + `0 12px 32px -12px`, ink at 6–18%).

## Shapes

Soft but not bubbly: 6px for small controls, 10px for inputs and inline messages, 14px for cards, 16px top corners on the bottom sheet. Pills (`full`) for primary actions, tabs, chips and the source link.

## Components

- **Primary button:** jade pill, white 13px semibold label, sentence case.
- **Secondary button (Save):** ink pill with white label.
- **Chips / pills:** muted surface, muted text, 12px.
- **Word chip:** words in the transcript are tappable; selected gets jade-mist fill + jade underline, saved words get an amber dotted underline.
- **Card ("moment"):** muted surface, 14px radius, 14px padding.
- **Bottom sheet:** white, 16px top radius, grab handle, soft upward shadow.
- **Tabs:** text buttons; the active tab is an ink pill.

## Do's and Don'ts

- Do keep jade as the only saturated colour on screen; amber only for saved/attention.
- Do set every Chinese character in Noto Sans HK, with Jyutping above, never below.
- Don't add decoration inside the transcript; it must stay readable mid-video.
- Don't use shadows on in-flow content, only on floating layers.
- Don't use all-caps or more than two font weights per view.
