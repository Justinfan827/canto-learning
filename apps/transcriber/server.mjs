// Local transcription helper for Pause & Ask. When a video has no captions, the side panel
// asks this server to download the audio (yt-dlp) and transcribe it with a local speech
// model, streaming lines back as NDJSON. Run: node apps/transcriber/server.mjs
import { spawn, spawnSync } from "child_process"
import fs from "fs"
import http from "http"
import os from "os"
import path from "path"

const PORT = Number(process.env.PORT ?? 8787)
// Set HOST=0.0.0.0 to let a phone on the same Wi-Fi pull study data.
const HOST = process.env.HOST ?? "127.0.0.1"
const CACHE = path.join(os.homedir(), ".cache/canto-learning")
const AUDIO = path.join(CACHE, "audio")
const OUT = path.join(CACHE, "transcripts")
for (const d of [AUDIO, OUT]) fs.mkdirSync(d, { recursive: true })

const which = (cmd) => {
  const r = spawnSync("/bin/sh", ["-c", `command -v ${cmd}`], { encoding: "utf8" })
  return r.status === 0 ? r.stdout.trim() : null
}
const firstExisting = (...ps) => ps.find((p) => p && fs.existsSync(p)) ?? null

const GGML_TURBO = firstExisting(
  process.env.WHISPER_CPP_MODEL,
  path.join(os.homedir(), "Library/Application Support/ru.starmel.OpenSuperWhisper/whisper-models/ggml-large-v3-turbo.bin"),
  path.join(os.homedir(), ".cache/whisper.cpp/ggml-large-v3-turbo.bin")
)

const SENSEVOICE_DIR = firstExisting(
  process.env.SENSEVOICE_MODEL_DIR,
  path.join(CACHE, "models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17")
)
const SILERO_VAD = firstExisting(path.join(CACHE, "models/silero_vad.onnx"))
const ENGINES_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "engines")
const SENSEVOICE_PY = path.join(ENGINES_DIR, "sensevoice.py")
const TO_HK_PY = path.join(ENGINES_DIR, "to_hk.py")

/** "[00:01:02.500 --> 00:01:04.000]  text" (whisper.cpp) or "[01:02.500 --> 01:04.000] text" (SenseVoice). */
const TS_LINE = /^\[((?:\d+:)?\d+:\d+\.\d+) --> ((?:\d+:)?\d+:\d+\.\d+)\]\s*(.*)$/
const toMs = (ts) => Math.round(ts.split(":").reduce((acc, p) => acc * 60 + Number(p), 0) * 1000)

function parseTimestampLines(onLine) {
  let buf = ""
  return (chunk) => {
    buf += chunk
    let nl
    while ((nl = buf.indexOf("\n")) >= 0) {
      const m = TS_LINE.exec(buf.slice(0, nl).trim())
      buf = buf.slice(nl + 1)
      if (m && m[3].trim()) onLine({ startMs: toMs(m[1]), endMs: toMs(m[2]), text: m[3].trim() })
    }
  }
}

/** Each engine turns a 16 kHz mono wav into timed lines, calling onLine as they're ready. */
const ENGINES = {
  sensevoice: {
    label: "SenseVoice Small (sherpa-onnx)",
    languages: "Cantonese, Mandarin, English, Japanese, Korean; writes spoken Cantonese (佢哋, 嘅, 唔)",
    available: () =>
      !which("uv")
        ? "uv isn't installed"
        : !SENSEVOICE_DIR || !SILERO_VAD
          ? "model not downloaded (see apps/transcriber/README)"
          : null,
    run: (wav, onLine) => ({
      cmd: which("uv"),
      args: ["run", "-q", "--with", "sherpa-onnx", "--with", "numpy", "--with", "opencc", "python", SENSEVOICE_PY, SENSEVOICE_DIR, SILERO_VAD, wav, "yue"],
      parse: parseTimestampLines(onLine)
    })
  },
  "whisper-cpp-turbo": {
    label: "Whisper large-v3-turbo (whisper.cpp)",
    languages: "Writes Cantonese speech as formal written Chinese (書面語), in Traditional characters",
    available: () =>
      !which("whisper-cli")
        ? "whisper.cpp isn't installed (brew install whisper-cpp)"
        : !GGML_TURBO
          ? "ggml-large-v3-turbo.bin not found"
          : !which("uv")
            ? "uv isn't installed"
            : null,
    // Whisper mixes Simplified and Traditional, so its output goes through OpenCC to HK Traditional.
    run: (wav, onLine) => ({
      cmd: which("uv"),
      args: ["run", "-q", "--with", "opencc", "python", TO_HK_PY, which("whisper-cli"), "-m", GGML_TURBO, "-l", "yue", "-f", wav, "-pp"],
      parse: parseTimestampLines(onLine)
    })
  }
}

