/** Thin wrappers over the browser's speech synthesis. */

function cantoneseVoice() {
  const voices = speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang === "zh-HK") ??
    voices.find((v) => v.lang.toLowerCase().startsWith("yue")) ??
    voices.find((v) => /cantonese|粵|粤/i.test(v.name))
  )
}

export function speak(text: string, opts: { slow?: boolean } = {}) {
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = "zh-HK"
  const v = cantoneseVoice()
  if (v) u.voice = v
  u.rate = opts.slow ? 0.6 : 1
  speechSynthesis.speak(u)
}

export function hasCantoneseVoice() {
  return !!cantoneseVoice()
}
