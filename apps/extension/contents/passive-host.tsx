/**
 * Hosts the pause popup (tabs/passive.tsx) in the YouTube page. The popup runs as an extension
 * page in an iframe, so it shares the side panel's storage; this script only places it over the
 * sidebar beside the player (or over the player's right edge when there is no sidebar) and
 * shows it when the popup asks.
 */
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { useEffect, useState } from "react"

export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/*"],
  run_at: "document_idle"
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = `
    .pna-pop { position: fixed; z-index: 2100; border: 0; border-radius: 14px; background: transparent;
      box-shadow: 0 1px 2px rgba(0,0,0,.12), 0 18px 40px -12px rgba(0,0,0,.35); color-scheme: normal; }
    .pna-pop.hidden { visibility: hidden; pointer-events: none; }
    .pna-pop.shown { animation: pna-in .14s ease-out; }
    @keyframes pna-in { from { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .pna-pop.shown { animation: none; } }
  `
  return style
}

const WIDTH = 380
const GAP = 12
/** YouTube's masthead. */
const TOP_MIN = 56 + GAP
/** Space the player's own controls need at the bottom. */
const PLAYER_CONTROLS = 64

interface Box {
  left: number
  top: number
  width: number
  maxHeight: number
}

const shown = (el: Element | null): el is HTMLElement => !!el && (el as HTMLElement).offsetParent !== null && el.getBoundingClientRect().width > 0

/** Over the sidebar beside the player when it's there; otherwise over the player's right edge. */
function place(): Box | null {
  const player = document.querySelector("#movie_player")
  if (!shown(player)) return null
  const p = player.getBoundingClientRect()
  const side = document.querySelector("#secondary")
  if (shown(side)) {
    const s = side.getBoundingClientRect()
    if (s.width >= 300 && s.left >= p.right - 1) {
      const top = Math.max(p.top, TOP_MIN)
      return { left: s.left, top, width: Math.min(s.width, WIDTH + 40), maxHeight: window.innerHeight - top - GAP }
    }
  }
  const width = Math.min(WIDTH, p.width - 2 * GAP)
  const top = Math.max(p.top + GAP, TOP_MIN)
  return { left: p.right - width - GAP, top, width, maxHeight: p.bottom - PLAYER_CONTROLS - top }
}

const theme = () => (document.documentElement.hasAttribute("dark") ? "dark" : "light")

function PassiveHost() {
  const [want, setWant] = useState({ visible: false, height: 0 })
  const [box, setBox] = useState<Box | null>(null)
  // Only show the popup on watch pages; the frame stays loaded across YouTube's in-page navigation.
  const [watch, setWatch] = useState(location.pathname === "/watch")
  const [src] = useState(() => chrome.runtime.getURL(`tabs/passive.html?theme=${theme()}`))

  useEffect(() => {
    const origin = new URL(chrome.runtime.getURL("")).origin
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== origin || e.data?.source !== "pna-passive") return
      setWant({ visible: !!e.data.visible, height: Number(e.data.height) || 0 })
    }
    const onNav = () => setWatch(location.pathname === "/watch")
    window.addEventListener("message", onMsg)
    document.addEventListener("yt-navigate-finish", onNav)
    return () => {
      window.removeEventListener("message", onMsg)
      document.removeEventListener("yt-navigate-finish", onNav)
    }
  }, [])

  const visible = want.visible && watch && want.height > 0
  // Follow the player while showing: scrolling, resizing and theater mode all move it.
  useEffect(() => {
    if (!visible) return
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() =>
        setBox((b) => {
          const n = place()
          return n && b && n.left === b.left && n.top === b.top && n.width === b.width && n.maxHeight === b.maxHeight ? b : n
        })
      )
    }
    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, { passive: true })
    const t = window.setInterval(update, 500)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update)
      clearInterval(t)
    }
  }, [visible])

  const on = visible && !!box
  const style = box
    ? { left: box.left, top: box.top, width: box.width, height: Math.min(want.height, Math.max(120, box.maxHeight)) }
    : { left: 0, top: 0, width: WIDTH, height: 0 }
  return (
    <iframe
      // The frame loads with the page and stays, so it can transcribe while the video plays.
      src={src}
      title="Pause & Ask"
      className={"pna-pop " + (on ? "shown" : "hidden")}
      style={style}
      allow="autoplay"
    />
  )
}

export default PassiveHost
