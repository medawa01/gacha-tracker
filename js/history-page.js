
/* ===== data: default pull log; user history is stored locally ======
   PULLS is oldest → newest; entries are appended at the END of the list.
   n = combatant name (must match a CHARS key for the class/attribute line)
   p = pity counter when the S-Rank dropped (0 through configured hard pity)
   optional duplicate label is stored under the config's game-specific field */
const CONFIG = window.HISTORY_CONFIG;
const COST_PER_PULL = CONFIG.costPerPull, SOFT_PITY = CONFIG.softPity, HARD_PITY = CONFIG.hardPity;
const DEFAULT_PULLS = CONFIG.defaults || [];
const HISTORY_KEY = CONFIG.storageKey, SYNC_KEY = "gacha-sync";
const labelOf = x => x[CONFIG.labelField] || "";
let PULLS = DEFAULT_PULLS.map(x=>({...x}));
const removedPulls = [];   // session-only undo history; never persisted
function validPulls(value){
  return Array.isArray(value) && value.every(x=>x && typeof x==="object" && !Array.isArray(x)
    && typeof x.n==="string" && x.n.trim()!=="" && Number.isInteger(x.p) && x.p>=0 && x.p<=HARD_PITY
    && (x[CONFIG.labelField]==null || typeof x[CONFIG.labelField]==="string"));
}
function parsePullLine(line){
  const m = String(line).trim().match(new RegExp(`^(.+?)\\s+(\\d+)(?:\\s*\\|\\s*(${CONFIG.labelPattern}))?$`, "i"));
  if(!m) throw new Error(`Invalid rescue entry: ${line}`);
  const p = Number(m[2]);
  if(!m[1].trim() || p>HARD_PITY) throw new Error(`Invalid rescue entry: ${line}`);
  return { n:m[1].trim(), p, ...(m[3] ? {[CONFIG.labelField]:m[3].toUpperCase()} : {}) };
}
function parsePullText(text){
  const lines = String(text).split(/\r?\n/).map(x=>x.trim()).filter(x=>x && !x.startsWith("#"));
  const pulls = lines.map(parsePullLine);
  if(!validPulls(pulls)) throw new Error("Invalid rescue list");
  return pulls;
}
function formatPullText(pulls){
  return `# Character <pullcount> | ${CONFIG.labelSample} (optional)\n` + pulls.map(x=>`${x.n} ${x.p}${labelOf(x) ? ` | ${labelOf(x)}` : ""}`).join("\n") + "\n";
}
function loadPulls(){
  try{
    const saved = localStorage.getItem(HISTORY_KEY);
    if(saved===null){ PULLS = DEFAULT_PULLS.map(x=>({...x})); savePulls(); }
    else{
      const parsed = JSON.parse(saved);
      if(!validPulls(parsed)) throw new Error("Invalid saved history");
      PULLS = parsed.map(x=>({...x, n:x.n.trim()}));
    }
  }catch(e){
    if(e instanceof SyntaxError || e.message==="Invalid saved history"){
      PULLS = DEFAULT_PULLS.map(x=>({...x}));
      try{ savePulls(); }catch{}
    }
  }
}
function noteCznModified(){
  if(!CONFIG.syncWithTracker) return;
  try{
    const m = JSON.parse(localStorage.getItem(SYNC_KEY)||"{}");
    if(m && m.linked) localStorage.setItem(SYNC_KEY, JSON.stringify({...m, modified:Math.max(Date.now(),(Number(m.modified)||0)+1)}));
  }catch{}
}
function savePulls(mark=true){
  localStorage.setItem(HISTORY_KEY, JSON.stringify(PULLS));
  if(mark) noteCznModified();
}
function renderAll(){
  A = analyse(PULLS);
  renderStats(A); renderCharts(A); renderRecent(A); renderPulls(A); renderRoster(A);
  $("removePullBtn").disabled = !PULLS.length;
  $("undoPullBtn").disabled = !removedPulls.length;
}

