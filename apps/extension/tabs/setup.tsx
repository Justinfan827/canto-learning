import { cn } from "cn"
import { Captions, ChevronDown, CircleCheck, MessageSquareText, RefreshCw, TriangleAlert, Volume2 } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"

import { Button } from "~components/ui/button"
import { Card, CardContent, CardHeader } from "~components/ui/card"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "~components/ui/field"
import { Spinner } from "~components/ui/spinner"
import { Switch } from "~components/ui/switch"

import "~lib/fonts"
import { loadSettings, saveSettings, type Settings } from "~lib/settings"
import { hasCantoneseVoice, speak } from "~lib/speech"
import { LOCAL_HELPER } from "~lib/features"
import { listEngines, pickEngine, type Engine } from "~lib/transcriber"

import "../tailwind.css"

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
    <main className="min-h-screen bg-surface font-sans text-body">
      <div className="mx-auto flex max-w-[640px] flex-col gap-5 px-5 pt-12 pb-20">
        <header className="mb-2 flex items-center gap-4">
          <div
            aria-hidden
            lang="yue"
            className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary font-zh text-[30px] font-bold text-primary-foreground shadow-[0_4px_0_var(--primary-pressed)]">
            粵
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="m-0 type-display text-foreground">CantoBro settings</h1>
            <p className="m-0 type-body text-muted-foreground">Captions, the dictionary and saved words work with nothing set up here.</p>
          </div>
        </header>

        <SettingsCard id="popup" icon={<MessageSquareText />} title="Pause popup">
          <FieldGroup>
            <Field orientation="horizontal" className="gap-4">
              <FieldContent className="gap-1">
                <FieldLabel htmlFor="pause-popup" className="type-body font-bold text-foreground">
                  Show the paused line over YouTube&apos;s sidebar
                </FieldLabel>
                <FieldDescription className="m-0 type-body-sm text-muted-foreground">
                  When you pause, a small card shows the line so you can look up a word without opening the side panel. It stays hidden while the side panel is
                  open.
                </FieldDescription>
              </FieldContent>
              <Switch id="pause-popup" checked={s.pausePopup} onCheckedChange={(on) => setNow({ pausePopup: on })} />
            </Field>
          </FieldGroup>
        </SettingsCard>

        <SettingsCard id="captions" icon={<Captions />} title="Captions">
          <p className="m-0 type-body text-body">
            The panel uses the video&apos;s Cantonese captions, then Chinese captions.
            {LOCAL_HELPER && " When a video has neither, a small helper app transcribes the audio on this computer. Audio never leaves it."}
          </p>
          {!LOCAL_HELPER ? null : engines === "loading" ? (
            <Status tone="muted" icon={<Spinner />}>
              Looking for the transcriber helper…
            </Status>
          ) : engines ? (
            <>
              <Status tone="ok" icon={<CircleCheck />}>
                Transcriber helper is running.
              </Status>
              <FieldGroup>
                <Field className="gap-2">
                  <FieldLabel htmlFor="engine" className="type-body font-bold text-foreground">
                    Transcription quality
                  </FieldLabel>
                  <div className="relative">
                    <select
                      id="engine"
                      value={s.transcribeEngine}
                      onChange={(e) => setNow({ transcribeEngine: e.target.value })}
                      className="h-11 w-full cursor-pointer appearance-none rounded-md border-2 border-b-4 border-input bg-background pr-10 pl-3 type-body text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                      <option value="auto">Auto{autoLabel(engines)}</option>
                      {engines.map((e) => (
                        <option key={e.id} value={e.id} disabled={!!e.unavailable}>
                          {e.label}
                          {e.unavailable ? ` (${e.unavailable})` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <FieldDescription className="m-0 type-body-sm text-muted-foreground">Auto picks the best installed engine for Cantonese.</FieldDescription>
                </Field>
              </FieldGroup>
            </>
          ) : (
            <>
              <Status tone="warn" icon={<TriangleAlert />}>
                The transcriber helper isn&apos;t running.
              </Status>
              <ol className="m-0 flex list-none flex-col gap-4 p-0">
                <Step n={1} text="Install the tools once (macOS):" code="brew install whisper-cpp yt-dlp ffmpeg" />
                <Step n={2} text="Then start the helper from the project folder and leave it running:" code="pnpm transcriber" />
              </ol>
              <Button variant="outline" size="sm" className="self-start" onClick={checkHelper}>
                <RefreshCw data-icon="inline-start" />
                Check again
              </Button>
            </>
          )}
        </SettingsCard>

        <SettingsCard id="voice" icon={<Volume2 />} title="Cantonese voice">
          {voice ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Status tone="ok" icon={<CircleCheck />} className="flex-1">
                Found a Cantonese voice.
              </Status>
              <Button variant="outline" size="sm" onClick={() => speak("你好，我哋開始啦")}>
                <Volume2 data-icon="inline-start" />
                Test it
              </Button>
            </div>
          ) : (
            <Status tone="warn" icon={<TriangleAlert />}>
              No Cantonese (zh-HK) voice on this computer, so play buttons will use another Chinese voice. On macOS, add one in System Settings → Accessibility →
              Spoken Content.
            </Status>
          )}
        </SettingsCard>
      </div>
    </main>
  )
}

/** One group of settings: a card with an icon and a heading. The id is a link target from the panel. */
function SettingsCard(props: { id: string; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section id={props.id} className="scroll-mt-6">
      <Card className="gap-4 py-5">
        <CardHeader className="flex items-center gap-3 px-5">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-md bg-surface text-milk-tea [&_svg]:size-[22px]">
            {props.icon}
          </span>
          <h2 className="m-0 type-title text-foreground">{props.title}</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-5">{props.children}</CardContent>
      </Card>
    </section>
  )
}

/** A short status line: jade when something works, gold when it needs attention. */
function Status(props: { tone: "ok" | "warn" | "muted"; icon: ReactNode; className?: string; children: ReactNode }) {
  return (
    <p
      className={cn(
        "m-0 flex items-start gap-2.5 rounded-md px-3 py-2.5 type-body-sm font-bold [&_svg]:mt-px [&_svg]:size-[18px] [&_svg]:shrink-0",
        props.tone === "ok" && "bg-jade-soft text-jade-pressed dark:text-jade",
        props.tone === "warn" && "bg-gold-soft text-gold-ink",
        props.tone === "muted" && "bg-surface text-muted-foreground",
        props.className
      )}>
      {props.icon}
      <span>{props.children}</span>
    </p>
  )
}

/** A numbered setup step with a command to copy. */
function Step(props: { n: number; text: string; code: string }) {
  return (
    <li className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-x-3 gap-y-2">
      <span aria-hidden className="grid size-7 place-items-center rounded-full bg-harbour-soft type-body-sm font-extrabold text-harbour-ink">
        {props.n}
      </span>
      <p className="m-0 self-center type-body text-body">{props.text}</p>
      <pre className="col-start-2 m-0 overflow-x-auto rounded-md border-2 border-border bg-surface px-3 py-2.5 font-mono text-[13px] leading-snug text-foreground select-all">
        {props.code}
      </pre>
    </li>
  )
}

function autoLabel(engines: Engine[]) {
  const e = pickEngine(engines, "auto")
  return e ? ` (${e.label})` : " (nothing for Cantonese installed)"
}

export default Setup
