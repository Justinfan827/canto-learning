import { DEFAULT_FREE_MODEL, OPENROUTER_URL } from "./openaiCompat"
import type { ListenLang } from "./speech"

export type Provider = "openai" | "claude"
export type TextSize = "s" | "m" | "l"

export interface Settings {
  /** "openai" is any OpenAI-compatible endpoint, OpenRouter by default. */
  provider: Provider
  /** Claude API key. */
  apiKey: string
  openaiBaseUrl: string
  openaiKey: string
  openaiModel: string
  speakAnswers: boolean
  /** Local speech model for videos without captions; "auto" picks the best one installed. */
  transcribeEngine: string
  /** Set once the "audio stays on this computer" notice has been dismissed. */
  transcribeNoticeSeen: boolean
  /** Language of spoken questions. */
  listenLang: ListenLang
  // Display options, from the panel's Aa menu.
  showJyutping: boolean
  register: "colloquial" | "formal"
  showEnglish: boolean
  textSize: TextSize
}

const DEFAULTS: Settings = {
  provider: "openai",
  apiKey: "",
  openaiBaseUrl: OPENROUTER_URL,
  openaiKey: "",
  openaiModel: DEFAULT_FREE_MODEL,
  speakAnswers: false,
  transcribeEngine: "auto",
  transcribeNoticeSeen: false,
  listenLang: "zh-HK",
  showJyutping: true,
  register: "colloquial",
  showEnglish: true,
  textSize: "m"
}

export async function loadSettings(): Promise<Settings> {
  const s = await chrome.storage.local.get(Object.keys(DEFAULTS))
  return { ...DEFAULTS, ...s } as Settings
}

export async function saveSettings(s: Partial<Settings>) {
  await chrome.storage.local.set(s)
}

/** Whether the chosen provider has what it needs to make calls. Local servers need no key. */
export function isConfigured(s: Settings) {
  if (s.provider === "claude") return !!s.apiKey
  return !!s.openaiModel && (!!s.openaiKey || !s.openaiBaseUrl.startsWith(OPENROUTER_URL))
}

/** The settings that change which model the tutor uses; other changes shouldn't rebuild it. */
export function aiKey(s: Settings) {
  return JSON.stringify([s.provider, s.apiKey, s.openaiBaseUrl, s.openaiKey, s.openaiModel])
}
