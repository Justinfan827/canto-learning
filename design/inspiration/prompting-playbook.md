# Prompting playbook: remixing brands into your own identity

How to get distinctive, consistent brand assets out of image models (Nano Banana, GPT Image, Seedream, FLUX, Midjourney, Recraft). Compiled 2026-10-10 from the model vendors' prompting guides and mascot/character-design practice; sources at the end.

## The process: diverge → converge → systematise

```
1. Extract    describe each reference brand's traits in words (not just images)
2. Recombine  one trait from each source, plus your own point of view
3. Diverge    many cheap, very different concepts; pick by gut
4. Converge   iterate one winner, one variable at a time
5. Lock       model sheet + brand DNA block + saved style / LoRA
6. Produce    poses, icons, scenes, always against the locked sheet
```

Most people skip 1, 2 and 5 and wonder why results look generic or drift.

## 1. Extract: turn references into vocabulary

Models copy *what you name*. A collage of Duolingo makes "something like Duolingo"; a list of traits lets you pick and mix.

- **Reverse-prompt the reference.** Give a model (Claude, Gemini, GPT) the image and ask: *"Describe this illustration style as a design system: shape primitives, outline, shading, palette with hex values, proportions, eye style, line weight, perspective, texture, mood. No brand names."* Save the answer.
- Use the analyses in this folder (`duolingo-web/README.md`, `landscape.md`) as your trait lists.
- Name traits in designer language: *"circle and pill primitives, no outlines, one flat shadow tone, 2.5-head-tall proportions, dot eyes with one specular highlight, isometric 30° tilt, 4-colour palette"*.

## 2. Recombine: transplant traits, not looks

Pick **one trait per source** and add **one thing nobody else has**:

| From | Take | Leave |
|---|---|---|
| Duolingo | chunky primitives, the character *acts* | the owl, the green, their cast |
| Drops | single-colour flat figures on a solid field | their exact figures |
| Pleco | colour carries meaning (tones) | the dense UI |
| **You** | Hong Kong specifics: 茶餐廳 tableware, 絲襪 strainer, minibus, neon, Jyutping | — |

Distance test: if someone would say "that's a Duolingo knock-off", you've taken a *look*, not a *trait*. Never name a brand or character in the prompt.

## 3. Diverge: get personality before polish

- **Ask an LLM for 20 concepts first**, one line each, very different (attitude × object × signature detail), then render the best 5. Cheaper than 20 renders.
- Every mascot prompt needs:
  - **An attitude**, e.g. deadpan, hyperactive, grumpy regular, overachiever.
  - **A signature detail** only you'd have.
  - **Exaggerated proportions**, such as oversized head, tiny limbs, lopsided body.
  - **A pose that is a verb**, e.g. crossing arms, sprinting, side-eyeing; never "standing".
- Use the model with the most taste for this step (Midjourney, GPT Image, Seedream). Nano Banana is precise but drifts to "nice and generic".
- Cheap model + high count (Recraft V4.1 Flash, Nano Banana 2 Lite) for divergence; expensive model for the keeper.

## 4. Converge: prompt structure that holds

**Labelled blocks beat one long sentence** (OpenAI and Google guides both recommend this):

```
Use: brand mascot for a Cantonese learning app, flat vector, will be used at 48px and 400px
Subject: <character name>, <what it is>, <attitude>, <pose>
Brand DNA: <paste the fixed block from section 5, unchanged>
References: Image 1 = character design (keep exactly). Image 2 = style only (shapes, shading, palette), ignore its subject.
Constraints: white background, no text, no extra characters, no outlines, max 4 colours
```

Techniques:
- **Assign a role to every reference image** ("Image 1 for the character, Image 2 for style only"). Start with 2–3 references, not 14.
- **Name the character** ("Nai Cha") and reuse the name; models track named subjects better.
- **Say what stays, then what changes**: "Keep the character exactly the same. Change only the pose to waving." Repeat the keep-list every iteration.
- **Change one variable per turn.** Pose *or* palette *or* expression, never all three.
- **Feed approved outputs back** as references (and stay in the same chat/thread on Nano Banana and GPT Image so the history is used).
- **Positive phrasing**: "plain white background" beats "no clutter".
- **Hex codes** for the palette, not colour names ("jade" means something different to every model).
- **State the use and size**: "works as a 24px app icon" forces simpler shapes.