/* class · attribute · faction per combatant (GameSaiyan roster, Nov 2026).
   New characters not listed here simply show a “—” meta line. */
const CHARS = CONFIG.chars;

/* attribute name → css var on the avatar */
const ATTR_VAR = {
  Passion:"var(--attr-passion)", Void:"var(--attr-void)", Instinct:"var(--attr-instinct)",
  Order:"var(--attr-order)", Justice:"var(--attr-justice)",
};

/* ===== pure math: no DOM — analyse(PULLS) feeds every renderer ===== */
function zoneOf(p){ return p<CONFIG.zoneCuts.lucky ? "lucky" : p<CONFIG.zoneCuts.soft ? "early" : p<CONFIG.zoneCuts.deep ? "soft" : "deep"; }
function analyse(pulls){
  const n = pulls.length, rows = [], seen = {}; let cum = 0;
  pulls.forEach((x,k)=>{
    cum += x.p;
    seen[x.n] = (seen[x.n]||0)+1;
    rows.push({ name:x.n, pity:x.p, label:labelOf(x), idx:k+1, occ:seen[x.n], cum, zone:zoneOf(x.p) });
  });
  const vals = pulls.map(x=>x.p).sort((a,b)=>a-b);
  const total = cum;
  const median = !n ? 0 : n%2 ? vals[(n-1)/2] : (vals[n/2-1]+vals[n/2])/2;
  const avg = n ? total/n : 0;
  const unique = Object.keys(seen).length;
  const best = rows.slice().sort((a,b)=>a.pity-b.pity)[0] || null;
  const worstVal = n ? vals[n-1] : 0;
  const worst = rows.filter(r=>r.pity===worstVal);
  const buckets = [];
  for(let lo=0; lo<HARD_PITY; lo+=10){
    const vs = vals.filter(v=>v>=lo && (lo+10>HARD_PITY ? v<=HARD_PITY : v<lo+10));
    const zc = {}; vs.forEach(v=>{ const z=zoneOf(v); zc[z]=(zc[z]||0)+1; });
    const zone = vs.length ? Object.keys(zc).sort((a,b)=>zc[b]-zc[a])[0] : zoneOf(lo+5);
    buckets.push({ lo, c:vs.length, zone });
  }
  const rosterMap = {};
  rows.forEach(r=>{
    const m = rosterMap[r.name] = rosterMap[r.name] || { name:r.name, count:0, first:r.idx, pitSum:0, label:"" };
    m.count++; m.pitSum += r.pity; if(r.label) m.label = r.label;
  });
  const roster = Object.values(rosterMap)
    .map(m=>({ ...m, avg:m.pitSum/m.count }))
    .sort((a,b)=> b.count-a.count || a.first-b.first);
  return {
    n, rows, total, avg, median, unique, best, worst, worstVal,
    dupes: n-unique, saved: n*HARD_PITY-total, crystals: total*COST_PER_PULL,
    inSoft: rows.filter(r=>r.pity>=SOFT_PITY).length,
    hitCap: rows.filter(r=>r.pity>=HARD_PITY).length,
    buckets, roster,
  };
}
function rollingAvg(values, w){
  const out = [];
  for(let i=w-1; i<values.length; i++){
    let s=0; for(let j=i-w+1; j<=i; j++) s += values[j];
    out.push(s/w);
  }
  return out;
}

/* ===== helpers ===== */
const $ = id => document.getElementById(id);
const NFmt = new Intl.NumberFormat();
const NFmt1 = new Intl.NumberFormat(undefined, { minimumFractionDigits:1, maximumFractionDigits:1 });
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function setStatus(msg, tone){
  const el = $("status"); if(!el) return;
  el.textContent = msg || ""; el.dataset.tone = tone || "";
}
/* Pre-resized 64px portraits in assets/chars avoid browser downsampling the originals. */
function ava(name, cls){
  const url = CONFIG.portraits(name);
  return `<span class="ava ${cls||""}" ${avaStyle(name)} aria-hidden="true">${esc(name.charAt(0).toUpperCase())}${url ? `<img src="${esc(url)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</span>`;
}
function avaStyle(name){
  const meta = CHARS[name] || {};
  return `style="--a:${meta.attr && ATTR_VAR[meta.attr] ? ATTR_VAR[meta.attr] : "var(--muted)"}"`;
}
function metaLine(name){
  const meta = CHARS[name] || {};
  const bits = [meta.cls, meta.attr, meta.fact].filter(Boolean);
  return bits.length ? bits.join(" · ") : "—";
}

