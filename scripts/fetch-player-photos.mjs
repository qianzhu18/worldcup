#!/usr/bin/env node
/**
 * fetch-player-photos.mjs
 *
 * Generates lib/generated/player-photos.ts mapping:
 *   - player ID -> real headshot URL
 *   - player ID -> Chinese display name from Wikidata
 *
 * Strategy:
 *   1. Query English Wikipedia PageImages + Wikibase metadata for every player.
 *   2. Players with a Wikipedia thumbnail get the real photo URL.
 *   3. Wikibase IDs are resolved through Wikidata for zh-hans / zh-cn / zh labels.
 *   4. Players without a real photo fall back in-app to a deterministic local avatar.
 *
 * Run:  node scripts/fetch-player-photos.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PLAYER_DATA = resolve(ROOT, "lib/generated/player-data.ts");
const OUT_FILE = resolve(ROOT, "lib/generated/player-photos.ts");

const UA = "JMWL-WorldCup/1.0 (educational hackathon; contact: dev@jmwl.example)";
const WIKIDATA_LANGS = ["zh-hans", "zh-cn", "zh"];

const MANUAL_ZH = {
  "Lionel Messi": "梅西",
  "Kylian Mbappé": "姆巴佩",
  "Lamine Yamal": "亚马尔",
  "Jude Bellingham": "贝林厄姆",
  "Cristiano Ronaldo": "C罗",
  "Erling Haaland": "哈兰德",
  "Vinícius Júnior": "维尼修斯",
  "Vinicius Junior": "维尼修斯",
  "Kevin De Bruyne": "德布劳内",
  "Christian Pulisic": "普利西奇",
  "Mohamed Salah": "萨拉赫",
  Neymar: "内马尔",
  Rodri: "罗德里",
  Pedri: "佩德里",
  "Rayan Cherki": "切尔基",
  "Bradley Barcola": "巴尔科拉",
  "Désiré Doué": "杜埃",
  "Ousmane Dembélé": "登贝莱",
  "Dani Olmo": "奥尔莫",
  "Ferran Torres": "费兰·托雷斯",
  "Harry Kane": "凯恩",
  "Warren Zaïre-Emery": "扎伊尔-埃梅里",
  "Franco Mastantuono": "马斯坦托诺",
  "Marcus Thuram": "马库斯·图拉姆",
  "Michael Olise": "奥利塞",
  "Aurélien Tchouaméni": "楚阿梅尼",
  Gavi: "加维",
  "Bukayo Saka": "萨卡",
  "Alejandro Garnacho": "加纳乔",
  "Martín Zubimendi": "苏维门迪",
  "Adrien Rabiot": "拉比奥",
  "Giuliano Simeone": "朱利亚诺·西蒙尼",
  Raphinha: "拉菲尼亚",
  "Nicolás González": "尼古拉斯·冈萨雷斯",
  "Thiago Almada": "阿尔马达",
  "Nico Williams": "尼科·威廉姆斯",
  "Fabián Ruiz": "法比安·鲁伊斯",
  "Maghnes Akliouche": "阿克利乌什",
  "Malo Gusto": "马洛·古斯托",
  "Mike Maignan": "迈尼昂",
  "Álex Baena": "阿莱士·巴埃纳",
  "Mikel Merino": "梅里诺",
  "Nicolás Paz": "尼科·帕斯",
  "Yeremy Pino": "耶雷米·皮诺",
  "Mikel Oyarzabal": "奥亚萨瓦尔",
  "Jean-Philippe Mateta": "马特塔",
  "David Raya": "戴维·拉亚",
  "Joan García": "霍安·加西亚",
  "Lautaro Martínez": "劳塔罗·马丁内斯",
  "Víctor Muñoz": "维克托·穆尼奥斯",
  "Marc Pubill": "马克·普比尔",
  "Manu Koné": "马努·科内",
  "Eric García": "埃里克·加西亚",
  "Marcos Llorente": "马科斯·略伦特",
  "Ibrahima Konaté": "科纳特",
  "Jules Koundé": "孔德",
  "Lucas Hernández": "卢卡斯·埃尔南德斯",
  "Máximo Perrone": "马克西莫·佩罗内",
  "Julián Álvarez": "胡利安·阿尔瓦雷斯",
  "Pau Cubarsí": "库巴西",
  "Dayot Upamecano": "于帕梅卡诺",
  "Borja Iglesias": "博尔哈·伊格莱西亚斯",
  "Robin Risser": "罗宾·里瑟",
  "Alexis Mac Allister": "麦卡利斯特",
  "Enzo Fernández": "恩佐·费尔南德斯",
  "Rodrigo De Paul": "德保罗",
  "Tomás Aranda": "托马斯·阿兰达",
  "Juan Musso": "穆索",
  "Nahuel Molina": "莫利纳",
  "Matías Soulé": "苏莱",
  "Marc Cucurella": "库库雷利亚",
  "Claudio Echeverri": "埃切维里",
  "William Saliba": "萨利巴",
  "Matheus Cunha": "库尼亚",
  "Marcus Rashford": "拉什福德",
  "N'Golo Kanté": "坎特",
  "Unai Simón": "乌奈·西蒙",
  "Francisco Conceicao": "弗朗西斯科·孔塞桑",
  "Rafael Leao": "莱奥",
  "Lucas Digne": "迪涅",
  "Theo Hernández": "特奥·埃尔南德斯",
  "Noni Madueke": "马杜埃凯",
  "Pedro Neto": "佩德罗·内托",
  "Declan Rice": "赖斯",
  "Brice Samba": "桑巴",
  "Lisandro Martínez": "利桑德罗·马丁内斯",
  "Jamal Musiala": "穆西亚拉",
  "Pedro Porro": "波罗",
  "Joao Neves": "若昂·内维斯",
  "Emiliano Martínez": "埃米利亚诺·马丁内斯",
  "Bruno Fernandes": "布鲁诺·费尔南德斯",
  "Florian Wirtz": "维尔茨",
  "Goncalo Ramos": "贡萨洛·拉莫斯",
  "Eberechi Eze": "埃泽",
  "Cody Gakpo": "加克波",
  "Bernardo Silva": "贝尔纳多·席尔瓦",
  Vitinha: "维蒂尼亚",
  Casemiro: "卡塞米罗",
};

// ---------------------------------------------------------------------------
// 1. Parse player id + name from generated data
// ---------------------------------------------------------------------------

const src = readFileSync(PLAYER_DATA, "utf8");
const players = [];
const entryRe = /\{\s*"id"\s*:\s*"([^"]+)"[\s\S]*?"name"\s*:\s*"([^"]+)"/g;
let m;
while ((m = entryRe.exec(src)) !== null) {
  players.push({ id: m[1], name: m[2] });
}
console.log(`Found ${players.length} players in player-data.ts`);

// ---------------------------------------------------------------------------
// 2. Wikipedia PageImages fetcher
// ---------------------------------------------------------------------------

async function fetchWikiMeta(name) {
  const title = encodeURIComponent(name.replace(/ /g, "_"));
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&titles=${title}` +
    `&prop=pageimages|pageprops&format=json&pithumbsize=400&piprop=thumbnail&redirects=1`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
      if (res.status === 429 || res.status === 503) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      if (!res.ok) return null;
      const json = await res.json();
      const pages = json?.query?.pages ?? {};
      const page = Object.values(pages)[0];
      if (!page || page.missing !== undefined) return null;
      const thumb = page?.thumbnail?.source;
      const qid = page?.pageprops?.wikibase_item;
      return {
        photo: typeof thumb === "string" ? thumb : null,
        qid: typeof qid === "string" ? qid : null,
      };
    } catch {
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runPool(items, worker, size = 6) {
  const out = new Array(items.length);
  let i = 0;
  let done = 0;
  let hits = 0;
  async function next() {
    while (i < items.length) {
      const idx = i++;
      const r = await worker(items[idx], idx);
      out[idx] = r;
      done++;
      if (r) hits++;
      if (done % 50 === 0 || done === items.length) {
        console.log(`  progress ${done}/${items.length} hits=${hits}`);
      }
    }
  }
  await Promise.all(Array.from({ length: size }, next));
  return { out, hits };
}

// ---------------------------------------------------------------------------
// 3. Run
// ---------------------------------------------------------------------------

async function fetchWikidataLabels(qids) {
  const labels = new Map();
  const unique = [...new Set(qids.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    const url =
      `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json` +
      `&props=labels&languages=${WIKIDATA_LANGS.join("|")}&ids=${batch.join("|")}`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
      if (!res.ok) continue;
      const json = await res.json();
      for (const qid of batch) {
        const entity = json?.entities?.[qid];
        const label = firstChineseLabel(entity?.labels);
        if (label) labels.set(qid, label);
      }
    } catch {
      // Keep generation resilient; missing labels simply fall back to existing names.
    }
    await sleep(120);
  }
  return labels;
}

function firstChineseLabel(labels) {
  for (const lang of WIKIDATA_LANGS) {
    const value = labels?.[lang]?.value;
    if (typeof value === "string" && /[\u4e00-\u9fff]/.test(value)) return value;
  }
  return null;
}

const { out: metas } = await runPool(players, async (p) => fetchWikiMeta(p.name), 16);
const zhByQid = await fetchWikidataLabels(metas.map((meta) => meta?.qid));

const map = {};
const zhMap = {};
players.forEach((p, idx) => {
  const meta = metas[idx];
  const url = meta?.photo;
  if (url) map[p.id] = url;
  const zh = MANUAL_ZH[p.name] ?? (meta?.qid ? zhByQid.get(meta.qid) : undefined);
  if (zh && zh !== p.name) zhMap[p.id] = zh;
});

const hits = Object.keys(map).length;
const zhHits = Object.keys(zhMap).length;
console.log(`Resolved ${hits} Wikipedia photos, ${players.length - hits} will use local avatar fallback.`);
console.log(`Resolved ${zhHits} Chinese names from manual overrides/Wikidata.`);

// ---------------------------------------------------------------------------
// 4. Write TypeScript file
// ---------------------------------------------------------------------------

const json = JSON.stringify(map, null, 0);
const banner = `// AUTO-GENERATED by scripts/fetch-player-photos.mjs
// ${hits} of ${players.length} players have a real Wikipedia headshot; others fall back to local generated avatars.
// ${zhHits} of ${players.length} players have Chinese display names.
// Regenerate: node scripts/fetch-player-photos.mjs
`;
const body =
  `export const PLAYER_PHOTOS: Record<string, string> = ${json};\n\n` +
  `export const PLAYER_ZH_NAMES: Record<string, string> = ${JSON.stringify(zhMap, null, 0)};\n`;
writeFileSync(OUT_FILE, banner + body, "utf8");
console.log(`Wrote ${OUT_FILE}`);
