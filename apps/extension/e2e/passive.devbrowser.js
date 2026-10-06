// The pause popup walkthrough in the user's running Chrome, driven by the dev-browser CLI.
// Same steps as passive.mjs, minus saving (that would write to the real word list).
// Load the build first (see .claude/skills/e2e-real-chrome), then:
//   dev-browser --connect ws://127.0.0.1:PORT/devtools/browser --timeout 300 < apps/extension/e2e/passive.devbrowser.js
// Screenshots land in ~/.dev-browser/tmp/pna-*.png.
const VID = "m9BweWeWD0g"
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const step = (s) => console.log(`\n▶ ${s}`)
const shot = async (name) => console.log("  screenshot:", await saveScreenshot(await yt.screenshot(), `pna-${name}.png`))

const yt = await browser.getPage("pna-passive")
step("Opening the video at 5:20")
await yt.goto(`https://www.youtube.com/watch?v=${VID}&t=320s`, { waitUntil: "domcontentloaded", timeout: 60000 })
await yt.waitForSelector("video", { timeout: 30000 })
const frame = async () => {
  for (let i = 0; i < 80; i++) {
    const f = yt.frames().find((f) => f.url().includes("tabs/passive.html"))
    if (f) return f
    await wait(250)
  }
  throw new Error("No popup frame: is the extension loaded and reloaded?")
}
let pop = await frame()
const iframe = yt.locator("iframe.pna-pop")
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
const placement = async () => {
  const box = await iframe.boundingBox()
  const player = await yt.locator("#movie_player").boundingBox()
  return JSON.stringify({ box, overVideo: overlaps(box, player) })
}
const lineText = () => pop.locator(".moment .big").innerText()
const video = (js) => yt.evaluate(js)

step("Playing: nothing shows")
await video(() => document.querySelector("video").play().catch(() => {}))
await wait(4000)
console.log("  hidden while playing:", await iframe.evaluate((el) => el.classList.contains("hidden")))
await shot("0-playing")

step("Paused: the card shows")
await video(() => document.querySelector("video").pause())
await pop.waitForSelector(".pp.card .moment .chip-w", { timeout: 15000 })
await wait(400)
console.log("  card:", await placement())
console.log("  line:", (await lineText()).replace(/\s+/g, " "))
await shot("1-paused")

step("Tapping a word")
await pop.locator(".moment .chip-w").first().click()
await pop.waitForSelector(".sheet")
console.log("  ", (await pop.locator(".sheet").innerText()).replace(/\n+/g, " | "))
await shot("2-word")

step("Scrolling over the card steps lines")
let before = await lineText()
await pop.locator(".moment").hover()
await yt.mouse.wheel(0, -120)
await wait(400)
const up = await lineText()
await yt.mouse.wheel(0, 120)
await wait(400)
console.log("  up changed:", before !== up, "down came back:", before === (await lineText()))
await wait(500)
console.log("  still paused:", await video(() => document.querySelector("video").paused))

step("Space resumes and hides it")
await pop.locator(".pp-time").click()
await yt.keyboard.press("Space")
await wait(1500)
console.log("  playing:", !(await video(() => document.querySelector("video").paused)), "hidden:", await iframe.evaluate((el) => el.classList.contains("hidden")))

step("Other layout (toggles theater mode, then back)")
await video(() => document.querySelector(".ytp-size-button").click())
await wait(1000)
await video(() => document.querySelector("video").pause())
await pop.waitForSelector(".pp.card", { timeout: 5000 })
await wait(500)
console.log("  card:", await placement())
await shot("3-other-layout")
await video(() => document.querySelector(".ytp-size-button").click())

step("Fullscreen")
await yt.locator("#movie_player").hover()
await yt.locator(".ytp-fullscreen-button").click()
await wait(2500)
pop = await frame()
await video(() => document.querySelector("video").pause())
await pop.waitForSelector(".pp.card", { timeout: 15000 }).catch(() => {})
await wait(800)
console.log("  fullscreen:", await video(() => !!document.fullscreenElement), "card:", await placement())
await shot("4-fullscreen")
await yt.keyboard.press("Escape")
console.log("\nDone. The tab stays open.")
