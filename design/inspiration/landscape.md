# Language-learning brand landscape (web, October 2026)

How the main language apps look on their marketing sites today, and where a Cantonese read-along app can stand apart. It draws on the per-app folders (`*-web/`, captured 2026-10-10 at 1440×900 @2x with tokens read from live CSS) and the iPhone captures in this folder. Duolingo is summarised from the iPhone research in [`README.md`](README.md); its web capture is being done in a separate thread.

Apps: [Drops](drops-web), [Ling](ling-web), [Speak](speak-web), [Babbel](babbel-web), [Praktika](praktika-web), [HelloChinese](hellochinese-web), plus Duolingo for reference.

## At a glance

| App | Mascot? | Who carries the brand | Illustration style | Primary colour | Canvas | Display type | Primary button |
|---|---|---|---|---|---|---|---|
| **Duolingo** | Yes: Duo the owl + a recurring cast | The owl acts on every screen | Flat, bold, rounded vector characters | Green `#58CC02` | White / charcoal | Heavy rounded sans, ALL CAPS buttons | Chunky rounded rect with a darker bottom "lip" |
| **Drops** | No (an unnamed generic learner in marketing) | Colour field + one-colour word pictograms | Pictograms: single-colour silhouettes. Marketing: semi-flat shaded scenes | Lime `#DBE65B` on purple `#712BB5` | Saturated purple / blue | TT Norms Pro 800, +0.5px | Lime **pill**, 100px radius, flat, uppercase copy |
| **Ling** | Yes: Ling the monkey + Gaia the globe | Character duo | **Flat geometric**, 10–20 primitive shapes, no outlines | Orange `#FF9900` | White, butter yellow, sky blue | Poppins 700 | Orange **rounded rect**, 16px, flat |
| **Speak** | No (filmed human tutors; a tiny blob AI tutor in-app) | One colour + real people on video | **None**: UI cards, photos and video | Electric blue `#1C49FF` | White / light grey | Axiforma 600, −0.04em | Blue **pill**, flat, "Get Started →" |
| **Babbel** | No, by design | Editorial photography + serif | **None**: photos, cut-out objects, orange silhouettes | Orange `#FE4D01` | Warm cream `#F6F4EF` | **Feature Text serif, regular 400** | **Black pill** (orange only for Sign up) |
| **Praktika** | Yes, as a cast: Skye, Tama, Raven, Noah (AI tutors) | The tutors are the product | **Stylised 3D** "animated film" people, 3D props | Violet `#7429FF` (50–1000 scale) | Lilac-grey `#F7F6FA` | Aeonik Pro 500, −0.02em | Violet **pill**, flat |
| **HelloChinese** | Yes: sage (app icon) + kung-fu panda (games) | Candy feature icons + China motifs | **Glossy soft-3D icons on colour blobs**; flat game scenes | Mint green `#00CA72` (+ violet hero) | White + pastel washes | Poppins 900 | Store badges only |
| *Canto today* | *No* | *The transcript* | *None* | *Jade `#0B7A5C` (dark mode `#4CC29B`)* | *White / dark* | *Noto Sans HK* | *—* |

Palette boards for each app are in `<app>-web/assets/palette-board.png`, and the raw tokens are in `<app>-web/palette.json`.

## What the market looks like

### Five archetypes

```diagram
                 PLAYFUL ▲
                         │
  ┌─────────────────┐    │    ┌──────────────────────┐
  │ 1 Mascot game   │    │    │ 2 Colour + pictogram │
  │ Duolingo, Ling, │    │    │ Drops                │
  │ HelloChinese    │    │    └──────────────────────┘
  └─────────────────┘    │
 CHARACTER ◀─────────────┼─────────────────────────▶ NO CHARACTER
  ┌─────────────────┐    │    ┌──────────────────────┐
  │ 3 AI-tutor cast │    │    │ 4 Tech-minimal       │
  │ Praktika        │    │    │ Speak                │
  │ (Speak's blob)  │    │    ├──────────────────────┤
  └─────────────────┘    │    │ 5 Editorial premium  │
                         │    │ Babbel               │
                 GROWN-UP ▼   └──────────────────────┘
                                   ▲ Canto belongs here
```

1. **Mascot-led game (Duolingo, Ling, HelloChinese).** An animal or character narrates and celebrates, primaries are bright, type is heavy and rounded, and the app is framed as a game ("Learning that feels like playing", "No. 1… most fun"). It is the most crowded corner, and the characters converge: Ling's monkey and HelloChinese's panda both borrow Duolingo's grammar of a cheering animal plus a path of nodes.
2. **Colour field + pictogram system (Drops).** No mascot. The brand is one saturated field per mode plus a huge library of one-colour word pictures. On the website Drops still adds a shaded generic learner who acts out each benefit, which shows how hard it is to resist putting a person in.
3. **AI-tutor cast (Praktika, and in-app Speak).** The newest archetype. The "characters" are human-looking tutors with names, faces and voices, rendered as stylised 3D (Praktika moved from photoreal in 2024 to Pixar-like in 2026). The palette is violet or blue, with tech gloss: gradients and frosted glass. Speak's small blue blob is a lighter version: a presence indicator, not a personality.
4. **Tech-minimal (Speak).** One colour, one geometric sans with tight tracking, white canvas, product UI as illustration and filmed humans as proof. It reads like a SaaS product rather than a game.
5. **Editorial premium (Babbel).** Serif headlines in regular weight, cream paper, photography of real people, cut-out objects and silhouettes instead of drawings. The 2024 rebrand deliberately dropped "app" for "coach". It is the only brand here that looks like a magazine.

