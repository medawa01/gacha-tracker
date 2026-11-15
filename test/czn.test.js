/* CZN rescue-list parsing and formatting tests; no browser or dependencies. */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const html = fs.readFileSync(path.join(__dirname, "..", "czn.html"), "utf8");
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map(m => m[1]).find(s => s.includes("const DEFAULT_PULLS"));
if(!script) throw new Error("no CZN app script found");
const app = new Function(`${script}\n;return {parsePullLine, parsePullText, formatPullText, validPulls};`)();
const personalExport = fs.readFileSync(path.join(__dirname, "..", "czn-rescue-history.txt"), "utf8");

function is(name, got, want){
  try{ assert.deepStrictEqual(got,want); console.log("OK   "+name); }
  catch{ console.error(`FAIL ${name}\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`); process.exitCode=1; }
}

is("add syntax with multi-word character", app.parsePullLine("Mei Lin 62"), {n:"Mei Lin",p:62});
is("optional ego suffix", app.parsePullLine("Nine 61 | e1"), {n:"Nine",p:61,ego:"E1"});
is("full text import ignores comments and blank lines",
  app.parsePullText("# rescue list\r\n\r\nMei Lin 62\r\nNine 61 | E1\r\n"),
  [{n:"Mei Lin",p:62},{n:"Nine",p:61,ego:"E1"}]);
is("empty text imports as empty history", app.parsePullText("# empty list\n"), []);
is("export/import round trip retains ego and chronology",
  app.parsePullText(app.formatPullText([{n:"Yuki",p:9},{n:"Nine",p:61,ego:"E1"}])),
  [{n:"Yuki",p:9},{n:"Nine",p:61,ego:"E1"}]);
is("pity above hard cap rejected", (()=>{try{app.parsePullLine("Yuki 71");return false;}catch{return true;}})(), true);
is("invalid line rejected", (()=>{try{app.parsePullText("Yuki nope");return false;}catch{return true;}})(), true);
is("valid stored entry accepted", app.validPulls([{n:"Yuki",p:0}]), true);
is("invalid stored entry rejected", app.validPulls([{n:"",p:2}]), false);
is("checked-in personal export contains all 23 rescues", app.parsePullText(personalExport).length, 23);
is("checked-in export retains both ego labels", app.parsePullText(personalExport).filter(x=>x.ego).map(x=>x.ego), ["E1","E3"]);
