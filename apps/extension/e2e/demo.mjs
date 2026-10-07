// Visible walkthrough on a real YouTube video: loads the built extension in Chromium,
// opens the side panel next to the video, plays, pauses, transcribes and saves a word.
// Needs the transcriber running (pnpm transcriber). Run: node e2e/demo.mjs [videoId]
import { chromium } from "playwright-core"
import fs from "fs"
import os from "os"
import path from "path"

const EXT = new URL("../build/chrome-mv3-prod", import.meta.url).pathname
const VID = process.argv[2] ?? "m9BweWeWD0g"
const step = (s) => console.log(`\n▶ ${s}`)
const pauseMs = (ms) => new Promise((r) => setTimeout(r, ms))

const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), "pna-demo-")), {
  executablePath: process.env.CHROMIUM_PATH,
  headless: false,
  viewport: null,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--start-maximized", "--autoplay-policy=no-user-gesture-required"]
})
let [sw] = ctx.serviceWorkers()
if (!sw) sw = await ctx.waitForEvent("serviceworker")
const extId = new URL(sw.url()).host
for (const p of ctx.pages()) if (p.url().includes("setup.html")) await p.close()

step("Opening the video")
const yt = ctx.pages()[0] ?? (await ctx.newPage())
await yt.goto(`https://www.youtube.com/watch?v=${VID}&t=60s`, { waitUntil: "domcontentloaded", timeout: 60000 })
await yt.waitForSelector("video", { timeout: 30000 })
const tabId = await sw.evaluate(async () => (await chrome.tabs.query({ url: "https://www.youtube.com/*" }))[0].id)

step("Opening the side panel in its own window")
const panelWin = await ctx.newPage()
await panelWin.goto(`chrome-extension://${extId}/sidepanel.html?tab=${tabId}`)
await sw.evaluate(async () => {
  const [w] = await chrome.windows.getAll({ windowTypes: ["normal"] })
  const panel = (await chrome.tabs.query({})).find((t) => t.url?.includes("sidepanel.html"))
  const sw = w.width ?? 1400
  const pw = 420
  await chrome.windows.update(w.id, { left: 0, top: 0, width: Math.max(700, sw - pw) })
  if (panel) await chrome.windows.create({ tabId: panel.id, type: "popup", left: Math.max(0, sw - pw), top: 0, width: pw, height: w.height ?? 900 })
})
const panel = ctx.pages().find((p) => p.url().includes("sidepanel.html"))
await yt.bringToFront()

step("Playing the video")
await yt.evaluate(() => { document.querySelector("video")?.play().catch(() => {}) })
await pauseMs(4000)

step("Waiting for the panel to transcribe on its own (no captions on this video)")
await panel.waitForSelector(".pill >> text=Transcrib", { timeout: 20000 })
console.log("pill:", await panel.locator(".bar .pill").innerText())
await panel.waitForSelector(".lyrics .ln.now", { timeout: 600000 })
console.log("reading along:", await panel.locator(".lyrics .ln").count(), "lines so far")
await pauseMs(6000)

step("Pausing")
await yt.evaluate(() => document.querySelector("video")?.pause())
await panel.waitForSelector(".moment .chip-w", { timeout: 15000 })
console.log("words:", (await panel.locator(".moment .chip-w").allInnerTexts()).map((w) => w.replace(/\s+/g, " ")).join(" / "))
await pauseMs(2000)

step("Tapping words")
const words = panel.locator(".moment .chip-w")
const n = await words.count()
for (let i = 0; i < Math.min(n, 3); i++) {
  await words.nth(i).click()
  await panel.waitForSelector(".sheet")
  console.log("  ", (await panel.locator(".sheet").innerText()).replace(/\n+/g, " | "))
  await pauseMs(2500)
}

step("Saving the last word")
await panel.click(".sheet .save")
await panel.waitForSelector(".sheet .save.done")
await pauseMs(1500)
await panel.keyboard.press("Escape")

step("Clicking the previous line to jump back, then playing on")
await panel.locator(".lyrics .ln:has(+ .ln-card)").click()
await pauseMs(1500)
await yt.evaluate(() => { document.querySelector("video")?.play().catch(() => {}) })
await pauseMs(8000)
await yt.evaluate(() => document.querySelector("video")?.pause())
await panel.waitForSelector(".moment .chip-w", { timeout: 15000 })

if (process.env.SHOTS) {
  await panel.screenshot({ path: path.join(process.env.SHOTS, "panel.png") })
  await yt.screenshot({ path: path.join(process.env.SHOTS, "video.png") })
}
const saved = await panel.evaluate(() => new Promise((res) => { const r = indexedDB.open("pause-and-ask"); r.onsuccess = () => { const q = r.result.transaction("words").objectStore("words").getAll(); q.onsuccess = () => res(q.result) } }))
console.log("\nsaved words:", JSON.stringify(saved.map((w) => [w.colloquial, w.jyutping, w.meaning])))
console.log("\nDone. The window stays open; close it when you're finished.")
await new Promise((r) => ctx.on("close", r))