### Patterns across all of them
- **Mascots are for games; serious brands use people.** Every brand that wants to look grown-up (Babbel, Speak) has no mascot and uses photography or video of real people. Every brand with a mascot is in the playful corner.
- **Geometric sans everywhere.** TT Norms Pro, Poppins (twice), Axiforma, Aeonik Pro, and Duolingo's rounded heavy face. Only Babbel uses a serif. **Nobody uses a CJK typeface as a brand voice**: Chinese characters, when they appear, are content in system fonts.
- **Pills won.** Drops, Speak, Babbel and Praktika all use flat full-pill buttons with no shadow. Ling uses a 16px rounded rectangle. Duolingo's 3D "lip" button is the only one with depth.
- **Colour territory is taken by hue.**
  - Green: Duolingo lime-green, HelloChinese mint.
  - Orange: Babbel, Ling.
  - Purple and violet: Drops, Praktika (also HelloChinese's hero).
  - Electric blue: Speak.
  - **Nobody owns a deep, muted blue-green (jade), and nobody uses warm paper + ink except Babbel.**
- **Feedback colours are universal:** green = correct, amber/orange = explanation, red/pink = wrong. Speak shows a "Perfect line / Could be improved" pair, Praktika "It is better to say / Explanation", and Duolingo's green and red sheets.
- **Romanisation is shown above the characters** wherever Chinese appears (HelloChinese word cards and graded reader, Duolingo tiles). No marketing site shows **Jyutping**, and none shows tones visually; Pleco's tone colours are a tool feature, not a brand.

### The Chinese/Cantonese corner specifically
- **HelloChinese**, the most visible Chinese-specific brand, signposts China with stock motifs: a Confucius-like sage, a kung-fu panda in a straw hat, bamboo, pagodas. It is cheerful but generic and mainland-coded.
- **No Cantonese-first app has a real brand.** CantoneseClass101 is a template shared by 30+ sister sites. Ling, Drops and Duolingo list Cantonese as one flag among many (Drops and Ling at least use the Hong Kong bauhinia). The one Cantonese-first app with a mascot, Koala Chinese 樹熊認字 (kids aged 3–8, 2026), is tiny and generic kawaii. **Nobody visually owns Hong Kong**: its street typography, signage, neon, minibuses or cha chaan teng culture.

## Gaps Canto can own

Canto is a read-along app for Cantonese video: jade green, Noto Sans HK, minimal, no mascot. That puts it in the grown-up, no-character half of the map, next to Speak and Babbel, and away from the crowded mascot corner. Gaps it can own:

1. **Let Traditional Chinese characters be the brand graphic.** Every other brand illustrates with drawings, 3D people or photos, and treats hanzi as content. Canto can make **large 繁體 characters with Jyutping above them**, set in Noto Sans HK, its hero visual and logo-adjacent motif: the transcript line *is* the illustration. Speak shows that product UI can carry a brand without illustration; HelloChinese's graded reader shows the layout but in a candy skin.
2. **Own jade as a calm, deep green, clearly not Duolingo's.** Jade is the one unclaimed hue family. Keep it deep and slightly blue (closer to jade stone than lime or mint) so it never reads as Duolingo `#58CC02` or HelloChinese `#00CA72`. Today's light-mode `#0B7A5C` already does this. The dark-mode `#4CC29B` drifts towards HelloChinese's mint and is worth checking against it. Pair it with Babbel-style warm neutrals (paper white, ink) for a reading feel. Use jade for one job (the active line / primary action), the way Speak uses its blue.
3. **Be the grown-up Cantonese brand.** The Cantonese space has only templates, kids' apps and academic tools. Babbel and Speak prove adults respond to calm and confident ("Real conversation. No pressure."). Canto can speak plainly to diaspora adults and heritage learners: no streak fireworks, no superlatives.
4. **Use Hong Kong itself, not China clichés.** Where Canto needs imagery, its *source material* is real Cantonese video, so frames from the videos learners watch can play the role Babbel's photography plays. Hong Kong typographic culture (neon-sign strokes, minibus-board numerals, 茶餐廳 menu boards) is an open, specific vocabulary for occasional accents (empty states, the app icon, social posts), drawn in-house rather than borrowed. Avoid panda, pagoda and bamboo.
5. **Make tones visible: no brand does this.** Six Cantonese tones are the hardest thing for learners, and Pleco's per-syllable tone colours are the only precedent, and only as a utility. Canto could define a **six-colour tone accent system** (optional, off by default) that sits under jade, a functional palette nobody else has.
6. **Flat, quiet controls.** Pills are the market default and Duolingo's lip is iconic, so neither differentiates. A flat button in jade with a moderate radius (around 10–12px), sentence-case labels and Noto Sans HK at medium weight would look intentional and calm next to them, and match Canto's minimal UI.
7. **A voice without a mascot.** Ling, Praktika and Duolingo get warmth from a character talking. Canto can get the same warmth from **first-person microcopy in Cantonese** (e.g. 「慢慢嚟」 "take your time" on pause, 「唔該晒」 when a word is saved), with English beside it. It is personable without a character, and very Hong Kong.

### Avoid
- A mascot as such: it would pull Canto into the most crowded archetype. If one is ever wanted, it should come from Hong Kong daily life (milk-tea cup, minibus, dim sum basket, as the README already suggests), never a panda.
- Violet or electric blue (taken by Praktika, Drops and Speak), and glossy 3D or AI-tutor faces (Praktika's territory).
- Superlative "No. 1" copy and heavy 900-weight display type: they clash with a calm reading app.
