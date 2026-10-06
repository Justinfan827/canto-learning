// Squads e2e: two Chrome profiles with the built extension, each with some saved
// words. Ana signs up and makes a squad, Ben joins with its code, both see the
// leaderboard, then Ana makes a link code and the phone's redeem call signs in
// as her. Needs a Convex deployment running packages/backend (a local one works):
// pnpm build && CONVEX_URL=http://127.0.0.1:3210 node e2e/squads.mjs   (headless Chromium; set CHROMIUM_PATH if needed)
import { chromium } from "playwright-core"
import fs from "fs"
import os from "os"
import path from "path"

const EXT = new URL("../build/chrome-mv3-prod", import.meta.url).pathname
const SHOTS = new URL("screenshots/", import.meta.url).pathname
const CONVEX = process.env.CONVEX_URL
if (!CONVEX) throw new Error("Set CONVEX_URL to a deployment running packages/backend")
fs.mkdirSync(SHOTS, { recursive: true })

const json3 = { events: [{ tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: "大家好" }] }] }
const page = (vid) => `<!doctype html><html><head><meta charset="utf-8"><title>Mock YouTube</title></head><body>
<div id="movie_player"><video class="html5-main-video" width="320" height="180"></video><div class="captions"></div></div>
<script>
  const resp = { videoDetails: { videoId: "${vid}", title: "Mock vlog", author: "Mock channel" },
    captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ baseUrl: "/api/timedtext?v=${vid}&lang=zh-HK", languageCode: "zh-HK", name: { simpleText: "中文" } }] } } };
  window.ytInitialPlayerResponse = resp;
  const p = document.getElementById("movie_player");
  p.getPlayerResponse = () => resp;
  p.loadModule = () => {};
  p.setOption = (m, o, v) => { window.__setOption = v; fetch("/api/timedtext?v=${vid}&lang=" + v.languageCode + "&fmt=json3"); };
</script></body></html>`

const check = (ok, what) => {
  if (!ok) throw new Error("FAILED: " + what)
  console.log("ok:", what)
}

/** A fresh profile with the extension, a mock YouTube tab, and the side panel open on it with `words` saved. */
async function person(words) {
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), "pna-squads-")), {
    executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    headless: !process.env.HEADED,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`]
  })
  await ctx.route("https://www.youtube.com/**", (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.includes("timedtext")) return route.fulfill({ contentType: "application/json", body: JSON.stringify(json3) })
    return route.fulfill({ contentType: "text/html", body: page(url.searchParams.get("v")) })
  })
  let [sw] = ctx.serviceWorkers()
  if (!sw) sw = await ctx.waitForEvent("serviceworker")
  const extId = new URL(sw.url()).host
  const yt = await ctx.newPage()
  await yt.goto("https://www.youtube.com/watch?v=mockvid0001")
  const loaded = () => yt.waitForFunction(() => window.__setOption, null, { timeout: 5000 }).then(() => true, () => false)
  if (!(await loaded())) {
    await yt.reload()
    await loaded()
  }
  const tabId = await sw.evaluate(async () => (await chrome.tabs.query({ url: "https://www.youtube.com/*" }))[0].id)
  const panel = await ctx.newPage()
  await panel.setViewportSize({ width: 380, height: 720 })
  await panel.goto(`chrome-extension://${extId}/sidepanel.html?tab=${tabId}`)
  await panel.waitForSelector("button[aria-label='Squads']", { timeout: 10000 })
  // Saved words straight into the extension's IndexedDB (the panel has already opened it).
  await panel.evaluate(
    (words) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open("pause-and-ask", 1)
        req.onsuccess = () => {
          const tx = req.result.transaction("words", "readwrite")
          const now = Date.now()
          words.forEach(([colloquial, status, intervalDays]) =>
            tx.objectStore("words").add({ colloquial, formal: null, jyutping: null, meaning: null, notes: null, status, timesAsked: 1, timesMissed: 0, intervalDays, ease: 2.5, dueAt: now, createdAt: now, updatedAt: now })
          )
          tx.oncomplete = resolve
          tx.onerror = () => reject(tx.error)
        }
        req.onerror = () => reject(req.error)
      }),
    words
  )
  return { ctx, panel }
}

