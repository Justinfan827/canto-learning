# Design notes

**Brief.** A calm phone study guide for one learner, built from the words they saved while watching Cantonese YouTube. It should feel like the same product as the extension's side panel.

**Tokens.** The extension's palette, so phone and browser read as one app: ink `#17201C`, muted `#7B8682`, line `#E8ECEA`, page `#F3F5F4`, jade `#0B7A5C` (accent and the "Know it" side), amber `#B45309` (the "Still learning" side). Dark mode uses the extension's dark values. Chinese is set in PingFang HK (Hong Kong forms); everything else is the system font so Dynamic Type and optical sizing come free.

**The one bold thing.** Tone contours. Each Jyutping syllable gets its pitch drawn as a short jade line in a tinted track (the speaking range), so tone 1 is a high flat line, tone 2 a rise, tone 4 a low fall. Everything else stays quiet: white surfaces on a tinted page, one accent, no decoration.

**Motion.** Only where it answers a touch: the card flip, the card following your finger and flying off the way you threw it (velocity projected from the drag), and a critically damped settle. Reduce Motion swaps the flip for a cross-fade and drops the fly-off.

## Iterations

1. Source-line highlights kept the line's own size (they had jumped to 20 pt inside 14 pt text). Review and Listen moved onto the tinted page so the white cards read as cards. Video buttons got their icons back and stopped clipping.
2. Tone contours got a tinted track so high and low are legible; the flashcard back was checked; the missing-voice warning became a quiet info line.
3. Contour tracks size to their syllable; Library sections tightened; dark mode checked.
4. Lists use the app's own page and surface colors in both modes (the system black clashed in dark); text on jade switches to near-black in dark mode for contrast. Review sessions mark repeats with "Again"; the summary lists missed words with sound and meaning, and misses are due tomorrow to match its copy.
5. Listen options moved into a menu, leaving the word, the controls and the queue; the queue says what one pass sounds like. Library rows and the review prompt stack vertically at accessibility text sizes, and Jyutping scales with Dynamic Type.

Skills applied: frontend-design (plan, tokens, critique loop), Apple design (springs, velocity handoff, reduced motion, materials), SwiftUI UI patterns (tabs, navigation, state ownership), SwiftUI Liquid Glass (glass buttons on iOS 26).
