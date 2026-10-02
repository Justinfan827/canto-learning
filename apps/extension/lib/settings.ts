export interface Settings {
  apiKey: string
  speakAnswers: boolean
}

const DEFAULTS: Settings = { apiKey: "", speakAnswers: false }

export async function loadSettings(): Promise<Settings> {
  const s = await chrome.storage.local.get(Object.keys(DEFAULTS))
  return { ...DEFAULTS, ...s } as Settings
}

export async function saveSettings(s: Partial<Settings>) {
  await chrome.storage.local.set(s)
}
