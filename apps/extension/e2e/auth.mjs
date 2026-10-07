// Signing in on a dev build, against the dev Convex deployment in .env.dev: the settings page's
// "Sign in as dev user" button, a signed-in call to Convex (copying this browser's words), and
// signing out. Run: pnpm build:dev && node e2e/auth.mjs   (set CHROMIUM_PATH; HEADED=1 to watch)
import { chromium } from "playwright-core"
import fs from "fs"

const EXT = new URL("../build/chrome-mv3-dev", import.meta.url).pathname
const ID = "anhlhljekeokoaobmdgkekjmlfdmohii"

const ctx = await chromium.launchPersistentContext(fs.mkdtempSync("/tmp/pna-profile-"), {
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  headless: !process.env.HEADED,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`]
})
try {
  let [sw] = ctx.serviceWorkers()
  if (!sw) sw = await ctx.waitForEvent("serviceworker")
  const extId = new URL(sw.url()).host
  console.log("extension id:", extId, extId === ID ? "(pinned)" : "(NOT the pinned id)")
  if (extId !== ID) throw new Error("the manifest key didn't pin the extension id")

  const page = await ctx.newPage()
  await page.goto(`chrome-extension://${extId}/tabs/setup.html#sync`)
  await page.waitForSelector("#sync button")
  console.log("signed out:", (await page.locator("#sync").innerText()).replace(/\n+/g, " | "))
  await page.click("#sync .dev-login")
  await page.waitForSelector("#sync .ok", { timeout: 20000 })
  console.log("signed in:", await page.locator("#sync .ok").innerText())

  // A call that needs the session: copy this (empty) browser's words to the account.
  await page.click("#sync >> text=Copy this browser's words")
  await page.waitForSelector("#sync >> text=/Copied \\d+ words/", { timeout: 20000 })
  console.log("signed-in call:", await page.locator("#sync >> text=/Copied/").innerText())

  // The session survives a reload: it lives in the extension's localStorage.
  await page.reload()
  await page.waitForSelector("#sync .ok", { timeout: 10000 })
  console.log("after reload:", await page.locator("#sync .ok").innerText())

  await page.click("#sync >> text=Sign out")
  await page.waitForSelector("#sync >> text=Sign in with Google")
  console.log("signed out again:", (await page.locator("#sync").innerText()).replace(/\n+/g, " | "))
  console.log("errors: []")
} finally {
  await ctx.close()
}
