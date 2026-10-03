// The pause popup on a real YouTube video: plays, pauses, checks the popup shows the line over
// the sidebar, taps and saves a word, steps lines, then resumes and checks it hides.
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

const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), "pna-passive-")), {
  executablePath: process.env.CHROMIUM_PATH,
  headless: !process.env.HEADED,
  viewport: { width: 1440, height: 900 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--autoplay-policy=no-user-gesture-required"]
})
let [sw] = ctx.serviceWorkers()
if (!sw) sw = await ctx.waitForEvent("serviceworker")
for (const p of ctx.pages()) if (p.url().includes("setup.html")) await p.close()

step("Opening the video at 5:20")
const yt = ctx.pages()[0] ?? (await ctx.newPage())
await yt.goto(`https://www.youtube.com/watch?v=${VID}&t=320s`, { waitUntil: "domcontentloaded", timeout: 60000 })
await yt.waitForSelector("video", { timeout: 30000 })
const frame = async () => {
  for (;;) {
    const f = yt.frames().find((f) => f.url().includes("tabs/passive.html"))
    if (f) return f
    await wait(250)
  }
}
const pop = await frame()
const iframe = yt.locator("iframe.pna-pop")

step("Playing: the popup stays hidden")
await yt.evaluate(() => document.querySelector("video")?.play().catch(() => {}))
await wait(3000)
console.log("hidden while playing:", await iframe.evaluate((el) => el.classList.contains("hidden")))

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
const box = await iframe.boundingBox()
const side = await yt.locator("#secondary").boundingBox()
console.log("popup at", box, "sidebar at", side)
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

step("Saving it")
await pop.click(".sheet .save")
await pop.waitForSelector(".sheet .save.done")
await shot(yt, "3-saved.png")

step("Previous line")
const before = await pop.locator(".moment .big").innerText()
await pop.click('button[aria-label="Previous line"]')
await wait(800)
console.log("changed line:", before !== (await pop.locator(".moment .big").innerText()))
console.log("still paused:", await yt.evaluate(() => document.querySelector("video").paused))

step("Space in the popup resumes and hides it")
await pop.locator(".pp-bar").click()
await yt.keyboard.press("Space")
await wait(1500)
console.log("playing:", !(await yt.evaluate(() => document.querySelector("video").paused)))
console.log("hidden:", await iframe.evaluate((el) => el.classList.contains("hidden")))

step("Theater mode: the popup moves over the player")
await yt.evaluate(() => document.querySelector(".ytp-size-button")?.click())
await wait(1000)
await yt.evaluate(() => document.querySelector("video")?.pause())
await wait(1000)
console.log("popup at", await iframe.boundingBox(), "player at", await yt.locator("#movie_player").boundingBox())
console.log("video paused:", await yt.evaluate(() => document.querySelector("video").paused), "popup hidden attr:", await pop.evaluate(() => document.querySelector(".pp")?.hidden))
await shot(yt, "4-theater.png")

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
if (process.env.HEADED) await new Promise((r) => ctx.on("close", r))
await ctx.close()
