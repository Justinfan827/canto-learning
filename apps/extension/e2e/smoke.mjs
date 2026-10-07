// Smoke test: loads the built extension in Chromium against a mock YouTube page and
// a mock transcriber helper. Reads along, pauses, looks up and saves a word, then opens
// a video with no captions and checks it transcribes on its own. Screenshots of each state go to e2e/screenshots/.
// Run: pnpm build && xvfb-run -a node e2e/smoke.mjs   (set CHROMIUM_PATH if needed)
import { chromium } from "playwright-core"
import { execSync } from "child_process"
import fs from "fs"

const EXT = new URL("../build/chrome-mv3-prod", import.meta.url).pathname
const VID = "mockvid0001"
const NOCAP = "mockvid0002"
const SHOTS = new URL("screenshots/", import.meta.url).pathname
fs.mkdirSync(SHOTS, { recursive: true })

const json3 = {
  events: [
    { tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: "大家好" }] },
    { tStartMs: 2000, dDurationMs: 2000, segs: [{ utf8: "他沒有看到" }] },
    { tStartMs: 4000, dDurationMs: 2000, segs: [{ utf8: "這麼古怪" }] },
    { tStartMs: 6000, dDurationMs: 2000, segs: [{ utf8: "我們走吧" }] },
  ],
}

const page = (vid, tracks) => `<!doctype html><html><head><meta charset="utf-8"><title>Mock YouTube</title></head><body>
<div id="movie_player"><video class="html5-main-video" width="320" height="180" preload="auto"></video><div class="captions"></div></div>
<script>
  const resp = { videoDetails: { videoId: "${vid}", title: "Mock vlog 測試", author: "Mock channel" },
    captions: { playerCaptionsTracklistRenderer: { captionTracks: ${JSON.stringify(tracks)} } } };
  window.ytInitialPlayerResponse = resp;
  const p = document.getElementById("movie_player");
  p.getPlayerResponse = () => resp;
  p.loadModule = () => {};
  p.setOption = (m, o, v) => { window.__setOption = v; fetch("/api/timedtext?v=${vid}&lang=" + v.languageCode + "&fmt=json3"); };
  const v = p.querySelector("video");
  v.src = "/silence.wav";
  window.__setTime = (s) => { v.currentTime = s };
</script></body></html>`

