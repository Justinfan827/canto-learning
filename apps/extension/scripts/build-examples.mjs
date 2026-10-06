// Builds the bundled example sentences from Tatoeba (CC BY 2.0 FR). Jyutping comes from the bundled
// dictionary, word by word. Writes assets/examples.dat for the extension and
// apps/ios/Canto/Resources/examples.json for the phone.
//
// Tatoeba has few Cantonese sentences with English, so each word takes examples from three tiers,
// best first, and the lower tiers only fill words the higher ones left short:
//   1. Cantonese with English (linked directly, or through a Mandarin translation).
//   2. Written Chinese (書面語) with English, converted to Traditional characters.
//   3. Cantonese with no English yet.
// Needs assets/dict.dat (scripts/build-dict.mjs). Downloads are cached in .cache/examples.
// Run: node scripts/build-examples.mjs [--if-missing]
import { execFileSync } from "child_process"
import fs from "fs"
import path from "path"

import { lookup, segment } from "../../../packages/shared/src/dict.ts"

const root = path.dirname(new URL(import.meta.url).pathname)
const cache = path.join(root, "../.cache/examples")
const outs = [path.join(root, "../assets/examples.dat"), path.join(root, "../../ios/Canto/Resources/examples.json")]

// Bump when the output changes shape or content, so --if-missing rebuilds older files.
const VERSION = 2
const current = (f) => {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8")).version === VERSION
  } catch {
    return false
  }
}
if (process.argv.includes("--if-missing") && outs.every(current)) process.exit(0)

const TATOEBA = "https://downloads.tatoeba.org/exports/per_language"
const FILES = [
  "yue/yue_sentences.tsv.bz2",
  "yue/yue-eng_links.tsv.bz2",
  "yue/yue-cmn_links.tsv.bz2",
  "cmn/cmn_sentences.tsv.bz2",
  "cmn/cmn-eng_links.tsv.bz2",
  "eng/eng_sentences.tsv.bz2"
]

async function tsv(file) {
  fs.mkdirSync(cache, { recursive: true })
  const bz = path.join(cache, path.basename(file))
  const plain = bz.replace(/\.bz2$/, "")
  if (!fs.existsSync(plain)) {
    if (!fs.existsSync(bz)) {
      console.log("downloading", `${TATOEBA}/${file}`)
      const res = await fetch(`${TATOEBA}/${file}`)
      if (!res.ok) throw new Error(`${file}: ${res.status}`)
      fs.writeFileSync(bz, Buffer.from(await res.arrayBuffer()))
    }
    execFileSync("bunzip2", ["-k", "-f", bz])
  }
  return fs
    .readFileSync(plain, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"))
}

const dict = JSON.parse(fs.readFileSync(path.join(root, "../assets/dict.dat"), "utf8"))
const [yue, yueEng, yueCmn, cmn, cmnEng, eng] = await Promise.all(FILES.map(tsv))

// *_sentences: id, lang, text. *_links: from id, to id.
const wanted = new Set([...yueEng, ...cmnEng].map((l) => l[1]))
const english = new Map()
for (const [id, , text] of eng) if (wanted.has(id)) english.set(id, text)
const firstEnglish = (links) => {
  const out = new Map()
  for (const [a, e] of links) if (english.has(e) && !out.has(a)) out.set(a, english.get(e))
  return out
}
const cmnEnglish = firstEnglish(cmnEng)
const yueEnglish = firstEnglish(yueEng)
// Cantonese sentences with no English of their own often have a Mandarin translation that does.
for (const [y, c] of yueCmn) if (!yueEnglish.has(y) && cmnEnglish.has(c)) yueEnglish.set(y, cmnEnglish.get(c))

const HAN = /\p{Script=Han}/u
// Words that are almost everywhere; listing examples for them adds weight and teaches nothing.
const SKIP = new Set([..."我你佢嘅咗喺係唔都就嗰呢個啲同又仲好"])

/** Simplified → Traditional through the dictionary's variant entries, word by word. */
function traditional(text) {
  const char = (c) => (typeof dict[c] === "string" && [...dict[c]].length === 1 ? dict[c] : c)
  return splitKeep(text)
    .map((w) => (typeof dict[w] === "string" ? dict[w] : [...w].map(char).join("")))
    .join("")
}
/** `segment` drops punctuation; this keeps every character so the sentence survives intact. */
function splitKeep(text) {
  const out = []
  let rest = text
  for (const w of segment(text, dict)) {
    const at = rest.indexOf(w)
    if (at < 0) continue
    if (at > 0) out.push(rest.slice(0, at))
    out.push(w)
    rest = rest.slice(at + w.length)
  }
  if (rest) out.push(rest)
  return out
}

const seen = new Set()
function sentence(text, en, source) {
  const len = [...text].length
  if (seen.has(text) || len < 4 || len > 40 || !HAN.test(text)) return null
  seen.add(text)
  const words = segment(text, dict)
  const jyutping = words.map((w) => (HAN.test(w) ? lookup(w, dict).jyutping : w)).join(" ")
  // A character the dictionary can't read would leave a gap in the Jyutping; skip those few.
  if (jyutping.includes("?")) return null
  return { text, jyutping, en, source, words }
}
// Shorter sentences first: they show the word with less to decode.
const tier = (list) => list.filter(Boolean).sort((a, b) => [...a.text].length - [...b.text].length)

const tiers = [
  tier(yue.filter(([id]) => yueEnglish.has(id)).map(([id, , text]) => sentence(text, yueEnglish.get(id), 0))),
  tier(cmn.filter(([id]) => cmnEnglish.has(id)).map(([id, , text]) => sentence(traditional(text), cmnEnglish.get(id), 1))),
  tier(yue.filter(([id]) => !yueEnglish.has(id)).map(([, , text]) => sentence(text, "", 0)))
]

const PER_WORD = 5
// The lower tiers only top a word up to this many, and only for words of two or more characters:
// single characters are rarely what someone saves, and would multiply the size.
const FILL = 3
const sentences = []
const words = {}
tiers.forEach((list, t) => {
  for (const s of list) {
    let used = false
    for (const w of new Set(s.words)) {
      if (!HAN.test(w) || SKIP.has(w)) continue
      if (t > 0 && [...w].length < 2) continue
      const ids = (words[w] ??= [])
      if (ids.length >= (t === 0 ? PER_WORD : FILL)) continue
      if (!used) sentences.push(s)
      used = true
      ids.push(sentences.length - 1)
    }
  }
})

const out = {
  version: VERSION,
  sources: [
    { name: "Tatoeba", license: "CC BY 2.0 FR", url: "https://tatoeba.org" },
    { name: "Tatoeba 書面語", license: "CC BY 2.0 FR", url: "https://tatoeba.org" }
  ],
  sentences: sentences.map((s) => [s.text, s.jyutping, s.en, s.source]),
  words
}
for (const f of outs) {
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, JSON.stringify(out))
}
const count = (source, en) => sentences.filter((s) => s.source === source && !!s.en === en).length
console.log(
  `examples: ${sentences.length} sentences (${count(0, true)} Cantonese, ${count(1, true)} 書面語, ${count(0, false)} without English) for ${Object.keys(words).length} words, ${(fs.statSync(outs[0]).size / 1e6).toFixed(1)} MB`
)
