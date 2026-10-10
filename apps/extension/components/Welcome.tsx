import { useState } from "react"

import { DEV_LOGIN, continueAsGuest, signInAsDev, signInWithGoogle } from "~lib/auth"
import { copyLocalToConvex } from "~lib/data"

/**
 * The first thing the panel shows: sign in with Google, or keep saved words in this browser.
 * `onBusy` keeps it on screen after sign-in while guest words move to the account.
 */
export function Welcome(props: { onBusy: (busy: boolean) => void }) {
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const setBoth = (b: boolean) => (setBusy(b), props.onBusy(b))

  const signIn = async (how: () => Promise<void>) => {
    setBoth(true)
    setStatus("Signing in…")
    try {
      await how()
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
      return setBoth(false)
    }
    try {
      // Words saved as a guest move to the account. Safe to repeat: copied words are skipped.
      await copyLocalToConvex((done, total) => setStatus(`Moving your saved words to your account… ${done} of ${total}`))
      setBoth(false)
    } catch (e) {
      setStatus(`Signed in, but couldn't move this browser's saved words: ${e instanceof Error ? e.message : e}`)
      setCopyFailed(true)
    }
  }

  if (copyFailed)
    return (
      <div className="welcome">
        <p className="welcome-status">{status}</p>
        <button className="primary" onClick={() => setBoth(false)}>
          Continue
        </button>
      </div>
    )

  return (
    <div className="welcome">
      <div className="welcome-mark" aria-hidden>
        停
      </div>
      <h1>Pause &amp; Ask</h1>
      <p className="muted">Pause a Cantonese video, tap a word, and keep the ones you want to learn.</p>
      <div className="welcome-actions">
        <button className="primary" disabled={busy} onClick={() => signIn(signInWithGoogle)}>
          Continue with Google
        </button>
        {DEV_LOGIN && (
          <button className="secondary dev-login" disabled={busy} onClick={() => signIn(signInAsDev)}>
            Sign in as dev user
          </button>
        )}
        <button className="link guest" disabled={busy} onClick={continueAsGuest}>
          Continue as guest
        </button>
      </div>
      <p className="muted small">
        Signed in, your saved words sync to the Canto app on your phone. As a guest they stay in this browser; sign in later to bring them along.
      </p>
      {status && <p className="welcome-status">{status}</p>}
    </div>
  )
}
