// Signing in on a dev build, against the dev Convex deployment in .env.dev: the panel's welcome
// screen and its "Sign in as dev user" button (which also moves this browser's words to the
// account, a signed-in call), staying signed in after a reload, signing out back to the welcome
// screen, and continuing as a guest.
// Run: pnpm build:dev && node e2e/auth.mjs   (needs PLASMO_PUBLIC_DEV_LOGIN_PASSWORD at build time;
// set CHROMIUM_PATH; HEADED=1 to watch)
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
  if (ctx.pages().some((p) => p.url().includes("setup.html"))) throw new Error("installing opened the settings page")

  const page = await ctx.newPage()
  await page.setViewportSize({ width: 380, height: 720 })
  await page.goto(`chrome-extension://${extId}/sidepanel.html`)
  await page.waitForSelector(".welcome")
  console.log("welcome:", (await page.locator(".welcome-actions").innerText()).replace(/\n+/g, " | "))
  if (!(await page.locator(".welcome .dev-login").count())) throw new Error("no dev sign-in: build with PLASMO_PUBLIC_DEV_LOGIN_PASSWORD set")

  await page.click(".welcome .dev-login")
  await page.waitForSelector(".empty-account", { timeout: 30000 })
  console.log("signed in:", await page.locator(".empty-account").innerText())

  // The session survives a reload: it lives in the extension's localStorage.
  await page.reload()
  await page.waitForSelector(".empty-account", { timeout: 10000 })
  console.log("after reload:", await page.locator(".empty-account").innerText())

  await page.click(".empty-account >> text=Sign out")
  await page.waitForSelector(".welcome")
  console.log("signed out: back on the welcome screen")

  await page.click(".welcome .guest")
  await page.waitForSelector(".empty-account")
  console.log("guest:", await page.locator(".empty-account").innerText())
  console.log("errors: []")
} finally {
  await ctx.close()
}
