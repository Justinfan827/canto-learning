import { progressOf, type Squad } from "@pna/shared"
import { useCallback, useEffect, useState } from "react"

import { store } from "~lib/data"
import { createConvexSquads, loadIdentity, saveIdentity, squadError, type SquadIdentity } from "~lib/data/squads"

import { Icon } from "./Icon"

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

  const back = (
    <header className="bar">
      <div className="grow">
        <button className="pill" onClick={props.onBack}>
          <Icon name="back" />
          Back to video
        </button>
      </div>
    </header>
  )

  if (id === undefined) return back
  if (!id)
    return (
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

  return (
    <>
      {back}
      <div className="lh">
        <h1>Squads</h1>
        <span>Words learned</span>
      </div>
      <div className="list squads">
        {squads?.length === 0 && <p className="muted list-empty">Make a squad and share its code, or join one with a code from a friend.</p>}
        {squads?.map((s) => <Board key={s.id} squad={s} onLeave={() => run(async () => (await api!.leave(id, s.id), setSquads((l) => l?.filter((x) => x.id !== s.id) ?? null)))} />)}
        <CodeForm label="Join with a code" placeholder="AB2CD3" button="Join" busy={busy} onSubmit={(code) => run(async () => upsert(await api!.join(id, code)))} />
        <CodeForm label="New squad" placeholder="Squad name" button="Create" busy={busy} onSubmit={(name) => run(async () => upsert(await api!.create(id, name)))} />
        {error && (
          <p className="sq-err" role="alert">
            {error}
          </p>
        )}
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

function SignUp(props: { defaultUrl: string; busy: boolean; error: string | null; onStart: (name: string, url: string) => void }) {
  const [name, setName] = useState("")
  const [url, setUrl] = useState(props.defaultUrl)
  return (
    <form
      className="sq-start"
      onSubmit={(e) => {
        e.preventDefault()
        props.onStart(name, url.trim())
      }}
    >
      <h1>Learn with friends</h1>
      <p className="muted">Join a squad to see how many words everyone has learned. No account needed: pick the name your squad will see.</p>
      <label>
        Your name
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={24} />
      </label>
      <label>
        Squad server
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-deployment.convex.cloud" />
      </label>
      <p className="muted small">A Convex deployment you and your friends share. Only names and word counts go there, never your saved words.</p>
      {props.error && (
        <p className="sq-err" role="alert">
          {props.error}
        </p>
      )}
      <button className="primary" disabled={props.busy || !name.trim() || !url.trim()}>
        Start
      </button>
    </form>
  )
}

function Board({ squad, onLeave }: { squad: Squad; onLeave: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <section className="sq" aria-label={squad.name}>
      <div className="sq-head">
        <b>{squad.name}</b>
        <button
          className="sq-code"
          title="Copy invite code"
          onClick={() => {
            navigator.clipboard?.writeText(squad.code)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? "Copied" : squad.code}
        </button>
      </div>
      <ol className="sq-rows">
        {squad.members.map((m, i) => (
          <li key={i} className={m.isMe ? "me" : ""}>
            <span className="rk">{i + 1}</span>
            <span className="nm">
              {m.name}
              {m.isMe && <small> (you)</small>}
            </span>
            <span className="ct" title={`${m.saved} saved`}>
              {m.learned}
              <small> / {m.saved}</small>
            </span>
          </li>
        ))}
      </ol>
      <button className="link sq-leave" onClick={onLeave}>
        Leave
      </button>
    </section>
  )
}

function CodeForm(props: { label: string; placeholder: string; button: string; busy: boolean; onSubmit: (v: string) => Promise<void> }) {
  const [value, setValue] = useState("")
  return (
    <form
      className="sq-form"
      onSubmit={async (e) => {
        e.preventDefault()
        await props.onSubmit(value)
        setValue("")
      }}
    >
      <input aria-label={props.label} placeholder={props.placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="primary" disabled={props.busy || !value.trim()}>
        {props.button}
      </button>
    </form>
  )
}

function You(props: { id: SquadIdentity; busy: boolean; onRename: (name: string) => void; onLink: () => Promise<{ code: string; expiresAt: number }> }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(props.id.name)
  const [link, setLink] = useState<{ code: string; expiresAt: number } | null>(null)
  return (
    <div className="sq-you">
      {editing ? (
        <form
          className="sq-form"
          onSubmit={(e) => {
            e.preventDefault()
            props.onRename(name)
            setEditing(false)
          }}
        >
          <input aria-label="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoFocus />
          <button className="primary" disabled={props.busy || !name.trim()}>
            Save
          </button>
        </form>
      ) : (
        <p>
          You&apos;re <b>{props.id.name}</b>.{" "}
          <button className="link" onClick={() => setEditing(true)}>
            Rename
          </button>
        </p>
      )}
      {link ? (
        <p>
          In the Canto app, open Squads and enter <b className="sq-link">{link.code}</b> before {new Date(link.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.
        </p>
      ) : (
        <button className="link" onClick={() => props.onLink().then(setLink).catch(() => {})}>
          Use squads on your phone
        </button>
      )}
      <p className="muted small">Counts are words marked known or reviewed until they come back three weeks apart, out of words saved.</p>
    </div>
  )
}
