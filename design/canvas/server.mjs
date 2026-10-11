// Design canvas: a zero-dependency server that turns design/inspiration/ into brand boards.
//   node design/canvas/server.mjs            (PORT defaults to 4600)
// GET /api/manifest scans the folders on every request, so new captures show up on reload.
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, normalize, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const inspiration = join(here, "..", "inspiration");
const exportsDir = join(here, "..", "exports");
const PORT = Number(process.env.PORT || 4600);
const IMAGE = /\.(png|jpe?g|webp|gif|svg)$/i;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".md": "text/markdown; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".zip": "application/zip",
};

const exists = (p) => stat(p).then(() => true, () => false);
const text = (p) => readFile(p, "utf8").catch(() => "");
const url = (p) => "/inspiration/" + relative(inspiration, p).split(sep).map(encodeURIComponent).join("/");

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (IMAGE.test(e.name)) out.push(p);
  }
  return out.sort();
}

// Collect every #hex in a palette.json, whatever its shape, labelled by its key path.
function swatches(json, path = []) {
  if (typeof json === "string") {
    const m = json.match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
    return m ? [{ name: path.filter((k) => !/^\d+$/.test(k)).slice(-2).join(" ") || "colour", hex: "#" + m[1].toUpperCase() }] : [];
  }
  if (Array.isArray(json)) {
    return json.flatMap((v, i) => {
      if (v && typeof v === "object" && (v.hex || v.value) && (v.name || v.token || v.role)) {
        return swatches(v.hex || v.value, [...path, String(v.name || v.token || v.role)]);
      }
      return swatches(v, [...path, String(i)]);
    });
  }
  if (json && typeof json === "object") return Object.entries(json).flatMap(([k, v]) => swatches(v, [...path, k]));
  return [];
}

