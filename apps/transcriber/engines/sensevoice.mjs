// SenseVoice-Small through sherpa-onnx's Node addon, for the transcriber helper. Silero VAD cuts the
// audio into speech segments, SenseVoice transcribes each (converted to HK Traditional), and lines
// print as "[start --> end] text" as they finish. Needs no Python.
// Usage: node sensevoice.mjs MODEL_DIR VAD_ONNX AUDIO.wav [LANGUAGE]
import * as OpenCC from "opencc-js"
import sherpa from "sherpa-onnx-node"

const [modelDir, vadPath, wavPath, language = "yue"] = process.argv.slice(2)
const RATE = 16000
const MAX_CHARS = 22

const recognizer = new sherpa.OfflineRecognizer({
  featConfig: { sampleRate: RATE, featureDim: 80 },
  modelConfig: {
    senseVoice: { model: `${modelDir}/model.int8.onnx`, language, useInverseTextNormalization: 1 },
    tokens: `${modelDir}/tokens.txt`,
    numThreads: 4,
    provider: "cpu",
    debug: 0
  }
})

const vadConfig = {
  sileroVad: { model: vadPath, threshold: 0.5, minSilenceDuration: 0.25, minSpeechDuration: 0.25, maxSpeechDuration: 8, windowSize: 512 },
  sampleRate: RATE,
  numThreads: 1,
  provider: "cpu",
  debug: 0
}
const vad = new sherpa.Vad(vadConfig, 60)

// SenseVoice writes Simplified characters; show them as Hong Kong Traditional.
const toHk = OpenCC.Converter({ from: "cn", to: "hk" })
// Simplified 系 is ambiguous, and OpenCC often turns the Cantonese copula 係 into 系/繫.
const COPULA = /[系繫](?![統列數譜])/g
const KEEP = /(聯|維|關|體|派|星|直)係/g
const hk = (text) => toHk(text).replace(COPULA, "係").replace(KEEP, (_, a) => a + ("聯維".includes(a) ? "繫" : a === "關" ? "係" : "系"))

/** Splits a long segment at punctuation, sharing its time out by character count. */
function* splitLong(text, start, end) {
  const parts = text.split(/(?<=[，。？！、,.?!])/).filter((p) => p.trim())
  const chunks = []
  for (const p of parts) {
    if (chunks.length && [...chunks.at(-1)].length + [...p].length <= MAX_CHARS) chunks[chunks.length - 1] += p
    else chunks.push(p)
  }
  const total = chunks.reduce((n, c) => n + [...c].length, 0) || 1
  let t = start
  for (const c of chunks) {
    const d = ((end - start) * [...c].length) / total
    yield [c.trim(), t, t + d]
    t += d
  }
}

const ts = (sec) => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`
}

function drain() {
  while (!vad.isEmpty()) {
    const seg = vad.front(false)
    vad.pop()
    const stream = recognizer.createStream()
    stream.acceptWaveform({ sampleRate: RATE, samples: seg.samples })
    recognizer.decode(stream)
    const text = hk(recognizer.getResult(stream).text.trim())
    const start = seg.start / RATE
    const end = start + seg.samples.length / RATE
    for (const [chunk, a, b] of splitLong(text, start, end)) {
      const line = chunk.replace(/[，、,]+$/, "")
      if (line) process.stdout.write(`[${ts(a)} --> ${ts(b)}] ${line}\n`)
    }
  }
}

const { samples, sampleRate } = sherpa.readWave(wavPath)
if (sampleRate !== RATE) throw new Error(`expected ${RATE} Hz audio, got ${sampleRate}`)
const window = vadConfig.sileroVad.windowSize
for (let i = 0; i < samples.length; i += window) {
  vad.acceptWaveform(samples.subarray(i, i + window))
  drain()
}
vad.flush()
drain()
