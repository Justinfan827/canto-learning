import { DEFAULT_FREE_MODEL, OPENROUTER_URL } from "./openaiCompat"

export type Provider = "openai" | "claude"

export interface Settings {
  /** "openai" is any OpenAI-compatible endpoint, OpenRouter by default. */
  provider: Provider
  /** Claude API key. */
  apiKey: string
  openaiBaseUrl: string
  openaiKey: string
  openaiModel: string
  speakAnswers: boolean
}

const DEFAULTS: Settings = {
  provider: "openai",
  apiKey: "",
  openaiBaseUrl: OPENROUTER_URL,
  openaiKey: "",
  openaiModel: DEFAULT_FREE_MODEL,
  speakAnswers: false
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
