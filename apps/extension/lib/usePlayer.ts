import type { CaptionKind, CaptionLine, CaptionSource, CaptionTrack, PanelMessage, VideoInfo } from "@pna/shared"
import { useCallback, useEffect, useRef, useState } from "react"

export interface PlayerState {
  tabId: number | null
  video: VideoInfo | null
  tracks: CaptionTrack[]
  lines: CaptionLine[]
  captionKind: CaptionKind | null
  captionSource: CaptionSource | null
  paused: boolean
  timeMs: number
}

const EMPTY: PlayerState = {
  tabId: null,
  video: null,
  tracks: [],
  lines: [],
  captionKind: null,
  captionSource: null,
  paused: true,
  timeMs: 0
}

async function activeYouTubeTab() {
  // ?tab=<id> pins the panel to one tab when it's opened as a page (used by the smoke test).
  const pinned = Number(new URLSearchParams(location.search).get("tab"))
  const [tab] = pinned ? [await chrome.tabs.get(pinned)] : await chrome.tabs.query({ active: true, currentWindow: true })
  return tab?.id != null && tab.url?.startsWith("https://www.youtube.com/") ? tab : null
}

/** Mirrors the state of the YouTube tab in this window and exposes player controls. */
export function usePlayer() {
  const [state, setState] = useState<PlayerState>(EMPTY)
  const tabRef = useRef<number | null>(null)

  const sync = useCallback(async () => {
    const tab = await activeYouTubeTab()
    tabRef.current = tab?.id ?? null
    if (!tab?.id) return setState(EMPTY)
    try {
      const snap = await chrome.tabs.sendMessage(tab.id, { type: "snapshot" })
      setState({
        tabId: tab.id,
        video: snap?.video ?? null,
        tracks: snap?.tracks ?? [],
        lines: snap?.captions?.lines ?? [],
        captionKind: snap?.captions?.kind ?? null,
        captionSource: snap?.captions?.source ?? null,
        paused: snap?.player?.paused ?? true,
        timeMs: snap?.player?.timeMs ?? 0
      })
    } catch {
      // Content script not injected yet (tab opened before install); a reload fixes it.
      setState({ ...EMPTY, tabId: tab.id })
    }
  }, [])

  useEffect(() => {
    sync()
    const onMsg = (msg: PanelMessage, sender: chrome.runtime.MessageSender) => {
      if (sender.tab?.id == null || sender.tab.id !== tabRef.current) return
      setState((s) => {
        switch (msg.type) {
          case "video":
            return s.video?.id === msg.video.id
              ? { ...s, video: msg.video, tracks: msg.tracks }
              : { ...EMPTY, tabId: s.tabId, video: msg.video, tracks: msg.tracks }
          case "captions":
            if (msg.videoId !== s.video?.id) return s
            return { ...s, lines: msg.lines, captionKind: msg.kind, captionSource: msg.source }
          case "screen-line": {
            if (msg.videoId !== s.video?.id) return s
            const lines = s.lines.slice()
            const prev = lines[lines.length - 1]
            if (prev && prev.endMs > msg.line.startMs) lines[lines.length - 1] = { ...prev, endMs: msg.line.startMs }
            lines.push(msg.line)
            return { ...s, lines }
          }
          case "player":
            if (msg.videoId !== s.video?.id) return s
            return {
              ...s,
              timeMs: msg.timeMs,
              paused: msg.state === "pause" ? true : msg.state === "play" ? false : s.paused
            }
        }
        return s
      })
    }
    chrome.runtime.onMessage.addListener(onMsg)
    const onActivated = () => sync()
    // Also re-check when any tab finishes loading or changes URL: the panel may have opened
    // on another page before this tab went to YouTube, so tabRef can still be empty.
    const onUpdated = (_id: number, info: chrome.tabs.TabChangeInfo) => {
      if (info.status === "complete" || info.url) sync()
    }
    chrome.tabs.onActivated.addListener(onActivated)
    chrome.tabs.onUpdated.addListener(onUpdated)
    return () => {
      chrome.runtime.onMessage.removeListener(onMsg)
      chrome.tabs.onActivated.removeListener(onActivated)
      chrome.tabs.onUpdated.removeListener(onUpdated)
    }
  }, [sync])

  const command = useCallback((msg: Record<string, unknown>) => {
    if (tabRef.current != null) chrome.tabs.sendMessage(tabRef.current, msg).catch(() => {})
  }, [])

  return {
    state,
    seek: (timeMs: number) => command({ type: "seek", timeMs }),
    play: () => command({ type: "play" }),
    pause: () => command({ type: "pause" }),
    setLocalCaptions: (videoId: string, lines: CaptionLine[]) => command({ type: "local-captions", videoId, lines })
  }
}
