// Brand canvas: one board per brand on a pan/zoom canvas, built from /api/manifest.
let marked = null;
try { ({ marked } = await import("https://cdn.jsdelivr.net/npm/marked@12/lib/marked.esm.js")); } catch { /* falls back to <pre> */ }

const $ = (s, el = document) => el.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
  return el;
};

const viewport = $("#viewport"), world = $("#world");
const BOARD_W = 3400, GAP = 700;
const view = { x: 0, y: 0, s: 0.2 };
const boards = [];
let current = 0;

// ---------- rendering ----------
function md(text, folder) {
  const el = h("div", { class: "notes" });
  if (!marked) { el.append(h("pre", {}, text)); return el; }
  el.innerHTML = marked.parse(text);
  for (const node of el.querySelectorAll("img[src], a[href]")) {
    const attr = node.tagName === "IMG" ? "src" : "href";
    const v = node.getAttribute(attr);
    if (folder && v && !/^(https?:|\/|#|mailto:)/.test(v)) node.setAttribute(attr, `/inspiration/${folder}/${v}`);
    if (node.tagName === "A") node.target = "_blank";
  }
  return el;
}

const figure = (img, caption = true) =>
  h("figure", { "data-src": img.src, "data-name": img.name, "data-path": img.path },
    h("img", { src: img.src, loading: "lazy", alt: img.name, draggable: "false" }),
    caption && h("figcaption", {}, img.name.replace(/\.(png|jpe?g|svg|webp)$/i, "")));

function palette(colors) {
  return h("div", { class: "palette" }, colors.map((c) =>
    h("div", { class: "sw", title: "Click to copy", onclick: (e) => copy(c.hex, e.currentTarget) },
      h("div", { class: "c", style: { background: c.hex } }),
      h("div", { class: "n" }, c.name),
      h("div", { class: "h" }, c.hex),
      c.role && h("div", { class: "r" }, c.role))));
}

function copy(hex, el) {
  navigator.clipboard?.writeText(hex);
  el.classList.add("copied");
  setTimeout(() => el.classList.remove("copied"), 900);
}

function typeSpecs(type) {
  if (!type) return null;
  return h("div", { class: "specs" }, Object.entries(type).map(([role, t]) =>
    h("div", { class: "spec" },
      h("div", { class: "label" }, role),
      h("div", { class: "family" }, t.family || ""),
      h("div", { class: "sample", style: { fontFamily: `"${(t.family || "").split(/[ (]/)[0]}", "${t.family}", sans-serif`, fontWeight: String(t.weights || "400").split("/").pop() } },
        "Learn by listening · 聽住學廣東話"),
      h("div", { class: "note" }, [t.weights && `weights ${t.weights}`, t.notes].filter(Boolean).join(" · ")))));
}

function buttonDemo(b) {
  if (!b) return null;
  const radius = /pill/i.test(b.radius || "") || parseFloat(b.radius) >= 100 ? "999px" : (b.radius || "8px").split(" ")[0];
  const caseMap = { uppercase: "uppercase", lowercase: "lowercase" };
  const style = {
    background: b.bg || "#000", color: b.fg || "#fff", borderRadius: radius,
    boxShadow: b.shadow && b.shadow !== "none" ? b.shadow : "none",
    border: b.border && b.border !== "none" ? b.border : "0",
    fontWeight: b.weight || "600", fontSize: `calc(${parseFloat(b.size) || 16}px * 1.6)`,
    textTransform: caseMap[(b.case || "").toLowerCase()] || "none",
    letterSpacing: b.letterSpacing && b.letterSpacing !== "normal" ? `calc(${b.letterSpacing} * 1.6)` : "normal",
    height: `calc(${parseFloat(b.height) || 48}px * 1.6)`,
  };
  return h("div", {},
    h("button", { class: "demo", style }, b.label || "Button"),
    h("div", { class: "btn-props" }, [`radius ${b.radius}`, b.shadow && `shadow ${b.shadow}`, b.weight && `weight ${b.weight}`, b.case, b.letterSpacing && `tracking ${b.letterSpacing}`].filter(Boolean).join(" · ")));
}

function brandBoard(brand) {
  const web = brand.sources.find((s) => s.source === "web");
  const app = brand.sources.find((s) => s.source === "app");
  const spec = web?.spec || app?.spec || {};
  const colors = web?.palette?.length ? web.palette : app?.palette || [];
  const accent = spec.button?.bg || colors[0]?.hex || "#999";

  const notes = h("div", { class: "b-col" },
    h("div", {}, h("h2", { class: "sec" }, "Analysis"),
      brand.sources.filter((s) => s.readme).map((s) => h("div", { style: { marginBottom: "40px" } },
        h("span", { class: "src-tag", style: { background: s.source === "web" ? accent : "#333" } }, s.source === "web" ? "Web" : "iPhone app"),
        md(s.readme, s.folder))),
      brand.notes.length > 0 && h("div", {},
        h("span", { class: "src-tag" }, "Summary"),
        md(brand.notes.join("\n\n"), app?.folder || web?.folder))));

  const identity = h("div", { class: "b-col" });
  if (colors.length) identity.append(h("div", {}, h("h2", { class: "sec" }, `Colour · ${colors.length}`), palette(colors)));
  if (spec.type) identity.append(h("div", {}, h("h2", { class: "sec" }, "Type"), typeSpecs(spec.type)));
  if (spec.button) identity.append(h("div", {}, h("h2", { class: "sec" }, "Buttons (rendered from captured CSS)"),
    h("div", { class: "buttons" }, buttonDemo(spec.button), buttonDemo(spec.secondary_button))));
  if (web?.screens.length) identity.append(h("div", {}, h("h2", { class: "sec" }, `Web · ${web.screens.length} screens`), h("div", { class: "grid web" }, web.screens.map((i) => figure(i)))));
  if (app?.screens.length) identity.append(h("div", {}, h("h2", { class: "sec" }, `iPhone app · ${app.screens.length} screens`), h("div", { class: "grid app" }, app.screens.map((i) => figure(i)))));
  for (const s of brand.sources) {
    if (!s.assets.length) continue;
    identity.append(h("div", {}, h("h2", { class: "sec" }, `${s.source === "web" ? "Web" : "App"} assets`),
      s.assets.map((g) => h("div", {},
        h("div", { class: "group-name" }, `${g.name} · ${g.items.length}`),
        h("div", { class: `grid ${g.name === "flags" ? "small" : "assets"}` }, g.items.map((i) => figure(i, g.name !== "flags")))))));
  }

  const count = brand.sources.reduce((n, s) => n + s.screens.length + s.assets.reduce((m, g) => m + g.items.length, 0), 0);
  return {
    name: brand.name, accent, count,
    el: h("section", { class: "board" },
      h("div", { class: "board-label" }, brand.name),
      h("header", { class: "b-head" },
        h("div", {}, h("h1", { style: { color: accent } }, brand.name), spec.tagline && h("div", { class: "b-tag" }, `“${spec.tagline}”`)),
        h("div", { class: "b-meta" },
          spec.url && h("a", { href: spec.url, target: "_blank", style: { color: "#888" } }, spec.url.replace(/^https?:\/\//, "")),
          h("div", {}, brand.sources.map((s) => h("span", { class: "chip" }, s.folder))),
          spec.captured && h("div", {}, `captured ${spec.captured}`))),
      h("div", { class: "b-body" }, notes, identity)),
  };
}

function overviewBoard(overview) {
  return {
    name: "Overview", accent: "#0b7a5c", count: overview.length,
    el: h("section", { class: "board" },
      h("div", { class: "board-label" }, "Overview"),
      h("header", { class: "b-head" }, h("div", {}, h("h1", { style: { color: "#0b7a5c" } }, "The landscape"),
        h("div", { class: "b-tag" }, "How language-learning apps look today, and where Canto fits"))),
      h("div", { class: "overview-cols" }, overview.map((o) => h("div", {}, h("h2", { class: "sec" }, o.name), md(o.md, ""))))),
  };
}

// ---------- canvas ----------
function apply() {
  world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
  $("#zoom").textContent = `${Math.round(view.s * 100)}%`;
}

function zoomAt(factor, cx, cy) {
  const s = Math.min(4, Math.max(0.02, view.s * factor));
  view.x = cx - ((cx - view.x) * s) / view.s;
  view.y = cy - ((cy - view.y) * s) / view.s;
  view.s = s;
  apply();
}

function rectOf(b) { return { x: b.el.offsetLeft, y: b.el.offsetTop, w: b.el.offsetWidth, h: b.el.offsetHeight }; }

function focus(i, mode = "width") {
  current = (i + boards.length) % boards.length;
  const r = rectOf(boards[current]);
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  view.s = mode === "whole" ? Math.min((vw - 80) / r.w, (vh - 80) / (r.h + 60)) : (vw - 80) / r.w;
  view.x = (vw - r.w * view.s) / 2 - r.x * view.s;
  view.y = (mode === "whole" ? (vh - r.h * view.s) / 2 : 70) - r.y * view.s;
  apply();
  document.querySelectorAll("#nav button").forEach((b, j) => b.classList.toggle("active", j === current));
  history.replaceState(null, "", `#${encodeURIComponent(boards[current].name)}`);
}

function fitAll() {
  const xs = boards.map(rectOf);
  const w = Math.max(...xs.map((r) => r.x + r.w)), hgt = Math.max(...xs.map((r) => r.y + r.h));
  view.s = Math.min((viewport.clientWidth - 80) / w, (viewport.clientHeight - 80) / hgt);
  view.x = 40; view.y = 60;
  apply();
}

viewport.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - viewport.getBoundingClientRect().left, e.clientY - viewport.getBoundingClientRect().top);
  else { view.x -= e.deltaX; view.y -= e.deltaY; apply(); }
}, { passive: false });

let drag = null;
viewport.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 && e.button !== 1) return;
  if (e.target.closest("a, .sw, #hud")) return;
  drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false, target: e.target };
  viewport.setPointerCapture(e.pointerId);
});
viewport.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 4) return;
  drag.moved = true;
  viewport.classList.add("dragging");
  view.x = drag.vx + dx; view.y = drag.vy + dy; apply();
});
viewport.addEventListener("pointerup", () => {
  if (drag && !drag.moved) {
    const fig = drag.target.closest("figure");
    if (fig) inspect(fig);
  }
  drag = null;
  viewport.classList.remove("dragging");
});

addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea")) return;
  if (e.key === "ArrowRight" || e.key === "j") focus(current + 1);
  else if (e.key === "ArrowLeft" || e.key === "k") focus(current - 1);
  else if (e.key === "f") focus(current, "whole");
  else if (e.key === "a") fitAll();
  else if (e.key === "Escape") closeInspector();
  else if (e.key === "]") step(1);
  else if (e.key === "[") step(-1);
  else if (e.key === "=" || e.key === "+") zoomAt(1.25, viewport.clientWidth / 2, viewport.clientHeight / 2);
  else if (e.key === "-") zoomAt(0.8, viewport.clientWidth / 2, viewport.clientHeight / 2);
});
$("#zoom-in").onclick = () => zoomAt(1.25, viewport.clientWidth / 2, viewport.clientHeight / 2);
$("#zoom-out").onclick = () => zoomAt(0.8, viewport.clientWidth / 2, viewport.clientHeight / 2);
$("#fit").onclick = () => focus(current, "whole");

// ---------- inspector ----------
let inspected = null;
const canvas = $("#ins-canvas"), ctx = canvas.getContext("2d", { willReadFrequently: true });

function inspect(fig) {
  inspected = fig;
  $("#inspector").hidden = false;
  $("#ins-name").textContent = fig.dataset.name;
  $("#ins-open").href = fig.dataset.src;
  $("#ins-hex").textContent = "Click the image to pick a colour";
  $("#ins-swatch").style.background = "transparent";
  const img = new Image();
  img.onload = () => {
    const w = img.naturalWidth || 1200, hh = img.naturalHeight || 1200;
    const scale = Math.min(1, 3000 / Math.max(w, hh));
    canvas.width = Math.round(w * scale); canvas.height = Math.round(hh * scale);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    $("#ins-meta").textContent = `${w} × ${hh} · ${fig.dataset.path}`;
  };
  img.src = fig.dataset.src;
  document.querySelectorAll("figure.selected").forEach((f) => f.classList.remove("selected"));
}

