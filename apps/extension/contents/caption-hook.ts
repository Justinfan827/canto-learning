/**
 * Runs inside the YouTube page itself (MAIN world) so it can see the player's
 * own network requests. It copies every caption file the player downloads and
 * reports the video's caption tracks, then hands both to the bridge via
 * window.postMessage. Keep this file small: YouTube changes break it first.
 */
import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/*"],
  world: "MAIN",
  run_at: "document_start"
}

const SOURCE = "pna-hook"
const post = (msg: Record<string, unknown>) => window.postMessage({ source: SOURCE, ...msg }, "*")

function isTimedText(url: string) {
  return url.includes("/api/timedtext")
}

function reportTimedText(url: string, body: string) {
  try {
    const u = new URL(url, location.href)
    post({
      type: "timedtext",
      videoId: u.searchParams.get("v"),
      languageCode: u.searchParams.get("lang"),
      kind: u.searchParams.get("kind"),
      payload: JSON.parse(body)
    })
  } catch {
    // Not json3 (e.g. srv3 XML); the on-screen fallback will cover it.
  }
}

// Wrap fetch.
const origFetch = window.fetch
window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  const res = await origFetch.call(this, input, init)
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
  if (isTimedText(url)) res.clone().text().then((t) => reportTimedText(url, t), () => {})
  return res
}

// Wrap XMLHttpRequest (the player still uses it for captions).
const origOpen = XMLHttpRequest.prototype.open
XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
  const href = String(url)
  if (isTimedText(href)) {
    this.addEventListener("load", () => {
      if (typeof this.response === "string") reportTimedText(href, this.response)
      else if (this.responseType === "json") reportTimedText(href, JSON.stringify(this.response))
    })
  }
  // @ts-expect-error forwarding the original overloads
  return origOpen.call(this, method, url, ...rest)
}

interface Player extends HTMLElement {
  getPlayerResponse?: () => any
  setOption?: (module: string, option: string, value: unknown) => void
  loadModule?: (name: string) => void
  getVideoData?: () => { video_id: string; title: string; author: string }
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void
}

const player = () => document.getElementById("movie_player") as Player | null

function reportVideo() {
  const p = player()
  const resp = p?.getPlayerResponse?.() ?? (window as any).ytInitialPlayerResponse
  const details = resp?.videoDetails
  if (!details?.videoId) return
  const tracks = (resp?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []).map((t: any) => ({
    baseUrl: t.baseUrl,
    languageCode: t.languageCode,
    kind: t.kind,
    name: t.name?.simpleText ?? t.name?.runs?.[0]?.text
  }))
  post({
    type: "video",
    video: { id: details.videoId, title: details.title, channel: details.author },
    tracks
  })
}

// Commands from the bridge.
window.addEventListener("message", (e) => {
  if (e.source !== window || e.data?.source !== "pna-bridge") return
  const p = player()
  if (e.data.type === "enable-track" && p?.setOption) {
    p.loadModule?.("captions")
    p.setOption("captions", "track", { languageCode: e.data.languageCode, kind: e.data.kind })
  } else if (e.data.type === "request-video") {
    reportVideo()
  }
})

document.addEventListener("yt-navigate-finish", () => setTimeout(reportVideo, 500))
document.addEventListener("yt-player-updated", () => setTimeout(reportVideo, 500))
