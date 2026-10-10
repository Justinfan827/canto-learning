import { progressOf, type Squad } from "@pna/shared"
import { cn } from "cn"
import { Check, CircleAlert, Copy, Pencil, Smartphone, Trophy, Users } from "lucide-react"
import { useCallback, useEffect, useId, useState } from "react"

import { Button } from "~components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "~components/ui/field"
import { Input } from "~components/ui/input"
import { store } from "~lib/data"
import { createConvexSquads, loadIdentity, saveIdentity, squadError, type SquadIdentity } from "~lib/data/squads"

import { BackBar } from "./SavedList"

const eyebrow = "type-eyebrow text-xs font-extrabold text-muted-foreground"

/** Squads you're in, each with a leaderboard of words learned. Signs this Chrome profile up the first time, no login. */
export function Squads(props: { defaultUrl: string; onBack: () => void }) {
  const [id, setId] = useState<SquadIdentity | null | undefined>(undefined)
  const [squads, setSquads] = useState<Squad[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    loadIdentity().then(setId)
  }, [])

  const api = id ? createConvexSquads(id.url) : null

  const run = async (f: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await f()
    } catch (e) {
      setError(squadError(e))
    } finally {
      setBusy(false)
    }
  }

  // Report this browser's counts, then load the boards.
  const load = useCallback(async () => {
    if (!id) return
    const api = createConvexSquads(id.url)
    try {
      // A browser with no saved words shouldn't overwrite counts another device reported.
      const progress = progressOf(await store.listWords())
      if (progress.saved > 0) await api.report(id, progress)
      setSquads(await api.mySquads(id))
    } catch (e) {
      setError(squadError(e))
    }
  }, [id])
  useEffect(() => {
    load()
  }, [load])

  const back = <BackBar label="Back to video" onBack={props.onBack} />
  const page = (children: React.ReactNode) => <div className="flex min-h-0 flex-1 flex-col bg-surface font-sans text-body">{children}</div>

  if (id === undefined) return page(back)
  if (!id)
    return page(
      <>
        {back}
        <SignUp
          defaultUrl={props.defaultUrl}
          busy={busy}
          error={error}
          onStart={(name, url) =>
            run(async () => {
              const session = await createConvexSquads(url).signUp(name)
              const next = { ...session, url, name: name.trim() }
              await saveIdentity(next)
              setId(next)
            })
          }
        />
      </>
    )

  const upsert = (s: Squad) => setSquads((list) => [...(list ?? []).filter((x) => x.id !== s.id), s])

  return page(
    <>
      {back}
      <div className="flex items-center gap-3 px-4 pt-2 pb-3">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-lg bg-neon-soft text-neon-ink">
          <Trophy className="size-6" strokeWidth={2.5} />
        </span>
        <div className="flex min-w-0 flex-col">
          <h1 className="type-display m-0 text-foreground">Squads</h1>
          <span className="type-body-sm text-muted-foreground">Words learned</span>
        </div>
      </div>
      <div className="list squads flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-0.5 pb-5">
        {squads?.length === 0 && (
          <p className="list-empty m-0 rounded-xl border-2 border-dashed border-border px-5 py-6 text-center type-body text-muted-foreground">
            Make a squad and share its code, or join one with a code from a friend.
          </p>
        )}
        {squads?.map((s) => <Board key={s.id} squad={s} onLeave={() => run(async () => (await api!.leave(id, s.id), setSquads((l) => l?.filter((x) => x.id !== s.id) ?? null)))} />)}
        <div className="flex flex-col gap-4 rounded-xl border-2 border-b-4 border-border bg-card p-4">
          <CodeForm label="Join with a code" placeholder="AB2CD3" button="Join" primary code busy={busy} onSubmit={(code) => run(async () => upsert(await api!.join(id, code)))} />
          <CodeForm label="New squad" placeholder="Squad name" button="Create" busy={busy} onSubmit={(name) => run(async () => upsert(await api!.create(id, name)))} />
          {error && <ErrorNote error={error} />}
        </div>
        <You
          id={id}
          busy={busy}
          onRename={(name) =>
            run(async () => {
              await api!.rename(id, name)
              const next = { ...id, name: name.trim() }
              await saveIdentity(next)
              setId(next)
            })
          }
          onLink={() => api!.linkCode(id)}
        />
      </div>
    </>
  )
}

