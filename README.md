# gacha-tracker

Personal gacha currency tracker (static site, GitHub Pages).

- `index.html` — NTE, ZZZ, Genshin, GFL2, CZN, Endfield, Nikke, Stella Sora, WuWa, HSR cards
- `czn.html` — Chaos Zero Nightmare 5★ rescue history: pull log (pity per 5★), stats, pity histogram, luck-over-time chart, roster. Data is the `PULLS` array at the top of its script (oldest → newest; append at the end)
- No backend, values save in browser `localStorage`
- Export JSON / Import JSON buttons in the header back up and restore those values as a `.json` file