/* ===== view: stat tiles ===== */
function renderStats(a){
  const worstNames = a.worst.slice(0,2).map(w=>w.name).join(" · ") + (a.worst.length>2 ? ` +${a.worst.length-2}` : "");
  const tiles = [
    [NFmt.format(a.n),        CONFIG.itemLabel,      `${NFmt.format(a.unique)} unique · ${NFmt.format(a.dupes)} dupes`],
    [NFmt.format(a.total),   CONFIG.totalLabel,        `${NFmt.format(a.n)} history entries`],
    [NFmt.format(a.crystals),CONFIG.currencyLabel,`at ${COST_PER_PULL} per ${CONFIG.unitName}`],
    [NFmt1.format(a.avg),     "avg pity",       `mean of ${NFmt.format(a.n)} pulls`],
    [NFmt.format(a.median),  "median pity",    "middle value"],
    [a.best ? NFmt.format(a.best.pity) : "—", "luckiest", a.best ? `${a.best.name} · ${CONFIG.unitName} #${NFmt.format(a.best.cum)}` : "—"],
    [a.n ? NFmt.format(a.worstVal) : "—", "unluckiest", a.n ? worstNames : "—"],
    [NFmt.format(a.saved),   "saved",          `pulls under the ${HARD_PITY} cap`],
  ];
  $("stats").innerHTML = tiles.map(([num,lab,sub])=>`
    <div class="stat">
      <b>${num}</b>
      <span class="lab">${esc(lab)}</span>
      <span class="sub">${esc(sub)}</span>
    </div>`).join("");
}

