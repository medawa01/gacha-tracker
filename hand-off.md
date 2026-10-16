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
- Each card: Currency→pulls, Rolls, Tokens→pulls, Eff. Rolls, Pity, Target, Deficit (+currency), collapsible Resin timer (last value + timestamp → current / full-in / full-at / X-in).
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

## Workflow rules for this project

- Work locally, commit locally. Push (`git push origin main`) ONLY when the user says "push".
- After push, Pages takes ~1–2 min: `gh api repos/medawa01/gacha-tracker/pages/builds --jq ".[0]"`.
- Live site is JS-rendered; `webfetch` shows only the shell — verify deploys by fetching raw HTML and grepping markers.

## Environment (PC, Win11, PowerShell 5.1)

- Git + gh CLI via winget, but child shells may lack them on PATH (installed after the agent service started) — use full paths: `C:\Program Files\Git\bin\git.exe`, `C:\Program Files\GitHub CLI\gh.exe`.
- No `&&` or `~` in PowerShell; use `;` and full paths.
- Commits as `medawa <medawa01@users.noreply.github.com>`.
- Global skill `web-design-guidelines` installed (`~\.agents\skills\`) — page already audited against it (labels, focus-visible, Intl formatters, landmarks, reduced-motion).
- JS check trick: extract `<script>` to a temp file, run `node --check` on it.
