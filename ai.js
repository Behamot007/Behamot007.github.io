async function callAI({
  systemPrompt,
  userPrompt,
  model = "gpt-4o-mini",
  temperature = 0,
  maxTokens = 800,
  retries = 3,
}) {
  const OPENAPI_TOKEN = localStorage.getItem("OPENAPI_TOKEN");

  for (let i = 0; i < retries; i++) {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + OPENAPI_TOKEN,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content?.trim();

    try {
      return JSON.parse(text);
    } catch {
      console.warn("Ungültiges JSON, erneuter Versuch...");
    }
  }

  throw new Error(`KI liefert kein gültiges JSON nach ${retries} Versuchen.`);
}

async function getAIInfos(tracks) {
  const userPrompt = `Für die folgende Songliste:
${tracks.map((t) => `- ${t.name} von ${t.artist}`).join("\n")}
Bitte gebe mir nach Internetrecherche das korrekte Release-Datum der Lieder wieder im JSON-Format:
[
  { "name": "Titel", "artist": "Artist", "year": "first-release" }
]`;

  return await callAI({
    systemPrompt:
      "Du bist ein Assistent, der ausschließlich korrektes JSON ausgibt, ohne Erklärung. Felder dürfen nicht leer sein",
    userPrompt,
    model: "gpt-4o-mini",
    temperature: 0,
    maxTokens: 800,
    retries: 3,
  });
}

async function getAnimeQuizHints(anime) {
  const { title, description } = anime;

const userPrompt = `Erstelle für den folgenden Anime ein JSON-Objekt mit Quiz-Schlagworten.
Anime Titel: "${title}"
Beschreibung: "${description}"

Regeln für die Schlagwörter:
- Immer genau 3 Schlagwörter pro Schwierigkeitsstufe.
- Nur einzelne Begriffe (Namen, Orte, Objekte, Themen, Symbole).
- Keine Sätze oder Erklärungen.
- Begriffe müssen quiz-tauglich und thematisch eindeutig zum Anime passen.
- Der Titel selber darf nicht vorkommen 
- Staffel die Schwierigkeit klar erkennbar:

"sehr_schwer": Insider-Wissen, obskure Details, abstrakte Themen oder Nebencharaktere.
"schwer": wichtige Nebencharaktere, Orte oder Gegenstände, die nicht sofort den Anime verraten.
"mittel": häufig genannte Begriffe, markante Elemente, aber nicht direkt auflösend.
"einfach": Hauptcharaktere, Hauptorte oder zentrale Fähigkeiten.
"sehr_einfach": extrem eindeutige Begriffe (z. B. Hauptcharaktername, ikonisches Symbol, titelgebendes Objekt).

Das JSON muss wie folgt aussehen:
{
  "sehr_schwer": [ "Begriff1", "Begriff2", "Begriff3" ],
  "schwer": [ "Begriff1", "Begriff2", "Begriff3" ],
  "mittel": [ "Begriff1", "Begriff2", "Begriff3" ],
  "einfach": [ "Begriff1", "Begriff2", "Begriff3" ],
  "sehr_einfach": [ "Begriff1", "Begriff2", "Begriff3" ]
}`;


  return await callAI({
    systemPrompt:
      "Du bist ein Assistent, der ausschließlich korrektes JSON ausgibt, ohne Erklärung. Felder dürfen nicht leer sein.",
    userPrompt,
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 500,
    retries: 3,
  });
}

