// Local transcription helper for Pause & Ask. When a video has no captions, the side panel
// asks this server to download the audio (yt-dlp) and transcribe it with a local speech
// model, streaming lines back as NDJSON. Run: node apps/transcriber/server.mjs
import { spawn, spawnSync } from "child_process"
import fs from "fs"
import http from "http"
import os from "os"
import path from "path"

const PORT = Number(process.env.PORT ?? 8787)
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
const SENSEVOICE_PY = path.join(path.dirname(new URL(import.meta.url).pathname), "engines/sensevoice.py")

/** "[00:01:02.500 --> 00:01:04.000]  text" (whisper.cpp) or "[01:02.500 --> 01:04.000] text" (openai-whisper). */
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
    languages: "Cantonese, Mandarin, English and ~100 more",
    available: () => (!which("whisper-cli") ? "whisper.cpp isn't installed (brew install whisper-cpp)" : !GGML_TURBO ? "ggml-large-v3-turbo.bin not found" : null),
    run: (wav, onLine) => ({ cmd: which("whisper-cli"), args: ["-m", GGML_TURBO, "-l", "yue", "-f", wav, "-pp"], parse: parseTimestampLines(onLine) })
  },
  "whisper-turbo": {
    label: "Whisper turbo (openai-whisper)",
    languages: "Cantonese, Mandarin, English and ~100 more; downloads a 1.5 GB model on first use",
    available: () => (which("whisper") ? null : "openai-whisper isn't installed"),
    run: (wav, onLine, dir) => ({
      cmd: which("whisper"),
      args: [wav, "--model", "turbo", "--language", "yue", "--output_format", "json", "--output_dir", dir, "--verbose", "True"],
      parse: parseTimestampLines(onLine)
    })
  },
  "whisper-medium": {
    label: "Whisper medium (openai-whisper)",
    languages: "Chinese (no separate Cantonese option), English and more",
    available: () => (which("whisper") ? null : "openai-whisper isn't installed"),
    run: (wav, onLine, dir) => ({
      cmd: which("whisper"),
      args: [wav, "--model", "medium", "--language", "zh", "--output_format", "json", "--output_dir", dir, "--verbose", "True"],
      parse: parseTimestampLines(onLine)
    })
  },
  "parakeet-v3": {
    label: "Parakeet TDT 0.6B v3 (MLX)",
    languages: "English and 24 European languages; no Chinese",
    available: () => (which("parakeet-mlx") ? null : "parakeet-mlx isn't installed"),
    run: (wav, onLine, dir) => ({
      cmd: which("parakeet-mlx"),
      args: [wav, "--model", "mlx-community/parakeet-tdt-0.6b-v3", "--output-format", "json", "--output-dir", dir, "--output-template", "parakeet"],
      // Parakeet writes everything at the end.
      done: () => {
        const json = JSON.parse(fs.readFileSync(path.join(dir, "parakeet.json"), "utf8"))
        for (const s of json.sentences ?? []) onLine({ startMs: Math.round(s.start * 1000), endMs: Math.round(s.end * 1000), text: s.text.trim() })
      }
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
        const r = engine.run(input, (l) => onLine({ ...l, startMs: l.startMs + start, endMs: l.endMs + start }), passDir)
        await exec(r.cmd, r.args, r.parse)
        r.done?.()
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
    // An empty result usually means the model can't hear this language (Parakeet on Cantonese);
    // report it rather than caching nothing.
    if (!job.lines.length) throw new Error(`${engine.label} heard no speech it could transcribe. It may not support this language.`)
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

const server = http.createServer(async (req, res) => {
  // Only the extension (and local tools) should call this.
  const origin = req.headers.origin ?? ""
  if (origin && !origin.startsWith("chrome-extension://")) {
    res.writeHead(403).end()
    return
  }
  res.setHeader("access-control-allow-origin", origin || "*")
  res.setHeader("access-control-allow-headers", "content-type")
  if (req.method === "OPTIONS") return res.writeHead(204).end()

  const url = new URL(req.url, `http://localhost:${PORT}`)
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

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Pause & Ask transcriber on http://127.0.0.1:${PORT}`)
  for (const [id, e] of Object.entries(ENGINES)) console.log(`  ${id.padEnd(18)} ${e.available() ?? "ready"}`)
})
