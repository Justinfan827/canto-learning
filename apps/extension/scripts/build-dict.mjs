// Builds assets/dict.dat from CC-Canto, the CC-CEDICT Cantonese readings and CC-CEDICT
// (all CC BY-SA). Downloads are cached in .cache/dict. Run: node scripts/build-dict.mjs [--if-missing]
import { execFileSync } from "child_process"
import fs from "fs"
import path from "path"

const root = path.dirname(new URL(import.meta.url).pathname)
const cache = path.join(root, "../.cache/dict")
const out = path.join(root, "../assets/dict.dat")

if (process.argv.includes("--if-missing") && fs.existsSync(out)) process.exit(0)

const SOURCES = {
  canto: ["https://cantonese.org/cccanto-170202.zip", "cccanto-webdist.txt"],
  readings: ["https://cantonese.org/cccedict-canto-readings-150923.zip", "cccedict-canto-readings-150923.txt"],
  cedict: ["https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.zip", "cedict_ts.u8"]
}

async function source([url, file]) {
  fs.mkdirSync(cache, { recursive: true })
  const zip = path.join(cache, path.basename(url))
  if (!fs.existsSync(zip)) {
    console.log("downloading", url)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${url}: ${res.status}`)
    fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()))
  }
  if (!fs.existsSync(path.join(cache, file))) execFileSync("unzip", ["-o", "-q", zip, "-d", cache])
  return fs.readFileSync(path.join(cache, file), "utf8")
}

// 佢 佢 [qu2] {keoi5} /he / she / it (Cantonese)/Mandarin equivalent: 他tā [他]/ # comment
const LINE = /^(\S+) (\S+) \[([^\]]*)\](?: \{([^}]*)\})?(?: \/(.*)\/)?/

function* entries(text) {
  for (const line of text.split("\n")) {
    if (line.startsWith("#")) continue
    const m = LINE.exec(line)
    if (m) yield { trad: m[1], simp: m[2], pinyin: m[3].toLowerCase().replace(/\s+/g, "").replace(/u:/g, "v"), jp: m[4] ?? "", defs: m[5] ? m[5].split("/") : [] }
  }
}

const NOISE = /^(old variant of|variant of|surname |see [^ ]+$|CL:|used in |abbr\. for )/i

function gloss(defs) {
  let formal = ""
  const keep = []
  for (const d of defs) {
    const eq = /^Mandarin equivalent: ([^\x00-\x7f\s[]+?)(?:\[[^\]]*\]|[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]*)\s/.exec(d + " ")
    if (eq) {
      formal ||= eq[1]
      continue
    }
    if (!NOISE.test(d.trim()) && d.trim()) keep.push(d.trim())
  }
  return { gloss: (keep.length ? keep : defs.filter(Boolean)).slice(0, 4).join("; "), formal }
}

const [canto, readings, cedict] = await Promise.all([source(SOURCES.canto), source(SOURCES.readings), source(SOURCES.cedict)])

const jpFor = new Map()
for (const e of entries(readings)) if (e.jp) jpFor.set(`${e.trad}|${e.pinyin}`, e.jp)

/** @type {Record<string, [string, string, string, 0|1][]>} */
const dict = {}
const add = (key, entry) => {
  const list = (dict[key] ??= [])
  const same = list.find((x) => x[0] === entry[0])
  if (same) {
    // Same reading: merge senses rather than listing the word twice.
    const have = same[1] ? same[1].split("; ") : []
    same[1] = [...have, ...entry[1].split("; ").filter((g) => g && !have.includes(g))].join("; ")
    same[2] ||= entry[2]
    same[3] = (same[3] || entry[3]) ? 1 : 0
  } else list.push(entry)
}

for (const e of entries(canto)) {
  if (!e.jp) continue
  const g = gloss(e.defs)
  add(e.trad, [e.jp, g.gloss, g.formal, 1])
}
const noReading = []
for (const e of entries(cedict)) {
  const jp = jpFor.get(`${e.trad}|${e.pinyin}`)
  if (!jp) {
    noReading.push(e)
    continue
  }
  const g = gloss(e.defs)
  add(e.trad, [jp, g.gloss, "", 0])
}
// How often each character takes each reading inside longer words, to put a character's
// everyday reading first (食 sik6, not the literary ji6).
const charReading = new Map()
for (const [k, list] of Object.entries(dict)) {
  const chars = [...k]
  if (chars.length < 2) continue
  for (const [jp] of list) {
    const syl = jp.split(" ")
    if (syl.length !== chars.length) continue
    chars.forEach((c, i) => charReading.set(`${c}|${syl[i]}`, (charReading.get(`${c}|${syl[i]}`) ?? 0) + 1))
  }
}

// Words with no Cantonese reading on file (女神, newer CC-CEDICT entries) get one built from each
// character's most common reading, so they still split and show a meaning.
const charJp = (c) => {
  const list = dict[c]
  if (!list) return null
  return [...list].sort((a, b) => (charReading.get(`${c}|${b[0]}`) ?? 0) - (charReading.get(`${c}|${a[0]}`) ?? 0))[0][0]
}
// Characters with no reading of their own (喺, 攰) take the one they have inside longer words.
for (const e of noReading) {
  if (dict[e.trad] || [...e.trad].length !== 1) continue
  let best = null
  for (const [k, n] of charReading) if (k.startsWith(`${e.trad}|`) && n > (best?.[1] ?? 0)) best = [k.split("|")[1], n]
  const g = gloss(e.defs)
  if (best) add(e.trad, [best[0], g.gloss.replace(/ \(Cantonese\)/g, ""), g.formal, e.defs.some((d) => d.includes("(Cantonese)")) ? 1 : 0])
}
for (const e of noReading) {
  if (dict[e.trad] || [...e.trad].length < 2) continue
  const syl = [...e.trad].map(charJp)
  if (syl.some((x) => !x)) continue
  add(e.trad, [syl.join(" "), gloss(e.defs).gloss, "", 0])
}

for (const [k, list] of Object.entries(dict)) {
  const usage = (e) => ([...k].length === 1 ? charReading.get(`${k}|${e[0]}`) ?? 0 : 0)
  list.sort((a, b) => usage(b) - usage(a) || b[3] - a[3])
  list.length = Math.min(list.length, 3)
  for (const x of list) if (x[1].length > 140) x[1] = x[1].slice(0, 140).replace(/;[^;]*$/, "")
  dict[k] = list
}

// Simplified headwords point at their Traditional form.
for (const e of [...entries(canto), ...entries(cedict)]) if (e.simp !== e.trad && !dict[e.simp] && Array.isArray(dict[e.trad])) dict[e.simp] = e.trad

// Mandarin equivalents in CC-Canto are Simplified; show them in Traditional.
for (const list of Object.values(dict)) if (Array.isArray(list)) for (const x of list) if (typeof dict[x[2]] === "string") x[2] = dict[x[2]]

fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify(dict))
console.log(`dict: ${Object.keys(dict).length} headwords, ${(fs.statSync(out).size / 1e6).toFixed(1)} MB`)