## 5. Lock: make the identity reproducible

- **Brand DNA block**: one paragraph you paste unchanged into every prompt (shapes, shading, palette hex, proportions, eye style, line, texture). Edit it deliberately; never improvise it per prompt.
- **Model sheet** for the mascot (the animation-studio standard):
  1. Generate a front-view seed you love.
  2. From the seed: front / ¾ / side / back turnaround.
  3. An expression sheet: happy, surprised, annoyed, shy, proud, sleepy.
  4. Rules: proportions in head-heights, exact colours, what the character never does.
  5. Small-size and one-colour versions (it must read at 24px and as a silhouette).
- **Review new outputs against the sheet, not against the last image**, or drift compounds.
- **Tool locks**: Recraft *Create style* from 3–5 approved images; Midjourney `--sref` code or a moodboard profile; a FLUX LoRA (~$2–8) once you have 15–30 approved images of *your own* character.

## 6. Produce and keep a log

- Generate assets as a set (6 icons in one prompt) so they share weight and style.
- Vectorise keepers (Recraft, $0.01) and clean up by hand in Figma: AI gets you 80%; the last 20% (consistent stroke ends, aligned shapes) is what reads as "brand".
- Keep `prompts.md` with: prompt, model, references, seed/settings, verdict. Your brand DNA block evolves from this log.

## Ownership

- Use other brands only as trait references; don't train on or ship their characters.
- Generations on free plans (Recraft, OpenArt) are public and often not licensed for commercial use.
- US copyright needs human authorship, so make the final mascot human-authored: redraw or substantially edit the AI concept and treat AI as the sketch partner. Trademark the final mark if it becomes the brand.

## Starter brand DNA block for Canto (edit me)

```
Flat vector, built from circle and pill primitives, no outlines, one flat shadow tone per colour,
2.5-head-tall proportions, dot eyes with a single white highlight, slightly lopsided playful posture,
palette: jade #0B7A5C (Canto `--jade`), light jade #4CC29B, milk-tea caramel #C98B4E, porcelain #FAF7F2, ink #1F2A2E, accent red #E8483B,
max 4 colours per illustration, Hong Kong 茶餐廳 details, white background.
```
(Jade values are Canto's own `--jade` tokens from `apps/extension/style.css`.)

## Sources
- Google Cloud, [Ultimate prompting guide for Nano Banana](https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-nano-banana)
- Google DeepMind, [Nano Banana prompt guide](https://deepmind.google/models/gemini-image/prompt-guide/)
- Google, [Nano Banana Pro prompting tips](https://blog.google/products-and-platforms/products/gemini/prompting-tips-nano-banana-pro/)
- OpenAI Cookbook, [GPT Image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide) and [gpt-image-1.5 guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide)
- Fuser, [GPT Image 2.5 prompt guide](https://fuser.studio/articles/gpt-image-prompt-guide)
- LeftHD, [AI brand mascot consistency test protocol](https://lefthd.com/insights/ai-brand-mascot-consistency-test/)
- MarketPrompter, [AI character sheet prompts](https://marketprompter.com/blog/ai-character-prompts)
- MyUP, [AI character turnaround workflow](https://myup.ai/blog/ai-character-turnaround-workflow)
- Constant Creates, [Why your brand needs a character turnaround](https://www.constantcreates.com/blog/character-design-turnaround-mascot)
- Lenny's Newsletter, [Mastering Midjourney for brand imagery](https://www.lennysnewsletter.com/p/mastering-midjourney-how-to-create)
- Prompt Architects, [Midjourney --sref explained](https://www.prompt-architects.com/blog/214-style-references-in-midjourney-sref-explained)
- Blake Crosley, [Midjourney 8.2 guide](https://blakecrosley.com/guides/midjourney)
