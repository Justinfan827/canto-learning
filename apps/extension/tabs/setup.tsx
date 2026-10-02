import Anthropic from "@anthropic-ai/sdk"
import { useEffect, useState } from "react"

import { checkOpenAi, DEFAULT_FREE_MODEL, OPENROUTER_URL, ProviderError } from "~lib/openaiCompat"
import { loadSettings, saveSettings, type Settings } from "~lib/settings"
import { hasCantoneseVoice, speak } from "~lib/speech"

import "../style.css"

/**
 * Opened once after install. The side panel can't show Chrome's microphone
 * prompt, so the mic is granted here, on a normal extension tab.
 */
function Setup() {
  const [s, setS] = useState<Settings | null>(null)
  const [mic, setMic] = useState<"unknown" | "granted" | "denied">("unknown")
  const [test, setTest] = useState<string | null>(null)
  const [voice, setVoice] = useState(false)

  useEffect(() => {
    loadSettings().then(setS)
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((p) => setMic(p.state === "granted" ? "granted" : p.state === "denied" ? "denied" : "unknown"))
      .catch(() => {})
    const check = () => setVoice(hasCantoneseVoice())
    check()
    speechSynthesis.addEventListener("voiceschanged", check)
    return () => speechSynthesis.removeEventListener("voiceschanged", check)
  }, [])

  if (!s) return null

  const grantMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      setMic("granted")
    } catch {
      setMic("denied")
    }
  }

  const save = async () => {
    await saveSettings(s)
    setTest("Checking…")
    try {
      if (s.provider === "claude") await new Anthropic({ apiKey: s.apiKey, dangerouslyAllowBrowser: true }).models.list({ limit: 1 })
      else await checkOpenAi({ baseUrl: s.openaiBaseUrl, apiKey: s.openaiKey, model: s.openaiModel })
      setTest("Connected. Open a YouTube video and click the extension icon.")
    } catch (e) {
      setTest(
        e instanceof Anthropic.AuthenticationError || (e instanceof ProviderError && e.status === 401)
          ? "Saved, but this key was rejected."
          : `Saved, but the check failed: ${e instanceof Error ? e.message : e}`
      )
    }
  }

  return (
    <main className="setup">
      <h1>Pause & Ask setup</h1>

      <h2>1. Microphone</h2>
      <p>Lets you ask questions by voice when you pause.</p>
      {mic === "granted" ? (
        <p className="ok">Microphone allowed.</p>
      ) : (
        <>
          <button className="primary" onClick={grantMic}>
            Allow microphone
          </button>
          {mic === "denied" && <p className="warn">Blocked. Allow it from the lock icon in the address bar, then reload this page.</p>}
        </>
      )}

      <h2>2. Model</h2>
      <p className="muted">Keys are stored only in this browser profile. Your words and history are saved locally in this browser too.</p>
      <label className="row">
        <input type="radio" checked={s.provider === "openai"} onChange={() => setS({ ...s, provider: "openai" })} />
        Free model through OpenRouter (or any OpenAI-compatible server)
      </label>
      <label className="row">
        <input type="radio" checked={s.provider === "claude"} onChange={() => setS({ ...s, provider: "claude" })} />
        Claude (paid, best at Cantonese)
      </label>
      {s.provider === "openai" ? (
        <>
          <p className="muted">
            Make a free key at openrouter.ai/keys. Free models are rate limited. For a local server, set the URL to e.g. http://localhost:11434/v1 (Ollama)
            and leave the key empty.
          </p>
          <label>
            Server URL
            <input value={s.openaiBaseUrl} placeholder={OPENROUTER_URL} onChange={(e) => setS({ ...s, openaiBaseUrl: e.target.value.trim() })} />
          </label>
          <label>
            Model
            <input value={s.openaiModel} placeholder={DEFAULT_FREE_MODEL} onChange={(e) => setS({ ...s, openaiModel: e.target.value.trim() })} />
          </label>
          <label>
            API key
            <input type="password" value={s.openaiKey} placeholder="sk-or-..." onChange={(e) => setS({ ...s, openaiKey: e.target.value.trim() })} />
          </label>
        </>
      ) : (
        <label>
          Claude API key
          <input type="password" value={s.apiKey} placeholder="sk-ant-..." onChange={(e) => setS({ ...s, apiKey: e.target.value.trim() })} />
        </label>
      )}
      <label className="row">
        <input type="checkbox" checked={s.speakAnswers} onChange={(e) => setS({ ...s, speakAnswers: e.target.checked })} />
        Read answers aloud
      </label>
      <button className="primary" onClick={save}>
        Save
      </button>
      {test && <p>{test}</p>}

      <h2>3. Cantonese voice</h2>
      {voice ? (
        <p className="ok">
          Found a Cantonese voice. <button className="link" onClick={() => speak("你好，我哋開始啦")}>Test it</button>
        </p>
      ) : (
        <p className="warn">No Cantonese (zh-HK) voice on this computer, so play buttons will use another Chinese voice. On macOS, add one in System Settings → Accessibility → Spoken Content.</p>
      )}
    </main>
  )
}

export default Setup