/* ===== view: charts (hand-built SVG, no dependencies) ===== */
function svgHist(a){
  const W=520, H=240, X0=36, X1=508, Y0=194, YT=24;
  const span = X1-X0, maxC = Math.max(1, ...a.buckets.map(b=>b.c));
  const scale = (Y0-YT)/maxC;
  const px = p => X0 + p/HARD_PITY*span;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pity histogram: ${NFmt.format(a.n)} S-Rank pulls between ${a.n?a.best.pity:0} and ${a.n?a.worstVal:0} pity.">`;
  a.buckets.forEach(b=>{
    const bw = span/Math.ceil(HARD_PITY/10), x = px(b.lo)+5, w = bw-10, cx = px(b.lo)+bw/2;
    if(b.c>0){
      const h = b.c*scale;
      s += `<rect x="${x.toFixed(1)}" y="${(Y0-h).toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(h,2).toFixed(1)}" rx="2" style="fill:var(--z-${b.zone})"/>`;
      s += `<text x="${cx.toFixed(1)}" y="${(Y0-h-7).toFixed(1)}" text-anchor="middle" style="font-family:var(--mono);font-size:11px;fill:var(--soft)">${b.c}</text>`;
    } else {
      s += `<text x="${cx.toFixed(1)}" y="${Y0-7}" text-anchor="middle" style="font-family:var(--mono);font-size:11px;fill:var(--muted)">0</text>`;
    }
    s += `<text x="${cx.toFixed(1)}" y="${Y0+16}" text-anchor="middle" style="font-family:var(--mono);font-size:10px;fill:var(--muted)">${b.lo}–${Math.min(b.lo+9,HARD_PITY)}</text>`;
  });
  s += `<line x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}" style="stroke:var(--divider)" stroke-width="1"/>`;
  s += `<line x1="${px(SOFT_PITY).toFixed(1)}" y1="${YT}" x2="${px(SOFT_PITY).toFixed(1)}" y2="${Y0}" style="stroke:var(--muted)" stroke-width="1" stroke-dasharray="3 4" opacity=".7"/>`;
  s += `<text x="${(px(SOFT_PITY)+6).toFixed(1)}" y="13" style="font-family:var(--mono);font-size:10px;fill:var(--muted)">soft pity ${SOFT_PITY}</text>`;
  s += `<text x="${X1}" y="13" text-anchor="end" style="font-family:var(--mono);font-size:10px;fill:var(--muted)">hard ${HARD_PITY}</text>`;
  s += `</svg>`;
  return s;
}
function svgTrend(a){
  const W=520, H=240, X0=36, X1=508, Y0=194, YT=24;
  const n = Math.max(a.n,1), span = X1-X0;
  const x = i => X0 + (i-0.5)/n*span;
  const y = p => Y0 - p/HARD_PITY*(Y0-YT);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Scatter plot of pity per five-star pull from first to latest, with a rolling four-pull average.">`;
  [["lucky",0,CONFIG.zoneCuts.lucky-1],["early",CONFIG.zoneCuts.lucky,SOFT_PITY-1],["soft",SOFT_PITY,CONFIG.zoneCuts.deep-1]].forEach(([z,lo,hi])=>{
    s += `<rect x="${X0}" y="${y(hi).toFixed(1)}" width="${span}" height="${(y(lo)-y(hi)).toFixed(1)}" style="fill:var(--z-${z})" opacity=".06"/>`;
  });
  for(let t=0; t<=HARD_PITY; t+=10){
    s += `<line x1="${X0-4}" y1="${y(t).toFixed(1)}" x2="${X0}" y2="${y(t).toFixed(1)}" style="stroke:var(--divider)" stroke-width="1"/>`;
    s += `<text x="${X0-8}" y="${(y(t)+3).toFixed(1)}" text-anchor="end" style="font-family:var(--mono);font-size:9px;fill:var(--muted)">${t}</text>`;
  }
  s += `<line x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}" style="stroke:var(--divider)" stroke-width="1"/>`;
  s += `<line x1="${X0}" y1="${y(SOFT_PITY).toFixed(1)}" x2="${X1}" y2="${y(SOFT_PITY).toFixed(1)}" style="stroke:var(--muted)" stroke-width="1" stroke-dasharray="3 4" opacity=".7"/>`;
  s += `<text x="${X1}" y="${(y(SOFT_PITY)-6).toFixed(1)}" text-anchor="end" style="font-family:var(--mono);font-size:10px;fill:var(--muted)">soft pity ${SOFT_PITY}</text>`;
  if(a.rows.length > 1){
    s += `<polyline points="${a.rows.map(r=>`${x(r.idx).toFixed(1)},${y(r.pity).toFixed(1)}`).join(" ")}" style="fill:none;stroke:var(--muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`;
  }
  a.rows.forEach((r,k)=>{
    s += `<circle cx="${x(r.idx).toFixed(1)}" cy="${y(r.pity).toFixed(1)}" r="5" style="fill:var(--z-${r.zone});stroke:var(--card)" stroke-width="2"/>`;
  });
  const xLabels = [1,5,10,15,20].filter(i=>i<n).concat(n>5 ? [n] : []);
  [...new Set(xLabels)].forEach(i=>{
    const last = i===n && n>5;
    s += `<text x="${x(i).toFixed(1)}" y="${Y0+16}" text-anchor="middle" style="font-family:var(--mono);font-size:9px;fill:var(--muted)">${last ? "latest" : i}</text>`;
  });
  s += `</svg>`;
  return s;
}
function renderCharts(a){
  const pct = a.n ? Math.round(a.inSoft/a.n*100) : 0;
  $("histFig").innerHTML = svgHist(a) + `
    <figcaption><b>${NFmt.format(a.inSoft)} of ${NFmt.format(a.n)} pulls (${pct}%)</b> landed in the configured soft-pity range (${SOFT_PITY}+); ${NFmt.format(a.n-a.inSoft)} came earlier. ${a.hitCap ? `${NFmt.format(a.hitCap)} hit the ${HARD_PITY} cap.` : `The ${HARD_PITY} cap was never hit.`}
    ${CONFIG.zoneLegend}</figcaption>`;
  $("trendFig").innerHTML = svgTrend(a) + `
    <figcaption>Pity per 5★ from first to latest; the grey line connects each consecutive pull. Dots are coloured by zone, avatar rings in the log below use attribute colours.</figcaption>`;
}