function makeWav(seconds, rate = 8000) {
  const n = seconds * rate, b = Buffer.alloc(44 + n)
  b.write("RIFF", 0); b.writeUInt32LE(36 + n, 4); b.write("WAVE", 8); b.write("fmt ", 12)
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24)
  b.writeUInt32LE(rate, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write("data", 36); b.writeUInt32LE(n, 40)
  b.fill(128, 44); return b
}
const wav = makeWav(20)
const ctx = await chromium.launchPersistentContext(fs.mkdtempSync("/tmp/pna-profile-"), {
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  headless: !process.env.HEADED,
  args: ["--autoplay-policy=no-user-gesture-required", `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
})
const logs = []
ctx.on("console", (m) => logs.push(m.text()))

await ctx.route("https://www.youtube.com/**", async (route) => {
  const url = route.request().url()
  if (url.endsWith("/silence.wav")) {
    const range = route.request().headers()["range"]
    const m = range && /bytes=(\d+)-(\d*)/.exec(range)
    if (!m) return route.fulfill({ contentType: "audio/wav", headers: { "accept-ranges": "bytes" }, body: wav })
    const start = +m[1], end = m[2] ? +m[2] : wav.length - 1
    return route.fulfill({ status: 206, contentType: "audio/wav", headers: { "accept-ranges": "bytes", "content-range": `bytes ${start}-${end}/${wav.length}` }, body: wav.subarray(start, end + 1) })
  }
  if (url.includes("/api/timedtext")) {
    const lang = new URL(url).searchParams.get("lang")
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(lang === "zh-HK" ? json3 : { events: [] }) })
  }
  const v = new URL(url).searchParams.get("v")
  const tracks = v === NOCAP ? [{ baseUrl: `/api/timedtext?v=${v}&lang=en`, languageCode: "en", name: { simpleText: "English" } }] : [
    { baseUrl: `/api/timedtext?v=${v}&lang=en`, languageCode: "en", name: { simpleText: "English" } },
    { baseUrl: `/api/timedtext?v=${v}&lang=zh-HK`, languageCode: "zh-HK", name: { simpleText: "中文（香港）" } }]
  return route.fulfill({ contentType: "text/html", body: page(v, tracks) })
})
// Mock transcriber helper. /transcribe is held until the test releases it, to catch the in-progress state.
let releaseTranscript
const transcriptHeld = new Promise((r) => (releaseTranscript = r))
const transcribeCalls = []
const studyPushes = []
await ctx.route("http://127.0.0.1:8787/**", async (route) => {
  const url = new URL(route.request().url())
  const cors = { "access-control-allow-origin": "*", "access-control-allow-methods": "*", "access-control-allow-headers": "*" }
  if (url.pathname === "/backup")
    return route.fulfill({ status: route.request().method() === "GET" ? 404 : 200, contentType: "application/json", headers: cors, body: "{}" })
  if (url.pathname === "/study") {
    if (route.request().method() === "PUT") studyPushes.push(route.request().postDataJSON())
    return route.fulfill({ status: route.request().method() === "OPTIONS" ? 204 : 200, contentType: "application/json", headers: cors, body: "{}" })
  }
  if (url.pathname === "/study/words")
    return route.fulfill({ status: route.request().method() === "OPTIONS" ? 204 : 200, contentType: "application/json", headers: cors, body: JSON.stringify({ words: [] }) })
  if (url.pathname === "/engines")
    return route.fulfill({ contentType: "application/json", headers: cors, body: JSON.stringify({ engines: [
      { id: "sensevoice", label: "SenseVoice Small (sherpa-onnx)", languages: "", unavailable: "model not downloaded" },
      { id: "whisper-cpp-turbo", label: "Whisper turbo", languages: "", unavailable: null }] }) })
  transcribeCalls.push(Object.fromEntries(url.searchParams))
  await transcriptHeld
  const ev = [
    { type: "progress", stage: "Transcribing with Whisper turbo", pass: 1, fromMs: 0, durationMs: 20000 },
    ...["我哋今日去深水埗", "呢間茶餐廳好正"].map((text, idx) => ({ type: "line", line: { idx, startMs: idx * 3000, endMs: idx * 3000 + 3000, text } })),
    { type: "done" }]
  return route.fulfill({ contentType: "application/x-ndjson", headers: cors, body: ev.map((e) => JSON.stringify(e)).join("\n") + "\n" })
})
// Find the extension id from its service worker.
let [sw] = ctx.serviceWorkers()
if (!sw) sw = await ctx.waitForEvent("serviceworker")
const extId = new URL(sw.url()).host

const yt = await ctx.newPage()
yt.on("console", (m) => logs.push(m.text()))
yt.on("pageerror", (e) => logs.push("PAGEERR " + e.message))
await yt.goto(`https://www.youtube.com/watch?v=${VID}`)
// On a fresh profile the first page can load before the content scripts are registered; reload once if so.
const trackEnabled = () => yt.waitForFunction(() => window.__setOption, null, { timeout: 5000 }).then(() => true, () => false)
if (!(await trackEnabled())) { await yt.reload(); await trackEnabled() }
if (process.env.DEBUG) console.log("LOGS", logs, await yt.evaluate(() => [document.title, typeof window.__setOption, document.documentElement.outerHTML.length]))
const opt = await yt.evaluate(() => window.__setOption)
console.log("track enabled:", JSON.stringify(opt))
const tabId = await sw.evaluate(async () => (await chrome.tabs.query({ url: "https://www.youtube.com/*" }))[0].id)
// CONVEX_URL + CONVEX_TOKEN run the same flow with saved words on the local Convex deployment
// from `pnpm --filter @pna/backend dev`. It starts by emptying that deployment.
const convex = process.env.CONVEX_URL ? { url: process.env.CONVEX_URL, token: process.env.CONVEX_TOKEN ?? "" } : null
if (convex) execSync("npx convex run admin:clearAll", { cwd: new URL("../../../packages/backend", import.meta.url).pathname, stdio: "ignore" })
if (convex) await sw.evaluate((c) => chrome.storage.local.set({ dataBackend: "convex", convexUrl: c.url, convexToken: c.token }), convex)
const convexSnapshot = async () => {
  const r = await fetch(`${convex.url}/api/query`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: "study:snapshot", args: { token: convex.token }, format: "json" }) })
  return (await r.json()).value
}

