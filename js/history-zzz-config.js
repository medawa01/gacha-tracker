window.HISTORY_CONFIG = {
  costPerPull:160, softPity:75, hardPity:90, zoneCuts:{lucky:50,soft:75,deep:90},
  storageKey:"gacha-zzz-pulls", syncWithTracker:false, filePrefix:"zzz-agent-history",
  labelField:"mindscape", labelPattern:"M\\d+", labelSample:"M1", labelName:"Mindscape", unitName:"Signal Search", unitPlural:"S-Ranks", logTotalLabel:"searches spent", currencyLabel:"Polychrome", itemLabel:"S-Rank pulls", totalLabel:"searches spent", subtitle:"S-Rank Agent history",
  zoneLegend:'Zones: <span style="color:var(--z-lucky)">≤49 lucky</span> · <span style="color:var(--z-early)">50–74 before soft pity</span> · <span style="color:var(--z-soft)">75–89 community-estimated soft pity</span> · <span style="color:var(--z-deep)">90 hard pity</span>.',
  defaults:[],
  portraits:name=>{const slug={"Soldier 11":"soldier-11","Soldier 0 - Anby":"soldier-0-anby","Soldier 0 Anby":"soldier-0-anby","Orphie & Magus":"orphie-magus","Astra Yao":"astra-yao","Zhu Yuan":"zhu-yuan","Ye Shunguang":"ye-shunguang","Nangong Yu":"nangong-yu","Ju Fufu":"ju-fufu","Starlight Billy":"starlight-billy"}[name]||name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");return `assets/zzz/${slug}.webp`;},
  chars:{}
};