/* ===== view: rescue log ===== */
let order = "new";
try{ if(new URLSearchParams(location.search).get("order")==="old") order = "old"; }catch(e){}
function renderRecent(a){
  $("recent").innerHTML = [...a.rows].reverse().map(r=>`
    <div class="wp" data-zone="${r.zone}" title="${esc(r.name)} · pity ${r.pity} · ${CONFIG.unitName} #${NFmt.format(r.cum)}" role="img" aria-label="${esc(r.name)}, pity ${r.pity}">
      ${ava(r.name)}<span class="badge">${r.pity}</span>
    </div>`).join("");
}
function renderPulls(a){
  const body = $("pulls"); if(!body) return;
  $("logCount").textContent = a.n ? `${NFmt.format(a.n)} ${CONFIG.unitPlural} · ${NFmt.format(a.total)} ${CONFIG.logTotalLabel}` : "";
  const rows = order==="new" ? [...a.rows].reverse() : a.rows;
  const zoneLabel = { lucky:"lucky", early:"early", soft:"soft pity", deep:"deep pity" };
  body.innerHTML = !a.n
      ? `<tr><td colspan="4" class="empty">No ${CONFIG.unitPlural} logged yet — use Add to record one.</td></tr>`
    : rows.map(r=>{
        const chips = [];
        if(r.label) chips.push(`<span class="chip ego">${esc(r.label)}</span>`);
        else if(r.occ>1) chips.push(`<span class="chip">×${r.occ}</span>`);
        if(r.idx===a.n) chips.push(`<span class="chip new">latest</span>`);
        return `<tr data-zone="${r.zone}">
          <td class="no">${NFmt.format(r.cum)}</td>
          <td class="who"><div class="who-in">${ava(r.name)}<div><h3 translate="no">${esc(r.name)}${chips.join("")}</h3><p class="meta">${esc(metaLine(r.name))}</p></div></div></td>
          <td class="pt"><b>${NFmt.format(r.pity)}</b><div class="pbar" aria-hidden="true"><span class="pfill" style="width:${(r.pity/HARD_PITY*100).toFixed(1)}%"></span><span class="ptick" style="left:${(SOFT_PITY/HARD_PITY*100).toFixed(3)}%"></span></div></td>
          <td class="zn"><span class="zone-chip">${zoneLabel[r.zone]}</span></td>
        </tr>`;
      }).join("");
}
function setOrder(o){
  order = o;
  $("ordNew").setAttribute("aria-pressed", String(o==="new"));
  $("ordOld").setAttribute("aria-pressed", String(o==="old"));
  renderPulls(A);
  try{ history.replaceState(null, "", o==="old" ? "?order=old" : location.pathname); }catch(e){}
}

/* ===== view: roster ===== */
function renderRoster(a){
  $("rosCount").textContent = a.n ? `${NFmt.format(a.unique)} combatants` : "";
  $("roster").innerHTML = !a.n
    ? `<div class="empty" style="border:0">Nothing to show — no pulls logged.</div>`
    : a.roster.map(m=>{
        const chips = [];
        if(m.count>1) chips.push(`<span class="chip">×${m.count}</span>`);
        if(m.label) chips.push(`<span class="chip ego">${esc(m.label)}</span>`);
        return `<div class="unit">
          ${ava(m.name,"sm")}
          <div class="unit-id">
            <h3 translate="no">${esc(m.name)}${chips.join("")}</h3>
            <p class="meta">${esc(metaLine(m.name))}</p>
          </div>
          <div class="unit-right"><b>${NFmt1.format(m.avg)}</b><span class="cap">avg pity</span></div>
        </div>`;
      }).join("");
}

