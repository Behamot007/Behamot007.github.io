async function getAIInfos(tracks) {
  const OPENAPI_TOKEN = localStorage.getItem("OPENAPI_TOKEN");
  const promptText = `Für die folgende Songliste:
${tracks.map((t) => `- ${t.name} von ${t.artist}`).join("\n")}
Bitte gebe mir nach Internetrecherche das korrekte Release-Datum der Lieder wieder im JSON-Format:
[
  { "name": "Titel", "artist": "Artist", "year": "first-release" }
]`;

  for (let i = 0; i < 3; i++) {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + OPENAPI_TOKEN,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Du bist ein Assistent, der ausschließlich korrektes JSON ausgibt, ohne Erklärung. Felder dürfen nicht leer sein",
          },
          {
            role: "user",
            content: promptText,
          },
        ],
        temperature: 0,
        max_tokens: 800,
      }),
    });
    const data = await resp.json();
    let text = data.choices[0].message.content.trim();
    try {
      return JSON.parse(text);
    } catch {
      try {
        log("Ungültiges JSON, erneuter Versuch...");
      } catch {
        console.log("Ungültiges JSON, erneuter Versuch...");
      }
    }
  }
  throw new Error("KI liefert kein gültiges JSON nach 3 Versuchen.");
}
