import { cn } from "cn"
import { Check, ChevronDown, Ellipsis, Star, UsersRound } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"

import type { Account } from "~lib/auth"
import type { Settings } from "~lib/settings"

import { Button, buttonVariants } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Switch } from "./ui/switch"
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group"

export type PillTone = "ok" | "work" | "warn" | "idle"

export interface Pill {
  text: string
  tone: PillTone
  /** A fix to offer in the source menu, e.g. open transcriber setup. */
  action?: { label: string; run: () => void }
}

/** One caption source in the pill's menu: YouTube's captions or a local speech model. */
export interface SourceOption {
  id: string
  label: string
  note?: string
  active: boolean
  disabled?: boolean
}

/** The status dot's colour: jade when captions are in, gold while working or when something's missing. */
export function StatusDot({ tone, className }: { tone: PillTone; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-2 shrink-0 rounded-full",
        tone === "ok" && "bg-jade",
        tone === "work" && "animate-pulse bg-gold",
        tone === "warn" && "bg-gold-pressed",
        tone === "idle" && "bg-faint",
        className
      )}
    />
  )
}

/** A floating menu's frame, matching the shadcn dropdown: white, 16px corners, one soft shadow. */
const floating = "absolute top-full z-50 mt-2 grid rounded-lg bg-popover p-1.5 font-sans text-popover-foreground shadow-md ring-1 ring-foreground/10"
/** Header icon buttons: 34px, muted until hovered or open. */
const iconButton = "ib text-muted-foreground hover:bg-border/60 hover:text-foreground aria-expanded:bg-border/60 aria-expanded:text-foreground [&_svg:not([class*='size-'])]:size-[19px]"