function ErrorNote({ error }: { error: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-primary-soft px-3 py-2.5 text-destructive">
      <CircleAlert className="mt-px size-4 shrink-0" strokeWidth={2.5} />
      <p className="sq-err m-0 type-body-sm font-bold text-destructive" role="alert">
        {error}
      </p>
    </div>
  )
}

function SignUp(props: { defaultUrl: string; busy: boolean; error: string | null; onStart: (name: string, url: string) => void }) {
  const [name, setName] = useState("")
  const [url, setUrl] = useState(props.defaultUrl)
  const id = useId()
  return (
    <form
      className="sq-start mx-auto flex w-full max-w-[340px] flex-col gap-5 overflow-y-auto px-5 pt-4 pb-8"
      onSubmit={(e) => {
        e.preventDefault()
        props.onStart(name, url.trim())
      }}>
      <div className="flex flex-col items-center gap-3 text-center">
        <span aria-hidden className="grid size-16 place-items-center rounded-2xl bg-neon text-white shadow-[0_5px_0_var(--neon-ink)] dark:text-background dark:shadow-[0_5px_0_var(--neon-soft)]">
          <Users className="size-8" strokeWidth={2.5} />
        </span>
        <h1 className="type-display m-0 text-foreground">Learn with friends</h1>
        <p className="type-body m-0 text-muted-foreground">Join a squad to see how many words everyone has learned. No account needed: pick the name your squad will see.</p>
      </div>
      <FieldGroup className="gap-4">
        <Field className="gap-1.5">
          <FieldLabel htmlFor={id + "-name"} className={eyebrow}>
            Your name
          </FieldLabel>
          <Input id={id + "-name"} className="h-11" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={24} />
        </Field>
        <Field className="gap-1.5">
          <FieldLabel htmlFor={id + "-url"} className={eyebrow}>
            Squad server
          </FieldLabel>
          <Input id={id + "-url"} className="h-11 text-[13px] md:text-[13px]" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-deployment.convex.cloud" />
          <FieldDescription className="small type-body-sm text-muted-foreground">
            A Convex deployment you and your friends share. Only names and word counts go there, never your saved words.
          </FieldDescription>
        </Field>
      </FieldGroup>
      {props.error && <ErrorNote error={props.error} />}
      <Button type="submit" className="primary w-full" disabled={props.busy || !name.trim() || !url.trim()}>
        Start
      </Button>
    </form>
  )
}

/** Rank chips: gold for the leader, warm neutrals after, like a league table. */
const rankTone = ["bg-gold text-gold-ink shadow-[0_3px_0_var(--gold-pressed)] dark:text-background", "bg-border text-body shadow-[0_3px_0_var(--border-pressed)]", "bg-milk-tea/30 text-body shadow-[0_3px_0_var(--milk-tea)]"]

