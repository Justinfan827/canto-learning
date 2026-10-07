import { useEffect, useState } from "react"

import { CONVEX_URL, DEV_LOGIN, getAccount, signInAsDev, signInWithGoogle, signOut, type Account } from "~lib/auth"
import { copyLocalToConvex, restoreBackup } from "~lib/data"
import "~lib/fonts"
import { loadSettings, saveSettings, type Settings } from "~lib/settings"
import { hasCantoneseVoice, speak } from "~lib/speech"
import { listEngines, pickEngine, type Engine } from "~lib/transcriber"

import "../style.css"

/**
 * Settings, also opened once after install. Everything is optional: captions and
 * the dictionary work with nothing set up.
 */
function Setup() {
  const [s, setS] = useState<Settings | null>(null)
  const [voice, setVoice] = useState(false)
  const [sync, setSync] = useState<string | null>(null)
  const [account, setAccount] = useState<Account | null>(null)

  const [engines, setEngines] = useState<Engine[] | null | "loading">("loading")
  const checkHelper = () => {
    setEngines("loading")
    listEngines().then(setEngines)
  }

  useEffect(() => {
    checkHelper()
    loadSettings().then(setS)
    getAccount().then(setAccount)
    const onAccount = (changes: Record<string, chrome.storage.StorageChange>) => {
      if ("account" in changes) setAccount(changes.account.newValue ?? null)
    }
    chrome.storage.onChanged.addListener(onAccount)
    const check = () => setVoice(hasCantoneseVoice())
    check()
    speechSynthesis.addEventListener("voiceschanged", check)
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", check)
      chrome.storage.onChanged.removeListener(onAccount)
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

  const signIn = async (how: () => Promise<void>) => {
    setSync("Signing in…")
    try {
      await how()
      setSync(null)
    } catch (e) {
      setSync(e instanceof Error ? e.message : String(e))
    }
  }
  const copyLocal = async () => {
    try {
      const r = await copyLocalToConvex((done, total) => setSync(`Copying ${done} of ${total}…`))
      setSync(`Copied ${r.words} words.${r.alreadyOnConvex ? ` ${r.alreadyOnConvex} of them were already in your account.` : ""}`)
    } catch (e) {
      setSync(`Copy failed: ${e instanceof Error ? e.message : e}`)
    }
  }

  const restore = async (file: File | undefined) => {
    if (!file) return
    try {
      const r = await restoreBackup(await file.text())
      setSync(
        r.words || r.encounters
          ? `Restored ${r.words} words and ${r.encounters} moments from ${r.videos} videos.`
          : "Everything in that backup is already here."
      )
    } catch (e) {
      setSync(`Restore failed: ${e instanceof Error ? e.message : e}`)
    }
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
          The panel uses the video&apos;s Cantonese captions, then Chinese captions. When a video has neither, a small helper app transcribes the audio on this
          computer. Audio never leaves it.
        </p>
        {engines === "loading" ? (
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

      <section id="sync">
        <h2>Saved words</h2>
        {!CONVEX_URL ? (
          <p className="muted">Saved words and captions stay in this browser. This build doesn&apos;t sync to an account.</p>
        ) : account ? (
          <>
            <p className="ok">
              Signed in as {account.email}. Saved words go to your account, where the phone app can read them.
            </p>
            <button className="link" onClick={copyLocal}>
              Copy this browser&apos;s words to your account
            </button>{" "}
            <button className="link" onClick={() => (signOut(), setSync(null))}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <p className="muted">Saved words stay in this browser until you sign in. Signed in, they&apos;re kept in your account and on your phone.</p>
            <button className="primary" onClick={() => signIn(signInWithGoogle)}>
              Sign in with Google
            </button>
            {DEV_LOGIN && (
              <>
                {" "}
                <button className="link dev-login" onClick={() => signIn(signInAsDev)}>
                  Sign in as dev user
                </button>
              </>
            )}
          </>
        )}
        <label className="row">
          Restore a backup into this browser{" "}
          <input type="file" accept="application/json,.json" onChange={(e) => restore(e.target.files?.[0])} />
        </label>
        <p className="muted">Adds the backup&apos;s words to the ones here; nothing is replaced.</p>
        {sync && <p className="muted">{sync}</p>}
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
