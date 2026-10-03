// The pause popup on a real YouTube video: nothing while playing, the line's card on pause, placed beside the player normally and over it in theater and fullscreen. Taps and
// saves a word, steps lines with the arrows and by scrolling, then resumes and checks it collapses.
// Needs the transcriber running (pnpm transcriber) for videos without captions.
// Run: node e2e/passive.mjs [videoId]   (HEADED=1 to watch, SHOTS=dir for screenshots)
import { chromium } from "playwright-core"
import fs from "fs"
import os from "os"
import path from "path"

const EXT = new URL("../build/chrome-mv3-prod", import.meta.url).pathname
const VID = process.argv[2] ?? "m9BweWeWD0g"
const SHOTS = process.env.SHOTS
const step = (s) => console.log(`\n▶ ${s}`)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const shot = async (page, name) => SHOTS && (await page.screenshot({ path: path.join(SHOTS, name) }))

// CONNECT=ws://127.0.0.1:PORT/devtools/browser runs in an already-running Chrome (with the
// extension loaded) in a new tab; otherwise a fresh Chrome for Testing with the build preloaded.
const remote = process.env.CONNECT ? await chromium.connectOverCDP(process.env.CONNECT) : null
const ctx = remote
  ? remote.contexts()[0]
  : await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), "pna-passive-")), {
      executablePath: process.env.CHROMIUM_PATH,
      headless: !process.env.HEADED,
      viewport: { width: 1440, height: 900 },
      args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--autoplay-policy=no-user-gesture-required"]
    })
if (!remote) {
  let [sw] = ctx.serviceWorkers()
  if (!sw) sw = await ctx.waitForEvent("serviceworker")
  for (const p of ctx.pages()) if (p.url().includes("setup.html")) await p.close()
}

step("Opening the video at 5:20")
const yt = remote ? await ctx.newPage() : (ctx.pages()[0] ?? (await ctx.newPage()))
await yt.goto(`https://www.youtube.com/watch?v=${VID}&t=320s`, { waitUntil: "domcontentloaded", timeout: 60000 })
await yt.waitForSelector("video", { timeout: 30000 })
const frame = async () => {
  for (;;) {
    const f = yt.frames().find((f) => f.url().includes("tabs/passive.html"))
    if (f) return f
    await wait(250)
  }
}
let pop = await frame()
const iframe = yt.locator("iframe.pna-pop")
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
const placement = async () => {
  const box = await iframe.boundingBox()
  const player = await yt.locator("#movie_player").boundingBox()
  return { box, overVideo: overlaps(box, player) }
}


step("Playing: nothing shows")
await yt.evaluate(() => document.querySelector("video")?.play().catch(() => {}))
await wait(3000)
console.log("hidden while playing:", await iframe.evaluate((el) => el.classList.contains("hidden")))
await shot(yt, "0-playing.png")

step("Waiting for captions or the local transcript to reach the playhead")
for (let i = 0; i < 120; i++) {
  await yt.evaluate(() => document.querySelector("video")?.pause())
  await wait(800)
  if (await pop.locator(".moment .chip-w").count()) break
  await yt.evaluate(() => document.querySelector("video")?.play().catch(() => {}))
  await wait(4000)
}

step("Paused: the popup shows the line")
await pop.waitForSelector(".moment .chip-w", { timeout: 10000 })
console.log("card:", await placement())
console.log("line:", (await pop.locator(".moment .big").innerText()).replace(/\s+/g, " "))
await shot(yt, "1-paused.png")

step("Tapping a word")
const words = pop.locator(".moment .chip-w")
await words.nth(Math.min(1, (await words.count()) - 1)).click()
await pop.waitForSelector(".sheet")
console.log("  ", (await pop.locator(".sheet").innerText()).replace(/\n+/g, " | "))
await wait(400)
console.log("popup height with word:", (await iframe.boundingBox()).height)
await shot(yt, "2-word.png")

// Saving writes to the real word list, so only in a throwaway browser.
if (!remote) {
  step("Saving it")
  await pop.click(".sheet .save")
  await pop.waitForSelector(".sheet .save.done")
  await shot(yt, "3-saved.png")
}

const lineText = () => pop.locator(".moment .big").innerText()
step("Previous line")
let before = await lineText()
await pop.click('button[aria-label="Previous line"]')
await wait(600)
console.log("changed line:", before !== (await lineText()))

step("Scrolling over the card steps lines")
before = await lineText()
await pop.locator(".moment").hover()
await yt.mouse.wheel(0, -120)
await wait(400)
const up = await lineText()
await yt.mouse.wheel(0, 120)
await wait(400)
console.log("scroll up changed line:", before !== up, "scroll down came back:", before === (await lineText()))
await wait(500)
console.log("still paused:", await yt.evaluate(() => document.querySelector("video").paused))

step("Space in the popup resumes and hides it")
await pop.locator(".pp-time").click()
await yt.keyboard.press("Space")
await wait(1500)
console.log("playing:", !(await yt.evaluate(() => document.querySelector("video").paused)), "hidden:", await iframe.evaluate((el) => el.classList.contains("hidden")))

step("Theater mode: the card goes over the video")
await yt.evaluate(() => document.querySelector(".ytp-size-button")?.click())
await wait(1000)
await yt.evaluate(() => document.querySelector("video")?.pause())
await pop.waitForSelector(".pp.card", { timeout: 5000 })
await wait(500)
console.log("card:", await placement())
await shot(yt, "4-theater.png")
await yt.evaluate(() => document.querySelector(".ytp-size-button")?.click())

step("Fullscreen: the card shows inside it")
await yt.locator("#movie_player").hover()
await yt.locator(".ytp-fullscreen-button").click()
await wait(2500)
pop = await frame()
await yt.evaluate(() => document.querySelector("video")?.pause())
await pop.waitForSelector(".moment, .pp-empty", { timeout: 15000 }).catch(() => {})
await wait(800)
console.log("fullscreen:", await yt.evaluate(() => !!document.fullscreenElement), "card:", await placement())
await shot(yt, "5-fullscreen.png")
await yt.keyboard.press("Escape")
await wait(1000)

const saved = await pop.evaluate(
  () =>
    new Promise((res) => {
      const r = indexedDB.open("pause-and-ask")
      r.onsuccess = () => {
        const q = r.result.transaction("words").objectStore("words").getAll()
        q.onsuccess = () => res(q.result)
      }
    })
)
console.log("\nsaved words:", JSON.stringify(saved.map((w) => [w.colloquial, w.jyutping])))
if (remote) process.exit(0) // leave the tab open in the user's Chrome
if (process.env.HEADED) await new Promise((r) => ctx.on("close", r))
await ctx.close()
