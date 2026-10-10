// Clicking the toolbar icon opens the side panel.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})

/** Settings from the removed AI tutor, including model API keys. */
const RETIRED_SETTINGS = ["provider", "apiKey", "openaiBaseUrl", "openaiKey", "openaiModel", "speakAnswers", "listenLang", "showEnglish"]

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.remove(RETIRED_SETTINGS).catch(() => {})
})

export {}
