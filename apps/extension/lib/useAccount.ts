import { useEffect, useState } from "react"

import { CONVEX_URL, getAccount, isGuest, type Account } from "./auth"

export interface AccountState {
  account: Account | null
  guest: boolean
  /** Nobody has signed in or chosen to continue as a guest yet: show the welcome screen. */
  choosing: boolean
}

/** Who's using the extension, kept up to date as they sign in and out. Null until loaded. */
export function useAccount(): AccountState | null {
  const [state, setState] = useState<{ account: Account | null; guest: boolean } | null>(null)
  useEffect(() => {
    const load = async () => setState({ account: await getAccount(), guest: await isGuest() })
    load()
    const onChange = (changes: Record<string, chrome.storage.StorageChange>) => {
      if ("account" in changes || "guest" in changes) load()
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])
  if (!state) return null
  // Builds without a deployment have no accounts: everyone is a guest.
  if (!CONVEX_URL) return { account: null, guest: true, choosing: false }
  return { ...state, choosing: !state.account && !state.guest }
}
