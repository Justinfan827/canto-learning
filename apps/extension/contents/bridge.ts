/**
 * Isolated-world content script. Watches the <video> element, relays caption
 * files from the page hook, falls back to on-screen captions, and forwards
 * everything to the side panel. Also handles commands from the panel.
 */
import { parseJson3, pickTrack, type CaptionKind, type CaptionLine, type CaptionSource, type CaptionTrack, type PanelMessage, type VideoInfo } from "@pna/shared"
import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/*"],
  run_at: "document_idle"
}

const SCREEN_FALLBACK_MS = 5000

let video: VideoInfo | null = null
let tracks: CaptionTrack[] = []
let captions: { lines: CaptionLine[]; kind: CaptionKind; source: CaptionSource } | null = null
let fallbackTimer: number | undefined
let screenObserver: MutationObserver | null = null

const send = (msg: PanelMessage) => chrome.runtime.sendMessage(msg).catch(() => {}) // panel may be closed
const toHook = (msg: Record<string, unknown>) => window.postMessage({ source: "pna-bridge", ...msg }, "*")

function currentVideoId() {
  return new URL(location.href).searchParams.get("v")
}

function onVideo(v: VideoInfo, t: CaptionTrack[]) {
  if (v.id !== currentVideoId()) return
  if (video?.id === v.id && captions) return
  const changed = video?.id !== v.id
  video = v
  tracks = t
  if (changed) {
    captions = null
    stopScreenFallback()
  }
  const best = pickTrack(tracks)
  video.captionKind = best ? (best.kind === "asr" ? "auto" : "manual") : undefined
  send({ type: "video", video, tracks })
  if (best) toHook({ type: "enable-track", languageCode: best.languageCode, kind: best.kind })
  clearTimeout(fallbackTimer)
  // With no Chinese track there's nothing useful on screen either; the panel transcribes locally instead.
  if (best)
    fallbackTimer = window.setTimeout(() => {
      if (!captions && video?.id === v.id) startScreenFallback()
    }, SCREEN_FALLBACK_MS)
}

function onTimedText(data: { videoId: string | null; languageCode: string | null; kind: string | null; payload: any }) {
  if (!video || (data.videoId && data.videoId !== video.id)) return
  const best = pickTrack(tracks)
  // Ignore files for tracks we didn't choose (e.g. the user switched to English).
  if (best && data.languageCode && data.languageCode !== best.languageCode) return
  const lines = parseJson3(data.payload)
  if (!lines.length) return
  stopScreenFallback()
  captions = { lines, kind: data.kind === "asr" ? "auto" : "manual", source: "track" }
  send({ type: "captions", videoId: video.id, ...captions })
}

/** Builds lines from what YouTube draws on screen, for videos whose file we never saw. */
function startScreenFallback() {
  const v = getVideoEl()
  if (!v || !video) return
  captions = { lines: [], kind: "manual", source: "screen" }
  send({ type: "captions", videoId: video.id, ...captions })
  let last = ""
  screenObserver = new MutationObserver(() => {
    const text = [...document.querySelectorAll(".ytp-caption-segment")].map((n) => n.textContent ?? "").join(" ").trim()
    if (!text || text === last || !captions || !video) return
    last = text
    const t = Math.round(v.currentTime * 1000)
    const prev = captions.lines[captions.lines.length - 1]
    if (prev && prev.endMs > t) prev.endMs = t
    const line = { idx: captions.lines.length, startMs: t, endMs: t + 4000, text }
    captions.lines.push(line)
    send({ type: "screen-line", videoId: video.id, line })
  })
  const container = document.querySelector("#movie_player") ?? document.body
  screenObserver.observe(container, { childList: true, subtree: true, characterData: true })
}

function stopScreenFallback() {
  screenObserver?.disconnect()
  screenObserver = null
}

const getVideoEl = () => document.querySelector<HTMLVideoElement>("video.html5-main-video") ?? document.querySelector("video")

let boundVideo: HTMLVideoElement | null = null
function bindVideo() {
  const v = getVideoEl()
  if (!v || v === boundVideo) return
  boundVideo = v
  const report = (state: "play" | "pause" | "seek" | "time") => () => {
    const id = currentVideoId()
    if (id) send({ type: "player", videoId: id, state, timeMs: Math.round(v.currentTime * 1000) })
  }
  v.addEventListener("play", report("play"))
  v.addEventListener("pause", report("pause"))
  v.addEventListener("seeked", report("seek"))
  let lastTick = 0
  v.addEventListener("timeupdate", () => {
    const now = performance.now()
    if (now - lastTick > 250) {
      lastTick = now
      report("time")()
    }
  })
}

window.addEventListener("message", (e) => {
  if (e.source !== window || e.data?.source !== "pna-hook") return
  if (e.data.type === "video") onVideo(e.data.video, e.data.tracks)
  else if (e.data.type === "timedtext") onTimedText(e.data)
})

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  const v = getVideoEl()
  switch (msg?.type) {
    case "snapshot":
      reply({
        video,
        tracks,
        captions,
        player: v ? { paused: v.paused, timeMs: Math.round(v.currentTime * 1000) } : null
      })
      return
    case "seek":
      if (v) v.currentTime = msg.timeMs / 1000
      break
    case "play":
      v?.play()
      break
    case "pause":
      v?.pause()
      break
    case "local-captions":
      // Lines transcribed on this computer, for videos without a caption file.
      if (!video || msg.videoId !== video.id) break
      stopScreenFallback()
      captions = { lines: msg.lines, kind: "auto", source: "local" }
      send({ type: "captions", videoId: video.id, ...captions })
      break
  }
})

new MutationObserver(bindVideo).observe(document.documentElement, { childList: true, subtree: true })
bindVideo()
toHook({ type: "request-video" })
