import axios from "axios";
import Bottleneck from "bottleneck";
import { createObjectCsvWriter } from "csv-writer";
import fs from "fs";
import path from "path";
import _ from "lodash";
import { log } from "console";

// ====== Konfiguration ======
const OUT_DIR = path.resolve("dataset");
const JSONL_PATH = path.join(OUT_DIR, "characters.jsonl");
const CSV_PATH = path.join(OUT_DIR, "characters.csv");
const CHECKPOINT = path.join(OUT_DIR, "checkpoint.json");

// Rate Limits: Jikan ~ 2 req/s; AniList ~ 90/min (1.5/s)
const jikanLimiter = new Bottleneck({ minTime: 500 });
const anilistLimiter = new Bottleneck({ minTime: 700 });

const jikan = axios.create({ baseURL: "https://api.jikan.moe/v4", timeout: 20000 });
const anilist = axios.create({ baseURL: "https://graphql.anilist.co", timeout: 20000 });

fs.mkdirSync(OUT_DIR, { recursive: true });

// ====== CLI-Argumente ======
function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map(kv => {
      const [k, v] = kv.replace(/^--/, "").split("=");
      return [k, v ?? true];
    })
  );
  const mode = (args.mode === "characters" || args.mode === "anime") ? args.mode : "anime";
  const limit = Number.isFinite(Number(args.limit)) ? Number(args.limit) : (mode === "characters" ? 100 : 100);
  return { mode, limit };
}
const { mode, limit } = parseArgs();
console.log(`Mode: ${mode}  Limit: ${limit}`);

// ====== Utils ======
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function safeCall(fn, { retries = 5, baseDelay = 800 } = {}) {
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === retries) throw err;
      const code = err?.response?.status;
      const wait = baseDelay * Math.pow(2, i) + Math.random()*200;
      if (code === 429) {
        const retryAfter = Number(err?.response?.headers?.["retry-after"]) || 0;
        await sleep(Math.max(wait, retryAfter*1000));
      } else {
        await sleep(wait);
      }
    }
  }
}

function writeJSONL(obj) {
  fs.appendFileSync(JSONL_PATH, JSON.stringify(obj) + "\n");
}

function toCSVRecords(items) {
  const headers = [
    "character_id_mal", "character_id_anilist", "name", "alt_names", "gender",
    "species_tags", "role", "age", "height_cm",
    "popularity_mal_favorites", "popularity_anilist_favorites",
    "anime_id_mal", "anime_id_anilist", "anime_title", "anime_year_start", "universe",
    "image_url", "validated", "sources"
  ];
  return { headers, records: items.map(x => headers.reduce((acc, h) => ({
    ...acc, [h]: Array.isArray(x[h]) ? x[h].join("; ") : (x[h] ?? "")
  }), {})) };
}

// ====== Jikan Helpers ======
const jikanGet = (url, params) =>
  jikanLimiter.schedule(() => safeCall(() => jikan.get(url, { params })).then(r => r.data));


async function getTopAnime(limit=100) {
  const res = await jikanGet("/top/anime", { limit });
  return res.data || [];
}

async function getAnimeCharacters(malId) {
  let page = 1; const collected = [];
  while (true) {
    const res = await jikanGet(`/anime/${malId}/characters`, { page });
    const data = res.data || [];
    collected.push(...data);
    if (!res.pagination?.has_next_page) break;
    page++;
  }
  return collected;
}

async function getTopCharacters(limit = 100) {
  const pageLimit = 25; // Jikan liefert max 25/Seite
  let page = 1;
  const collected = [];

  while (collected.length < limit) {
    const res = await jikanGet("/top/characters", {
      page,
      limit: Math.min(pageLimit, limit - collected.length)
    });

    const data = res?.data || [];
    collected.push(...data);

    if (!res?.pagination?.has_next_page) break;
    page++;
  }
  return collected.slice(0, limit);
}


async function getCharacterFull(malCharId) {
  // Liefert detaillierte Infos inkl. animeography
  return jikanGet(`/characters/${malCharId}/full`);
}

// ====== AniList Helpers ======
const ANILIST_CHAR = `
query ($search: String) {
  Character(search: $search) {
    id name { full native alternative }
    gender age description favourites
    media(perPage: 3) {
      edges { node { id title { romaji english native } startDate { year } } }
    }
  }
}`;