/* ===== theme: palette switch (same key and behaviour as index.html) ===== */
const THEMES = [
  { id:"midnight", name:"Midnight", swatch:"#5CE1E6", page:"#05060B" },
  { id:"lime",     name:"Lime",     swatch:"#76c442", page:"#161313" },
  { id:"tactical-hud", name:"Tactical (HUD)", swatch:"#35e6ff", page:"#050c13" },
];
const THEME_KEY = "gacha-theme";
function currentTheme(){
  try{
    const t = localStorage.getItem(THEME_KEY);
    return THEMES.some(x=>x.id===t) ? t : "midnight";
  }catch{ return "midnight"; }
}
function applyTheme(id, announce){
  const th = THEMES.find(x=>x.id===id) || THEMES[0];
  document.documentElement.dataset.theme = th.id;
  try{ localStorage.setItem(THEME_KEY, th.id); }catch{}
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.content = th.page;
  document.querySelectorAll(".theme-opt").forEach(b=>{
    const on = b.dataset.theme === th.id;
    b.setAttribute("aria-selected", on ? "true" : "false");
    const chk = b.querySelector(".check");
    if(chk) chk.textContent = on ? "✓" : "";
  });
  const btn = $("themeBtn");
  if(btn){
    btn.setAttribute("aria-label", `Theme: ${th.name} — change`);
    btn.setAttribute("title", `Theme: ${th.name}`);
  }
  if(announce) setStatus(`Theme: ${th.name}.`);
}
function initTheme(){
  const btn = $("themeBtn"), menu = $("themeMenu");
  if(!btn || !menu) return;
  menu.innerHTML = THEMES.map(t=>`
      <button type="button" class="theme-opt" role="option" aria-selected="false" data-theme="${t.id}">
        <span class="swatch" style="background:${t.swatch}"></span>
        <span class="tname">${t.name}</span>
        <span class="check"></span>
      </button>`).join("");
  const opts = () => Array.from(menu.querySelectorAll(".theme-opt"));
  const isOpen = () => !menu.hidden;
  const open = () => { menu.hidden = false; btn.setAttribute("aria-expanded","true"); };
  const close = (refocus) => { menu.hidden = true; btn.setAttribute("aria-expanded","false"); if(refocus) btn.focus(); };

  btn.addEventListener("click", e=>{ e.stopPropagation(); isOpen() ? close(false) : open(); });
  menu.addEventListener("click", e=>{
    const b = e.target.closest(".theme-opt");
    if(!b) return;
    applyTheme(b.dataset.theme, true);
    close(false); btn.focus();
  });
  document.addEventListener("click", e=>{ if(isOpen() && !e.target.closest(".theme-wrap")) close(false); });
  document.addEventListener("keydown", e=>{
    if(!isOpen()) return;
    const list = opts(), cur = list.indexOf(document.activeElement);
    if(e.key === "Escape"){ close(true); e.preventDefault(); }
    else if(e.key === "ArrowDown" || e.key === "ArrowUp"){
      e.preventDefault();
      const next = cur < 0 ? 0 : (e.key === "ArrowDown" ? (cur+1)%list.length : (cur-1+list.length)%list.length);
      list[next].focus();
    }
    else if(e.key === "Home"){ e.preventDefault(); list[0].focus(); }
    else if(e.key === "End"){ e.preventDefault(); list[list.length-1].focus(); }
    else if(e.key === "Tab"){ close(false); }
  });
  applyTheme(currentTheme(), false);
}

