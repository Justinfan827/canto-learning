import { useState } from "react"

import { Button } from "~components/ui/button"

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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface p-8 text-center font-sans">
        <p className="type-body-sm text-muted-foreground">{status}</p>
        <Button onClick={() => setBoth(false)}>Continue</Button>
      </div>
    )

  return (
    <div className="welcome flex min-h-screen flex-col items-center justify-center gap-3 bg-surface px-7 py-10 text-center font-sans text-body">
      <div
        aria-hidden
        lang="yue"
        className="mb-2 grid size-16 place-items-center rounded-2xl bg-primary font-zh text-[34px] font-bold text-primary-foreground shadow-[0_5px_0_var(--primary-pressed)]">
        粵
      </div>
      <h1 className="type-display text-foreground">CantoBro</h1>
      <p className="type-body max-w-[280px] text-muted-foreground">Pause a Cantonese video, tap a word, and keep the ones you want to learn.</p>
      <div className="mt-4 mb-2 flex w-full max-w-[280px] flex-col gap-3">
        <Button disabled={busy} onClick={() => signIn(signInWithGoogle)}>
          Continue with Google
        </Button>
        {DEV_LOGIN && (
          <Button variant="outline" className="dev-login" disabled={busy} onClick={() => signIn(signInAsDev)}>
            Sign in as dev user
          </Button>
        )}
        <Button variant="ghost" className="guest" disabled={busy} onClick={continueAsGuest}>
          Continue as guest
        </Button>
      </div>
      <p className="type-body-sm max-w-[280px] text-muted-foreground">
        Signed in, your saved words sync to the Canto app on your phone. As a guest they stay in this browser; sign in later to bring them along.
      </p>
      {status && (
        <p role="status" className="type-body-sm text-muted-foreground">
          {status}
        </p>
      )}
    </div>
  )
}