const panel = await ctx.newPage()
await panel.setViewportSize({ width: 380, height: 720 })
await panel.goto(`chrome-extension://${extId}/sidepanel.html?tab=${tabId}`)
await panel.waitForSelector(".moment", { timeout: 10000 }) // the video starts paused, so the panel opens on line 0's card
// Line text without the Jyutping ruby.
const text = (sel) => panel.$eval(sel, (el) => { const c = el.cloneNode(true); c.querySelectorAll("rt").forEach((r) => r.remove()); return c.textContent.replace(/\s+/g, "") })
console.log("pill:", await panel.locator(".bar .pill").innerText(), "| opened on:", await text(".moment .big"))

// Read-along: the current line has Jyutping and a highlighted word.
await yt.evaluate(async () => { const v = document.querySelector("video"); if (v.readyState < 1) await new Promise(r => v.addEventListener("loadedmetadata", r, { once: true })); v.currentTime = 4.6; await v.play() })
await panel.waitForSelector(".ln.now[data-idx='2']", { timeout: 5000 })
console.log("lines:", await panel.locator(".lyrics .ln").count(), "| now line:", await text(".ln.now"), "| ruby:", await panel.locator(".ln.now rt").allInnerTexts(), "| word highlights:", await panel.locator(".ln .w.cur").count())
await panel.screenshot({ path: SHOTS + "1-watching.png" })

// Pausing opens the card with dictionary lookups and saving.
await yt.evaluate(() => document.querySelector("video").pause())
await panel.waitForSelector(".moment .chip-w", { timeout: 10000 })
console.log("card words:", await panel.locator(".moment .chip-w").allInnerTexts(), "| card actions:", await panel.locator(".moment .act").allInnerTexts())
if (await panel.locator(".dock form, .dock input, .answer").count()) throw new Error("tutor UI still shown on pause")
await panel.locator(".moment .chip-w").last().click()
await panel.waitForSelector(".sheet")
await panel.waitForTimeout(300) // let the sheet finish rising
console.log("word sheet:", (await panel.locator(".sheet").innerText()).replace(/\n/g, " | "))
// A word with no examples shows no examples section at all.
if ((await panel.locator(".sheet .examples").count()) && !(await panel.locator(".sheet .examples .ex").count())) throw new Error("empty examples section shown")
await panel.screenshot({ path: SHOTS + "3-word.png" })
await panel.click(".sheet .save")
await panel.waitForSelector(".sheet .save.done", { timeout: 5000 })
if (convex) {
  const snap = await convexSnapshot()
  const w = snap.words.find((x) => x.colloquial === "古怪")
  console.log("convex word:", w?.colloquial, "| sources:", w?.sources.map((s) => `${s.videoId}#${s.lineIdx}`))
  if (!w?.sources.some((s) => s.videoId === VID)) throw new Error("saved word didn't reach Convex")
}
await panel.keyboard.press("Escape")
await panel.waitForSelector(".sheet", { state: "detached" })
console.log("saved badge:", await panel.locator(".ib .n").innerText(), "| saved underline:", await panel.locator(".moment .chip-w.saved").allInnerTexts())
await panel.screenshot({ path: SHOTS + "2-paused.png" })