/* ===== startup ===== */
let A = analyse(PULLS);
function init(){
  loadPulls();
  renderAll();
  $("ordNew").setAttribute("aria-pressed", String(order==="new"));
  $("ordOld").setAttribute("aria-pressed", String(order==="old"));
  $("ordNew").addEventListener("click", ()=>setOrder("new"));
  $("ordOld").addEventListener("click", ()=>setOrder("old"));
  const dialog = $("addPullDialog"), input = $("addPullInput");
  $("addPullBtn").addEventListener("click", ()=>{ input.value=""; dialog.showModal(); input.focus(); });
  $("cancelAddPull").addEventListener("click", ()=>dialog.close());
  $("addPullForm").addEventListener("submit", e=>{
    e.preventDefault();
    let pull, appended=false;
    try{
      pull = parsePullLine(input.value);
      PULLS.push(pull); appended=true; savePulls(); renderAll(); dialog.close();
      setStatus(`Added ${pull.n} at ${pull.p} pity${labelOf(pull) ? ` (${labelOf(pull)})` : ""}.`, "ok");
    }catch(err){ if(appended) PULLS.pop(); setStatus(err.message || "Could not save history.", "err"); }
  });
  $("removePullBtn").addEventListener("click", ()=>{
    if(!PULLS.length) return;
    const index = PULLS.length-1, [pull] = PULLS.splice(index,1);
    try{ savePulls(); removedPulls.push({pull,index}); renderAll(); setStatus(`Removed latest ${CONFIG.unitName}: ${pull.n} (${pull.p}). Undo is available until this page closes.`, "ok"); }
    catch{ PULLS.splice(index,0,pull); renderAll(); setStatus("Could not save history; nothing was removed.", "err"); }
  });
  $("undoPullBtn").addEventListener("click", ()=>{
    if(!removedPulls.length) return;
    const item = removedPulls.pop(); PULLS.splice(Math.min(item.index,PULLS.length),0,item.pull);
    try{ savePulls(); renderAll(); setStatus(`Restored ${item.pull.n} (${item.pull.p}).`, "ok"); }
    catch{ PULLS.splice(PULLS.indexOf(item.pull),1); removedPulls.push(item); renderAll(); setStatus("Could not save history; undo was not applied.", "err"); }
  });
  $("exportPullsBtn").addEventListener("click", ()=>{
    const name = `${CONFIG.filePrefix}-${new Date().toISOString().slice(0,10)}.txt`;
    const url = URL.createObjectURL(new Blob([formatPullText(PULLS)],{type:"text/plain;charset=utf-8"}));
    const a = document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000); setStatus(`Exported ${PULLS.length} ${CONFIG.unitPlural} to ${name}.`, "ok");
  });
  $("importPullsBtn").addEventListener("click", ()=>$("pullsFile").click());
  $("pullsFile").addEventListener("change", async e=>{
    const file = e.target.files && e.target.files[0]; e.target.value="";
    if(!file) return;
    try{
      const replacement = parsePullText(await file.text());
      if(!confirm(`Replace the full history with ${replacement.length} entries from "${file.name}"?`)) return setStatus("Import cancelled — nothing changed.", "");
      const previous = PULLS; PULLS = replacement;
      try{ savePulls(); }catch(err){ PULLS=previous; throw err; }
      removedPulls.length = 0;
      renderAll(); setStatus(`Imported ${PULLS.length} ${CONFIG.unitPlural} from "${file.name}".`, "ok");
    }catch(err){ setStatus(err.message || "Could not read or save that rescue list.", "err"); }
  });
  window.addEventListener("storage", e=>{
    if(e.key!==HISTORY_KEY || e.newValue===null) return;
    try{
      const next=JSON.parse(e.newValue);
      if(!validPulls(next)) return;
      PULLS=next; removedPulls.length=0; renderAll(); setStatus("History updated in another tab.", "ok");
    }catch{}
  });
  initTheme();
}
if(typeof document !== "undefined") init();   // undefined in node, so the math can be imported

if(typeof module !== "undefined") module.exports = {validPulls,parsePullLine,parsePullText,formatPullText,analyse,zoneOf};