function exec(cmd, args, onStdout) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { env: { ...process.env, PYTHONUNBUFFERED: "1" } })
    let err = ""
    p.stdout.setEncoding("utf8").on("data", (d) => onStdout?.(d))
    p.stderr.setEncoding("utf8").on("data", (d) => (err = (err + d).slice(-4000)))
    p.on("error", reject)
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${path.basename(cmd)} exited ${code}: ${err.trim().split("\n").slice(-3).join(" ")}`))))
  })
}

async function audioFor(videoId, progress) {
  const wav = path.join(AUDIO, `${videoId}.wav`)
  if (fs.existsSync(wav)) return wav
  progress("Downloading audio")
  const src = path.join(AUDIO, `${videoId}.src`)
  const ytdlp = () => exec(which("yt-dlp"), ["-f", "bestaudio", "-o", src, "--no-playlist", "--force-overwrites", `https://www.youtube.com/watch?v=${videoId}`])
  // YouTube sometimes answers 403 once; a second try usually works.
  await ytdlp().catch(() => ytdlp())
  progress("Converting audio")
  // TRANSCRIBE_MAX_SECONDS trims the audio, for quick tests.
  const trim = process.env.TRANSCRIBE_MAX_SECONDS ? ["-t", process.env.TRANSCRIBE_MAX_SECONDS] : []
  await exec(which("ffmpeg"), ["-y", "-i", src, ...trim, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav])
  fs.rmSync(src, { force: true })
  return wav
}

/** Length of a 16 kHz mono 16-bit wav, from its size. */
const wavDurationMs = (wav) => Math.round(((fs.statSync(wav).size - 44) / 32000) * 1000)

/** Cuts [startMs, endMs) out of a wav so a pass can start mid-video. */
async function cut(wav, startMs, endMs, out) {
  const range = [...(startMs ? ["-ss", String(startMs / 1000)] : []), ...(endMs != null ? ["-t", String((endMs - startMs) / 1000)] : [])]
  await exec(which("ffmpeg"), ["-y", "-i", wav, ...range, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", out])
  return out
}

/** Starts mid-video only when there's a meaningful amount before and after the playhead. */
const MIN_SPLIT_MS = 5000

/**
 * One job per video + engine; later requests replay what's done and follow along.
 * A job asked to start at `fromMs` transcribes from there to the end first, then fills in
 * the start, so the lines you're about to hear arrive first. Lines are not in time order.
 */
const jobs = new Map()

function startJob(videoId, engineId, fromMs) {
  const key = `${videoId}.${engineId}`
  const cached = path.join(OUT, `${key}.json`)
  const job = { lines: [], done: false, error: null, progress: { type: "progress", stage: "Starting" }, listeners: new Set() }
  const emit = (ev) => job.listeners.forEach((l) => l(ev))
  const progress = (stage, extra = {}) => {
    job.progress = { type: "progress", stage, ...extra }
    emit(job.progress)
  }
  const onLine = (l) => {
    const line = { idx: job.lines.length, ...l }
    job.lines.push(line)
    emit({ type: "line", line })
  }
  jobs.set(key, job)
  ;(async () => {
    const hit = fs.existsSync(cached) ? JSON.parse(fs.readFileSync(cached, "utf8")) : []
    if (hit.length) {
      hit.forEach((l) => onLine(l))
      return
    }
    const engine = ENGINES[engineId]
    const wav = await audioFor(videoId, progress)
    const durationMs = wavDurationMs(wav)
    const from = fromMs >= MIN_SPLIT_MS && fromMs < durationMs - MIN_SPLIT_MS ? Math.floor(fromMs / 1000) * 1000 : 0
    const passes = from ? [[from, null], [0, from]] : [[0, null]]
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pna-"))
    try {
      for (const [i, [start, end]] of passes.entries()) {
        progress(`Transcribing with ${engine.label}`, { pass: i + 1, fromMs: from, durationMs })
        const passDir = path.join(dir, `pass${i}`)
        fs.mkdirSync(passDir)
        const input = start || end != null ? await cut(wav, start, end, path.join(passDir, "part.wav")) : wav
        // Timestamps come back relative to the cut; shift them to the video's time.
        const r = engine.run(input, (l) => onLine({ ...l, startMs: l.startMs + start, endMs: l.endMs + start }))
        await exec(r.cmd, r.args, r.parse)
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
    // An empty result usually means there's no speech (or only music); report it rather than caching nothing.
    if (!job.lines.length) throw new Error(`${engine.label} heard no speech it could transcribe.`)
    const sorted = job.lines.map(({ startMs, endMs, text }) => ({ startMs, endMs, text })).sort((a, b) => a.startMs - b.startMs)
    fs.writeFileSync(cached, JSON.stringify(sorted))
  })().then(
    () => {
      job.done = true
      emit({ type: "done" })
    },
    (e) => {
      job.done = true
      job.error = e.message
      emit({ type: "error", message: e.message })
      jobs.delete(key)
    }
  )
  return job
}

// Study sync: the extension PUTs its saved words here and the phone app GETs them.
// Kept as plain files so a remote backend can take over the same two routes later.
const STUDY = path.join(CACHE, "study.json")
const REVIEWS = path.join(CACHE, "study-reviews.json")
// Words typed in on the phone, waiting for the extension to add them.
const NEW_WORDS = path.join(CACHE, "study-words.json")
const MAX_BODY = 50 * 1024 * 1024
// Backups of the extension's whole database: latest.json, plus one file per day.
const BACKUPS = path.join(CACHE, "backups")
const LATEST = path.join(BACKUPS, "latest.json")
const KEEP_DAILY = 60
const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch {
    return fallback
  }
}
const writeJson = (file, value) => {
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(value))
  fs.renameSync(`${file}.tmp`, file)
}
const readBody = (req) =>
  new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on("data", (c) => {
      size += c.length
      if (size > MAX_BODY) reject(new Error("too large"))
      else chunks.push(c)
    })
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    req.on("error", reject)
  })