// Drag across the line's words to regroup them into one, then undo.
{
  const chips = panel.locator(".moment .chip-w")
  const split = await chips.count()
  const first = await chips.first().boundingBox()
  const last = await chips.last().boundingBox()
  await panel.mouse.move(first.x + 4, first.y + first.height / 2)
  await panel.mouse.down()
  await panel.mouse.move(last.x + last.width - 4, last.y + last.height / 2, { steps: 6 })
  console.log("drag hint:", await panel.locator(".regroup-hint").innerText())
  await panel.mouse.up()
  await panel.waitForFunction(() => document.querySelectorAll(".moment .chip-w").length === 1, null, { timeout: 5000 })
  await panel.waitForSelector(".sheet")
  console.log("regrouped words:", await chips.allInnerTexts(), "| sheet:", (await panel.locator(".sheet .dhead").innerText()).replace(/\n/g, " "))
  await panel.keyboard.press("Escape")
  await panel.waitForSelector(".sheet", { state: "detached" })
  const stored = await panel.evaluate(() => chrome.storage.local.get("groupings"))
  console.log("stored grouping:", JSON.stringify(stored.groupings))
  await panel.click(".regroup-hint .link")
  await panel.waitForFunction((n) => document.querySelectorAll(".moment .chip-w").length === n, split)
  console.log("after undo:", await chips.allInnerTexts())
}

// Example sentences come from the bundled Tatoeba set, with Jyutping and English, no model needed.
await yt.evaluate(async () => { const v = document.querySelector("video"); v.currentTime = 6.5; await v.play() })
await panel.waitForSelector(".ln.now[data-idx='3']", { timeout: 5000 })
await yt.evaluate(() => document.querySelector("video").pause())
await panel.waitForFunction(() => document.querySelector(".moment .chip-w")?.textContent.startsWith("我"), null, { timeout: 5000 })
await panel.locator(".moment .chip-w").first().click()
await panel.waitForSelector(".sheet .examples .ex", { timeout: 5000 })
{
  const ex = panel.locator(".sheet .examples .ex").first()
  console.log("examples for", await panel.locator(".sheet .dhead .hz").innerText(), ":", await panel.locator(".sheet .examples .ex").count(), "| first:", await ex.locator(".ex-yue").innerText(), "/", await ex.locator(".ex-jp").innerText(), "/", await ex.locator(".ex-en").innerText(), "| source:", await panel.locator(".sheet .src span").first().innerText())
  if (!(await ex.locator(".ex-yue b").count()) || !(await ex.locator(".ex-jp").innerText()).trim()) throw new Error("example sentence missing the marked word or its Jyutping")
}
await panel.waitForTimeout(300)
await panel.screenshot({ path: SHOTS + "3-examples.png" })
await panel.keyboard.press("Escape")
await panel.waitForSelector(".sheet", { state: "detached" })
// Back to line 2 paused, where the rest of the test expects to be.
await yt.evaluate(async () => { const v = document.querySelector("video"); v.currentTime = 4.5; await v.play() })
await panel.waitForSelector(".ln.now[data-idx='2']", { timeout: 5000 })
await yt.evaluate(() => document.querySelector("video").pause())
await panel.waitForFunction(() => document.querySelector(".moment .chip-w")?.textContent.startsWith("這"), null, { timeout: 5000 })

// Settings have no tutor or microphone sections.
const setup = await ctx.newPage()
await setup.goto(`chrome-extension://${extId}/tabs/setup.html`)
const sections = await setup.locator("section h2").allInnerTexts()
console.log("settings sections:", sections, "| transcriber:", await setup.locator("#captions select option").first().innerText())
if (sections.some((h) => /tutor|microphone/i.test(h))) throw new Error("settings still show the tutor")
await setup.close()
await panel.bringToFront()

