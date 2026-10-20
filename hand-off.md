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
- All the math lives in `computePulls` / `computeResin` (DOM-free); `calc()` only reads the DOM, calls them, writes the DOM, then persists. Don't put math back into `calc()`.
- `test/calc.test.js` — `node test/calc.test.js` (40 assertions, no deps).
- `assets/*.jpg` — 1200x400 header art, slug = lowercase id (`stella-sora.jpg`).
- Each card: header banner (game name + ⓘ infotip), result block (deficit / need / progress bar / eff. rolls), five stepper rows (Currency, Rolls, Tokens, Pity, Target — derived pull counts under each label), collapsible Resin timer (last value + timestamp → current / full-in / full-at / X-in).
- Only per-game config changes: `gemPerPull, glitterPerPull, targetMult, deficitPerPull, resinCap, regenMin`.
- State in `localStorage` key `gacha-<ID>`; timer recalculates every 30s. The chosen theme lives in its own key `gacha-theme` (`midnight` | `lime`) so the game data and the export/import JSON format stay untouched.
- Header buttons (top-right, icon-only): **Theme** opens a dropdown to switch palette, **Export JSON** downloads `gacha-tracker-YYYY-MM-DD.json` = `{ "<ID>": {field:value} }` for all ten games — the stored shape verbatim, no envelope or version tag. **Import JSON** writes those keys back to `localStorage`, repaints inputs (`loadState()`) and recalculates. It confirms once, then overwrites only the keys the file names, so a hand-edited or partial file (`{"HSR":{"gems":"999"}}`) works. Status line under the buttons reports the result (accent = done, coral = refused).

## Sheet → app values (verified against GI.xlsx computed values)

| Game | gem/pull | token rate | target× | deficit× | resin cap/regen |
|---|---|---|---|---|---|
| NTE | 160 | 24 | 80 | 160 | 240 / 6min* |
| ZZZ | 160 | 20 | 160 | 160 | 240 / 6min |
| Genshin | 160 | 5 | 150 | 160 | 200 / 8min |
| GFL2 | 150 | 30 | 130 | 160 (!) | 260 / 5min |
| CZN | 160 | 10 | 120 | 160 | 314 / 6min |
| Endfield | 500 | 25 | 120 | 160 (!) | 360 / 7.2min |
| Nikke | 300 | 1 | 200 | 300 | none |
| Stella Sora | 300 | 100 | 120 | 160 (!) | none |
| WuWa | 160 | 8 | 150 | 160 | 240 / 6min |
| HSR | 160 | 20 | 150 | 160 | 300 / 6min |

- `*` NTE sheet said 200 cap / 8min; updated to 240 / 6min per web (ntegame.net checklist).
- `(!)` deficit multiplier kept exactly as in the sheet even where it differs from gem cost — user decision; revisit if wrong in-game.
- Labels: sheet's "Gems"/"Starglitter" renamed to "Currency"/"Tokens" (Genshin-specific otherwise). "Target" = desired guaranteed 5-stars; "X" = resin alert threshold (auto-stamps timestamp when Last resin edited).

## Design system (card redesign)

Visual spec: `G:\Downloads\OpenCode\NTE Pull Calculator Card – Redesign Spec.md` (written for one card; applied to all ten). The card was later re-cut to the tighter design in `G:\Downloads\OpenCode\gacha-tracker.css` (design A) — that layout is now the base for **both** themes; only the palette differs.

- **Themes:** one shared layout, two palettes selected by `html[data-theme="midnight"|"lime"]`.
  - Midnight (default): page `#05060B`, card `#0D0F1B`, raised `#161828`, border `#262A40`/`#2A2F48`, divider `#23273D`, text `#ECEEF8`/`#C9CDE3`/`#9AA0BC`, accent `#5CE1E6`, done `#9BF0F3`, warn `#FF9A5C`, hover `#1B1F33`, focus `#161A2C`.
  - Lime: page `#161313`, card `#1c1919`, raised `#232020`, field `#151212`, track `#0f0d0d`, borders `#2d2929`, text `#f5f3f3`/`#cfc9c9`/`#a09a9a`, accent `#76c442`, done `#a8e063`, warn `#ff9a5c`, hover `#262222`, focus `#201d1d`.
  - Shared token names: `--page --card --raised --field --track --border --border-control --divider --txt --soft --muted --acc --acc-done --warn --hover --focus --ov1 --ov2 --ov-info`. `--ov*` are the banner/info scrims (navy vs warm `rgba`), so no hard-coded colour survives outside the token block.
  - Switching: a tiny pre-paint script in `<head>` reads `gacha-theme` and sets `documentElement.dataset.theme` (no flash); `applyTheme()` also updates `<meta name="theme-color">` and the menu's `aria-selected`/check mark. Add a third theme by extending the `THEMES` array — nothing else is theme-specific.
