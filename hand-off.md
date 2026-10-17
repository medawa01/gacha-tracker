# hand-off — gacha-tracker

Personal static web app tracking gacha currencies across 10 games. Converted from a Google Sheet. Single page, no backend, GitHub Pages.

## Links & locations

| | |
|---|---|
| Live site | https://medawa01.github.io/gacha-tracker/ |
| Repo | https://github.com/medawa01/gacha-tracker (public — free plan has no Pages on private repos) |
| Local repo (canonical, branch `main`) | `G:\Downloads\opencode\gacha-tracker\` |
| Source sheet | `G:\Downloads\opencode\GI.xlsx`, sheet `GCH` — blocks repeat every 4 cols: F NTE, J ZZZ, N Genshin, R GFL2, V CZN, Z Endfield, AD Nikke, AH Stella Sora, AL WuWa, AP HSR |
| Scratch (superseded, never publish) | `G:\Downloads\opencode\{draft,nte-draft,zzz-draft}.html` |

## How it works

- `index.html` — all CSS + JS inline. Renders one card per game from the `GAMES` array.
- `assets/*.jpg` — 1200x400 header art, slug = lowercase id (`stella-sora.jpg`).
- Each card: header banner (game name + ⓘ infotip), result block (deficit / need / progress bar / eff. rolls), five stepper rows (Currency, Rolls, Tokens, Pity, Target — derived pull counts under each label), collapsible Resin timer (last value + timestamp → current / full-in / full-at / X-in).
- Only per-game config changes: `gemPerPull, glitterPerPull, targetMult, deficitPerPull, resinCap, regenMin`.
- State in `localStorage` key `gacha-<ID>`; timer recalculates every 30s.

## Sheet → app values (verified against GI.xlsx computed values)

| Game | gem/pull | token rate | target× | deficit× | resin cap/regen |
|---|---|---|---|---|---|
| NTE | 160 | 24 | 80 | 160 | 240 / 6min* |
| ZZZ | 160 | 20 | 160 | 160 | 240 / 6min |
| Genshin | 160 | 5 | 150 | 160 | 200 / 8min |
| GFL2 | 150 | 30 | 130 | 160 (!) | 260 / 5min |
| CZN | 160 | 10 | 120 | 160 | 314 / 6min |
| Endfield | 500 | 25 | 120 | 160 (!) | 350 / 7.2min |
| Nikke | 300 | 1 | 200 | 300 | none |
| Stella Sora | 300 | 100 | 120 | 160 (!) | none |
| WuWa | 160 | 8 | 150 | 160 | 240 / 6min |
| HSR | 160 | 20 | 150 | 160 | 300 / 6min |

- `*` NTE sheet said 200 cap / 8min; updated to 240 / 6min per web (ntegame.net checklist).
- `(!)` deficit multiplier kept exactly as in the sheet even where it differs from gem cost — user decision; revisit if wrong in-game.
- Labels: sheet's "Gems"/"Starglitter" renamed to "Currency"/"Tokens" (Genshin-specific otherwise). "Target" = desired guaranteed 5-stars; "X" = resin alert threshold (auto-stamps timestamp when Last resin edited).

## Design system (card redesign)

Visual spec: `G:\Downloads\OpenCode\NTE Pull Calculator Card – Redesign Spec.md` (written for one card; applied to all ten).

- Tokens in `:root` — page `#05060B`, card/well `#0D0F1B`, surface `#161828`, border `#262A40`, control border `#2A2F48`, divider `#23273D`, text `#ECEEF8`/`#C9CDE3`/`#9AA0BC`, accent (cyan) `#5CE1E6`, warning (coral) `#FF9A5C`, hover `#1B1F33`, focus `#161A2C`.
- Fonts: Space Grotesk (display/labels) + IBM Plex Mono (numbers/captions) from Google Fonts. Offline falls back to system-ui/monospace.
- Card = 20px radius; result block 14px; stepper/resin button 12px; progress bar 4px.
- Steppers: 44×44 − / 84px input / 44×44 + (`.sinput`). Inputs are `type="text"` + `inputmode="numeric"`, no spinners; raw digits while focused, `Intl`-formatted on blur; − disabled at 0. Values are clamped at ≥ 0; step is 1 (the old native inputs had no `step`).
- Numbers: `rawOf`/`numOf` strip separators on read; `localStorage` always stores raw digits, so old saved values stay valid.
- Layout: 5 columns at ≥1280px viewport, else auto-fit ≥250px. Narrow cards use a container query (`@container (max-width:320px)`) that shrinks the input to 66px and wraps the derived subtext; 44px hit areas are kept.
- Result block: deficit = `need − pity − eff` (unchanged math); `pullsNeeded` shown in the caption is `target×mult − pity`; bar fill = `eff/pullsNeeded`. Goal-reached states: "pulls spare" (accent) / "goal reached" at 0 — this replaced the old "done ✓" wording.
- Resin timestamps: "Last checked" and "Full at" are read-only computed values, formatted `dd/MM/yy HH:mm` by `fmtStamp()` (locale-independent on purpose). "Last checked" is set only by `CHECKED[p] = nowLocal()` when Last resin is edited — there is no date picker. Storage keeps the old `checked` shape (`YYYY-MM-DDTHH:mm`), so existing saves still load.

## Workflow rules for this project

- Work locally, commit locally. Push (`git push origin main`) ONLY when the user says "push".
- After push, Pages takes ~1–2 min: `gh api repos/medawa01/gacha-tracker/pages/builds --jq ".[0]"`.
- Live site is JS-rendered; `webfetch` shows only the shell — verify deploys by fetching raw HTML and grepping markers.

## Environment (PC, Win11, PowerShell 5.1)

- Git + gh CLI via winget, but child shells may lack them on PATH (installed after the agent service started) — use full paths: `C:\Program Files\Git\bin\git.exe`, `C:\Program Files\GitHub CLI\gh.exe`.
- No `&&` or `~` in PowerShell; use `;` and full paths.
- Commits as `medawa <medawa01@users.noreply.github.com>`.
- Global skill `web-design-guidelines` installed (`~\.agents\skills\`) — page already audited against it (labels, focus-visible, Intl formatters, landmarks, reduced-motion). Exception: resin timestamps use a deliberate `dd/MM/yy HH:mm` formatter instead of `Intl.DateTimeFormat`, so the minutes stay visible in narrow cards.
- JS check trick: extract `<script>` to a temp file, run `node --check` on it.
- Headless UI check (no browser needed on screen): run Edge headless (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`) with `--headless=new --dump-dom --virtual-time-budget=6000 --user-data-dir=<temp>`. Inject a `<script>` into a temp copy of the page that measures/getRect()s things and writes results into a `<pre id="diag">`, then grep the dump. This is how overflow, collisions and stepper behaviour were verified. Pass `--window-size=W,H` as its own argv entry (build the argument list as an array; PowerShell string-concat mangles it and Edge then exits 13).
