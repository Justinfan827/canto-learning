// Reskin Canto from a DESIGN.md: maps its tokens onto the extension's CSS variables.
//   pnpm design:reskin duolingo            print the CSS for the Duolingo skin
//   pnpm design:reskin duolingo --apply    write it into apps/extension/style.css
//   pnpm design:reskin canto --apply       back to Canto's own look (./DESIGN.md)
//   pnpm design:reskin path/to/DESIGN.md   any file that follows the token contract
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const css = join(root, "apps/extension/style.css");
const [arg, flag] = process.argv.slice(2);
if (!arg) {
  console.error("usage: pnpm design:reskin <brand|canto|path/to/DESIGN.md> [--apply]");
  process.exit(1);
}

const file = [
  arg,
  arg === "canto" && join(root, "DESIGN.md"),
  join(root, `design/inspiration/${arg}-web/DESIGN.md`),
  join(root, `design/inspiration/${arg}/DESIGN.md`),
].find((p) => p && existsSync(p) && p.endsWith(".md"));
if (!file) {
  console.error(`No DESIGN.md found for "${arg}"`);
  process.exit(1);
}

// The official CLI parses and validates the frontmatter; DTCG JSON is easy to read.
const tokens = JSON.parse(execFileSync("npx", ["-y", "@google/design.md@0.4.0", "export", "--format", "dtcg", file], { encoding: "utf8" }));
const color = (name) => tokens.color?.[name]?.$value?.hex;
const dim = (group, name) => {
  const v = tokens[group]?.[name]?.$value;
  return v && `${v.value}${v.unit}`;
};
const family = (name) => tokens.typography?.[name]?.$value?.fontFamily;

// Canto variable ← DESIGN.md colour token (dark mode uses the dark- twin).
const COLORS = {
  "--bg": "background", "--fg": "on-surface", "--muted": "on-surface-muted", "--faint": "on-surface-faint",
  "--line": "border", "--soft": "surface-muted", "--jade": "primary", "--jade-soft": "primary-soft",
  "--amber": "warning", "--amber-soft": "warning-soft", "--red": "error", "--on-accent": "on-primary",
};
const quote = (f) => (/^[\w-]+$/.test(f) ? f : `"${f}"`);
const stack = (first, rest) => [...new Set([quote(first), ...rest])].join(", ");
const light = {}, dark = {};
for (const [v, t] of Object.entries(COLORS)) {
  if (color(t)) light[v] = color(t);
  if (color(`dark-${t}`)) dark[v] = color(`dark-${t}`);
}
if (family("body-md")) light["--f-ui"] = stack(family("body-md"), ["system-ui", "-apple-system", '"Segoe UI"', "sans-serif"]);
if (family("transcript-current")) light["--f-zh"] = stack(family("transcript-current"), ['"Noto Sans HK"', '"PingFang HK"', '"Microsoft JhengHei"', "sans-serif"]);
for (const [v, t] of [["--r-s", "sm"], ["--r-m", "md"], ["--r-l", "lg"]]) if (dim("rounded", t)) light[v] = dim("rounded", t);

const block = (sel, vars, indent = "") =>
  `${indent}${sel} {\n${Object.entries(vars).map(([k, v]) => `${indent}  ${k}: ${v};`).join("\n")}\n${indent}}`;
const out = `/* ${tokens.$description || arg} (from ${file.replace(root, "")}) */\n${block(":root", light)}\n@media (prefers-color-scheme: dark) {\n${block(":root", dark, "  ")}\n}\n`;

if (flag !== "--apply") {
  process.stdout.write(out);
  process.exit(0);
}

// Replace values in place: the first :root block for light, the dark media block for dark.
let text = readFileSync(css, "utf8");
const darkStart = text.indexOf("@media (prefers-color-scheme: dark)");
const darkEnd = text.indexOf("\n}\n", darkStart) + 3;
const swap = (chunk, vars) => {
  for (const [k, v] of Object.entries(vars)) {
    const re = new RegExp(`(${k.replace(/[-]/g, "\\-")}:\\s*)[^;]+;`);
    if (re.test(chunk)) chunk = chunk.replace(re, `$1${v};`);
  }
  return chunk;
};
text = swap(text.slice(0, darkStart), light) + swap(text.slice(darkStart, darkEnd), dark) + text.slice(darkEnd);
writeFileSync(css, text);
console.log(`Applied ${arg} to apps/extension/style.css (${Object.keys(light).length} light + ${Object.keys(dark).length} dark variables). Undo: pnpm design:reskin canto --apply`);
