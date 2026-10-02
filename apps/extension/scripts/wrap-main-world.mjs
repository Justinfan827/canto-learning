// Plasmo's bundle for the MAIN-world caption hook declares top-level `var e, t`,
// which leak into the YouTube page's global scope. Wrap it so nothing leaks.
import fs from "node:fs"
import path from "node:path"

const dir = process.argv[2] ?? "build/chrome-mv3-prod"
for (const f of fs.readdirSync(dir).filter((f) => /^caption-hook\..*\.js$/.test(f))) {
  const p = path.join(dir, f)
  const src = fs.readFileSync(p, "utf8")
  if (src.startsWith("(function(){")) continue
  fs.writeFileSync(p, `(function(){${src}\n})();`)
  console.log(`wrapped ${p}`)
}
