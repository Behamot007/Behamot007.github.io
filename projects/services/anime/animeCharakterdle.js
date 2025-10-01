let characters = [];
let target = null;
let messages = [];
let gameOver = false;

async function loadCharacters() {
  const resp = await fetch('/api/characters', {
    headers: { Accept: 'application/json' }
  });
  if (!resp.ok) {
    console.error('Konnte Charakterliste nicht laden:', resp.statusText);
    characters = [];
    return;
  }
  const data = await resp.json();
  const filtered = Array.isArray(data) ? data.filter(c => c && c.character_id_mal) : [];
  const sorted = filtered.sort(
    (a, b) =>
      parseInt(b.popularity_mal_favorites || '0', 10) -
      parseInt(a.popularity_mal_favorites || '0', 10)
  );
  characters = sorted.slice(0, 50);
}

function startGame() {
  if (!characters.length) {
    appendMessage(
      'assistant',
      'Der Charakter-Datensatz konnte nicht geladen werden. Bitte prüfe die Backend-Verbindung.'
    );
    return;
  }
  target = characters[Math.floor(Math.random() * characters.length)];
  messages = [{
    role: 'system',
    content: `Du bist der Animecharakter "${target.name}" aus "${target.anime_title}". Antworte in der Ich-Perspektive, bleibe strikt in der Rolle und verrate weder deinen Namen noch den Titel des Animes, außer der Nutzer nennt deinen Namen korrekt. Halte Antworten kurz (höchstens zwei Sätze).`
  }];
  gameOver = false;
  document.getElementById('chat').innerHTML = '';
  appendMessage('assistant', 'Ich bin bereit. Stelle mir deine Fragen.');
}

function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = role;
  div.textContent = text;
  document.getElementById('chat').appendChild(div);
  div.scrollIntoView();
}

async function chatWithAI() {
  if (!window.openAiClient || typeof window.openAiClient.chat !== 'function') {
    throw new Error('OpenAI-Client ist nicht verfügbar.');
  }

  const data = await window.openAiClient.chat({
    messages,
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 150
  });
  const reply = data.choices?.[0]?.message?.content?.trim();
  return reply || '...';
}

async function send() {
  if (gameOver) return;
  if (!target || !target.name) {
    console.warn('Kein Zielcharakter geladen, starte das Spiel neu.');
    appendMessage(
      'assistant',
      'Ich bin mir gerade nicht sicher, wen ich darstellen soll. Bitte starte das Spiel neu.'
    );
    return;
  }
  const input = document.getElementById('input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  appendMessage('user', text);
  if (text.toLowerCase().includes(target.name.toLowerCase())) {
    appendMessage('assistant', `Du hast mich gefunden! Ich bin ${target.name} aus ${target.anime_title}.`);
    gameOver = true;
    return;
  }
  messages.push({ role: 'user', content: text });
  try {
    const reply = await chatWithAI();
    messages.push({ role: 'assistant', content: reply });
    appendMessage('assistant', reply);
  } catch (error) {
    console.error('OpenAI-Fehler:', error);
    appendMessage('assistant', 'Entschuldige, ich konnte keine Antwort generieren. Bitte versuche es später erneut.');
  }
}

document.getElementById('send').addEventListener('click', send);
document.getElementById('input').addEventListener('keydown', e => {
  if (e.key === 'Enter') send();
});
document.getElementById('restart').addEventListener('click', startGame);

loadCharacters().then(startGame);
