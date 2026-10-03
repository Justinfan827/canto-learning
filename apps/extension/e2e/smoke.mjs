// Smoke test: loads the built extension in Chromium against a mock YouTube page,
// a mock Claude API and a mock transcriber helper. Reads along, pauses, looks up and
// saves a word, asks the tutor, then opens a video with no captions and checks it
// transcribes on its own. Screenshots of each state go to e2e/screenshots/.
// Run: pnpm build && xvfb-run -a node e2e/smoke.mjs   (set CHROMIUM_PATH if needed)
import { chromium } from "playwright-core"
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
  headless: false,
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
await ctx.route("http://127.0.0.1:8787/**", async (route) => {
  const url = new URL(route.request().url())
  const cors = { "access-control-allow-origin": "*" }
  if (url.pathname === "/engines")
    return route.fulfill({ contentType: "application/json", headers: cors, body: JSON.stringify({ engines: [
      { id: "whisper-cpp-turbo", label: "Whisper large-v3-turbo (whisper.cpp)", languages: "", unavailable: "not installed" },
      { id: "whisper-turbo", label: "Whisper turbo", languages: "", unavailable: null },
      { id: "parakeet-v3", label: "Parakeet", languages: "", unavailable: null }] }) })
  transcribeCalls.push(Object.fromEntries(url.searchParams))
  await transcriptHeld
  const ev = [
    { type: "progress", stage: "Transcribing with Whisper turbo", pass: 1, fromMs: 0, durationMs: 20000 },
    ...["我哋今日去深水埗", "呢間茶餐廳好正"].map((text, idx) => ({ type: "line", line: { idx, startMs: idx * 3000, endMs: idx * 3000 + 3000, text } })),
    { type: "done" }]
  return route.fulfill({ contentType: "application/x-ndjson", headers: cors, body: ev.map((e) => JSON.stringify(e)).join("\n") + "\n" })
})
// Mock the Claude API with real response shapes.
const claudeCalls = []
await ctx.route("https://api.anthropic.com/**", async (route) => {
  const req = route.request()
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" }
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { ...cors, "access-control-allow-methods": "*" } })
  const url = new URL(req.url())
  if (url.pathname.startsWith("/v1/models")) return route.fulfill({ contentType: "application/json", headers: cors, body: JSON.stringify({ data: [], has_more: false, first_id: null, last_id: null }) })
  const body = req.postDataJSON()
  const sys = typeof body.system === "string" ? body.system : body.system.map((b) => b.text).join("")
  const user = typeof body.messages.at(-1).content === "string" ? body.messages.at(-1).content : JSON.stringify(body.messages.at(-1).content)
  claudeCalls.push({ model: body.model, kind: sys.slice(0, 40), stream: !!body.stream, fmt: !!body.output_config?.format, fallbacks: body.fallbacks, beta: req.headers()["anthropic-beta"] })
  const msg = (text) => ({ id: "msg_1", type: "message", role: "assistant", model: body.model, content: [{ type: "text", text }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } })
  let out
  if (sys.startsWith("You convert")) {
    const idxs = [...user.split("Convert these lines:\n")[1].matchAll(/^(\d+): (.*)$/gm)].map((m) => [+m[1], m[2]])
    const conv = { "他沒有看到": "佢冇睇到", "這麼古怪": "咁古怪", "我們走吧": "我哋走啦" }
    out = { lines: idxs.map(([idx, t]) => ({ idx, source_register: conv[t] ? "formal" : "colloquial", formal: t, colloquial: conv[t] ?? t, colloquial_inferred: !!conv[t] })) }
  } else if (sys.startsWith("Split")) {
    out = { words: [{ text: "這麼", jyutping: "ze5 mo1", meaning: "so", formal: null, colloquial: "咁", likely_error: null }, { text: "古怪", jyutping: "gu2 gwaai3", meaning: "strange", formal: null, colloquial: null, likely_error: null }] }
  } else if (sys.startsWith("From a tutoring")) {
    out = { words: [{ colloquial: "咁", formal: "這麼", jyutping: "gam3", meaning: "so, that much", notes: null }] }
  }
  if (out) return route.fulfill({ contentType: "application/json", headers: cors, body: JSON.stringify(msg(JSON.stringify(out))) })
  globalThis.__askUser = user
  const chunks = ["**咁** (gam3) means *so*. ", "It's 口語; the 書面語 form is 這麼."]
  const ev = (type, data) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`
  const m = msg(""); m.content = []
  const sse = ev("message_start", { message: m }) + ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } }) +
    chunks.map((t) => ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: t } })).join("") +
    ev("content_block_stop", { index: 0 }) + ev("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 10 } }) + ev("message_stop", {})
  return route.fulfill({ contentType: "text/event-stream", headers: cors, body: sse })
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

// No model set up: pausing opens the card; dictionary lookups and saving still work.
await yt.evaluate(() => document.querySelector("video").pause())
await panel.waitForSelector(".moment .chip-w", { timeout: 10000 })
console.log("no-AI words:", await panel.locator(".moment .chip-w").allInnerTexts())
console.log("no-AI dock:", await panel.locator(".offnote").innerText(), "| explain button:", await panel.locator(".act.ai").count())
await panel.locator(".moment .chip-w").last().click()
await panel.waitForSelector(".sheet")
await panel.waitForTimeout(300) // let the sheet finish rising
console.log("no-AI word sheet:", (await panel.locator(".sheet").innerText()).replace(/\n/g, " | "))
await panel.screenshot({ path: SHOTS + "3-word.png" })
await panel.click(".sheet .save")
await panel.waitForSelector(".sheet .save.done", { timeout: 5000 })
await panel.keyboard.press("Escape")
await panel.waitForSelector(".sheet", { state: "detached" })
console.log("saved badge:", await panel.locator(".ib .n").innerText(), "| saved underline:", await panel.locator(".moment .chip-w.saved").allInnerTexts())
await panel.screenshot({ path: SHOTS + "2-paused-no-tutor.png" })

// Drag across both words to regroup them, then undo.
{
  const chips = panel.locator(".moment .chip-w")
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
  await panel.waitForFunction(() => document.querySelectorAll(".moment .chip-w").length === 2)
  console.log("after undo:", await chips.allInnerTexts())
}

// Turn on Claude in settings.
const setup = await ctx.newPage()
await setup.goto(`chrome-extension://${extId}/tabs/setup.html`)
console.log("settings sections:", await setup.locator("section h2").allInnerTexts(), "| transcriber:", await setup.locator("#captions select option").first().innerText())
await setup.click("text=Claude (paid")
await setup.fill('input[type=password]', "sk-ant-test")
await setup.click("button:has-text(\"Save\")")
await setup.waitForSelector("text=Connected", { timeout: 10000 })
console.log("setup: connected")
await panel.bringToFront()
await yt.evaluate(async () => { const v = document.querySelector("video"); v.currentTime = 2.5; await v.play() })
await panel.waitForFunction(() => [...document.querySelectorAll(".ln[data-idx='1'] .w")].map((w) => w.firstChild?.textContent ?? "").join("").includes("佢") || document.querySelector(".ln[data-idx='1']")?.textContent.includes("佢"), null, { timeout: 10000 })
console.log("colloquial line 1:", await text(".ln[data-idx='1']"), "| english:", await panel.locator(".ln.now .en").count())

