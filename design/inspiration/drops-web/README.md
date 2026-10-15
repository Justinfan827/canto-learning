# Drops (web): purple field, lime type, a cast of one-colour pictograms

Marketing site [languagedrops.com](https://languagedrops.com/) captured on 2026-10-10 in Chromium at 1440×900 @2x, plus public brand material. Reference captures only: the illustrations, logo and fonts belong to Drops (PlanB Labs OÜ, a Kahoot! company). For the iPhone app, see [`../drops`](../drops).

## What's here

| Path | Contents |
|---|---|
| `01-home-hero-grammar.png` … `07-home-premium-footer.png` | Homepage, one viewport per screen (scrolled 900 px at a time), resized to 1440×900 |
| `assets/svg/` | Original SVGs served by the site (premium icons, award badge, rating stars) |
| `assets/png/` | Original PNG illustrations (hero teacher, learner character scenes, flag drops, golden drop, logo) plus browser renders of every SVG |
| `assets/blog/` | 2017 Behance identity case study (logo construction, colour-coded topic cards, Montserrat + Mouse Memoirs, illustration set), the official brand-assets style guide and app icon, the 2021 redesign post, and the Open Graph pictogram pattern |
| `palette.json`, `assets/palette-board.png` | Colour roles, type and button tokens from the live CSS |

## Brand analysis

### Drops: one saturated field per mode, lime on purple, and pictures instead of words
- **Mascot / characters:** there is no mascot, and the brand-assets page, about page and blog never mention one. The marketing site does use a **recurring generic learner**: a brown-haired young man in a white T-shirt. He appears as a teacher at a chalkboard (`hero-teacher-grammar`), flying through word bubbles (`games-flying-learner`), lifting a dumbbell inside a speech bubble (`conversation-dumbbell`), flying as a superhero with flag badges (`confidence-superhero`), as a lab-coat scientist (`method-scientist`), and running across floating tiles (`practice-running-tiles`). He acts out each benefit but never speaks, and he has no name. Inside the app the pictures are wordless one-colour pictograms; the site's colourful, shaded learner is a marketing-only layer.
- **Illustration style:** two systems.
  1. **Marketing scenes:** semi-flat vector with soft gradients and shading, a skin-tone, white and blue character, and purple/lilac props. Premium feature icons are greyscale 3D-ish line-art vignettes (`premium-*`).
  2. **Product pictograms:** single-colour lilac or white silhouettes on purple (`blog/languagedrops-opengraph-illustration-pattern.png`, `blog/languagedrops-blog-2021-redesign-announcement.png`). One picture per word means the picture carries the meaning, with no translation needed ("100% illustrated").

  The flag "drops" (`flag-drop-cantonese` with the Hong Kong bauhinia, `flag-drop-mandarin`) put every language inside the logo's drop shape, which turns the logo into a system.
- **Colour:** a dark-purple world. Page field `#712BB5`, nav `#261453`, deepest band `#29093D`, alternate sections in blue `#217AD1`. Lime `#DBE65B` is used for headings, outline buttons and the logo; the filled CTA is `#DAEB3F`, and the PREMIUM pill is pure `#FFFF00`. CSS custom properties expose a wider mode palette: turquoise `#0AB1B4`, banana `#F7CC51`, tangerine, magenta, water. These are the per-mode colours seen in the app (orange new words, teal matching). History: the 2017 identity was a blue gradient drop with a different blurred gradient per task type (`blog/behance-drops-2017-topic-cards-color-coding.png`). The 2021 makeover moved it to purple + lime.
- **Shape and type:** **TT Norms Pro** everywhere, a geometric sans. Headlines are 38px/800 with +0.5px tracking, in sentence case. Buttons are full pills (`border-radius: 100px`, 66px tall, no shadow or "lip") with a lime fill and night-purple label. The primary CTA is written in capitals in the copy ("GET STARTED"), while nav buttons use title case and a 2px lime outline. The logo replaces the O of DROPS with a drop. In 2017 the system was Montserrat for content and Mouse Memoirs for the learning screens.
- **Voice:** short, cheerful and benefit-first ("Language learning made easy", "Learn a Language with Fun Games", "Seen in Some Seriously Cool Spots…"). There are puns on the brand name in blog titles ("Exciting New Updates Have Drops-ed"). Mission: "improving lives through language". The page is heavy on social proof: an awards row, press logos, "4.8 out of 5, 300,000+ reviews".
- **Habit and reward (as marketed):** "5 minutes a day", streaks and reminders. Premium is a golden drop (`golden-drop-premium`).
- **Chinese / Cantonese specifics:** Cantonese is a first-class language in the nav ("Learn Cantonese") with its own Hong Kong flag drop. No Jyutping is shown on the website itself.

### Suggested slide order
1. `01-home-hero-grammar.png`: purple field, lime headline, the learner as teacher
2. `assets/blog/languagedrops-opengraph-illustration-pattern.png`: the real product language, one-colour word pictograms
3. `assets/blog/behance-drops-2017-logo-drop-speech-bubble.png` → `assets/png/flag-drop-cantonese.png`: drop + speech-bubble mark becomes a container for every language
4. `03-home-games-conversations.png` and `04-home-practice-anywhere.png`: purple/blue section rhythm, the learner acting out benefits
5. `assets/blog/behance-drops-2017-topic-cards-color-coding.png`: colour = mode (2017) vs. today's purple + lime
6. `assets/palette-board.png`: tokens: lime pill CTA, TT Norms Pro 800
7. `06-home-method-premium.png` + `assets/png/golden-drop-premium.png`: premium as gold
