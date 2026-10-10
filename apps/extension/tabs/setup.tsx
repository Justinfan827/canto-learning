import { useEffect, useState } from "react"

import "~lib/fonts"
import { loadSettings, saveSettings, type Settings } from "~lib/settings"
import { hasCantoneseVoice, speak } from "~lib/speech"
import { LOCAL_HELPER } from "~lib/features"
import { listEngines, pickEngine, type Engine } from "~lib/transcriber"

import "../style.css"

/**
 * Settings, from the panel's ⋯ menu. Everything is optional: captions and the dictionary
 * work with nothing set up. Signing in and out happens in the panel.
 */
function Setup() {
  const [s, setS] = useState<Settings | null>(null)
  const [voice, setVoice] = useState(false)

  const [engines, setEngines] = useState<Engine[] | null | "loading">("loading")
  const checkHelper = () => {
    setEngines("loading")
    listEngines().then(setEngines)
  }

  useEffect(() => {
    if (LOCAL_HELPER) checkHelper()
    loadSettings().then(setS)
    const check = () => setVoice(hasCantoneseVoice())
    check()
    speechSynthesis.addEventListener("voiceschanged", check)
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", check)
    }
  }, [])

  // Links from the panel (e.g. #captions) point at a section that only exists once settings load.
  const loaded = !!s
  useEffect(() => {
    if (loaded && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView()
  }, [loaded])

  if (!s) return null

  const setNow = (p: Partial<Settings>) => {
    setS({ ...s, ...p })
    saveSettings(p)
  }

  return (
    <main className="setup">
      <h1>Pause &amp; Ask settings</h1>
      <p>Captions, the dictionary and saved words work with nothing set up here.</p>

      <section id="popup">
        <h2>Pause popup</h2>
        <label className="row">
          <input type="checkbox" checked={s.pausePopup} onChange={(e) => setNow({ pausePopup: e.target.checked })} />
          Show the paused line over YouTube&apos;s sidebar
        </label>
        <p className="muted">When you pause, a small card shows the line so you can look up a word without opening the side panel. It stays hidden while the side panel is open.</p>
      </section>

      <section id="captions">
        <h2>Captions</h2>
        <p className="muted">
          The panel uses the video&apos;s Cantonese captions, then Chinese captions.
          {LOCAL_HELPER && " When a video has neither, a small helper app transcribes the audio on this computer. Audio never leaves it."}
        </p>
        {!LOCAL_HELPER ? null : engines === "loading" ? (
          <p className="muted">Looking for the transcriber helper…</p>
        ) : engines ? (
          <>
            <p className="ok">Transcriber helper is running.</p>
            <label>
              Transcription quality
              <select value={s.transcribeEngine} onChange={(e) => setNow({ transcribeEngine: e.target.value })}>
                <option value="auto">Auto{autoLabel(engines)}</option>
                {engines.map((e) => (
                  <option key={e.id} value={e.id} disabled={!!e.unavailable}>
                    {e.label}
                    {e.unavailable ? ` (${e.unavailable})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted">Auto picks the best installed engine for Cantonese.</p>
          </>
        ) : (
          <>
            <p className="warn">The transcriber helper isn&apos;t running.</p>
            <p>Install the tools once (macOS):</p>
            <pre>brew install whisper-cpp yt-dlp ffmpeg</pre>
            <p>Then start the helper from the Pause &amp; Ask folder and leave it running:</p>
            <pre>pnpm transcriber</pre>
            <button className="link" onClick={checkHelper}>
              Check again
            </button>
          </>
        )}
      </section>

      <section id="voice">
        <h2>Cantonese voice</h2>
        {voice ? (
          <p className="ok">
            Found a Cantonese voice.{" "}
            <button className="link" onClick={() => speak("你好，我哋開始啦")}>
              Test it
            </button>
          </p>
        ) : (
          <p className="warn">
            No Cantonese (zh-HK) voice on this computer, so play buttons will use another Chinese voice. On macOS, add one in System Settings → Accessibility →
            Spoken Content.
          </p>
        )}
      </section>
    </main>
  )
}

function autoLabel(engines: Engine[]) {
  const e = pickEngine(engines, "auto")
  return e ? ` (${e.label})` : " (nothing for Cantonese installed)"
}

export default Setup