function closeInspector() { $("#inspector").hidden = true; inspected = null; }

function step(dir) {
  if (!inspected) return;
  const figs = [...inspected.closest(".board").querySelectorAll("figure")];
  inspect(figs[(figs.indexOf(inspected) + dir + figs.length) % figs.length]);
}

canvas.addEventListener("click", (e) => {
  const r = canvas.getBoundingClientRect();
  const x = Math.floor(((e.clientX - r.left) / r.width) * canvas.width);
  const y = Math.floor(((e.clientY - r.top) / r.height) * canvas.height);
  const [R, G, B, A] = ctx.getImageData(x, y, 1, 1).data;
  const hex = "#" + [R, G, B].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  $("#ins-swatch").style.background = hex;
  $("#ins-hex").textContent = A === 0 ? "transparent" : `${hex}  rgb(${R}, ${G}, ${B})  · copied`;
  if (A) navigator.clipboard?.writeText(hex);
});
$("#ins-close").onclick = closeInspector;
$("#ins-prev").onclick = () => step(-1);
$("#ins-next").onclick = () => step(1);

// ---------- boot ----------
const data = await (await fetch("/api/manifest")).json();
const order = ["duolingo"];
const sorted = [...data.brands].sort((a, b) => (order.indexOf(b.key) - order.indexOf(a.key)) || a.key.localeCompare(b.key));
boards.push(overviewBoard(data.overview), ...sorted.map(brandBoard));

let x = 0;
for (const b of boards) {
  b.el.style.left = `${x}px`; b.el.style.top = "0px";
  world.append(b.el);
  x += BOARD_W + GAP;
}
$("#nav").append(...boards.map((b, i) =>
  h("button", { onclick: () => focus(i) }, h("span", { class: "dot", style: { background: b.accent } }), b.name, h("span", { class: "count" }, i ? b.count : ""))));

const start = boards.findIndex((b) => `#${encodeURIComponent(b.name)}` === location.hash);
requestAnimationFrame(() => focus(start > 0 ? start : 0));
