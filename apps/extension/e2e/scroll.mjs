// Scroll probe: a long mock transcript, played in headless Chromium, logging how the read-along
// list scrolls as lines change, when the user scrolls away, and when they seek.
// Run: pnpm build:ext && CHROMIUM_PATH=... node e2e/scroll.mjs
import { chromium } from "playwright-core"
import fs from "fs"

const EXT = new URL("../build/chrome-mv3-prod", import.meta.url).pathname
const SHOTS = new URL("screenshots/", import.meta.url).pathname
fs.mkdirSync(SHOTS, { recursive: true })
const VID = "mockscroll01"
const N = 80, STEP = 1500
const sample = ["我哋今日去深水埗食嘢", "呢間茶餐廳好正，我細個成日嚟", "你試吓佢哋嘅菠蘿包", "好味到唔得了", "我哋走啦", "其實香港有好多好食嘅地方，不過要識搵先得"]
const json3 = { events: Array.from({ length: N }, (_, i) => ({ tStartMs: i * STEP, dDurationMs: STEP, segs: [{ utf8: sample[i % sample.length] }] })) }
const page = `<!doctype html><html><head><meta charset="utf-8"><title>Mock</title></head><body>
<div id="movie_player"><video class="html5-main-video" width="320" height="180" preload="auto"></video><div class="captions"></div></div>
<script>
  const resp = { videoDetails: { videoId: "${VID}", title: "Scroll test", author: "Mock" },
    captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ baseUrl: "/api/timedtext?v=${VID}&lang=zh-HK", languageCode: "zh-HK", name: { simpleText: "中文" } }] } } };
  window.ytInitialPlayerResponse = resp;
  const p = document.getElementById("movie_player");
  p.getPlayerResponse = () => resp; p.loadModule = () => {};
  p.setOption = (m, o, v) => { window.__setOption = v; fetch("/api/timedtext?v=${VID}&lang=" + v.languageCode + "&fmt=json3"); };
  p.querySelector("video").src = "/silence.wav";
</script></body></html>`
function makeWav(seconds, rate = 8000) {
  const n = seconds * rate, b = Buffer.alloc(44 + n)
  b.write("RIFF", 0); b.writeUInt32LE(36 + n, 4); b.write("WAVE", 8); b.write("fmt ", 12)
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24)
  b.writeUInt32LE(rate, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write("data", 36); b.writeUInt32LE(n, 40)
  b.fill(128, 44); return b
}
const wav = makeWav(Math.ceil((N * STEP) / 1000) + 5)
const ctx = await chromium.launchPersistentContext(fs.mkdtempSync("/tmp/pna-scroll-"), {
  executablePath: process.env.CHROMIUM_PATH, headless: !process.env.HEADED,
  args: ["--autoplay-policy=no-user-gesture-required", `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
})
await ctx.route("http://127.0.0.1:8787/**", (r) => r.abort())
await ctx.route("https://www.youtube.com/**", async (route) => {
  const url = route.request().url()
  if (url.endsWith("/silence.wav")) {
    const m = /bytes=(\d+)-(\d*)/.exec(route.request().headers()["range"] ?? "")
    if (!m) return route.fulfill({ contentType: "audio/wav", headers: { "accept-ranges": "bytes" }, body: wav })
    const s = +m[1], e = m[2] ? +m[2] : wav.length - 1
    return route.fulfill({ status: 206, contentType: "audio/wav", headers: { "accept-ranges": "bytes", "content-range": `bytes ${s}-${e}/${wav.length}` }, body: wav.subarray(s, e + 1) })
  }
  if (url.includes("/api/timedtext")) return route.fulfill({ contentType: "application/json", body: JSON.stringify(json3) })
  return route.fulfill({ contentType: "text/html", body: page })
})
let [sw] = ctx.serviceWorkers()
if (!sw) sw = await ctx.waitForEvent("serviceworker")
const extId = new URL(sw.url()).host
const yt = await ctx.newPage()
await yt.goto(`https://www.youtube.com/watch?v=${VID}`)
if (!(await yt.waitForFunction(() => window.__setOption, null, { timeout: 5000 }).then(() => true, () => false))) await yt.reload()
const tabId = await sw.evaluate(async () => (await chrome.tabs.query({ url: "https://www.youtube.com/*" }))[0].id)
const panel = await ctx.newPage()
await panel.setViewportSize({ width: 380, height: 720 })
await panel.goto(`chrome-extension://${extId}/sidepanel.html?tab=${tabId}`)
await panel.waitForSelector(".moment", { timeout: 10000 })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const vid = (fn, arg) => yt.evaluate(fn, arg)
const play = (t) => vid(async (t) => { const v = document.querySelector("video"); if (v.readyState < 1) await new Promise((r) => v.addEventListener("loadedmetadata", r, { once: true })); if (t != null) v.currentTime = t; await v.play() }, t)

// Where the current line sits, as a share of the list's height (0 = top), plus scrollTop.
const where = () => panel.evaluate(() => {
  const box = document.querySelector(".lyrics"), el = box?.querySelector(".ln.now")
  if (!box || !el) return null
  const b = box.getBoundingClientRect(), r = el.getBoundingClientRect()
  return { idx: +el.dataset.idx, at: +((r.top - b.top) / b.height).toFixed(2), visible: r.bottom > b.top && r.top < b.bottom, scrollTop: Math.round(box.scrollTop), back: !!document.querySelector(".lyrics-back") }
})
// Records scrollTop every frame for ms and reports jumps (frame-to-frame moves) bigger than px.
const trace = (ms) => panel.evaluate((ms) => new Promise((res) => {
  const box = document.querySelector(".lyrics"), out = []
  const t0 = performance.now()
  const tick = () => { out.push([Math.round(performance.now() - t0), Math.round(box.scrollTop), document.querySelector(".ln.now")?.dataset.idx]); performance.now() - t0 < ms ? requestAnimationFrame(tick) : res(out) }
  requestAnimationFrame(tick)
}), ms)
const summarize = (tr) => {
  let maxStep = 0, moves = 0
  for (let i = 1; i < tr.length; i++) { const d = Math.abs(tr[i][1] - tr[i - 1][1]); if (d) moves++; maxStep = Math.max(maxStep, d) }
  return { frames: tr.length, framesMoving: moves, maxFrameJump: maxStep }
}

// 1. Read-along: where does the current line sit, and how does the list move between lines?
await play(10)
await sleep(800)
console.log("1. playing:", JSON.stringify(await where()))
const tr = await trace(4000)
console.log("   4s of playback:", JSON.stringify(summarize(tr)), "| final:", JSON.stringify(await where()))
await panel.screenshot({ path: SHOTS + "scroll-1-playing.png" })

// 2. User scrolls up with the wheel to read earlier lines.
await panel.mouse.move(190, 400)
for (let i = 0; i < 6; i++) { await panel.mouse.wheel(0, -150); await sleep(60) }
await sleep(300)
console.log("2. after wheel up:", JSON.stringify(await where()))
await sleep(2000)
console.log("   2s later (still reading):", JSON.stringify(await where()))
await panel.screenshot({ path: SHOTS + "scroll-2-user.png" })
await sleep(3500)
console.log("   5.5s later:", JSON.stringify(await where()))

// 3. Drag the scrollbar / keyboard aren't wheel events: scroll programmatically like a trackpad-less user.
await panel.evaluate(() => { const b = document.querySelector(".lyrics"); b.focus(); })
await panel.keyboard.press("PageUp")
await sleep(500)
console.log("3. after PageUp:", JSON.stringify(await where()))
await sleep(1600)
console.log("   1.6s later:", JSON.stringify(await where()))

// 4. Seek far ahead: does it smooth-scroll across the whole list?
await play(100)
const tr2 = await trace(1500)
console.log("4. seek to 100s:", JSON.stringify(summarize(tr2)), JSON.stringify(await where()))

// 5. Pause, then play again: is the list where it was?
await vid(() => document.querySelector("video").pause())
await panel.waitForSelector(".moment", { timeout: 5000 })
await sleep(500)
await play()
await panel.waitForSelector(".lyrics .ln.now", { timeout: 5000 })
const tr3 = await trace(1200)
console.log("5. resume after pause:", JSON.stringify(summarize(tr3)), JSON.stringify(await where()))
await panel.screenshot({ path: SHOTS + "scroll-5-resume.png" })

// 6. Click a past line to jump to it.
await sleep(500)
const target = await panel.evaluate(() => { const el = document.querySelector(".ln.now"); return +el.dataset.idx - 4 })
await panel.click(`.ln[data-idx='${target}']`)
await sleep(900)
console.log("6. clicked line", target, "->", JSON.stringify(await where()))
await ctx.close()
