import { STORAGE_KEYS, getStoredValue } from './storage.js';

async function callChatCompletion({
  systemPrompt,
  userPrompt,
  model = 'gpt-4o-mini',
  temperature = 0,
  maxTokens = 800,
  retries = 3
}) {
  const token = getStoredValue(STORAGE_KEYS.openAiToken);
  if (!token) {
    throw new Error('Kein OpenAI Token hinterlegt.');
  }

  for (let attempt = 0; attempt < retries; attempt += 1) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        max_tokens: maxTokens
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`OpenAI Fehler: ${JSON.stringify(data)}`);
    }

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      continue;
    }

    try {
      return JSON.parse(text);
    } catch (err) {
      console.warn('OpenAI lieferte kein valides JSON, erneuter Versuch…');
    }
  }

  throw new Error(`KI liefert kein gültiges JSON nach ${retries} Versuchen.`);
}

export async function fetchPlaylistMetadata(tracks) {
  if (!Array.isArray(tracks) || !tracks.length) {
    return [];
  }

  const userPrompt = `Für die folgende Songliste:\n${tracks
    .map(track => `- ${track.name} von ${track.artist}`)
    .join('\n')}\nBitte gebe mir nach Internetrecherche das korrekte Release-Datum der Lieder wieder im JSON-Format:\n[\n  { "name": "Titel", "artist": "Artist", "year": "first-release" }\n]`;

  return callChatCompletion({
    systemPrompt: 'Du bist ein Assistent, der ausschließlich korrektes JSON ausgibt, ohne Erklärung. Felder dürfen nicht leer sein.',
    userPrompt,
    model: 'gpt-4o-mini',
    temperature: 0,
    maxTokens: 800,
    retries: 3
  });
}

export async function fetchAnimeQuizHints(anime) {
  const { title, description } = anime;
  const userPrompt = `Erstelle für den folgenden Anime ein JSON-Objekt mit Quiz-Schlagworten.\nAnime Titel: "${title}"\nBeschreibung: "${description}"\n\nRegeln für die Schlagwörter:\n- Immer genau 3 Schlagwörter pro Schwierigkeitsstufe.\n- Nur einzelne Begriffe (Namen, Orte, Objekte, Themen, Symbole).\n- Keine Sätze oder Erklärungen.\n- Begriffe müssen quiz-tauglich und thematisch eindeutig zum Anime passen.\n- Der Titel selber darf nicht vorkommen\n- Staffel die Schwierigkeit klar erkennbar:\n\n"sehr_schwer": Insider-Wissen, obskure Details, abstrakte Themen oder Nebencharaktere.\n"schwer": wichtige Nebencharaktere, Orte oder Gegenstände, die nicht sofort den Anime verraten.\n"mittel": häufig genannte Begriffe, markante Elemente, aber nicht direkt auflösend.\n"einfach": Hauptcharaktere, Hauptorte oder zentrale Fähigkeiten.\n"sehr_einfach": extrem eindeutige Begriffe (z. B. Hauptcharaktername, ikonisches Symbol, titelgebendes Objekt).\n\nDas JSON muss wie folgt aussehen:\n{\n  "sehr_schwer": [ "Begriff1", "Begriff2", "Begriff3" ],\n  "schwer": [ "Begriff1", "Begriff2", "Begriff3" ],\n  "mittel": [ "Begriff1", "Begriff2", "Begriff3" ],\n  "einfach": [ "Begriff1", "Begriff2", "Begriff3" ],\n  "sehr_einfach": [ "Begriff1", "Begriff2", "Begriff3" ]\n}`;

  return callChatCompletion({
    systemPrompt: 'Du bist ein Assistent, der ausschließlich korrektes JSON ausgibt, ohne Erklärung. Felder dürfen nicht leer sein.',
    userPrompt,
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 500,
    retries: 3
  });
}

export { callChatCompletion };

export async function fetchChatReply(messages, options = {}) {
  const token = getStoredValue(STORAGE_KEYS.openAiToken);
  if (!token) {
    throw new Error('Kein OpenAI Token hinterlegt.');
  }

  const { model = 'gpt-4o-mini', temperature = 0.7, maxTokens = 150 } = options;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`OpenAI Fehler: ${JSON.stringify(data)}`);
  }
  return data?.choices?.[0]?.message?.content?.trim() || '';
}
