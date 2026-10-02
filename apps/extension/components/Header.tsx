import { useEffect, useRef, type ReactNode } from "react"

import type { Settings } from "~lib/settings"

import { Icon } from "./Icon"

export type PillTone = "ok" | "work" | "warn" | "idle"

export interface Pill {
  text: string
  tone: PillTone
  /** What clicking the pill does, e.g. open transcriber setup. */
  action?: { label: string; run: () => void }
}

/** Caption-source pill on the left; saved words, display options and settings on the right. */
export function Header(props: {
  pill: Pill
  savedCount: number
  menuOpen: boolean
  onSaved: () => void
  onMenu: (open: boolean) => void
  onMore: () => void
  menu: ReactNode
}) {
  const { pill } = props
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!props.menuOpen) return
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) props.onMenu(false)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [props.menuOpen, props.onMenu])

  const pillBody = (
    <>
      <span className={"dot " + pill.tone} />
      <span className="pill-text">{pill.text}</span>
      {pill.action && <span className="pill-action">{pill.action.label}</span>}
    </>
  )
  return (
    <header className="bar">
      <div className="grow">
        {pill.action ? (
          <button className="pill" onClick={pill.action.run} title={pill.action.label}>
            {pillBody}
          </button>
        ) : (
          <span className="pill">{pillBody}</span>
        )}
      </div>
      <button className="ib" aria-label="Saved words" title="Saved words" onClick={props.onSaved}>
        <Icon name="star" />
        {props.savedCount > 0 && <span className="n">{props.savedCount > 99 ? "99+" : props.savedCount}</span>}
      </button>
      <div className="menu-anchor" ref={menuRef}>
        <button
          className={"ib aa" + (props.menuOpen ? " on" : "")}
          aria-label="Display options"
          aria-expanded={props.menuOpen}
          title="Display options"
          onClick={() => props.onMenu(!props.menuOpen)}
        >
          Aa
        </button>
        {props.menuOpen && props.menu}
      </div>
      <button className="ib" aria-label="Settings" title="Settings" onClick={props.onMore}>
        <Icon name="more" />
      </button>
    </header>
  )
}

/** The Aa menu: each option says what it changes. */
export function DisplayMenu({ s, hasAi, onChange }: { s: Settings; hasAi: boolean; onChange: (p: Partial<Settings>) => void }) {
  const needsTutor = <small className="needs">Needs an AI tutor</small>
  return (
    <div className="pop" role="dialog" aria-label="Display options">
      <label className="row">
        <div>
          Jyutping<small>Romanisation above each character</small>
        </div>
        <Toggle on={s.showJyutping} onChange={(v) => onChange({ showJyutping: v })} label="Jyutping" />
      </label>
      <div className={"row" + (hasAi ? "" : " off")}>
        <div>
          Chinese<small>As spoken, or as written in Chinese</small>
          {!hasAi && needsTutor}
        </div>
        <Seg
          value={s.register}
          disabled={!hasAi}
          options={[
            ["colloquial", "口語"],
            ["formal", "書面語"]
          ]}
          onChange={(v) => onChange({ register: v })}
          zh
        />
      </div>
      <label className={"row" + (hasAi ? "" : " off")}>
        <div>
          English<small>Translation under the current line</small>
          {!hasAi && needsTutor}
        </div>
        <Toggle on={s.showEnglish && hasAi} disabled={!hasAi} onChange={(v) => onChange({ showEnglish: v })} label="English" />
      </label>
      <div className="row">
        <div>Text size</div>
        <Seg
          value={s.textSize}
          options={[
            [
              "s",
              <span key="s" style={{ fontSize: 11 }}>
                A
              </span>
            ],
            [
              "m",
              <span key="m" style={{ fontSize: 13 }}>
                A
              </span>
            ],
            [
              "l",
              <span key="l" style={{ fontSize: 16 }}>
                A
              </span>
            ]
          ]}
          onChange={(v) => onChange({ textSize: v })}
          ariaLabels={["Small", "Medium", "Large"]}
        />
      </div>
    </div>
  )
}

function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button role="switch" aria-checked={on} aria-label={label} disabled={disabled} className={"tog" + (on ? " on" : "")} onClick={() => onChange(!on)} />
}

function Seg<T extends string>(props: {
  value: T
  options: [T, ReactNode][]
  onChange: (v: T) => void
  disabled?: boolean
  zh?: boolean
  ariaLabels?: string[]
}) {
  return (
    <div className={"seg" + (props.zh ? " zh" : "")} role="radiogroup">
      {props.options.map(([v, label], i) => (
        <button
          key={v}
          role="radio"
          aria-checked={props.value === v}
          aria-label={props.ariaLabels?.[i]}
          disabled={props.disabled}
          className={props.value === v ? "on" : ""}
          onClick={() => props.onChange(v)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
