/**
 * Hosts the pause popup (tabs/passive.tsx) in the YouTube page. The popup runs as an extension
 * page in an iframe, so it shares the side panel's storage; this script only places it and sizes
 * it to what the popup asks for. Nothing shows while the video plays; the line's card shows when
 * it's paused.
 *
 * Placement follows the player's layout: beside the player (over the recommendations) in the
 * normal layout, over the video's top-right corner in theater mode, and inside the fullscreen
 * element in fullscreen.
 */
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { useEffect, useRef, useState } from "react"

export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/*"],
  run_at: "document_idle"
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = `
    .pna-pop { position: fixed; z-index: 2100; border: 0; border-radius: 14px; background: transparent; color-scheme: normal;
      box-shadow: 0 1px 2px rgba(0,0,0,.14), 0 10px 28px -10px rgba(0,0,0,.4); }
    .pna-pop.shown { animation: pna-in .14s ease-out; }
    @keyframes pna-in { from { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .pna-pop.shown { animation: none; } }
    .pna-pop.hidden { visibility: hidden; pointer-events: none; }
  `
  return style
}

const WIDTH = 380
const GAP = 12
/** YouTube's masthead. */
const MASTHEAD = 56
/** Space the player's own controls need at the bottom. */
const PLAYER_CONTROLS = 64
/** Narrower than this beside the player and the card goes over the video instead. */
const MIN_SIDE = 300

type Want = { mode: "none" } | { mode: "card"; width: number; height: number }

/** The right edge, top and room the popup has. It grows down and to the left from the top-right. */
interface Slot {
  right: number
  top: number
  maxWidth: number
  maxHeight: number
}

function slot(): Slot | null {
  const player = document.querySelector("#movie_player")
  if (!player) return null
  const p = player.getBoundingClientRect()
  if (p.width === 0) return null
  const theater = !!document.querySelector("ytd-watch-flexy[theater], ytd-watch-flexy[fullscreen]")
  const fullscreen = !!document.fullscreenElement
  // Normal layout: the recommendations column to the right of the player.
  const room = window.innerWidth - p.right - 2 * GAP
  if (!fullscreen && !theater && room >= MIN_SIDE) {
    const top = Math.max(p.top, MASTHEAD + GAP)
    return { right: window.innerWidth - GAP, top, maxWidth: Math.min(room, WIDTH + 40), maxHeight: window.innerHeight - top - GAP }
  }
  // Theater or fullscreen with black bars wide enough: in the bar beside the picture.
  const pic = document.querySelector("video")?.getBoundingClientRect()
  const bar = pic ? p.right - pic.right - 2 * GAP : 0
  if (bar >= MIN_SIDE) {
    const top = Math.max(p.top + GAP, fullscreen ? GAP : MASTHEAD + GAP)
    return { right: p.right - GAP, top, maxWidth: Math.min(bar, WIDTH + 40), maxHeight: p.bottom - PLAYER_CONTROLS - top }
  }
  // Otherwise (or a window too narrow for a side column): over the video's top-right.
  const top = Math.max(p.top + GAP, fullscreen ? GAP : MASTHEAD + GAP)
  return { right: p.right - GAP, top, maxWidth: Math.min(WIDTH, p.width - 2 * GAP), maxHeight: p.bottom - PLAYER_CONTROLS - top }
}

const theme = () => (document.documentElement.hasAttribute("dark") ? "dark" : "light")
const video = () => document.querySelector<HTMLVideoElement>("video.html5-main-video") ?? document.querySelector("video")

function PassiveHost() {
  const frame = useRef<HTMLIFrameElement>(null)
  const [want, setWant] = useState<Want>({ mode: "none" })
  const [where, setWhere] = useState<Slot | null>(null)
  // Only on watch pages; the frame stays loaded across YouTube's in-page navigation.
  const [watch, setWatch] = useState(location.pathname === "/watch")
  const [src] = useState(() => chrome.runtime.getURL(`tabs/passive.html?theme=${theme()}`))

  useEffect(() => {
    const origin = new URL(chrome.runtime.getURL("")).origin
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== origin || e.data?.source !== "pna-passive") return
      const d = e.data
      setWant(d.mode === "card" ? { mode: d.mode, width: Number(d.width) || 0, height: Number(d.height) || 0 } : { mode: "none" })
    }
    const onNav = () => setWatch(location.pathname === "/watch")
    window.addEventListener("message", onMsg)
    document.addEventListener("yt-navigate-finish", onNav)
    return () => {
      window.removeEventListener("message", onMsg)
      document.removeEventListener("yt-navigate-finish", onNav)
    }
  }, [])

  // Tell the popup about play and pause straight from the <video>, so it never lags behind.
  useEffect(() => {
    let bound: HTMLVideoElement | null = null
    const tell = () => {
      const v = video()
      if (v) frame.current?.contentWindow?.postMessage({ source: "pna-host", paused: v.paused }, "*")
    }
    const bind = () => {
      const v = video()
      if (!v || v === bound) return
      bound?.removeEventListener("play", tell)
      bound?.removeEventListener("pause", tell)
      bound = v
      v.addEventListener("play", tell)
      v.addEventListener("pause", tell)
      tell()
    }
    bind()
    const t = window.setInterval(bind, 1000)
    frame.current?.addEventListener("load", tell)
    return () => {
      clearInterval(t)
      bound?.removeEventListener("play", tell)
      bound?.removeEventListener("pause", tell)
    }
  }, [])

  // Fullscreen only draws the fullscreen element's subtree, so move the frame's host into it.
  // Moving an iframe reloads it, which is fine: it picks the video's state back up.
  useEffect(() => {
    const host = (frame.current?.getRootNode() as ShadowRoot | undefined)?.host as HTMLElement | undefined
    if (!host) return
    const home = { parent: host.parentNode, next: host.nextSibling }
    const onFs = () => {
      const fs = document.fullscreenElement
      if (fs && !fs.contains(host)) fs.appendChild(host)
      else if (!fs && home.parent && host.parentNode !== home.parent) home.parent.insertBefore(host, home.next)
    }
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])

  const visible = want.mode !== "none" && watch && want.height > 0
  // The card lays itself out at the width it will get, so its first reported height is right.
  useEffect(() => {
    if (where) frame.current?.contentWindow?.postMessage({ source: "pna-host", cardWidth: where.maxWidth }, "*")
  }, [where?.maxWidth])
  // Follow the player: scrolling, resizing, theater mode and fullscreen all move it.
  useEffect(() => {
    if (!visible) return
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setWhere((w) => (JSON.stringify(w) === JSON.stringify(slot()) ? w : slot())))
    }
    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, { passive: true })
    document.addEventListener("fullscreenchange", update)
    const t = window.setInterval(update, 500)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update)
      document.removeEventListener("fullscreenchange", update)
      clearInterval(t)
    }
  }, [visible])

  const on = visible && !!where
  let style: React.CSSProperties = { left: 0, top: 0, width: WIDTH, height: 0 }
  if (on && where && "width" in want) {
    const width = where.maxWidth
    const height = Math.min(want.height, Math.max(120, where.maxHeight))
    style = { left: where.right - width, top: where.top, width, height }
  }
  return (
    <iframe
      ref={frame}
      // The frame loads with the page and stays, so it can transcribe while the video plays.
      src={src}
      title="Pause & Ask"
      className={"pna-pop " + (on ? "shown" : "hidden")}
      style={style}
    />
  )
}

export default PassiveHost
