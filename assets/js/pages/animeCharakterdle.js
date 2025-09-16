import { renderSimpleNavigation } from '../modules/simpleNav.js';
import { fetchChatReply } from '../modules/aiClient.js';

const chatContainer = document.getElementById('chat');
const inputField = document.getElementById('input');
const sendButton = document.getElementById('send');
const restartButton = document.getElementById('restart');

let characters = [];
let target = null;
let messages = [];
let gameOver = false;

async function loadCharacters() {
  const resp = await fetch('anime-dataset/dataset/characters.csv');
  const csvText = await resp.text();
  const parsed = Papa.parse(csvText, { header: true });
  const data = parsed.data.filter(c => c && c.character_id_mal);
  characters = data
    .sort((a, b) => (parseInt(b.popularity_mal_favorites || '0', 10) - parseInt(a.popularity_mal_favorites || '0', 10)))
    .slice(0, 50);
}

function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = role;
  div.textContent = text;
  chatContainer.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function startGame() {
  if (!characters.length) return;
  target = characters[Math.floor(Math.random() * characters.length)];
  messages = [
    {
      role: 'system',
      content: `Du bist der Animecharakter "${target.name}" aus "${target.anime_title}". Antworte in der Ich-Perspektive, bleibe strikt in der Rolle und verrate weder deinen Namen noch den Titel des Animes, außer der Nutzer nennt deinen Namen korrekt. Halte Antworten kurz (höchstens zwei Sätze).`
    },
    { role: 'assistant', content: 'Ich bin bereit. Stelle mir deine Fragen.' }
  ];
  gameOver = false;
  chatContainer.innerHTML = '';
  appendMessage('assistant', 'Ich bin bereit. Stelle mir deine Fragen.');
}

async function chatWithAI() {
  const reply = await fetchChatReply(messages, { temperature: 0.7, maxTokens: 150 });
  return reply || '...';
}

async function sendMessage() {
  if (gameOver) return;
  const text = inputField.value.trim();
  if (!text) return;
  inputField.value = '';
  appendMessage('user', text);

  if (target && text.toLowerCase().includes(target.name.toLowerCase())) {
    appendMessage('assistant', `Du hast mich gefunden! Ich bin ${target.name} aus ${target.anime_title}.`);
    gameOver = true;
    return;
  }

  messages.push({ role: 'user', content: text });
  const reply = await chatWithAI();
  messages.push({ role: 'assistant', content: reply });
  appendMessage('assistant', reply);
}

function bindEvents() {
  sendButton.addEventListener('click', sendMessage);
  inputField.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      sendMessage();
    }
  });
  restartButton.addEventListener('click', startGame);
}

async function init() {
  renderSimpleNavigation('#globalNav', 'anime-chat');
  await loadCharacters();
  startGame();
  bindEvents();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
