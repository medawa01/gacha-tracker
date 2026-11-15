# gacha-tracker

Personal gacha currency tracker (static site, GitHub Pages).

- `index.html` — NTE, ZZZ, Genshin, GFL2, CZN, Endfield, Nikke, Stella Sora, WuWa, HSR cards
- `czn.html` — Chaos Zero Nightmare 5★ rescue history: pull log (pity per 5★), stats, pity histogram, luck-over-time chart, roster. History autosaves locally; add/remove/undo entries or import/export the full list as text.
- No backend, values save in browser `localStorage`
- Export JSON / Import JSON buttons in the header back up and restore those values as a `.json` file


## Todo
- [x] Store CZN rescue history in localStorage instead of hard-coded array.
- [x] Include CZN rescue history from localStorage in the Google Drive appData backup.