/** Caption-source pill on the left; saved words, display options and settings on the right. */
export function Header(props: {
  pill: Pill
  sources: SourceOption[]
  onSource: (id: string) => void
  savedCount: number
  menuOpen: boolean
  onSaved: () => void
  onSquads: () => void
  onMenu: (open: boolean) => void
  /** Who's signed in: null for a guest, undefined when this build has no accounts. */
  account?: Account | null
  onSignIn: () => void
  onSignOut: () => void
  onSettings: () => void
  menu: ReactNode
}) {
  const { pill } = props
  const menuRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)
  const [srcOpen, setSrcOpen] = useState(false)
  useEffect(() => {
    if (!srcOpen) return
    const close = (e: PointerEvent) => {
      if (!srcRef.current?.contains(e.target as Node)) setSrcOpen(false)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [srcOpen])
  useEffect(() => {
    if (!props.menuOpen) return
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) props.onMenu(false)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [props.menuOpen, props.onMenu])

  return (
    <header className="bar flex flex-none items-center gap-1 px-3.5 pt-3 pb-3">
      <div className="relative mr-1 min-w-0 flex-1" ref={srcRef}>
        <Button
          variant="outline"
          size="sm"
          className="pill max-w-full justify-start gap-2 pr-2.5 pl-3 font-sans text-[13px] font-extrabold tracking-normal text-body normal-case"
          aria-haspopup="menu"
          aria-expanded={srcOpen}
          title="Change caption source"
          onClick={() => setSrcOpen(!srcOpen)}>
          <StatusDot tone={pill.tone} />
          <span className="pill-text truncate">{pill.text}</span>
          <ChevronDown className="size-4 text-muted-foreground" strokeWidth={2.75} />
        </Button>
        {srcOpen && (
          <div className={cn(floating, "src-menu left-0 w-[272px] max-w-[calc(100vw-28px)] gap-0.5")} role="menu">
            <div className="px-2.5 pt-1.5 pb-1 type-eyebrow text-muted-foreground">Captions from</div>
            {props.sources.map((s) => (
              <button
                key={s.id}
                role="menuitemradio"
                aria-checked={s.active}
                className={cn(
                  "srcopt flex items-start gap-2 rounded-md px-2.5 py-2 text-left type-body text-foreground hover:bg-accent disabled:text-faint disabled:hover:bg-transparent",
                  s.active && "bg-jade-soft text-jade-pressed hover:bg-jade-soft"
                )}
                disabled={s.disabled}
                onClick={() => {
                  setSrcOpen(false)
                  props.onSource(s.id)
                }}>
                <span className="grid h-[22px] w-4 flex-none place-items-center">{s.active && <Check className="size-4" strokeWidth={3} />}</span>
                <span className="min-w-0">
                  <span className="block font-bold">{s.label}</span>
                  {s.note && <span className={cn("block type-body-sm", s.disabled ? "text-faint" : "text-muted-foreground")}>{s.note}</span>}
                </span>
              </button>
            ))}
            {pill.action && (
              <div className="mt-1 border-t-2 border-border pt-1.5">
                <button
                  className="srcopt flex w-full items-center rounded-md px-2.5 py-2 text-left type-button text-harbour-ink hover:bg-harbour-soft"
                  onClick={() => {
                    setSrcOpen(false)
                    pill.action!.run()
                  }}>
                  {pill.action.label}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <Button variant="ghost" size="icon" className={iconButton} aria-label="Saved words" title="Saved words" onClick={props.onSaved}>
        <Star strokeWidth={2.5} />
        {props.savedCount > 0 && (
          <span className="n absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 font-sans text-[11px] leading-none font-black tracking-normal text-primary-foreground ring-2 ring-surface">
            {props.savedCount > 99 ? "99+" : props.savedCount}
          </span>
        )}
      </Button>
      <Button variant="ghost" size="icon" className={iconButton} aria-label="Squads" title="Squads" onClick={props.onSquads}>
        <UsersRound strokeWidth={2.5} />
      </Button>
      <div className="relative" ref={menuRef}>
        <Button
          variant="ghost"
          size="icon"
          className={cn(iconButton, "text-[15px] font-black tracking-normal normal-case", props.menuOpen && "bg-border/60 text-foreground")}
          aria-label="Display options"
          aria-expanded={props.menuOpen}
          title="Display options"
          onClick={() => props.onMenu(!props.menuOpen)}>
          Aa
        </Button>
        {props.menuOpen && props.menu}
      </div>
      <DropdownMenu>
        {/* The trigger takes Button's look, not the component: Button doesn't forward refs on React 18, which the menu needs to position itself. */}
        <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), iconButton)} aria-label="More" title="Account and settings">
          <Ellipsis strokeWidth={2.75} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {props.account !== undefined && (
            <>
              <DropdownMenuGroup>
                <DropdownMenuLabel className="type-body-sm break-words text-muted-foreground">
                  {props.account ? `Signed in as ${props.account.email}` : "Guest: saved words stay in this browser"}
                </DropdownMenuLabel>
                {props.account ? (
                  <DropdownMenuItem onClick={props.onSignOut}>Sign out</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={props.onSignIn}>Sign in</DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={props.onSettings}>Settings</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

/** One Aa menu option: what it is, what it changes, and its control on the right. */
function Row({ title, help, children, off }: { title: ReactNode; help?: ReactNode; children: ReactNode; off?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-2.5 py-3">
      <div className={cn("min-w-0 type-body font-bold text-foreground", off && "text-muted-foreground")}>
        {title}
        {help}
      </div>
      {children}
    </div>
  )
}

const Help = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cn("mt-0.5 block type-body-sm text-muted-foreground", className)}>{children}</span>
)

/** The Aa menu: each option says what it changes. */
export function DisplayMenu({
  s,
  canFormal,
  onChange
}: {
  s: Settings
  /** True when 書面語 is available, from a second local transcript. */
  canFormal: boolean
  onChange: (p: Partial<Settings>) => void
}) {
  return (
    <div className={cn(floating, "pop -right-[38px] w-[300px] max-w-[calc(100vw-28px)] divide-y-2 divide-border px-2 py-1")} role="dialog" aria-label="Display options">
      <label>
        <Row title="Jyutping" help={<Help>Romanisation above each character</Help>}>
          <Toggle on={s.showJyutping} onChange={(v) => onChange({ showJyutping: v })} label="Jyutping" />
        </Row>
      </label>
      <Row
        off={!canFormal}
        title="Chinese"
        help={
          <>
            <Help>As spoken, or as written in Chinese</Help>
            {!canFormal && <Help className="text-gold-ink">Only on videos transcribed on this computer</Help>}
          </>
        }>
        <Seg
          value={canFormal ? s.register : "colloquial"}
          disabled={!canFormal}
          options={[
            ["colloquial", "口語"],
            ["formal", "書面語"]
          ]}
          onChange={(v) => onChange({ register: v })}
          zh
        />
      </Row>
      <label>
        <Row title="Pop up when paused" help={<Help>The paused line over YouTube's sidebar, while this panel is closed</Help>}>
          <Toggle on={s.pausePopup} onChange={(v) => onChange({ pausePopup: v })} label="Pop up when paused" />
        </Row>
      </label>
      <Row title="Text size">
        <Seg
          value={s.textSize}
          options={[
            [
              "s",
              <span key="s" style={{ fontSize: 12 }}>
                A
              </span>
            ],
            [
              "m",
              <span key="m" style={{ fontSize: 15 }}>
                A
              </span>
            ],
            [
              "l",
              <span key="l" style={{ fontSize: 19 }}>
                A
              </span>
            ]
          ]}
          onChange={(v) => onChange({ textSize: v })}
          ariaLabels={["Small", "Medium", "Large"]}
        />
      </Row>
    </div>
  )
}

function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <Switch
      render={<button />}
      nativeButton
      checked={on}
      onCheckedChange={(v) => onChange(v)}
      aria-label={label}
      disabled={disabled}
      className="h-6! w-10! [&>span]:size-5!"
    />
  )
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
    <ToggleGroup
      value={[props.value]}
      onValueChange={(v) => v[0] && props.onChange(v[0] as T)}
      disabled={props.disabled}
      spacing={0.5}
      className="flex-none rounded-md bg-muted p-[3px] ring-2 ring-border ring-inset">
      {props.options.map(([v, label], i) => (
        <ToggleGroupItem
          key={v}
          value={v}
          aria-label={props.ariaLabels?.[i]}
          size="sm"
          className={cn(
            "h-8 min-w-9 rounded-[9px] px-2.5 leading-none text-muted-foreground hover:bg-transparent aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-[0_2px_0_var(--border)] aria-pressed:hover:bg-background",
            props.zh && "font-zh text-[14px] font-bold"
          )}>
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