const ANILIST_ANIME = `
query ($search: String){
  Media(search:$search, type:ANIME){
    id title{ romaji english native } startDate{ year }
  }
}`;

const anilistPost = (query, variables) =>
  anilistLimiter.schedule(() => safeCall(() => anilist.post("/", { query, variables })).then(r => r.data));

async function searchAniListCharacter(name) {
  if (!name) return null;
  const res = await anilistPost(ANILIST_CHAR, { search: name });
  return res?.data?.Character || null;
}

async function searchAniListAnime(title) {
  if (!title) return null;
  const res = await anilistPost(ANILIST_ANIME, { search: title });
  return res?.data?.Media || null;
}

// ====== Parsing / Mapping ======
function sanitizeDesc(input) {
  if (!input) return "";
  let s = String(input);

  // HTML/Markdown/Entities grob entfernen/vereinheitlichen
  s = s.replace(/<br\s*\/?>/gi, " ")
       .replace(/<\/?[^>]+>/g, " ")
       .replace(/&nbsp;/gi, " ")
       .replace(/&amp;/gi, "&")
       .replace(/\*\*|__/g, ""); // **bold**, __bold__

  // Unicode Dashes vereinheitlichen
  s = s.replace(/[–—−]/g, "-");

  // Mehrfach-Whitespace trimmen
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function ftInToCm(ft, inch) {
  const f = parseInt(ft, 10) || 0;
  const i = parseInt(inch, 10) || 0;
  const cm = f * 30.48 + i * 2.54;
  return Math.round(cm);
}

/**
 * Liefert "170" oder "145-180" als String oder null
 */
function extractHeight(desc) {
  const text = sanitizeDesc(desc);
  if (!text) return null;

  // Falls "Height"/"Größe" vorkommt, analysiere den Abschnitt danach (reduziert Fehlmatches)
  let scope = text;
  const mLabel = text.match(/(?:\bheight\b|\bgröße\b)/i);
  if (mLabel) {
    const start = Math.max(0, mLabel.index);
    scope = text.slice(start, start + 200); // 200 Zeichen hinter dem Label reichen meist
  }

  // 1) Label + cm (z.B. "Height: 170 cm", "Größe - 145-180cm", "Height:170cm")
  let m = scope.match(/(?:height|größe)\s*[:\-]?\s*(\d{2,3})\s*(?:-\s*(\d{2,3}))?\s*cm\b/i);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = m[2] ? parseInt(m[2], 10) : null;
    if (Number.isFinite(a) && (!m[2] || Number.isFinite(b))) {
      return b ? `${Math.min(a,b)}-${Math.max(a,b)}` : String(a);
    }
  }

  // 2) Label + Fuß/Zoll (z.B. "Height: 5'7\"", 5' 7'')
  m = scope.match(/(?:height|größe)\s*[:\-]?\s*(\d)\s*'\s*(\d{1,2})(?:["“”''`]*)/i);
  if (m) {
    const cm = ftInToCm(m[1], m[2]);
    return String(cm);
  }

  // 3) Generisch: Bereich mit cm ohne Label (z.B. "145 - 180 cm")
  m = scope.match(/(\d{2,3})\s*-\s*(\d{2,3})\s*cm\b/i);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return `${Math.min(a,b)}-${Math.max(a,b)}`;
    }
  }

  // 4) Generisch: Einzelwert mit cm (z.B. "170cm" oder "170 cm")
  m = scope.match(/(\d{2,3})\s*cm\b/i);
  if (m) {
    const a = parseInt(m[1], 10);
    if (Number.isFinite(a)) return String(a);
  }

  // 5) Parentheses-Variante (z.B. "(170 cm)")
  m = scope.match(/\(\s*(\d{2,3})\s*cm\s*\)/i);
  if (m) {
    const a = parseInt(m[1], 10);
    if (Number.isFinite(a)) return String(a);
  }

  // 6) Nur Fuß/Zoll ohne Label irgendwo im Scope (z.B. "5'7\" (170 cm)" – falls cm nicht geparst)
  m = scope.match(/(\d)\s*'\s*(\d{1,2})(?:["“”''`]*)/);
  if (m) {
    const cm = ftInToCm(m[1], m[2]);
    return String(cm);
  }

  return null;
}