- Fonts: Inter (display/labels) + IBM Plex Mono (numbers/captions) from Google Fonts. Offline falls back to system-ui/monospace. `tabular-nums` on the body.
- Layout (design A): left-aligned `h1` with an accent dot; card radius 8px, no shadow; 64px banner with a 90° gradient scrim; uppercase 14px card titles; **flat result block** (no fill/border); deficit number in `--warn` (coral) while short and `--acc-done` when the goal is reached; muted sub-labels; 36×40 steppers with 66px inputs; resin button with a 3px accent left border; `--raised` resin body; 6px-radius tool buttons. Grid is 5 columns at ≥1280px, else auto-fit ≥270px; max width 1800px.
- Steppers: 36×40 − / 66px input / 36×40 + (`.sinput`). Inputs are `type="text"` + `inputmode="numeric"`, no spinners; raw digits while focused, `Intl`-formatted on blur; − disabled at 0. Values are clamped at ≥ 0; step is 1 (the old native inputs had no `step`).
- Numbers: `rawOf`/`numOf` strip separators on read; `localStorage` always stores raw digits, so old saved values stay valid.
- Layout: 5 columns at ≥1280px viewport, else auto-fit ≥270px. Narrow cards use a container query (`@container (max-width:320px)`) that shrinks the input to 58px and wraps the derived subtext.
- Result block: deficit = `need − pity − eff` (unchanged math); `pullsNeeded` shown in the caption is `target×mult − pity`; bar fill = `eff/pullsNeeded`. Goal-reached states: "pulls spare" (accent) / "goal reached" at 0 — this replaced the old "done ✓" wording.
- Resin timestamps: "Last checked" and "Full at" are read-only computed values, formatted `dd/MM/yy HH:mm` by `fmtStamp()` (locale-independent on purpose). "Last checked" is set only by `CHECKED[p] = nowLocal()` when Last resin is edited — there is no date picker. Storage keeps the old `checked` shape (`YYYY-MM-DDTHH:mm`), so existing saves still load.

## Anchors — grep these instead of reading the whole file

`index.html` is ~545 lines / ~31KB, one file. Jump straight to a region rather than loading it all:

- **CSS:** `/* --- tokens`, `--- page shell`, `--- tools`, `--- theme menu`, `--- card frame`, `--- header banner`, `--- card body`, `--- result block`, `--- input rows`, `--- resin panel`, `--- narrow cards`, `--- motion`
- **JS:** `/* ===== data:`, `/* ===== pure math:`, `/* ===== helpers:`, `/* ===== view:`, `/* ===== update:`, `/* ===== backup:`, `/* ===== theme:`, `/* ===== startup:`
- `loadState()` (startup section) is the single "storage → inputs" path: startup and import both call it, then `calcAll()`.
- The **pure math** section is the seam: it has no DOM access, so it can be lifted out to its own file verbatim if the project ever grows a second page. `render()`/`calc()` are coupled by element ids (`<id>-defPulls`, `<id>-resin`, …) — keep any future split along the math/view line, not the render/calc line.

## Tests

- `node test/calc.test.js` — pure-math suite (pull counts, deficit, goal/spare states, clamps, resin regen, formatters, config sanity). No browser, no DOM stubs, no dependencies. It evaluates the inline script that contains `const GAMES` — `index.html` has a second, pre-paint theme script in `<head>`, so the test must not just take the first `<script>`.
- For layout/interaction changes still use the headless Edge check below; for math changes the node suite is enough.

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
