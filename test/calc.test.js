/* Pure-math tests for index.html — no browser, no DOM stubs, no dependencies.
   Run:  node test/calc.test.js

   The inline script's init() is guarded by `typeof document !== "undefined"`,
   so the whole script can be evaluated in node and only the newline-free parts
   (GAMES / computePulls / computeResin / formatters) are exercised.            */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
/* index.html has two inline scripts: the pre-paint theme bootstrap in <head>
   and the app script at the end of <body>. Take the app one (it holds GAMES). */
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const app_src = scripts.find(s => s.includes("const GAMES"));
if(!app_src) throw new Error("no app <script> found in index.html");

const app = new Function(`${app_src}
;return { GAMES, FIELDS, computePulls, computeResin, fmtDur, fmtStamp };`)();

let pass = 0, fail = 0;
function is(name, got, want){
  try { assert.deepStrictEqual(got, want); pass++; console.log("OK   " + name); }
  catch { fail++; console.log(`FAIL ${name}\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`); }
}
const game = id => app.GAMES.find(g => g.id === id);

/* ---- regression set from the NTE redesign spec (must never drift) ---- */
const nte = game("NTE");
const r = app.computePulls(nte, { gems:35617, rolls:4, glitter:1684, pity:2, target:4 });
is("NTE gems -> pulls", r.gemPulls, 222);
is("NTE tokens -> pulls", r.tokenPulls, 70);
is("NTE eff. rolls", r.eff, 296);
is("NTE target pulls", r.need, 320);
is("NTE needed (target - pity)", r.pulls, 318);
is("NTE deficit", r.def, 22);
is("NTE deficit is short", r.short, true);
is("NTE need currency", r.needCurrency, 3520);
is("NTE progress %", Math.round(r.pct), 93);

/* ---- goal reached / spare states ---- */
const goal = app.computePulls(nte, { gems:35617, rolls:4, glitter:1684, pity:24, target:4 });
is("goal: deficit 0", goal.def, 0);
is("goal: not short", goal.short, false);
is("goal: bar full", goal.pct, 100);
is("goal: need currency 0", goal.needCurrency, 0);
const spare = app.computePulls(nte, { gems:35617, rolls:4, glitter:1684, pity:30, target:4 });
is("spare: deficit -6", spare.def, -6);
is("spare: need currency 0", spare.needCurrency, 0);

/* ---- empty input + clamping ---- */
is("empty input -> 0 eff", app.computePulls(nte, {}).eff, 0);
is("empty input -> 0 need", app.computePulls(nte, {}).need, 0);
is("zero target -> bar full", app.computePulls(nte, {target:0}).pct, 100);
is("huge surplus -> bar capped at 100", app.computePulls(nte, {gems:9999999, target:1}).pct, 100);

/* ---- per-game constants are honoured ---- */
is("Endfield 500/pull", app.computePulls(game("Endfield"), {gems:45275}).gemPulls, 90);
is("WuWa token rate 8", app.computePulls(game("WuWa"), {glitter:805}).tokenPulls, 100);
const nikke = app.computePulls(game("Nikke"), {gems:70205, target:9});
is("Nikke deficit", nikke.def, 1566);
is("Nikke deficit uses its own 300/pull", nikke.needCurrency, 1566*300);

/* ---- resin regen ---- */
const wuwa = game("WuWa");
const t0 = Date.parse("2026-10-17T10:00:00");
const rs = app.computeResin(wuwa, { resin:180, thresh:200, checked:"2026-10-17T10:00" }, t0 + 30*60000);
is("resin minutes elapsed", rs.elMin, 30);
is("resin current after 30m", Math.floor(rs.cur), 185);
is("resin hours to full", Math.round(rs.fullH*10)/10, 5.5);
is("resin hours to X", Math.round(rs.xH*10)/10, 1.5);
is("resin clamps at cap", app.computeResin(wuwa, {resin:240, checked:"2026-10-17T10:00"}, t0 + 600*60000).cur, 240);
is("no stamp -> null", app.computeResin(wuwa, {}, t0), null);
is("bad stamp -> null", app.computeResin(wuwa, {checked:"nope"}, t0), null);
is("game without resin -> null", app.computeResin(game("Nikke"), {checked:"2026-10-17T10:00"}, t0), null);

/* ---- formatters ---- */
is("fmtDur 0 -> full", app.fmtDur(0), "full");
is("fmtDur 5.5h", app.fmtDur(5.5), "5h 30m");
is("fmtDur 0.5h", app.fmtDur(0.5), "30m");
is("fmtDur negative", app.fmtDur(-1), "—");
is("fmtStamp dd/MM/yy HH:mm", app.fmtStamp(new Date(2026,9,17,14,30)), "17/10/26 14:30");
is("fmtStamp zero-pads", app.fmtStamp(new Date(2026,0,5,9,5)), "05/01/26 09:05");

/* ---- config sanity: every card row maps to an input + defaults ---- */
is("10 games configured", app.GAMES.length, 10);
is("5 input rows", app.FIELDS.length, 5);
is("each game has defaults for every field",
   app.GAMES.every(g => app.FIELDS.every(([key]) => g.defaults[key] !== undefined)), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
