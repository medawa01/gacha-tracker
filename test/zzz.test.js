/* ZZZ Agent history tests; does not load or commit the user's sample history. */
const assert = require("assert");
global.window = {};
require("../js/history-zzz-config");
const app = require("../js/history-page");

function is(name, got, want){
  try{ assert.deepStrictEqual(got,want); console.log("OK   "+name); }
  catch{ console.error(`FAIL ${name}\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`); process.exitCode=1; }
}

is("multi-word name and mindscape", app.parsePullLine("Soldier 11 84 | M2"), {n:"Soldier 11",p:84,mindscape:"M2"});
is("other mindscape labels normalize", app.parsePullLine("Nekomata 90 | m1"), {n:"Nekomata",p:90,mindscape:"M1"});
is("valid below soft pity", app.parsePullLine("Orphie & Magus 43"), {n:"Orphie & Magus",p:43});
is("import comments and multiple entries", app.parsePullText("# example only\nNekomata 50\nSoldier 11 84 | M2\n"), [{n:"Nekomata",p:50},{n:"Soldier 11",p:84,mindscape:"M2"}]);
is("export/import retains mindscape", app.parsePullText(app.formatPullText([{n:"Nekomata",p:50},{n:"Soldier 11",p:84,mindscape:"M2"}])), [{n:"Nekomata",p:50},{n:"Soldier 11",p:84,mindscape:"M2"}]);
is("90 hard pity accepted", app.validPulls([{n:"Rina",p:90}]), true);
is("above hard pity rejected", (()=>{try{app.parsePullLine("Rina 91");return false;}catch{return true;}})(), true);
is("wrong suffix format rejected", (()=>{try{app.parsePullLine("Rina 75 | E1");return false;}catch{return true;}})(), true);
is("community soft pity threshold", app.zoneOf(75), "soft");
is("hard cap zone", app.zoneOf(90), "deep");
