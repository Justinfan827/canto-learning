/** Thin wrappers over the browser's speech recognition and synthesis. */

export type ListenLang = "zh-HK" | "en-US"

type Recognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: any) => void) | null
  onend: (() => void) | null
  onerror: ((e: any) => void) | null
}

export function speechSupported() {
  return "webkitSpeechRecognition" in window || "SpeechRecognition" in window
}

/**
 * Listens until `silenceMs` passes without speech. Speaking resets the timer.
 * Calls onText with the running transcript and onDone when it stops.
 */
export function listen(opts: {
  lang: ListenLang
  silenceMs: number
  onText: (text: string, final: boolean) => void
  onDone: (error?: string) => void
}) {
  const Ctor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
  const rec: Recognition = new Ctor()
  rec.lang = opts.lang
  rec.interimResults = true
  rec.continuous = true
  let timer = window.setTimeout(() => rec.stop(), opts.silenceMs)
  let finalText = ""
  rec.onresult = (e: any) => {
    clearTimeout(timer)
    timer = window.setTimeout(() => rec.stop(), opts.silenceMs)
    let interim = ""
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) finalText += r[0].transcript
      else interim += r[0].transcript
    }
    opts.onText((finalText + interim).trim(), !interim)
  }
  let error: string | undefined
  rec.onerror = (e: any) => {
    error = e.error
  }
  rec.onend = () => {
    clearTimeout(timer)
    opts.onDone(error)
  }
  rec.start()
  return () => rec.abort()
}

function cantoneseVoice() {
  const voices = speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang === "zh-HK") ??
    voices.find((v) => v.lang.toLowerCase().startsWith("yue")) ??
    voices.find((v) => /cantonese|粵|粤/i.test(v.name))
  )
}

export function speak(text: string, opts: { slow?: boolean; lang?: "zh-HK" | "en-US" } = {}) {
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const lang = opts.lang ?? "zh-HK"
  u.lang = lang
  if (lang === "zh-HK") {
    const v = cantoneseVoice()
    if (v) u.voice = v
  }
  u.rate = opts.slow ? 0.6 : 1
  speechSynthesis.speak(u)
}

export function hasCantoneseVoice() {
  return !!cantoneseVoice()
}
