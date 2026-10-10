# HelloChinese (web): mint green, glossy blob icons, a sage and a kung-fu panda

Marketing site [hellochinese.cc](https://www.hellochinese.cc/) captured on 2026-10-10 in Chromium at 1440×900 @2x, plus App Store imagery and a 2020 Wayback snapshot. HelloChinese teaches Mandarin; it is included as the most visible Chinese-specific brand. No Cantonese-first app has a comparable identity (see [`../landscape.md`](../landscape.md)). Reference captures only: characters, icons and UI belong to HelloChinese Technology Co.

## What's here

| Path | Contents |
|---|---|
| `01-home-hero-no1-stroke-phone.png` … `06-home-footer-skyline.png` | Homepage, one viewport per screen, resized to 1440×900 |
| `assets/svg/` | Original SVGs: the faded hero scatter props (books, trophy) |
| `assets/png/` | App icon (sage), wordmarks, the kung-fu panda, six glossy feature icons on colour blobs, phone screens (stroke order, graded reader, tone game, chat lesson, course path, speech recognition), pinyin word cards (汉堡 hànbǎo, 我 wǒ), the stroke-order 文, the pinyin-over-hanzi sentence, green paint-splash, pagoda/bridge skyline, bamboo, SVG renders |
| `assets/blog/` | App Store icon and screenshots (No. 1 hero, panda tone game, graded-stories reader), site sprites, 2020 wordmark |
| `palette.json`, `assets/palette-board.png` | Colour roles and type |

## Brand analysis

### HelloChinese: a cheerful game skin over a textbook, signposted with China clichés
- **Mascot / characters:** two unnamed characters, with no public rationale.
  1. The **app icon is a smiling old sage**: white topknot, long moustache and beard, rosy cheeks, on a cyan-green-purple gradient (`app-icon-sage`). He reads as a Confucius-like "wise teacher".
  2. A **kung-fu panda** in a conical straw hat with a red scarf and bamboo staff (`panda-kungfu-hat`) is the hero of the tone game, where you slice pinyin on bamboo (`phone-panda-tone-game`).

  Neither narrates the marketing site; the hero is a hand tracing 文 on a phone. Iconography leans on stock Chinese motifs: panda, 斗笠 hat, bamboo, pagodas and an arched bridge in the footer skyline (`footer-skyline-pagodas`).
- **Illustration style:** **glossy, soft-3D icons on blurred gradient blobs**, one colour per feature: yellow game controller, purple book, pink mic, orange brush, cyan video, green clipboard (`icon-blob-*`). Hero props are scattered as faded, semi-transparent outline objects (`hero-scatter-*`). The panda game scenes are flat vector with gradients.
- **Colour:** **mint/emerald green** is the brand (`#00CA72` wordmark and accent words; footer gradient to `#00DEA9`; CSS green `#00C898`), with a **violet hero `#937AFF`** that doesn't recur elsewhere. Feature cards each get a pastel wash: butter, lilac, pink, sky, mint. Text is grey `#222` / `#444`. The overall effect is multi-coloured candy rather than a strict palette.
- **Shape and type:** **Poppins** throughout. "No. 1" is set at 128px/900, very heavy; section heads are bold. Cards are soft rounded tiles; round mint arrow buttons; the CTAs are just the official store badges. Hanzi appear in rounded white **word cards with pinyin on top** (`word-card-pinyin-hanbao`, `word-card-pinyin-wo`), and stroke order is drawn in a 田字格 grid (`phone-stroke-order`).
- **Voice:** superlative and benefit-led: "No. 1 Chinese Learning App", "the most fun & effective app", "Learn Chinese **anytime, anywhere**" (with the green emphasis), "Embark on an immersive Chinese learning journey". Proof comes from numbers: 20,000,000+ users, 500,000+ reviews, 4.9.
- **Habit and reward (as marketed):** game-based learning, leveling up, spaced repetition.
- **Chinese specifics:** this is the richest Chinese UI on any marketing site in this set:
  - pinyin above characters in word cards and in whole sentences (`pinyin-over-hanzi-sentence`)
  - stroke order on a 田字格
  - speech recognition with a waveform (`phone-speech-recognition`)
  - a **graded reader** with pinyin over every word, green-highlighted words and an audio scrubber (`phone-graded-reader`, `blog/appstore-hellochinese-screenshot-graded-stories-reader.jpg`). This is the closest existing pattern to Canto's read-along.

### Suggested slide order
1. `01-home-hero-no1-stroke-phone.png`: violet hero, 文 stroke, "No. 1" in Poppins 900
2. `assets/png/app-icon-sage.png` + `assets/png/panda-kungfu-hat.png`: the two characters (and the cliché risk)
3. `02-home-feature-blob-icons.png` + `assets/png/icon-blob-*.png`: glossy blob icon system
4. `assets/png/word-card-pinyin-hanbao.png`, `assets/png/pinyin-over-hanzi-sentence.png`: how romanisation sits over hanzi
5. `assets/blog/appstore-hellochinese-screenshot-graded-stories-reader.jpg`: the read-along precedent
6. `06-home-footer-skyline.png`: mint gradient + pagoda skyline
7. `assets/palette-board.png`
