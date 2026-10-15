# Praktika (web): violet, glass and a cast of animated-film AI tutors

Marketing site [praktika.ai](https://praktika.ai/) captured on 2026-10-10 in Chromium at 1440×900 @2x (cookie banner removed before capture), plus the "Praktika 4.0" rebrand post (Feb 2026). Reference captures only: the tutors, logo and UI belong to Praktika.ai.

## What's here

| Path | Contents |
|---|---|
| `01-home-hero-ai-tutor-phone.png` … `12-home-get-the-app-footer.png` | Homepage, one viewport per screen, resized to 1440×900 |
| `assets/svg/` | Original inline SVGs: logo, the three tone faces (Soft / Balanced / Strict) |
| `assets/png/` | Tutor portraits (Skye, Raven, Noah, Tama), the pronunciation-score card, phone screens (chat, feedback + explanation, practice scenarios, study plan, level picker), 3D gold laurel and star, the QR "download" hand, the tutor room background, app icon, SVG renders |
| `assets/blog/` | Praktika 4.0 cover, Skye + Tama tutors image, bento and dark-mode images; site logo and app icon; Raven/Noah phone mockups; a 2024 TechCrunch image of the pre-rebrand photoreal tutor |
| `palette.json`, `assets/palette-board.png` | Colour roles (full brand 50–1000 scale in CSS), type and button tokens |

## Brand analysis

### Praktika: the characters *are* the product, rendered like an animated film
- **Mascot / characters:** a **cast of named human tutors** instead of a mascot: **Skye** (red curls, freckles, brand T-shirt), **Tama** (glasses, purple tropical shirt), **Raven** (black bob with a purple streak) and **Noah** (round glasses, cardigan). The site calls them "your caring and supportive friends who remember your context". They *are* the interface: video-call faces in phone frames, portrait cards ("Study with Skye"), and a hero where Skye corrects a sentence in a speech bubble. The 4.0 rebrand moved them from photoreal game-engine avatars (2024, `blog/techcrunch-2024-praktika-core-app-pre-rebrand.png`) to **stylised, Pixar-like 3D** made with "generative AI animation". Wardrobe is colour-matched to brand violet.
- **Illustration style:** **3D everywhere, nothing flat**: the 3D tutors, a 3D gold laurel and star (`laurel-gold`, `star-3d-gold`), a 3D hand holding the QR code, and a moody violet room behind the tutors (`tutor-room-background`). The only flat graphics are the **three tone faces** (green Soft, blue Balanced, amber Strict: blobs with simple dot eyes). They make the setting "how strict should your tutor be" feel emotional.
- **Colour:** a **violet brand scale** in CSS (`--brand-50 #F7F2FF` → `--brand-1000 #1F0060`), with **`#7429FF`** as primary for the hero card, CTAs, logo and highlight chips. The page canvas is a cool lilac-grey `#F7F6FA`, text is near-black `#0D0D0D`, and secondary text is purple-grey `#4B4458`. Feedback uses green "It is better to say" plus amber "Explanation", and pink `#FF2D55` crosses mark the "private tutor" pain points. The rebrand cover uses violet-to-black gradients and frosted glass.
- **Shape and type:** **Aeonik Pro** headings at 60px/500 with −0.02em tracking (medium weight, not bold), and **Inter** for body. Buttons are **pills** (50px radius, flat violet, no shadow); store buttons are 16px-radius black or white. Cards are large-radius (~24–32px) white tiles. The logo is a speech bubble that doubles as a "P".
- **Voice:** warm and anxiety-reducing: "Practice freely. No judgement, ever", "Grow from your mistakes: instant, gentle corrections", "Choose the tone and intensity that keep you moving". Price is framed as "Private-tutor results without the private-tutor price" (~$8 vs ~$400/month). The founder says the ElevenLabs tutor voices "became part of our brand identity".
- **Habit and reward (as marketed):** personal study plan (`phone-study-plan`), CEFR level picker, pronunciation score (82, with completeness, rhythm and fluency bars), 100K+ five-star reviews.
- **Chinese / Cantonese specifics:** none visible; the site is English-learning-first.

### Suggested slide order
1. `01-home-hero-ai-tutor-phone.png`: violet card, Skye in a phone, correction bubble
2. `assets/blog/praktika-blog-4-0-tutors-skye-tama.jpg`: the animated-film cast
3. `assets/blog/techcrunch-2024-praktika-core-app-pre-rebrand.png` → `assets/png/tutor-skye-portrait.png`: photoreal → stylised
4. `05-home-meet-top-tutors.png`: tutors as "friends"
5. `08-home-tone-picker-reviews.png` + `assets/png/tone-*-face.png`: Soft / Balanced / Strict
6. `assets/png/phone-feedback-explanation.png`: the correction pattern
7. `assets/blog/praktika-blog-4-0-cover.jpg` + `assets/palette-board.png`: violet scale, glass, Aeonik Pro
