/* CZN history parsing and math tests; no browser or dependencies. */
const assert = require("assert");
global.window = {};
require("../js/history-czn-config");
const app = require("../js/history-page");

function is(name, got, want){
  try{ assert.deepStrictEqual(got,want); console.log("OK   "+name); }
  catch{ console.error(`FAIL ${name}\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`); process.exitCode=1; }
}

is("multi-word combatant", app.parsePullLine("Mei Lin 62"), {n:"Mei Lin",p:62});
is("optional ego suffix", app.parsePullLine("Nine 61 | e1"), {n:"Nine",p:61,ego:"E1"});
is("comments and blank lines ignored", app.parsePullText("# rescue list\r\n\r\nMei Lin 62\r\nNine 61 | E1\r\n"), [{n:"Mei Lin",p:62},{n:"Nine",p:61,ego:"E1"}]);
is("empty text clears history", app.parsePullText("# empty list\n"), []);
is("export/import retains suffix", app.parsePullText(app.formatPullText([{n:"Yuki",p:9},{n:"Nine",p:61,ego:"E1"}])), [{n:"Yuki",p:9},{n:"Nine",p:61,ego:"E1"}]);
is("hard cap rejected", (()=>{try{app.parsePullLine("Yuki 71");return false;}catch{return true;}})(), true);
is("invalid entry rejected", (()=>{try{app.parsePullText("Yuki nope");return false;}catch{return true;}})(), true);
is("valid stored entry", app.validPulls([{n:"Yuki",p:0}]), true);
is("invalid stored entry", app.validPulls([{n:"",p:2}]), false);
