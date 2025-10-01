import axios from "axios";


// Clients
const jikan = axios.create({ baseURL: "https://api.jikan.moe/v4", timeout: 20000 });
const anilist = axios.create({ baseURL: "https://graphql.anilist.co", timeout: 20000 });


// AniList Queries
const ANILIST_CHAR_QUERY = `
query ($search: String) {
Character(search: $search) {
id
name { full native alternative }
gender
age
description(asHtml:false)
favourites
media(perPage: 3) {
edges { node { id title { romaji english native } startDate { year } } }
}
}
}`;


async function runDebug(){
// Beispiel: Naruto (MAL ID 20)
const malId = 417;


// --- Jikan Character ---
const jikanChar = await jikan.get(`/characters/${malId}/full`).then(r=>r.data);
console.log("=== Jikan Character (Naruto) ===");
console.dir(jikanChar, { depth: 3 });


// --- AniList Character ---
const anilistChar = await anilist.post("/", { query: ANILIST_CHAR_QUERY, variables: { search: "Naruto uzumaki" } }).then(r=>r.data);
console.log("=== AniList Character (Naruto) ===");
console.dir(anilistChar, { depth: 3 });
}


runDebug().catch(e=> console.error(e));