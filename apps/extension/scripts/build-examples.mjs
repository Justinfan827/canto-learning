// Builds the bundled example sentences from Tatoeba's Cantonese sentences that have an English
// translation (CC BY 2.0 FR). Jyutping comes from the bundled dictionary, word by word. Writes
// assets/examples.dat for the extension and apps/ios/Canto/Resources/examples.json for the phone.
// Needs assets/dict.dat (scripts/build-dict.mjs). Downloads are cached in .cache/examples.
// Run: node scripts/build-examples.mjs [--if-missing]
import { execFileSync } from "child_process"
import fs from "fs"
import path from "path"

import { lookup, segment } from "../../../packages/shared/src/dict.ts"

const root = path.dirname(new URL(import.meta.url).pathname)
const cache = path.join(root, "../.cache/examples")
const outs = [path.join(root, "../assets/examples.dat"), path.join(root, "../../ios/Canto/Resources/examples.json")]

if (process.argv.includes("--if-missing") && outs.every((f) => fs.existsSync(f))) process.exit(0)

const TATOEBA = "https://downloads.tatoeba.org/exports/per_language"
const FILES = ["yue/yue_sentences.tsv.bz2", "yue/yue-eng_links.tsv.bz2", "eng/eng_sentences.tsv.bz2"]

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
const [yue, links, eng] = await Promise.all(FILES.map(tsv))

// yue_sentences: id, lang, text. links: yue id, eng id. eng_sentences: id, lang, text.
const wanted = new Set(links.map((l) => l[1]))
const english = new Map()
for (const [id, , text] of eng) if (wanted.has(id)) english.set(id, text)
const englishFor = new Map()
for (const [y, e] of links) if (english.has(e) && !englishFor.has(y)) englishFor.set(y, english.get(e))

const HAN = /\p{Script=Han}/u
// Words that are almost everywhere; listing examples for them adds weight and teaches nothing.
const SKIP = new Set([..."我你佢嘅咗喺係唔都就嗰呢個啲同又仲好"])

const sentences = []
const seen = new Set()
for (const [id, , text] of yue) {
  const en = englishFor.get(id)
  const len = [...text].length
  if (!en || seen.has(text) || len < 4 || len > 40 || !HAN.test(text)) continue
  seen.add(text)
  const words = segment(text, dict)
  const jyutping = words.map((w) => (HAN.test(w) ? lookup(w, dict).jyutping : w)).join(" ")
  // A character the dictionary can't read would leave a gap in the Jyutping; skip those few.
  if (jyutping.includes("?")) continue
  sentences.push({ text, jyutping, en, words })
}

// Shorter sentences first: they show the word with less to decode.
sentences.sort((a, b) => [...a.text].length - [...b.text].length)

const PER_WORD = 5
const words = {}
sentences.forEach((s, i) => {
  for (const w of new Set(s.words)) {
    if (!HAN.test(w) || SKIP.has(w)) continue
    const list = (words[w] ??= [])
    if (list.length < PER_WORD) list.push(i)
  }
})

const out = {
  sources: [{ name: "Tatoeba", license: "CC BY 2.0 FR", url: "https://tatoeba.org" }],
  sentences: sentences.map((s) => [s.text, s.jyutping, s.en, 0]),
  words
}
for (const f of outs) {
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, JSON.stringify(out))
}
console.log(`examples: ${sentences.length} sentences for ${Object.keys(words).length} words, ${(fs.statSync(outs[0]).size / 1e6).toFixed(1)} MB`)