const json = (res, status, value) => res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" }).end(JSON.stringify(value))

/** Saves a backup unless it has far fewer words than the last one, which would mean a database was lost. */
function saveBackup(dump) {
  fs.mkdirSync(BACKUPS, { recursive: true })
  const stamp = new Date().toISOString()
  const prev = readJson(LATEST, null)
  if (prev && dump.words.length < prev.words.length / 2) {
    writeJson(path.join(BACKUPS, `smaller-${stamp.replace(/[:.]/g, "-")}.json`), dump)
    return { ok: false, words: dump.words.length, kept: prev.words.length }
  }
  writeJson(LATEST, dump)
  // Named by local date, e.g. 2026-10-06.json.
  writeJson(path.join(BACKUPS, `${new Date().toLocaleDateString("sv")}.json`), dump)
  const daily = fs.readdirSync(BACKUPS).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()
  for (const f of daily.slice(0, -KEEP_DAILY)) fs.rmSync(path.join(BACKUPS, f))
  return { ok: true, words: dump.words.length }
}

async function handleBackup(req, res) {
  if (req.method === "GET") return fs.existsSync(LATEST) ? json(res, 200, readJson(LATEST, null)) : json(res, 404, { error: "no backup yet" })
  if (req.method === "PUT") {
    const dump = JSON.parse(await readBody(req))
    if (!Array.isArray(dump?.words) || !Array.isArray(dump?.videos)) return json(res, 400, { error: "bad backup" })
    return json(res, 200, saveBackup(dump))
  }
  return false
}

