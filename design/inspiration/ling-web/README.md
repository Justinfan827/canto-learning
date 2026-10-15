# Ling (web): a monkey, a globe and a world built from circles and squares

Marketing site [ling-app.com](https://ling-app.com/) captured on 2026-10-10 in Chromium at 1440×900 @2x, plus Ling's public brand guidelines and media kit. Reference captures only: Ling, Gaia, the logo and illustrations belong to Simya Solutions. For the iPhone app, see [`../ling`](../ling).

## What's here

| Path | Contents |
|---|---|
| `01-home-hero-monkey-phone.png` … `11-home-footer-links.png` | Homepage, one viewport per screen, resized to 1440×900 |
| `assets/svg/` | Original SVGs: logo lockups, hero (Ling + Gaia + phone), island world map, footer hill scene, learning-path cards, speech-bubble flags and emoji, floating feature icons, cloud border, flags (HK, CN, TW) |
| `assets/png/` | Browser renders of each SVG at 2x |
| `assets/blog/` | Pages from the official [branding guidelines](https://ling-app.com/branding/) (logo lockup and don'ts, default and "dynamic" app icon, illustration shape rules with do/don't) and the media-kit page introducing Ling and Gaia |
| `palette.json`, `assets/palette-board.png` | Colour roles, type and button tokens |

## Brand analysis

### Ling: a character duo in a flat, geometric, warm world
- **Mascot / characters:**
  - **Ling** (he/him) is a brown monkey in a black cap with an orange brim. The name is Thai ลิง "ling" = monkey, and the media kit also ties it to *lingua franca*. His listed traits are "curious, eager to learn, loyal".
  - **Gaia** (she/her) is a blue Earth-globe sidekick who "pushes Ling never to give up".

  On the site they *do* things. In the hero (`hero-monkey-gaia-phone`) Ling swings around a phone while Gaia cheers, surrounded by greetings in Thai, Tagalog and Russian. In the footer scene (`footer-hill-monkey-flag`) Ling plants a "Ling" flag on a hill while Gaia slides down a river with flags. Ling's head is also the logo. The app icon has "dynamic" language variants, with a flag on his cap, and "campaign" variants with seasonal backgrounds (`blog/ling-branding-app-icon-dynamic-language.png`). The points currency is bananas.
- **Illustration style:** strictly **flat, geometric, no outlines**. The guidelines say illustrations are built from circles, rectangles and squares only, with **10–20 shapes each**. Shading is subtle, warm colours signal friendliness and cool colours calm (`blog/ling-branding-illustration-dos.png` vs `…-donts.png`). The site applies this to the island map (`island-world-map`), green hills, a dinosaur and flag tiles. Speech-bubble flags with emoji faces (`bubble-flag-hongkong`, `bubble-emoji-love`) are the recurring "connection" motif, and a scalloped cloud border (`cloud-border`) frames sections.
- **Colour:** core brand **orange `#FF9900`**: every CTA, the cap brim, chat bubbles. The hero field is butter yellow `#FFEDBD` with sun-yellow clouds `#FFD970`. A bright **bluish-cyan band `#009DFF`** ("See Ling in Action") is Gaia's colour. Footer and sections use pale sky `#EAF3FC`. Text is slate (`#3D505C` headings, `#5C788A` body) rather than black. The guidelines define ten illustration ramps of 15 steps each (brand orange, bluish cyan, green `#26D968`, red, yellow, purple `#913BDD`, pastel magenta, sherbet, salmon, cyan-blue neutrals).
- **Shape and type:** **Poppins** for display (h1 48px/700, normal tracking, sentence case) and **Noto Sans** for body, chosen because it covers other scripts. Buttons are **rounded rectangles, not pills**: 16px radius, 53px tall, flat orange, white bold label, no shadow. Language rows are white cards with a flag and a chevron. The logo has Ling's head aligned to the baseline of the black "Ling" wordmark.
- **Voice:** reassuring and underdog-friendly: "The easy path to hard languages", "Go From I Don't Know Where to Start to Real Conversations", "Languages Others Overlook", "Real Native Speakers, Not Robots". There is a mission strand about endangered languages ("Endangered & Lesser-Known Languages Deserve Representation"). Users are "Lingers".
- **Habit and reward (as marketed):** "Learning That Feels Like Playing": bite-sized games, instant rewards, streaks, achievements. A winding dashed learning path of tilted flashcards (`learning-path-cards`) echoes Duolingo's path.
- **Chinese / Cantonese specifics:** Cantonese, Chinese Traditional, Chinese Simplified and Taiwanese Hokkien are listed separately under East Asia, each with its own flag (`flag-hongkong`, `flag-taiwan`, `flag-china`). No Jyutping appears on the marketing site.

### Suggested slide order
1. `01-home-hero-monkey-phone.png`: Ling + Gaia, warm yellow field, orange CTA
2. `assets/blog/ling-mediakit-characters-ling-and-gaia.png`: who the characters are and why
3. `assets/blog/ling-branding-illustration-shape-construction-dos.png` → `…-dos.png` → `…-donts.png`: the 10–20 primitive-shape rule
4. `assets/png/island-world-map.png` and `assets/png/footer-hill-monkey-flag.png`: the rule applied to scenes
5. `assets/blog/ling-branding-app-icon-dynamic-language.png`: mascot as a per-language system
6. `06-home-explore-languages.png`: Asia-first language list (Cantonese, Hokkien)
7. `assets/palette-board.png`: orange `#FF9900`, Poppins + Noto Sans, 16px-radius buttons
