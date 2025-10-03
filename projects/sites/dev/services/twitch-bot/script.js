const connectionForm = document.getElementById('connectionForm');
const apiBaseInput = document.getElementById('apiBase');
const apiPasswordInput = document.getElementById('apiPassword');
const clearPasswordBtn = document.getElementById('clearPassword');
const connectionStatusEl = document.getElementById('connectionStatus');
const oauthButton = document.getElementById('oauthStart');
const oauthInfoEl = document.getElementById('oauthInfo');
const channelInput = document.getElementById('channelInput');
const connectChannelBtn = document.getElementById('connectChannel');
const chatLog = document.getElementById('chatLog');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const messageSubmit = messageForm.querySelector('button');
const messageTemplate = document.getElementById('messageTemplate');

const STORAGE_KEYS = {
  apiBase: 'twitch-bot.apiBase',
  channel: 'twitch-bot.channel'
};

let apiBase = localStorage.getItem(STORAGE_KEYS.apiBase) || '/api/twitch';
let apiPassword = '';
let currentChannel = '';
let eventSource = null;
let lastOauthPayload = null;
let statusData = null;

apiBaseInput.value = apiBase;
const storedChannel = localStorage.getItem(STORAGE_KEYS.channel);
if (storedChannel) {
  channelInput.value = storedChannel;
}

function trimBase(value) {
  let result = (value || '').trim().replace(/\/$/, '');
  if (result && !/^https?:/i.test(result) && !result.startsWith('/')) {
    result = `/${result}`;
  }
  return result;
}

function buildUrl(path) {
  const base = trimBase(apiBase || '');
  if (!base) return path;
  if (base.startsWith('http')) {
    return `${base}${path}`;
  }
  if (!path.startsWith('/')) {
    return `${base}/${path}`;
  }
  return `${base}${path}`;
}

async function apiFetch(path, options = {}) {
  if (!apiPassword) {
    throw new Error('Kein API-Passwort gesetzt.');
  }
  const target = buildUrl(path);
  const init = { method: options.method || 'GET', headers: new Headers(options.headers || {}) };
  init.headers.set('Accept', 'application/json');
  if (!options.skipAuth) {
    init.headers.set('Authorization', `Bearer ${apiPassword}`);
  }
  if (options.body) {
    if (typeof options.body === 'string') {
      init.body = options.body;
    } else {
      init.body = JSON.stringify(options.body);
      init.headers.set('Content-Type', 'application/json');
    }
  }
  const response = await fetch(target, init);
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    const message = payload?.error || payload?.message || response.statusText;
    throw new Error(message || 'Unbekannter Fehler');
  }
  return payload;
}

function setStatus(text, variant = '') {
  connectionStatusEl.textContent = text;
  connectionStatusEl.classList.remove('status-box--ok', 'status-box--error');
  if (variant === 'ok') {
    connectionStatusEl.classList.add('status-box--ok');
  } else if (variant === 'error') {
    connectionStatusEl.classList.add('status-box--error');
  }
}

function setOauthInfo(content, variant = '') {
  oauthInfoEl.textContent = content;
  oauthInfoEl.classList.remove('status-box--ok', 'status-box--error');
  if (variant === 'ok') {
    oauthInfoEl.classList.add('status-box--ok');
  } else if (variant === 'error') {
    oauthInfoEl.classList.add('status-box--error');
  }
}

function clearChat() {
  chatLog.innerHTML = '';
}

function appendMessage(entry) {
  if (!entry) return;
  const { type, username, message, timestamp, channel, userId } = entry;
  const clone = messageTemplate.content.firstElementChild.cloneNode(true);
  const article = clone;
  const userEl = clone.querySelector('.chat-message__user');
  const timeEl = clone.querySelector('.chat-message__time');
  const textEl = clone.querySelector('.chat-message__text');

  const date = timestamp ? new Date(timestamp) : new Date();
  timeEl.textContent = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (type === 'system') {
    article.classList.add('chat-message--system');
    userEl.textContent = '# ' + (channel || currentChannel || 'system');
    textEl.textContent = message || '';
  } else if (type === 'self') {
    article.classList.add('chat-message--self');
    userEl.textContent = `${username || userId || 'Du'} · Eigene Nachricht`;
    textEl.textContent = message || '';
  } else if (type === 'outgoing') {
    article.classList.add('chat-message--bot');
    userEl.textContent = `BOT · ${username || 'Bot'}`;
    textEl.textContent = message || '';
  } else {
    userEl.textContent = username || userId || 'Unbekannt';
    textEl.textContent = message || '';
  }

  chatLog.appendChild(clone);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function handleStreamData(event) {
  try {
    const payload = JSON.parse(event.data);
    appendMessage(payload);
  } catch (error) {
    console.error('Konnte Stream-Payload nicht parsen', error, event.data);
  }
}

function handleStreamError(event) {
  console.warn('SSE Fehler', event);
  messageSubmit.disabled = true;
  connectChannelBtn.disabled = false;
  connectChannelBtn.textContent = 'Neu verbinden';
  appendMessage({
    type: 'system',
    channel: currentChannel,
    message: 'Verbindung zum Chat-Stream unterbrochen. Bitte erneut verbinden.',
    timestamp: new Date().toISOString()
  });
}

function closeStream() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  messageSubmit.disabled = true;
}

