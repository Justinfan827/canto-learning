# Themes: DESIGN.md skins for Canto

Every brand in `design/inspiration/` has a `DESIGN.md` ([Google's DESIGN.md format](https://github.com/google-labs-code/design.md)): YAML tokens plus prose on how to use them. CantoBro's current look is `/DESIGN.md` at the repo root (Hong Kong colours on Duolingo's chunky style); the earlier calm jade look is kept as `design/inspiration/canto-calm/DESIGN.md`. All of them share **one token contract**, so any brand can reskin Canto.

```sh
pnpm design:reskin duolingo            # print the CSS variables for the Duolingo skin
pnpm design:reskin duolingo --apply    # write them into apps/extension/style.css
pnpm design:reskin canto-calm --apply  # the earlier calm jade look
npx @google/design.md lint design/inspiration/drops-web/DESIGN.md
pnpm design:kits                       # zip each brand's illustrations into design/exports/
```

## Token contract

| DESIGN.md token | Canto CSS variable | Used for |
|---|---|---|
| `primary` / `dark-primary` | `--jade` | primary actions, selected word, focus, progress |
| `on-primary` | `--on-accent` | text on primary |
| `primary-soft` | `--jade-soft` | selected-word fill, soft highlight |
| `warning`, `warning-soft` | `--amber`, `--amber-soft` | saved words, "needs setup", transcribing progress |
| `error` | `--red` | inline errors |
| `background` | `--bg` | page and transcript background |
| `surface-muted` | `--soft` | cards, pills, segmented controls |
| `on-surface` | `--fg` | text |
| `on-surface-muted`, `on-surface-faint` | `--muted`, `--faint` | secondary text, hints, upcoming steps |
| `border` | `--line` | hairlines |
| `typography.body-md.fontFamily` | `--f-ui` | UI font |
| `typography.transcript-current.fontFamily` | `--f-zh` | Cantonese characters |
| `rounded.sm / md / lg` | `--r-s / --r-m / --r-l` | radius scale |

Every colour has a `dark-` twin, applied under `prefers-color-scheme: dark`. Required typography tokens: `headline-md`, `body-md`, `body-sm`, `label-md`, `label-sm`, `transcript-current`, `transcript-line`, `word-card`, `jyutping`. Required components: `button-primary`, `button-secondary`, `chip`, `word-selected`, `card`, `sheet`, `tab-active`. Brands add extra tokens (tone colours, reward gold, lip buttons); the reskin ignores those, but agents and designers can use them.

The reskin swaps colours, fonts and radii only. Component shapes that need new CSS (Duolingo's 3D lip, Drops' full-screen colour fields) are described in each file's Components section; build them deliberately rather than automatically.

Each brand file also ends with **Illustration & Imagery** (a ready-to-paste "style DNA" prompt for image models) and **Reskinning Canto** (what changes, what to watch).

**Note (after the CantoBro redesign):** the extension now takes its colours, fonts and radii from `apps/extension/globals.css` (Tailwind v4 and shadcn/ui, built from `/DESIGN.md`). `reskin --apply` still writes the older variables in `style.css`, which only the few remaining legacy rules use, so it no longer reskins the app. To try a brand for real, map its DESIGN.md tokens onto the variables in `globals.css` instead.
