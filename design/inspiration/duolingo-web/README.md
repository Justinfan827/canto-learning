# Duolingo brand identity: web and design-team sources

Captured 2026-10-10 from duolingo.com (desktop, 1440×900) and Duolingo's design blog. This complements the iPhone captures in [`../duolingo`](../duolingo), which cover the app itself.

Duolingo's public brand guidelines (design.duolingo.com) have been retired: every page now redirects to the blog's Design hub. Colour and type values below come from duolingo.com's live CSS instead.

## What's here

| Folder | Contents |
|---|---|
| `01–10-home-*.png` | The duolingo.com homepage, section by section, top to bottom |
| `assets/svg/` | Original vector files from the homepage: logo, Super Duolingo wordmark, 7 scene illustrations |
| `assets/png/` | The same SVGs rendered to PNG, plus `hero-cast-and-duo.png` (the animated hero, captured from the page) |
| `assets/blog/` | Images from Duolingo's design blog: Duo poses, the Vikram character redesign, the 2026 core-tabs refresh |
| `assets/flags/` | Course flag and subject icons (rounded-rectangle flags) |
| `assets/palette-board.png`, `palette.json` | The colour tokens from the site CSS, grouped by role |

## Design themes

### 1. One mascot, one cast, one shape language
- **Duo the owl** is a simple bean-shaped body with huge eyes and a tiny beak, and he is the brand's emotional range. He's hopeful (`blog/duo-hopeful-cover.png`), unhinged (`blog/duo-widget-melting.png`, the widget that "melts" when you skip lessons), wholesome (`blog/duo-sprout-duologues.png`, a sprouting plant). The logo itself is a Duo silhouette, not a letterform (`svg/logo-wordmark.svg`).
- **The cast**: Lily (purple hair, deadpan), Zari (hijab), Eddy (headband, gym), Bea, Vikram, Oscar, Lin, Junior, Lucy. They appear together in the hero (`png/hero-cast-and-duo.png`), tumbling around Duo as one family. Each has one attitude you can read from the silhouette.
- **Shape language is explicit.** The Vikram redesign post (`blog/vikram-shape-language.png`, `vikram-turnaround.png`) shows characters are built from a few primitives: circle and pill heads, rounded-rectangle bodies, tube limbs. No outlines, no gradients on characters, flat colour with one darker shade for depth. The redesign also tells us the team audits characters for stereotypes; representation is a design value they write about publicly.

### 2. Illustrations are scenes of *play*, not of study
Every homepage section illustration is a game moment rendered as a tilted, isometric-ish slab: characters riding lesson cards like skateboards or hoverboards (`png/scene-personalized-learning.png`), Eddy leaping between streak cards (`png/scene-stay-motivated.png`), a phone turned into a podium with a #1 rope line (`png/scene-free-fun-effective.png`), a phone full of gold coins (hero). Props are always the product's own UI: progress bars, streak flames, gems, coins, chests. **The UI is the toy.**

### 3. A huge, named, animal palette
The site's CSS has ~60 colour tokens, every one named after an animal or object (`palette.json`). Roles are strict:
- **Owl `#58CC02` / tree-frog `#58A700`**: the brand and every primary action. Tree-frog is the button's darker bottom "lip".
- **Macaw `#1CB0F6`**: secondary actions and links ("I ALREADY HAVE AN ACCOUNT"), info states.
- **Bee `#FFC800`, fox `#FF9600`**: rewards and habit: XP, coins, streak flame.
- **Cardinal `#FF4B4B`**: wrong answers, hearts.
- **Beetle / sabrewing / quasar / nebula**: the purple-pink-blue gradient world of Super and Max (`07-home-super-duolingo.png`, `svg/super-duolingo-wordmark.svg`), set on near-black navy (eclipse `#000437`, deep-martin `#100F3E`). Paid tiers literally live in a different colour universe.
- **Eel `#4B4B4B` → swan `#E5E5E5` → polar `#F7F7F7`**: text and surfaces. Body text is never black.

### 4. Chunky, pressable components
From the live CSS of the "GET STARTED" button: 12px radius, owl face, `box-shadow: 0 4px 0 #58A700` (a 4px solid lip, no blur), feather/duolingo-sans 700, **uppercase with 0.8px tracking**. Secondary buttons are white with a swan border and the same lip. Everything looks like a physical key you can press; the lip collapses on tap. The palette board reuses the same lip so the swatches read as "Duolingo".

### 5. Two typefaces with two jobs
- **Feather Bold** (custom, rounded, very heavy; CSS `feather`, 48–64px): section headlines, always written **lowercase** and friendly ("free. fun. effective.", "stay motivated", "learn anytime, anywhere"). Its round terminals echo Duo's shapes.
- **duolingo-sans** (their rounded sans; 700 for the 32px hero line): UI, body, and ALL-CAPS button labels. Falls back to PingFang SC for Chinese.
- Super Duolingo breaks the rule with a skewed, italic, gradient-filled wordmark: speed and premium.

### 6. Layout and voice
- Homepage rhythm: one claim + one illustration per screen, alternating sides, lots of white space, then a full-bleed colour world for Super (navy) and the closing CTA (owl-green hill with coins).
- Headlines are short, lowercase, and self-assured; body copy is one or two plain sentences ("We make it easy to form a habit of language learning with game-like features, fun challenges, and reminders from our friendly mascot, Duo the owl.").
- The 2026 core-tabs refresh (`blog/core-tabs-*.png`) moved every tab to **solid, vibrant colour headers** with a character or Duo pose in each, replacing inconsistent headers: colour as wayfinding, again.

## Suggested slide order for a presentation
1. `png/hero-cast-and-duo.png`: "one mascot, one cast"
2. `blog/vikram-shape-language.png` + `vikram-turnaround.png`: shape language
3. `png/scene-*.png` (4 up): "the UI is the toy"
4. `assets/palette-board.png`: the animal palette and colour roles
5. `01-home-hero.png` crop of the button + type: pressable components, two typefaces
6. `07-home-super-duolingo.png`: the paid tier's separate colour world
7. `blog/core-tabs-vibrant-headers.png`: colour as wayfinding in the app
8. `blog/duo-widget-melting.png` + `duo-sprout-duologues.png`: personality range
