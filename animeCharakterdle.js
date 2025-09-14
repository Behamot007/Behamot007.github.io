let characters = [];
let target = null;
let messages = [];
let gameOver = false;

async function loadCharacters() {
  const resp = await fetch('anime-dataset/dataset/characters.csv');
  const csvText = await resp.text();
  const parsed = Papa.parse(csvText, { header: true });
  const data = parsed.data.filter(c => c && c.character_id_mal);
  const sorted = data.sort((a, b) => (parseInt(b.popularity_mal_favorites || '0', 10) - parseInt(a.popularity_mal_favorites || '0', 10)));
  characters = sorted.slice(0, 50);
}

function startGame() {
  if (!characters.length) return;
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
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('OPENAPI_TOKEN')
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 150
    })
  });
  const data = await resp.json();
  const reply = data.choices?.[0]?.message?.content?.trim();
  return reply || '...';
}

async function send() {
  if (gameOver) return;
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
  const reply = await chatWithAI();
  messages.push({ role: 'assistant', content: reply });
  appendMessage('assistant', reply);
}

document.getElementById('send').addEventListener('click', send);
document.getElementById('input').addEventListener('keydown', e => {
  if (e.key === 'Enter') send();
});
document.getElementById('restart').addEventListener('click', startGame);

loadCharacters().then(startGame);