const rows = (panel, squad) => panel.locator(`section.sq[aria-label='${squad}'] .sq-rows li`).allInnerTexts()

const ana = await person([
  ["咁", "known", 0],
  ["乜", "learning", 30],
  ["睇", "learning", 2]
])
const ben = await person([
  ["食", "known", 0],
  ["瞓", "learning", 1]
])

// Ana: first visit asks for a name, then shows no squads yet.
await ana.panel.click("button[aria-label='Squads']")
await ana.panel.fill(".sq-start input >> nth=0", "Ana")
await ana.panel.fill(".sq-start input >> nth=1", CONVEX)
await ana.panel.screenshot({ path: SHOTS + "squads-1-start.png" })
await ana.panel.click(".sq-start .primary")
await ana.panel.waitForSelector(".squads")
await ana.panel.fill("input[aria-label='New squad']", "Tuesday crew")
await ana.panel.click("form.sq-form:has(input[aria-label='New squad']) .primary")
await ana.panel.waitForSelector("section.sq[aria-label='Tuesday crew']")
const code = (await ana.panel.locator(".sq-code").innerText()).trim()
check(/^[2-9A-Z]{6}$/.test(code), `squad made with invite code ${code}`)
check((await rows(ana.panel, "Tuesday crew")).join("|").replace(/\s+/g, " ").includes("Ana (you) 2 / 3"), "Ana's row counts 2 learned of 3 saved")

// Ben joins with the code, typed loosely.
await ben.panel.click("button[aria-label='Squads']")
await ben.panel.fill(".sq-start input >> nth=0", "Ben")
await ben.panel.fill(".sq-start input >> nth=1", CONVEX)
await ben.panel.click(".sq-start .primary")
await ben.panel.waitForSelector(".squads")
await ben.panel.fill("input[aria-label='Join with a code']", code.toLowerCase().slice(0, 3) + " " + code.toLowerCase().slice(3))
await ben.panel.click("form.sq-form:has(input[aria-label='Join with a code']) .primary")
await ben.panel.waitForSelector("section.sq[aria-label='Tuesday crew'] .sq-rows li >> nth=1")
const benRows = (await rows(ben.panel, "Tuesday crew")).map((r) => r.replace(/\s+/g, " ").trim())
check(benRows[0].startsWith("1") && benRows[0].includes("Ana") && benRows[1].includes("Ben (you) 1 / 2"), `Ben sees the board ranked: ${benRows.join(" | ")}`)
await ben.panel.screenshot({ path: SHOTS + "squads-2-board.png" })

// A wrong code says so.
await ben.panel.fill("input[aria-label='Join with a code']", "ZZZZZZ")
await ben.panel.click("form.sq-form:has(input[aria-label='Join with a code']) .primary")
await ben.panel.waitForSelector(".sq-err")
check((await ben.panel.locator(".sq-err").innerText()) === "No squad has the code ZZZZZZ", "wrong code shows a readable error")

// Ana reopens the view and sees Ben; then makes a link code for the phone.
await ana.panel.click(".bar .pill")
await ana.panel.click("button[aria-label='Squads']")
await ana.panel.waitForSelector("section.sq[aria-label='Tuesday crew'] .sq-rows li >> nth=1")
await ana.panel.click("text=Use squads on your phone")
const link = (await ana.panel.locator(".sq-link").innerText()).trim()
await ana.panel.screenshot({ path: SHOTS + "squads-3-link.png" })
const redeemed = await fetch(`${CONVEX}/api/mutation`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ path: "squads:redeemLinkCode", args: { code: link }, format: "json" })
}).then((r) => r.json())
check(redeemed.status === "success" && redeemed.value.name === "Ana", `link code ${link} signs the phone in as Ana`)

// The identity is in chrome.storage.sync, so it survives reopening the panel.
await ana.panel.reload()
await ana.panel.click("button[aria-label='Squads']")
await ana.panel.waitForSelector("section.sq[aria-label='Tuesday crew']")
check(true, "Ana stays signed in after reload")

await ana.ctx.close()
await ben.ctx.close()
console.log("squads e2e passed")
