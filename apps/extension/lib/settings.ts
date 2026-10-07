export type TextSize = "s" | "m" | "l"

export interface Settings {
  /** Local speech model for videos without captions; "auto" picks the best one installed. */
  transcribeEngine: string
  /** Use the local engine even when YouTube has captions. Off: YouTube first, local only as a fallback. */
  preferLocal: boolean
  /** Show the paused line in a small popup over YouTube's sidebar when the side panel is closed. */
  pausePopup: boolean
  // Display options, from the panel's Aa menu.
  showJyutping: boolean
  register: "colloquial" | "formal"
  textSize: TextSize
  /** Where saved words and captions live: this browser, or a Convex deployment shared with the phone. */
  dataBackend: "local" | "convex"
  convexUrl: string
  convexToken: string
}

const DEFAULTS: Settings = {
  transcribeEngine: "auto",
  preferLocal: false,
  pausePopup: true,
  showJyutping: true,
  register: "colloquial",
  textSize: "m",
  dataBackend: "local",
  convexUrl: "",
  convexToken: ""
}

export async function loadSettings(): Promise<Settings> {
  const s = await chrome.storage.local.get(Object.keys(DEFAULTS))
  return { ...DEFAULTS, ...s } as Settings
}

export async function saveSettings(s: Partial<Settings>) {
  await chrome.storage.local.set(s)
}