// "### Duolingo: one mascot carries everything" sections of the shared README, by brand.
function readmeSections(md) {
  const sections = {};
  for (const block of md.split(/^### /m).slice(1)) {
    const title = block.split("\n")[0];
    const brand = title.split(/[:\s]/)[0].toLowerCase();
    (sections[brand] ||= []).push("### " + block.split(/^## /m)[0].trim());
  }
  return sections;
}

async function folderInfo(dir, source) {
  const files = await walk(dir);
  const screens = files.filter((f) => relative(dir, f).split(sep).length === 1);
  const assetFiles = files.filter((f) => relative(dir, f).split(sep)[0] === "assets");
  const pngNames = new Set(assetFiles.filter((f) => f.includes(`${sep}png${sep}`)).map((f) => f.split(sep).pop().replace(/\.png$/, "")));
  const groups = {};
  for (const f of assetFiles) {
    const parts = relative(join(dir, "assets"), f).split(sep);
    const group = parts.length > 1 ? parts[0] : "assets";
    if (group === "svg" && pngNames.has(parts.at(-1).replace(/\.svg$/, ""))) continue; // shown via its png render
    (groups[group] ||= []).push({ src: url(f), name: parts.at(-1), path: relative(join(inspiration, ".."), f) });
  }
  let palette = [];
  let spec = null;
  for (const p of [join(dir, "palette.json"), join(dir, "assets", "palette.json")]) {
    if (!(await exists(p))) continue;
    const json = JSON.parse(await text(p));
    if (Array.isArray(json.colors)) {
      const { colors, ...rest } = json;
      palette = colors.filter((c) => c.hex).map((c) => ({ name: c.name || "", hex: c.hex.toUpperCase(), role: c.role || "" }));
      spec = rest;
    } else palette = swatches(json);
  }
  return {
    source,
    folder: relative(inspiration, dir),
    readme: await text(join(dir, "README.md")),
    design: await text(join(dir, "DESIGN.md")),
    screens: screens.map((f) => ({ src: url(f), name: f.split(sep).pop(), path: relative(join(inspiration, ".."), f) })),
    assets: Object.entries(groups).map(([name, items]) => ({ name, items })),
    palette,
    spec,
  };
}

async function manifest() {
  const shared = await text(join(inspiration, "README.md"));
  const sections = readmeSections(shared);
  const brands = {};
  for (const e of await readdir(inspiration, { withFileTypes: true })) {
    if (!e.isDirectory() || ["recraft-pack"].includes(e.name)) continue;
    const dir = join(inspiration, e.name);
    const files = await walk(dir);
    if (!files.length) continue;
    const key = e.name.replace(/-web$/, "");
    const brand = (brands[key] ||= { key, name: key[0].toUpperCase() + key.slice(1), sources: [], notes: sections[key] || [] });
    brand.sources.push(await folderInfo(dir, e.name.endsWith("-web") ? "web" : "app"));
  }
  for (const b of Object.values(brands)) {
    if (await exists(join(exportsDir, `${b.key}-brand-kit.zip`))) b.kit = `/exports/${b.key}-brand-kit.zip`;
    b.sources.sort((a, c) => (a.source === "web" ? -1 : 1) - (c.source === "web" ? -1 : 1));
    const heading = (b.sources.map((s) => s.readme).join("\n") + "\n" + b.notes.join("\n")).match(/^#{1,3} ([^\n]+)/m);
    if (heading) b.name = heading[1].split(/[:—(]| on the web| brand identity/i)[0].trim() || b.name;
  }
  const overview = [];
  for (const f of ["landscape.md", "README.md", "prompting-playbook.md"]) {
    const md = await text(join(inspiration, f));
    if (md) overview.push({ name: f, md });
  }
  const canto = await text(join(here, "..", "..", "DESIGN.md"));
  if (canto) overview.push({ name: "DESIGN.md · Canto today", md: canto.replace(/^---\n[\s\S]*?\n---\n/, "") });
  return { generated: new Date().toISOString(), overview, brands: Object.values(brands).sort((a, c) => a.key.localeCompare(c.key)) };
}

// Canto's CSS variables for a brand, via design/themes/reskin.mjs, cached by DESIGN.md mtime.
const skins = new Map();
async function skin(key) {
  const candidates = [join(inspiration, `${key}-web`, "DESIGN.md"), join(inspiration, key, "DESIGN.md"), join(here, "..", "..", "DESIGN.md")];
  let found = null;
  for (const c of key === "canto" ? candidates.slice(2) : candidates.slice(0, 2)) if (await exists(c)) { found = c; break; }
  if (!found) return null;
  const mtime = (await stat(found)).mtimeMs;
  if (skins.get(key)?.mtime === mtime) return skins.get(key).vars;
  const css = await new Promise((ok, fail) =>
    execFile("node", [join(here, "..", "themes", "reskin.mjs"), found], (err, out) => (err ? fail(err) : ok(out))));
  const parse = (chunk) => Object.fromEntries([...chunk.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]));
  const [light, dark = ""] = css.split("@media");
  const vars = { light: parse(light), dark: parse(dark) };
  skins.set(key, { mtime, vars });
  return vars;
}

createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path.startsWith("/api/skin/")) {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(await skin(path.slice(10).replace(/[^a-z0-9-]/gi, ""))));
    }
    if (path === "/api/manifest") {
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      return res.end(JSON.stringify(await manifest()));
    }
    const [root, rest] = path.startsWith("/inspiration/") ? [inspiration, path.slice(13)]
      : path.startsWith("/exports/") ? [exportsDir, path.slice(9)]
      : [here, path === "/" ? "index.html" : path.slice(1)];
    const file = normalize(join(root, rest));
    if (!file.startsWith(root) || !(await exists(file))) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "content-type": TYPES[extname(file).toLowerCase()] || "application/octet-stream", "cache-control": "no-cache" });
    res.end(await readFile(file));
  } catch (err) {
    res.writeHead(500); res.end(String(err));
  }
}).listen(PORT, () => console.log(`design canvas on http://localhost:${PORT}`));