// Play to 4.2s, then pause.
await yt.evaluate(async () => { const v = document.querySelector("video"); v.currentTime = 4.2; await v.play() })
await panel.waitForTimeout(800)
console.log("current line:", await text(".ln.now"))
await yt.evaluate(() => document.querySelector("video").pause())
await panel.waitForSelector(".moment .chip-w", { timeout: 10000 })
console.log("card words:", await panel.locator(".moment .chip-w").allInnerTexts(), "| inferred:", await panel.locator(".moment .top").innerText())
await panel.click(".act.ai")
await panel.waitForSelector(".answer .a >> text=gam3", { timeout: 10000 })
console.log("answer:", await panel.locator(".answer .a").first().innerText())
console.log("ask prompt:", globalThis.__askUser)
await panel.waitForSelector(".answer .follow >> text=Save", { timeout: 10000 })
console.log("follow chips:", await panel.locator(".answer .follow .act").allInnerTexts())
await panel.screenshot({ path: SHOTS + "4-tutor.png" })
await panel.emulateMedia({ colorScheme: "dark" })
await panel.screenshot({ path: SHOTS + "4-tutor-dark.png" })
await panel.emulateMedia({ colorScheme: "light" })
await panel.click(".answer .follow .act >> nth=0")
await panel.waitForSelector(".answer .follow .act.done", { timeout: 5000 })
console.log("claude calls:", JSON.stringify(claudeCalls, null, 0))

// Display menu: written Chinese, no Jyutping.
await panel.click("button[aria-label='Display options']")
await panel.screenshot({ path: SHOTS + "5-display.png" })
await panel.click(".pop >> text=書面語")
await panel.click(".pop button[aria-label='Jyutping']")
await panel.waitForTimeout(200)
console.log("formal card:", (await panel.locator(".moment .big").innerText()).replace(/\s+/g, ""), "| rt count:", await panel.locator(".moment rt").count())
await panel.click(".pop >> text=口語")
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
await panel.click("text=Back to video")

// Space plays; playing collapses the card.
await panel.locator("body").click({ position: { x: 5, y: 700 } }).catch(() => {})
await panel.keyboard.press("Space")
await panel.waitForTimeout(400)
console.log("after Space paused:", await yt.evaluate(() => document.querySelector("video").paused), "| card:", await panel.locator(".moment").count(), "| hint:", await panel.locator(".hint").innerText())
const words = await panel.evaluate(() => new Promise((res) => { const r = indexedDB.open("pause-and-ask"); r.onsuccess = () => { const q = r.result.transaction("words").objectStore("words").getAll(); q.onsuccess = () => res(q.result) } }))
console.log("stored words:", JSON.stringify(words.map((w) => [w.colloquial, w.jyutping, w.timesAsked])))

// A video with no Chinese captions transcribes on its own, from the playhead.
await yt.goto(`https://www.youtube.com/watch?v=${NOCAP}`)
await yt.evaluate(async () => { const v = document.querySelector("video"); if (v.readyState < 1) await new Promise(r => v.addEventListener("loadedmetadata", r, { once: true })); v.currentTime = 1 })
await panel.waitForSelector(".pill >> text=Transcribing ·", { timeout: 10000 })
console.log("transcribing:", await panel.locator(".bar .pill").innerText(), "| notice:", await panel.locator(".notice").count(), "| skeleton:", await panel.locator(".skel").count())
await panel.screenshot({ path: SHOTS + "7-transcribing.png" })
await panel.click(".notice .link")
await panel.waitForSelector(".notice", { state: "detached" })
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
console.log("errors:", logs.filter((l) => /error/i.test(l)).slice(0, 5))
await ctx.close()