// Display menu: no Jyutping. Written Chinese needs a local transcript, so it's off here.
await panel.click("button[aria-label='Display options']")
await panel.screenshot({ path: SHOTS + "5-display.png" })
console.log("display options:", (await panel.locator(".pop").innerText()).replace(/\n/g, " | "))
if (/English|tutor/i.test(await panel.locator(".pop").innerText())) throw new Error("display menu still offers tutor options")
await panel.click(".pop button[aria-label='Jyutping']")
await panel.waitForTimeout(200)
console.log("card rt count:", await panel.locator(".moment rt").count())
await panel.click(".pop button[aria-label='Jyutping']")
await panel.keyboard.press("Escape")

// Click a context line seeks.
await panel.click(".paused .ctx .ln >> nth=0")
await panel.waitForTimeout(300)
console.log("after seek time:", await yt.evaluate(() => document.querySelector("video").currentTime))

// Saved words list.
await panel.click("button[aria-label='Saved words']")
await panel.waitForSelector(".list .item")
console.log("saved list:", (await panel.locator(".list .item").allInnerTexts()).map((t) => t.replace(/\n/g, " ")))
await panel.screenshot({ path: SHOTS + "6-saved.png" })
// A row opens the word's details in place, with a speaker and a link back to the video.
const before = await yt.evaluate(() => document.querySelector("video").currentTime)
await panel.click(".list .item >> nth=0")
await panel.waitForSelector(".sheet")
console.log("saved detail:", (await panel.locator(".sheet .dhead").innerText()).replace(/\n/g, " "), "| from:", (await panel.locator(".sheet .from-link").innerText()).replace(/\n/g, " "))
if (!(await panel.locator(".sheet button[aria-label='Hear it']").count())) throw new Error("saved word detail has no speaker button")
if (!(await panel.locator(".list").count())) throw new Error("clicking a saved word left the saved list")
if ((await yt.evaluate(() => document.querySelector("video").currentTime)) !== before) throw new Error("clicking a saved word seeked the video")
await panel.screenshot({ path: SHOTS + "6b-saved-detail.png" })
await panel.keyboard.press("Escape")
await panel.waitForSelector(".sheet", { state: "detached" })
if (!(await panel.locator(".list button[aria-label^='Hear ']").count())) throw new Error("saved rows have no speaker button")

// Add a word by hand: the dictionary fills Jyutping and meaning, and it lands at the top tagged as added by hand.
await panel.click(".bar .pill >> text=Add word")
await panel.fill(".add input.hz", "傾偈")
await panel.waitForFunction(() => document.querySelectorAll(".add input")[1]?.value, null, { timeout: 5000 })
const filled = await panel.locator(".add input").evaluateAll((els) => els.map((e) => e.value))
console.log("add word filled:", JSON.stringify(filled))
if (!filled[1] || !filled[2]) throw new Error("dictionary didn't fill the new word")
await panel.screenshot({ path: SHOTS + "8-add-word.png" })
await panel.click(".add button[type=submit]")
await panel.waitForSelector(".add-note.ok", { timeout: 5000 })
const top = (await panel.locator(".list .item").first().innerText()).replace(/\n/g, " ")
console.log("after add:", await panel.locator(".add-note").innerText(), "| top item:", top)
if (!top.includes("傾偈") || !top.includes("Added by hand")) throw new Error("added word isn't at the top of the list")
await panel.fill(".add input.hz", "傾偈")
console.log("duplicate hint:", await panel.locator(".add-note.warn").innerText())
await panel.click(".add button[aria-label='Close']")
await panel.click("text=Back to video")

// Space plays; playing collapses the card.
await panel.locator("body").click({ position: { x: 5, y: 700 } }).catch(() => {})
await panel.keyboard.press("Space")
await panel.waitForTimeout(400)
console.log("after Space paused:", await yt.evaluate(() => document.querySelector("video").paused), "| card:", await panel.locator(".moment").count(), "| hint:", await panel.locator(".hint").innerText())
const words = convex ? (await convexSnapshot()).words : await panel.evaluate(() => new Promise((res) => { const r = indexedDB.open("pause-and-ask"); r.onsuccess = () => { const q = r.result.transaction("words").objectStore("words").getAll(); q.onsuccess = () => res(q.result) } }))
console.log("stored words:", JSON.stringify(words.map((w) => [w.colloquial, w.jyutping, w.timesAsked])))