function Board({ squad, onLeave }: { squad: Squad; onLeave: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <section className="sq flex flex-col gap-3 rounded-xl border-2 border-b-4 border-border bg-card p-4 pb-2" aria-label={squad.name}>
      <div className="sq-head flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <b className="type-title truncate text-foreground">{squad.name}</b>
          <span className="type-body-sm text-muted-foreground">
            {squad.members.length} {squad.members.length === 1 ? "member" : "members"}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="type-eyebrow text-[10px] text-muted-foreground">Invite code</span>
          <button
            className={cn(
              "sq-code inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 font-sans text-[13px] font-black tracking-[0.12em] transition-[transform,box-shadow] duration-75 active:translate-y-[3px] active:shadow-none",
              copied ? "bg-jade-soft text-jade-pressed shadow-[0_3px_0_var(--brand-jade)] dark:text-jade" : "bg-neon-soft text-neon-ink shadow-[0_3px_0_var(--neon)]"
            )}
            title="Copy invite code"
            onClick={() => {
              navigator.clipboard?.writeText(squad.code)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}>
            {copied ? <Check className="size-3.5" strokeWidth={3} /> : <Copy className="size-3.5" strokeWidth={2.5} />}
            {copied ? "Copied" : squad.code}
          </button>
        </div>
      </div>
      <ol className="sq-rows m-0 flex list-none flex-col gap-1 p-0">
        {squad.members.map((m, i) => (
          <li
            key={i}
            className={cn(
              "grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-lg border-2 border-transparent px-2 py-2",
              m.isMe && "me border-jade bg-jade-soft"
            )}>
            <span className={cn("rk row-span-2 grid size-7 font-sans place-items-center rounded-full text-[13px] font-black tabular-nums", rankTone[i] ?? "text-muted-foreground")}>{i + 1}</span>
            <span className={cn("nm truncate type-body font-extrabold text-foreground", m.isMe && "text-jade-pressed dark:text-jade")}>
              {m.name}
              {m.isMe && <small className="font-bold text-current opacity-80"> (you)</small>}
            </span>
            <span className="ct text-right font-sans text-base font-black text-jade-pressed tabular-nums dark:text-jade" title={`${m.saved} saved`}>
              {m.learned}
              <small className="text-xs font-bold text-muted-foreground"> / {m.saved}</small>
            </span>
            <span
              aria-hidden
              className={cn("col-span-2 h-2 overflow-hidden rounded-full", m.isMe ? "bg-background/70" : "bg-border")}>
              <span className="block h-full rounded-full bg-jade transition-[width]" style={{ width: `${m.saved ? Math.round((100 * m.learned) / m.saved) : 0}%` }} />
            </span>
          </li>
        ))}
      </ol>
      <Button variant="ghost" size="xs" className="link sq-leave self-end bg-transparent text-muted-foreground" onClick={onLeave}>
        Leave
      </Button>
    </section>
  )
}

function CodeForm(props: { label: string; placeholder: string; button: string; primary?: boolean; code?: boolean; busy: boolean; onSubmit: (v: string) => Promise<void> }) {
  const [value, setValue] = useState("")
  const id = useId()
  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor={id} className={eyebrow}>
        {props.label}
      </FieldLabel>
      <form
        className="sq-form flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          await props.onSubmit(value)
          setValue("")
        }}>
        <Input
          id={id}
          className={cn("h-[46px] flex-1", props.code && "tracking-[0.12em] uppercase placeholder:tracking-[0.12em]")}
          aria-label={props.label}
          placeholder={props.placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button type="submit" variant={props.primary ? "default" : "outline"} className="primary w-[92px] px-3" disabled={props.busy || !value.trim()}>
          {props.button}
        </Button>
      </form>
    </Field>
  )
}

function You(props: { id: SquadIdentity; busy: boolean; onRename: (name: string) => void; onLink: () => Promise<{ code: string; expiresAt: number }> }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(props.id.name)
  const [link, setLink] = useState<{ code: string; expiresAt: number } | null>(null)
  return (
    <div className="sq-you flex flex-col gap-3 rounded-xl border-2 border-border bg-card px-4 py-3.5 type-body-sm">
      {editing ? (
        <form
          className="sq-form flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            props.onRename(name)
            setEditing(false)
          }}>
          <Input className="h-[46px] flex-1" aria-label="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoFocus />
          <Button type="submit" variant="jade" className="primary px-4" disabled={props.busy || !name.trim()}>
            Save
          </Button>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="m-0 min-w-0 truncate type-body">
            You&apos;re <b className="font-black text-foreground">{props.id.name}</b>.{" "}
          </p>
          <Button variant="ghost" size="sm" className="link shrink-0 bg-transparent px-2" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" strokeWidth={2.5} />
            Rename
          </Button>
        </div>
      )}
      {link ? (
        <div className="flex items-start gap-3 rounded-lg bg-gold-soft px-3 py-3 text-gold-ink">
          <Smartphone className="mt-0.5 size-5 shrink-0" strokeWidth={2.5} />
          <p className="m-0 type-body-sm">
            In the Canto app, open Squads and enter{" "}
            <b className="sq-link mx-0.5 inline-block rounded-md bg-background px-2 py-0.5 font-sans text-[15px] font-black tracking-[0.14em] text-foreground">{link.code}</b> before{" "}
            {new Date(link.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.
          </p>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="link self-start bg-background" onClick={() => props.onLink().then(setLink).catch(() => {})}>
          <Smartphone className="size-4" strokeWidth={2.5} />
          Use squads on your phone
        </Button>
      )}
      <p className="m-0 text-xs font-semibold text-muted-foreground">Counts are words marked known or reviewed until they come back three weeks apart, out of words saved.</p>
    </div>
  )
}