function extractTagsFromDescription(desc) {
  if (!desc) return [];
  const tags = new Set();
  const t = desc.toLowerCase();

  // Arten / Wesen
  if (/\bhuman\b|mensch/.test(t)) tags.add("Mensch");
  if (/demon|oni|akuma/.test(t)) tags.add("Dämon");
  if (/angel|seraph/.test(t)) tags.add("Engel");
  if (/god|deity|gott\b/.test(t)) tags.add("Gott");
  if (/yokai|youkai|spirit|geist|specter|apparition/.test(t)) tags.add("Yokai/Geist");
  if (/vampire/.test(t)) tags.add("Vampir");
  if (/werewolf|lycan/.test(t)) tags.add("Werwolf");
  if (/elf/.test(t)) tags.add("Elf");
  if (/beastman|beast-man|beastkin|kemonomimi/.test(t)) tags.add("Bestienmensch");
  if (/dragon|drake|wyvern/.test(t)) tags.add("Drache");
  if (/slime/.test(t)) tags.add("Slime");
  if (/homunculus/.test(t)) tags.add("Homunculus");
  if (/android|cyborg|robot|automaton|gynoid/.test(t)) tags.add("Android/Cyborg");
  if (/alien|extraterrestrial/.test(t)) tags.add("Alien");
  if (/orc/.test(t)) tags.add("Ork");
  if (/goblin/.test(t)) tags.add("Goblin");
  if (/troll/.test(t)) tags.add("Troll");
  if (/giant|jötunn|jotunn/.test(t)) tags.add("Riese");
  if (/fairy|faerie|pixie/.test(t)) tags.add("Fee");
  if (/dwarf|zwerg/.test(t)) tags.add("Zwerg");
  if (/mermaid|merfolk|triton|meerjungfrau/.test(t)) tags.add("Meerwesen");
  if (/ghoul/.test(t)) tags.add("Ghoul");
  if (/skeleton|skelett/.test(t)) tags.add("Skelett");
  if (/zombie/.test(t)) tags.add("Zombie");
  if (/lich/.test(t)) tags.add("Lich");
  if (/golem/.test(t)) tags.add("Golem");
  if (/succubus|incubus/.test(t)) tags.add("Sukkubus/Inkubus");
  if (/angelic|holy knight|paladin/.test(t)) tags.add("Paladin"); // Zwischenwesen

  // Rollen/Extras (optional, falls du Tags breiter nutzen willst)
  if (/magician|mage|wizard|sorcerer|magier/.test(t)) tags.add("Magier");
  if (/ninja/.test(t)) tags.add("Ninja");
  if (/samurai/.test(t)) tags.add("Samurai");
  if (/pirate|pirat/.test(t)) tags.add("Pirat");
  if (/mecha|pilot/.test(t)) tags.add("Mecha-Pilot");
  if (/knight|ritter/.test(t)) tags.add("Ritter");
  if (/warrior|fighter/.test(t)) tags.add("Krieger");
  if (/archer|ranger|bogenschütze/.test(t)) tags.add("Bogenschütze/Waldläufer");
  if (/assassin|meuchler/.test(t)) tags.add("Assassine");
  if (/priest|cleric|healer/.test(t)) tags.add("Priester/Heiler");
  if (/monk|mönch/.test(t)) tags.add("Mönch");
  if (/necromancer/.test(t)) tags.add("Nekromant");
  if (/bard/.test(t)) tags.add("Barde");
  if (/summoner|beschwörer/.test(t)) tags.add("Beschwörer");
  if (/druid/.test(t)) tags.add("Druide");
  if (/alchemist|alchemist/.test(t)) tags.add("Alchemist");
  if (/thief|rogue|dieb/.test(t)) tags.add("Dieb/Schurke");
  if (/hunter|jäger/.test(t)) tags.add("Jäger");

  return Array.from(tags);
}

