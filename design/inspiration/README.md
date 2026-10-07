# UI inspiration: language-learning apps

Screens captured on an iPhone (via iPhone Mirroring) on 2026-10-07, at 652×1436. Each app has its screens in order, and an `assets/` folder of mascots, characters, illustrations and signature components cropped from them.

To add apps or continue one, use the `app-design-research` skill (`.claude/skills/app-design-research`). It drives the iPhone, captures screens, re-crops assets from each app's `assets.json`, and follows the template in its `references/brand-analysis.md`.

| App | Screens | Assets | How far we got |
|---|---|---|---|
| [duolingo](duolingo) | 42 | 14 | Onboarding, first Chinese lesson (every exercise type, right/wrong states), lesson end, streak, home path. Other tabs need an account. |
| [drops](drops) | 19 | 7 | Onboarding (Cantonese), Roman Assist setting, first word lesson. Stops at "Create Account". |
| [ling](ling) | 9 | 4 | Onboarding (Cantonese) up to the age question. |
| [pleco](pleco) | 4 | 2 | Search, results, word entry, stroke order. Shows Mandarin readings by default. |

## Brand identity, app by app

### Duolingo: one mascot carries everything
- **Mascot:** Duo the owl is on almost every screen, and he *acts*: waves hello, holds a pencil before the lesson, celebrates, sits by the streak flame, holds the streak calendar. The mascot is the narrator of the onboarding ("Hi there! I'm Duo!", "Just 7 quick questions…"), always in a speech bubble beside him.
- **Cast:** a small recurring cast of flat, bold characters (Lily with purple hair, a woman in a hijab, a moustached man) speak the exercise sentences in speech bubbles, so practice feels like a conversation, not a quiz.
- **Colour:** dark charcoal UI with one loud brand green (`#58CC02`-ish) for primary actions and progress; orange for the streak flame; gold for combos; red for wrong answers; a separate purple-blue world for the paid tier (Super).
- **Shape and type:** chunky rounded buttons with a darker bottom edge (they look pressable), heavy rounded type, ALL-CAPS button labels.
- **Feedback:** a bottom sheet slides up green ("Correct!", "Awesome!", "Nice catch!") or red ("Incorrect, correct answer: one"), with the button colour switching to match. Missed exercises come back at the end ("Let's correct the exercises you missed!", tagged PREVIOUS MISTAKE).
- **Habit:** streak, XP, gems and hearts in the top bar; a streak is "born" with an animated flame; the home screen is a winding path of round lesson nodes.
- **Chinese specifics:** pinyin sits small above each character inside word tiles and answer options, and dotted underlines mark words you can tap for a hint.

### Drops: illustration and colour do the teaching
- **No mascot;** instead, a single consistent illustration style: one-colour, flat, slightly abstract figures (a waving person, a dog, a bank, a person saying thank you) in white/tint on a solid background.
- **Colour:** each screen is a single saturated field (deep purple for setup, orange for new words, teal for matching), with a bright lime-yellow primary button. Colour tells you which mode you're in.
- **Word card:** illustration, English word, large Chinese character, Jyutping underneath (`狗 / gau2`, `嗨 / haai1`, `多謝 / do1 ze6`). Simple vertical stack, centred, very readable.
- **Gesture as UI:** drag the word up to "I know it" or down to "Learn"; drag a word onto the matching picture. A hand cursor demonstrates the gesture the first time.
- **Roman Assist:** an explicit, friendly setting for romanisation ("Always on / Show romanization for all words"), changeable later from the pause menu.
- **Chips:** interests are emoji + label chips with a yellow outline when selected.

### Ling: a friendly mascot on a light UI
- **Mascot:** a monkey in a backwards cap, inside a light-blue circle, who asks the onboarding questions from a speech bubble and stays as a small avatar in the top corner on later screens.
- **Colour:** white and very light blue backgrounds, one orange for primary buttons, selection outlines and checkboxes.
- **Icons:** small colourful 3D-ish icons on every option (skills), and a growing-plant sequence for age ranges, a playful touch on a dull question.
- **Tone:** personal ("What aspects of Cantonese would you like to improve, Learner?"), reassuring ("86% of our users are beginners!").

### Pleco: a reference tool, not a brand
- **No mascot or illustration.** Dense, dark, utilitarian lists.
- **Tone colours:** each syllable's characters are coloured by tone (red, green, blue, purple), which makes long result lists scannable at a glance.
- **Entry layout:** headword with traditional/simplified forms, reading with a speaker icon, then tabs (DICT, STROKE, CHARS, WORDS, SENTS), numbered senses and example sentences with audio.

## Takeaways for Canto

Canto today is calm and minimal: white or dark background, jade green (`--jade`), Noto Sans HK, Jyutping above the current line, no mascot or illustrations. That suits reading along with a video, so the ideas below add character around the edges without crowding the transcript.

1. **Pick a mascot or a single illustration style, not both.** Duolingo shows how far a mascot that *acts* (waves, cheers, guards the streak) can carry a brand; Drops shows that a strict one-colour illustration style can do the same without a character. A Hong Kong-flavoured mascot (e.g. a 茶餐廳 milk-tea cup, a minibus, a dim sum basket) would be distinctive; no competitor has one.
2. **Let colour mean something.** Drops changes the whole background per mode; Duolingo turns the feedback sheet green or red. Canto could keep jade for "watching" and use one other colour for "paused / studying" so the mode is obvious at a glance.
3. **Show Jyutping the way the leaders do:** small and above the character (Duolingo tiles, Canto already does this) or directly under it on cards (Drops). Pleco's tone colours are worth trying on Jyutping or characters as an option: they make tones visible, which is the hardest part of Cantonese.
4. **Make feedback and progress feel good.** A short celebratory sheet when a word is saved or reviewed, a streak, and "words learned" stats tiles (Duolingo's three coloured tiles) would add reward without changing the reading flow.
5. **Speak in a voice.** Duolingo and Ling ask onboarding questions through their mascot, in a speech bubble, in the first person. Canto's empty states and setup could use the same device.
6. **Bring back what you missed.** Duolingo's "previous mistake" replay maps neatly onto Canto's saved words: replay the moments from the video where you saved a word.

## Research log

**2026-10-07.** Duolingo, Drops, Ling and Pleco, installed for this session. To pick up where it stopped:
- Drops: needs an account after the first word lesson ("Create Account").
- Ling: waiting on "How old are you?"; the name was entered as the placeholder "Learner".
- Duolingo: Chinese course; the characters, leagues and profile tabs need a profile.
- Pleco: switch readings to Jyutping in its settings to capture Cantonese entries; the stroke/words/sentence tabs are add-ons.
- Ideas for next time: CantoneseClass101, and HelloTalk / Speak for conversation UI.
