// Smoke test: loads the built extension in Chromium against a mock YouTube page
// and a mock Claude API, then pauses, asks and checks the word is stored.
// Run: pnpm build && xvfb-run -a node e2e/smoke.mjs   (set CHROMIUM_PATH if needed)
import { chromium } from "playwright-core"
import fs from "fs"

const EXT = new URL("../build/chrome-mv3-prod", import.meta.url).pathname
const VID = "mockvid0001"

const json3 = {
  events: [
    { tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: "大家好" }] },
    { tStartMs: 2000, dDurationMs: 2000, segs: [{ utf8: "他沒有看到" }] },
    { tStartMs: 4000, dDurationMs: 2000, segs: [{ utf8: "這麼古怪" }] },
    { tStartMs: 6000, dDurationMs: 2000, segs: [{ utf8: "我們走吧" }] },
  ],
}

const page = `<!doctype html><html><head><meta charset="utf-8"><title>Mock YouTube</title></head><body>
<div id="movie_player"><video class="html5-main-video" width="320" height="180" preload="auto"></video><div class="captions"></div></div>
<script>
  const resp = { videoDetails: { videoId: "${VID}", title: "Mock vlog 測試", author: "Mock channel" },
    captions: { playerCaptionsTracklistRenderer: { captionTracks: [
      { baseUrl: "/api/timedtext?v=${VID}&lang=en", languageCode: "en", name: { simpleText: "English" } },
      { baseUrl: "/api/timedtext?v=${VID}&lang=zh-HK", languageCode: "zh-HK", name: { simpleText: "中文（香港）" } } ] } } };
  window.ytInitialPlayerResponse = resp;
  const p = document.getElementById("movie_player");
  p.getPlayerResponse = () => resp;
  p.loadModule = () => {};
  p.setOption = (m, o, v) => { window.__setOption = v; fetch("/api/timedtext?v=${VID}&lang=" + v.languageCode + "&fmt=json3"); };
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
  return route.fulfill({ contentType: "text/html", body: page })
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

// Configure settings via the setup page.
const setup = await ctx.newPage()
await setup.goto(`chrome-extension://${extId}/tabs/setup.html`)
await setup.fill('input[type=password]', "sk-ant-test")
await setup.click("button:has-text(\"Save\")")
await setup.waitForSelector("text=Connected", { timeout: 10000 })
console.log("setup: connected")

const yt = await ctx.newPage()
yt.on("console", (m) => logs.push(m.text()))
yt.on("pageerror", (e) => logs.push("PAGEERR " + e.message))
await yt.goto(`https://www.youtube.com/watch?v=${VID}`)
await yt.waitForTimeout(1500)
const opt = await yt.evaluate(() => window.__setOption)
console.log("track enabled:", JSON.stringify(opt))
const tabId = await sw.evaluate(async () => (await chrome.tabs.query({ url: "https://www.youtube.com/*" }))[0].id)

const panel = await ctx.newPage()
await panel.goto(`chrome-extension://${extId}/sidepanel.html?tab=${tabId}`)
await panel.waitForSelector(".transcript li[data-idx='3']", { timeout: 10000 })
console.log("transcript lines:", await panel.locator(".transcript li").count())
await panel.waitForSelector("text=佢冇睇到", { timeout: 10000 })
console.log("colloquial shown, inferred tags:", await panel.locator(".tag").count())

// Play to 4.5s, then pause.
console.log("seekable:", await yt.evaluate(async () => { const v = document.querySelector("video"); if (v.readyState < 1) await new Promise(r => v.addEventListener("loadedmetadata", r, { once: true })); return v.seekable.length + " dur " + v.duration }))
await yt.evaluate(async () => { const v = document.querySelector("video"); v.currentTime = 4.2; await v.play() })
await panel.waitForTimeout(800)
console.log("current line:", await panel.locator(".transcript li.current").innerText())
await yt.evaluate(() => document.querySelector("video").pause())
await panel.waitForSelector(".focus .word", { timeout: 10000 })
console.log("focus card words:", await panel.locator(".focus .word").allInnerTexts())
await panel.locator(".focus .word").first().click()
console.log("word card:", (await panel.locator(".wordcard").innerText()).replace(/\n/g, " | "))
await panel.click("text=Explain this line")
await panel.waitForSelector(".msg.assistant >> text=gam3", { timeout: 10000 })
console.log("answer:", await panel.locator(".msg.assistant").innerText())
console.log("ask prompt:", globalThis.__askUser)
await panel.waitForSelector("text=Added to your words", { timeout: 10000 })
console.log("logged:", await panel.locator(".logged").innerText())
console.log("claude calls:", JSON.stringify(claudeCalls, null, 0))

// Register switch.
await panel.click(".switch >> text=書面語")
console.log("formal view line 2:", await panel.locator(".transcript li[data-idx='2']").innerText())

// Click a line seeks.
await panel.click(".transcript li[data-idx='1']")
await panel.waitForTimeout(300)
console.log("after seek time:", await yt.evaluate(() => document.querySelector("video").currentTime))

// Play collapses the card.
await yt.evaluate(() => document.querySelector("video").play())
await panel.waitForTimeout(300)
console.log("focus card after play:", await panel.locator(".focus").count())
await panel.screenshot({ path: new URL("panel.png", import.meta.url).pathname })
const words = await panel.evaluate(() => new Promise((res) => { const r = indexedDB.open("pause-and-ask"); r.onsuccess = () => { const q = r.result.transaction("words").objectStore("words").getAll(); q.onsuccess = () => res(q.result) } }))
console.log("stored words:", JSON.stringify(words.map((w) => [w.colloquial, w.jyutping, w.timesAsked])))
console.log("errors:", logs.filter((l) => /error/i.test(l)).slice(0, 5))
await ctx.close()
