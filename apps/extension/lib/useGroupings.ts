import { useCallback, useEffect, useState } from "react"

const KEY = "groupings"

/**
 * Word groupings the user fixed by hand, keyed by line text so a fix applies wherever that line
 * appears. Kept in extension storage, so fixes survive reloads.
 */
export function useGroupings() {
  const [map, setMap] = useState<Record<string, string[]>>({})
  useEffect(() => {
    chrome.storage.local.get(KEY).then((s) => setMap(s[KEY] ?? {}))
    const onChange = (c: Record<string, chrome.storage.StorageChange>) => {
      if (c[KEY]) setMap(c[KEY].newValue ?? {})
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])
  const update = useCallback(async (text: string, words: string[] | null) => {
    const cur = ((await chrome.storage.local.get(KEY))[KEY] ?? {}) as Record<string, string[]>
    if (words) cur[text] = words
    else delete cur[text]
    setMap({ ...cur })
    await chrome.storage.local.set({ [KEY]: cur })
  }, [])
  return { map, set: (text: string, words: string[]) => update(text, words), clear: (text: string) => update(text, null) }
}