async function connectChannel(channel) {
  if (!channel) {
    throw new Error('Kein Channel angegeben.');
  }
  closeStream();
  clearChat();
  const normalized = channel.replace(/^#/, '').trim().toLowerCase();
  currentChannel = normalized;
  localStorage.setItem(STORAGE_KEYS.channel, normalized);
  connectChannelBtn.disabled = true;
  connectChannelBtn.textContent = 'Verbinde…';
  appendMessage({
    type: 'system',
    channel: normalized,
    message: `Verbinde zu #${normalized}...`,
    timestamp: new Date().toISOString()
  });
  const streamUrl = `${trimBase(apiBase)}/chat/stream?channel=${encodeURIComponent(normalized)}&apiPassword=${encodeURIComponent(apiPassword)}`;
  eventSource = new EventSource(streamUrl);
  eventSource.onopen = () => {
    appendMessage({
      type: 'system',
      channel: normalized,
      message: `Chat-Stream aktiv.`,
      timestamp: new Date().toISOString()
    });
    connectChannelBtn.disabled = false;
    connectChannelBtn.textContent = 'Neu verbinden';
  };
  eventSource.onmessage = handleStreamData;
  eventSource.onerror = handleStreamError;
  messageSubmit.disabled = false;
}

async function refreshStatus() {
  try {
    statusData = await apiFetch('/status');
    const parts = [];
    if (statusData.ready) {
      parts.push('Bot ist mit Twitch verbunden.');
    } else {
      parts.push('Bot-Verbindung wird aufgebaut …');
    }
    if (statusData.defaultChannel) {
      parts.push(`Standardchannel: #${statusData.defaultChannel}`);
      if (!channelInput.value) {
        channelInput.value = statusData.defaultChannel;
      }
    }
    setStatus(parts.join(' '), statusData.ready ? 'ok' : '');
    oauthButton.disabled = !statusData.oauthConfigured;
    connectChannelBtn.disabled = false;
    connectChannelBtn.textContent = 'Chat abonnieren';
  } catch (error) {
    setStatus(`Fehler: ${error.message}`, 'error');
    oauthButton.disabled = true;
    connectChannelBtn.disabled = true;
    throw error;
  }
}

connectionForm.addEventListener('submit', async event => {
  event.preventDefault();
  apiBase = trimBase(apiBaseInput.value.trim() || '');
  apiPassword = apiPasswordInput.value.trim();
  if (!apiBase || !apiPassword) {
    setStatus('Bitte Basis-URL und Passwort angeben.', 'error');
    return;
  }
  localStorage.setItem(STORAGE_KEYS.apiBase, apiBase);
  setStatus('Prüfe Backend …');
  try {
    await refreshStatus();
  } catch (error) {
    console.error('Verbindungsaufbau fehlgeschlagen', error);
  }
});

clearPasswordBtn.addEventListener('click', () => {
  apiPassword = '';
  apiPasswordInput.value = '';
  setStatus('Passwort wurde gelöscht. Bitte neu verbinden.');
  oauthButton.disabled = true;
  connectChannelBtn.disabled = true;
  connectChannelBtn.textContent = 'Chat abonnieren';
  closeStream();
  messageSubmit.disabled = true;
});

connectChannelBtn.addEventListener('click', async () => {
  if (!apiPassword) {
    setStatus('Bitte zuerst mit dem Backend verbinden.', 'error');
    return;
  }
  const channel = channelInput.value.trim();
  if (!channel) {
    setStatus('Bitte einen Channel eingeben.', 'error');
    return;
  }
  try {
    await connectChannel(channel);
    setStatus(`Stream verbunden mit #${currentChannel}.`, 'ok');
  } catch (error) {
    setStatus(`Chat konnte nicht verbunden werden: ${error.message}`, 'error');
    connectChannelBtn.disabled = false;
    connectChannelBtn.textContent = 'Neu verbinden';
  }
});

messageForm.addEventListener('submit', async event => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  if (!currentChannel) {
    setStatus('Kein Channel verbunden.', 'error');
    return;
  }
  try {
    await apiFetch('/chat/send', {
      method: 'POST',
      body: { channel: currentChannel, message: text }
    });
    messageInput.value = '';
  } catch (error) {
    setStatus(`Nachricht konnte nicht gesendet werden: ${error.message}`, 'error');
  }
});

oauthButton.addEventListener('click', async () => {
  try {
    setOauthInfo('Fordere OAuth-URL an …');
    const result = await apiFetch('/oauth/authorize');
    const popup = window.open(result.url, 'twitch-oauth', 'width=600,height=800');
    if (!popup) {
      setOauthInfo('Popup konnte nicht geöffnet werden. Bitte Pop-up-Blocker deaktivieren.', 'error');
      return;
    }
    setOauthInfo('Bitte Login im Twitch-Popup durchführen …');
  } catch (error) {
    setOauthInfo(`Fehler: ${error.message}`, 'error');
  }
});

window.addEventListener('message', event => {
  const data = event.data;
  if (!data || data.type !== 'twitch-oauth') return;
  lastOauthPayload = data.payload;
  if (data.payload?.error) {
    setOauthInfo(`OAuth-Fehler: ${data.payload.errorDescription || data.payload.error}`, 'error');
    return;
  }
  setOauthInfo(
    `Token erhalten (läuft in ${data.payload?.expiresIn || '?'}s ab). Scopes: ${(data.payload?.scope || []).join(', ')}`,
    'ok'
  );
  console.log('OAuth Payload', data.payload);
});

window.addEventListener('beforeunload', () => {
  closeStream();
});

setStatus('Bitte verbinde dich mit dem Backend.');
messageSubmit.disabled = true;
connectChannelBtn.disabled = true;

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    return;
  }
  if (apiPassword && currentChannel && !eventSource) {
    connectChannelBtn.click();
  }
});