async function handleStudy(req, res, url) {
  if (url.pathname === "/study" && req.method === "GET")
    return json(res, 200, readJson(STUDY, { version: 1, exportedAt: 0, videos: [], words: [] }))
  if (url.pathname === "/study" && req.method === "PUT") {
    const snap = JSON.parse(await readBody(req))
    if (snap?.version !== 1 || !Array.isArray(snap.words) || !Array.isArray(snap.videos)) return json(res, 400, { error: "bad snapshot" })
    writeJson(STUDY, snap)
    return json(res, 200, { ok: true, words: snap.words.length })
  }
  if (url.pathname === "/study/reviews" && req.method === "GET") return json(res, 200, { reviews: readJson(REVIEWS, []) })
  if (url.pathname === "/study/reviews" && req.method === "POST") {
    const { reviews } = JSON.parse(await readBody(req))
    if (!Array.isArray(reviews)) return json(res, 400, { error: "bad reviews" })
    const all = readJson(REVIEWS, [])
    all.push(...reviews.filter((r) => typeof r?.wordId === "number" && typeof r?.correct === "boolean"))
    writeJson(REVIEWS, all)
    return json(res, 200, { ok: true, total: all.length })
  }
  if (url.pathname === "/study/words" && req.method === "GET") return json(res, 200, { words: readJson(NEW_WORDS, []) })
  if (url.pathname === "/study/words" && req.method === "POST") {
    const { words } = JSON.parse(await readBody(req))
    if (!Array.isArray(words)) return json(res, 400, { error: "bad words" })
    const all = readJson(NEW_WORDS, [])
    for (const w of words) {
      if (typeof w?.colloquial !== "string" || !w.colloquial.trim() || typeof w.at !== "number") continue
      // The phone retries a failed upload, so the same word can arrive twice.
      if (!all.some((o) => o.at === w.at && o.colloquial === w.colloquial))
        all.push({ colloquial: w.colloquial, jyutping: w.jyutping ?? null, meaning: w.meaning ?? null, at: w.at })
    }
    writeJson(NEW_WORDS, all)
    return json(res, 200, { ok: true, total: all.length })
  }
  // The extension removes the words it has added, by their `at`.
  if (url.pathname === "/study/words" && req.method === "DELETE") {
    const { at } = JSON.parse(await readBody(req))
    if (!Array.isArray(at)) return json(res, 400, { error: "bad at" })
    const left = readJson(NEW_WORDS, []).filter((w) => !at.includes(w.at))
    writeJson(NEW_WORDS, left)
    return json(res, 200, { ok: true, left: left.length })
  }
  return false
}

const server = http.createServer(async (req, res) => {
  // Only the extension (and local tools) should call this.
  const origin = req.headers.origin ?? ""
  if (origin && !origin.startsWith("chrome-extension://")) {
    res.writeHead(403).end()
    return
  }
  res.setHeader("access-control-allow-origin", origin || "*")
  res.setHeader("access-control-allow-headers", "content-type")
  res.setHeader("access-control-allow-methods", "GET, PUT, POST, DELETE, OPTIONS")
  if (req.method === "OPTIONS") return res.writeHead(204).end()

  const url = new URL(req.url, `http://localhost:${PORT}`)
  if (url.pathname === "/backup") {
    try {
      if ((await handleBackup(req, res)) !== false) return
    } catch (e) {
      return json(res, 400, { error: e.message })
    }
  }
  if (url.pathname.startsWith("/study")) {
    try {
      if ((await handleStudy(req, res, url)) !== false) return
    } catch (e) {
      return json(res, 400, { error: e.message })
    }
  }
  if (req.method === "GET" && url.pathname === "/engines") {
    const engines = Object.entries(ENGINES).map(([id, e]) => ({ id, label: e.label, languages: e.languages, unavailable: e.available() }))
    return res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ engines }))
  }
  if (req.method === "GET" && url.pathname === "/transcribe") {
    const videoId = url.searchParams.get("v") ?? ""
    const engineId = url.searchParams.get("engine") ?? ""
    const engine = ENGINES[engineId]
    if (!/^[\w-]{6,20}$/.test(videoId) || !engine) return res.writeHead(400).end("bad video or engine")
    const why = engine.available()
    if (why) return res.writeHead(409).end(why)

    res.writeHead(200, { "content-type": "application/x-ndjson", "cache-control": "no-store" })
    const write = (ev) => res.write(JSON.stringify(ev) + "\n")
    const fromMs = Number(url.searchParams.get("from")) || 0
    const job = jobs.get(`${videoId}.${engineId}`) ?? startJob(videoId, engineId, fromMs)
    write(job.progress)
    for (const line of job.lines) write({ type: "line", line })
    if (job.done) {
      write(job.error ? { type: "error", message: job.error } : { type: "done" })
      return res.end()
    }
    const listener = (ev) => {
      write(ev)
      if (ev.type === "done" || ev.type === "error") {
        job.listeners.delete(listener)
        res.end()
      }
    }
    job.listeners.add(listener)
    req.on("close", () => job.listeners.delete(listener))
    return
  }
  res.writeHead(404).end()
})

server.listen(PORT, HOST, () => {
  console.log(`Pause & Ask transcriber on http://${HOST}:${PORT}`)
  for (const [id, e] of Object.entries(ENGINES)) console.log(`  ${id.padEnd(18)} ${e.available() ?? "ready"}`)
})