// A video with no Chinese captions transcribes on its own, from the playhead.
await yt.goto(`https://www.youtube.com/watch?v=${NOCAP}`)
await yt.evaluate(async () => { const v = document.querySelector("video"); if (v.readyState < 1) await new Promise(r => v.addEventListener("loadedmetadata", r, { once: true })); v.currentTime = 1 })
await panel.waitForSelector(".pill >> text=Transcribing ·", { timeout: 10000 })
await panel.waitForSelector(".loading-card")
console.log("transcribing:", await panel.locator(".bar .pill").innerText(), "| loading:", (await panel.locator(".loading-card").innerText()).replace(/\n/g, " | "))
await panel.screenshot({ path: SHOTS + "7-transcribing.png" })
releaseTranscript()
await yt.evaluate(() => document.querySelector("video").play())
await panel.waitForSelector(".lyrics .ln[data-idx='1']", { timeout: 10000 })
console.log("transcribed:", await panel.locator(".bar .pill").innerText(), "| lines:", await panel.locator(".lyrics .ln").count(), "| request:", JSON.stringify(transcribeCalls))
console.log("menu on no-caption video:", (await (async () => { await panel.click(".bar .pill"); const t = await panel.locator(".src-menu").innerText(); await panel.keyboard.press("Escape"); await panel.click(".bar .pill"); return t })()).replace(/\n/g, " | "))

// Back on a captioned video: YouTube is the default, and the pill's menu switches to a local model and back.
await yt.goto(`https://www.youtube.com/watch?v=${VID}`)
await panel.waitForSelector(".pill >> text=YouTube captions", { timeout: 10000 })
await panel.click(".bar .pill")
console.log("source menu:", (await panel.locator(".src-menu .srcopt").allInnerTexts()).map((t) => t.replace(/\n/g, " ")).join(" | "))
await panel.click(".src-menu .srcopt:has-text('Whisper turbo')")
await panel.waitForSelector(".pill >> text=Whisper turbo", { timeout: 10000 })
console.log("after picking local:", await panel.locator(".bar .pill").innerText(), "| preferLocal:", (await panel.evaluate(() => chrome.storage.local.get("preferLocal"))).preferLocal)
await panel.click(".bar .pill")
await panel.click(".src-menu .srcopt:has-text('YouTube captions')")
await panel.waitForSelector(".pill >> text=YouTube captions", { timeout: 10000 })
await panel.waitForSelector(".lyrics .ln[data-idx='3'], .moment", { timeout: 5000 }).catch(() => {})
console.log("back to YouTube:", await panel.locator(".bar .pill").innerText(), "| lines:", await panel.locator(".lyrics .ln").count(), "| card:", await text(".moment .big").catch(() => "-"))
// With Convex the phone reads Convex, so nothing is pushed to the helper.
const lastPush = convex ? await convexSnapshot() : studyPushes.at(-1)
console.log(convex ? "convex snapshot:" : `study pushes: ${studyPushes.length} |`, "words:", lastPush?.words.map((w) => [w.colloquial, w.sources.length]), "| videos:", lastPush?.videos.map((v) => v.id))
if (convex && studyPushes.length) throw new Error("pushed to the helper while on Convex")
const fromVideos = lastPush?.words.filter((w) => w.source !== "manual") ?? []
if (!fromVideos.length || !fromVideos.every((w) => w.sources.length)) throw new Error("study snapshot missing saved words or their source lines")
if (!lastPush.words.some((w) => w.colloquial === "傾偈" && w.source === "manual" && w.jyutping)) throw new Error("study snapshot missing the word added by hand")
console.log("errors:", logs.filter((l) => /error/i.test(l)).slice(0, 5))
await ctx.close()