function toCharacterRow({ jikanChar, malAnime, anilistChar, anilistAnime }) {
  // jikanChar kann aus zwei Quellen kommen:
  // - Anime-Char-Listing: { character: {...}, role: "Main"/"Supporting" }
  // - Top-Characters/Character-Full: direkt {...} ohne 'character'
  const base = jikanChar?.character || jikanChar || {}; 

  const name = base?.name || anilistChar?.name?.full || null;
  const altNames = _.uniq([
    ...(anilistChar?.name?.alternative || []),
    anilistChar?.name?.native
  ].filter(Boolean));

  return {
    character_id_mal: base?.mal_id ?? null,
    character_id_anilist: anilistChar?.id ?? null,
    name,
    alt_names: altNames,
    gender: anilistChar?.gender ?? null,
    age: anilistChar?.age ?? null,
    height_cm: extractHeight(jikanChar?.character?.about || jikanChar?.about || anilistChar?.description),
    species_tags: extractTagsFromDescription(jikanChar?.character?.about || jikanChar?.about || anilistChar?.description),
    role: malAnime?.role ?? null,
    popularity_mal_favorites: base?.favorites ?? null,
    popularity_anilist_favorites: anilistChar?.favourites ?? null,
    anime_id_mal: malAnime?.mal_id ?? null,
    anime_id_anilist: anilistAnime?.id ?? null,
    anime_title: malAnime?.title ?? anilistAnime?.title?.romaji ?? null,
    anime_year_start: malAnime?.year ?? anilistAnime?.startDate?.year ?? null,
    universe: malAnime?.title ?? null,
    image_url: base?.images?.jpg?.image_url ?? null,
    validated: false,
    sources: ["jikan", anilistChar ? "anilist" : null].filter(Boolean)
  };
}

// ====== Pipelines ======
async function pipelineTopAnime(limitAnime) {
  let cp = { processedAnimeIds: [] };
  if (fs.existsSync(CHECKPOINT)) {
    try { cp = JSON.parse(fs.readFileSync(CHECKPOINT, "utf-8")); } catch {}
  }

  const top = await getTopAnime(limitAnime);
  console.log(`Top Anime geladen: ${top.length}`);

  const allRows = [];

  for (const anime of top) {
    if (cp.processedAnimeIds.includes(anime.mal_id)) {
      console.log(`Überspringe (resume) MAL#${anime.mal_id} – ${anime.title}`);
      continue;
    }

    console.log(`\n==> ${anime.title} (MAL#${anime.mal_id})`);
    const chars = await getAnimeCharacters(anime.mal_id);
    console.log(`   Characters: ${chars.length}`);

    const anilistAnime = await searchAniListAnime(anime.title).catch(() => null);

    for (const c of chars) {
      const aniChar = await searchAniListCharacter(c.character?.name ?? c?.name).catch(() => null);
      const row = toCharacterRow({ jikanChar: c, malAnime: anime, anilistChar: aniChar, anilistAnime });
      writeJSONL(row);
      allRows.push(row);
    }

    cp.processedAnimeIds.push(anime.mal_id);
    fs.writeFileSync(CHECKPOINT, JSON.stringify(cp));
  }

  return allRows;
}

async function pipelineTopCharacters(limitChars) {
  const topChars = await getTopCharacters(limitChars);
  console.log(`Top Characters geladen: ${topChars.length}`);

  const allRows = [];

  for (const tc of topChars) {
    // tc ist ein Character-Objekt (kein {character:{...}})
    const malCharId = tc.mal_id;
    console.log(`\n==> ${tc.name} (MAL#${malCharId})  MAL-Favs:${tc.favorites}`);

    // Detaildaten inkl. Animeography (um Anime-Titel/Jahr zu füllen)
    let malAnime = null;
    try {
      const full = await getCharacterFull(malCharId);           
      const animeography = full?.data?.anime || [];
      
      // Nimm den ersten Eintrag als Referenz-Anime
      if (animeography.length > 0) {
        const a = animeography[0]?.anime;
        if (a) {
          malAnime = {
            mal_id: a.mal_id,
            title: a.title,
            year: a?.year ?? null,
            role: animeography[0]?.role
          };          
        }
      }
    } catch {}

    // AniList Suchen
    const anilistChar = await searchAniListCharacter(tc.name).catch(() => null);
    const anilistAnime = await searchAniListAnime(malAnime?.title || null).catch(() => null);

    const row = toCharacterRow({ jikanChar: tc, malAnime, anilistChar, anilistAnime });
    writeJSONL(row);
    allRows.push(row);
  }

  return allRows;
}

// ====== Main ======
async function main() {
  // Datei leeren, damit neue Runs sauber sind (optional)
  fs.writeFileSync(JSONL_PATH, "");
  const allRows = mode === "characters"
    ? await pipelineTopCharacters(limit)
    : await pipelineTopAnime(limit);

  const { headers, records } = toCSVRecords(allRows);
  const csvWriter = createObjectCsvWriter({ path: CSV_PATH, header: headers.map(h => ({ id: h, title: h })) });
  await csvWriter.writeRecords(records);
  console.log(`\nFertig. JSONL: ${JSONL_PATH}\nCSV: ${CSV_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
