// kleine Helfer
const normalize = s => (s || "").toLowerCase().trim();
const keyFor = (t) => `${normalize(t.name)}:::${normalize(t.artist)}`;

// optionales Cache, damit wiederholte Aufrufe nicht neu fragen
const aiCache = new Map(); // oder localStorage-basierter Cache

async function getAIInfosStrict(tracks) {
  const OPENAPI_TOKEN = localStorage.getItem("OPENAPI_TOKEN");
  if (!OPENAPI_TOKEN) return [];           // Keine KI möglich
  if (!Array.isArray(tracks) || !tracks.length) return [];

  // 1) bereits bekannte Werte aus Cache ziehen
  const unknowns = [];
  for (const t of tracks) {
    const k = keyFor(t);
    const cached = aiCache.get(k) || JSON.parse(localStorage.getItem("release::" + k) || "null");
    if (!cached) unknowns.push({ name: t.name, artist: t.artist });
  }
  if (!unknowns.length) return []; // alles gecached

  // 2) in kleine Batches splitten (z. B. 15)
  const chunks = [];
  for (let i = 0; i < unknowns.length; i += 15) chunks.push(unknowns.slice(i, i + 15));

  const results = [];
  for (const chunk of chunks) {
    const prompt = `Gib für jede Zeile das Erscheinungsjahr (YYYY). Wenn unsicher, "unknown".
${chunk.map(x => `- ${x.name} — ${x.artist}`).join("\n")}`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + OPENAPI_TOKEN
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        seed: 42, // stabilere, reproduzierbare Antworten
        response_format: {
          // erzwinge eine Array-Antwort mit genau den Feldern
          type: "json_schema",
          json_schema: {
            name: "releases",
            strict: true,
            schema: {
              type: "array",
              items: {
                type: "object",
                required: ["name", "artist", "year"],
                properties: {
                  name:   { type: "string" },
                  artist: { type: "string" },
                  year:   { type: "string", pattern: "^(unknown|[0-9]{4})$" }
                },
                additionalProperties: false
              }
            }
          }
        },
        messages: [
          { role: "system", content: "Gib NUR JSON im geforderten Schema aus. Keine Erklärungen." },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!resp.ok) {
      console.warn("OpenAI Fehler:", await resp.text());
      continue;
    }
    const data = await resp.json();
    const arr = data?.choices?.[0]?.message?.content;
    let parsed = [];
    try { parsed = JSON.parse(arr); } catch { parsed = []; }

    // Validierung + Cache
    for (const r of parsed) {
      if (!r || typeof r !== "object") continue;
      const k = keyFor(r);
      if (!k) continue;
      results.push(r);
      aiCache.set(k, r);
      try { localStorage.setItem("release::" + k, JSON.stringify(r)); } catch {}
    }
  }

  return results;
}