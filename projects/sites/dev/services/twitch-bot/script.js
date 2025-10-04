const API_BASE = '/api/twitch';

const navButtons = document.querySelectorAll('.page-nav__link');
const sections = {
  config: document.getElementById('view-config'),
  chat: document.getElementById('view-chat'),
  commands: document.getElementById('view-commands')
};

const connectionForm = document.getElementById('connectionForm');
const apiPasswordInput = document.getElementById('apiPassword');
const clearPasswordBtn = document.getElementById('clearPassword');
const connectionStatusEl = document.getElementById('connectionStatus');
const tokenStatusEl = document.getElementById('tokenStatus');
const oauthButton = document.getElementById('oauthStart');
const oauthInfoEl = document.getElementById('oauthInfo');
const channelInput = document.getElementById('channelInput');
const connectChannelBtn = document.getElementById('connectChannel');
const chatLog = document.getElementById('chatLog');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const messageSubmit = messageForm.querySelector('button');
const messageTemplate = document.getElementById('messageTemplate');
const commandPrefixInput = document.getElementById('commandPrefix');
const commandList = document.getElementById('commandList');
const addCommandBtn = document.getElementById('addCommand');
const saveCommandsBtn = document.getElementById('saveCommands');
const commandStatusEl = document.getElementById('commandStatus');

const STORAGE_KEYS = {
  channel: 'twitch-bot.channel'
};

let apiPassword = '';
let currentChannel = '';
let eventSource = null;
let statusData = null;
let commandsState = { prefix: '!', items: [] };
let commandsEditable = false;
let commandsLoaded = false;
let lastOauthPayload = null;

const storedChannel = localStorage.getItem(STORAGE_KEYS.channel);
if (storedChannel) {
  channelInput.value = storedChannel;
}

navButtons.forEach(button => {
  button.addEventListener('click', () => {
    const target = button.dataset.target;
    if (!target || !sections[target]) return;
    navButtons.forEach(btn => btn.classList.toggle('is-active', btn === button));
    Object.entries(sections).forEach(([key, section]) => {
      section.classList.toggle('is-active', key === target);
    });
  });
});

function buildUrl(path) {
  if (!path.startsWith('/')) {
    return `${API_BASE}/${path}`;
  }
  return `${API_BASE}${path}`;
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

function setTokenStatus(text, variant = '') {
  tokenStatusEl.textContent = text;
  tokenStatusEl.classList.remove('status-box--ok', 'status-box--error');
  if (variant === 'ok') {
    tokenStatusEl.classList.add('status-box--ok');
  } else if (variant === 'error') {
    tokenStatusEl.classList.add('status-box--error');
  }
}

function setCommandStatus(text, variant = '') {
  commandStatusEl.textContent = text;
  commandStatusEl.classList.remove('status-box--ok', 'status-box--error');
  if (variant === 'ok') {
    commandStatusEl.classList.add('status-box--ok');
  } else if (variant === 'error') {
    commandStatusEl.classList.add('status-box--error');
  }
}

function updateTokenStatus(token) {
  if (!token) {
    setTokenStatus('Noch kein Bot-Token hinterlegt.');
    return;
  }
  const parts = [];
  let variant = 'ok';
  if (token.login) {
    parts.push(`Token für ${token.login}`);
  } else {
    parts.push('Bot-Token gespeichert');
  }
  if (token.obtainedAt) {
    const obtained = new Date(token.obtainedAt);
    if (!Number.isNaN(obtained.getTime())) {
      parts.push(`aktualisiert am ${obtained.toLocaleString('de-DE')}`);
    }
  }
  if (token.expiresAt) {
    const expires = new Date(token.expiresAt);
    if (!Number.isNaN(expires.getTime())) {
      const diff = expires.getTime() - Date.now();
      if (diff > 0) {
        const minutes = Math.round(diff / 60000);
        parts.push(`läuft in ca. ${minutes} Minuten ab`);
      } else {
        parts.push('Token ist abgelaufen.');
        variant = 'error';
      }
    }
  } else {
    parts.push('läuft nicht ab.');
  }
  if (token.hasRefresh) {
    parts.push('Automatischer Refresh aktiv.');
  }
  setTokenStatus(parts.join(' · '), variant);
}

function clearChat() {
  chatLog.innerHTML = '';
}

function appendMessage(entry) {
  if (!entry) return;
  const { type, username, message, timestamp, channel, userId, meta } = entry;
  const clone = messageTemplate.content.firstElementChild.cloneNode(true);
  const article = clone;
  const userEl = clone.querySelector('.chat-message__user');
  const timeEl = clone.querySelector('.chat-message__time');
  const textEl = clone.querySelector('.chat-message__text');

  const date = timestamp ? new Date(timestamp) : new Date();
  timeEl.textContent = date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

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
    if (meta?.command) {
      const hint = document.createElement('span');
      hint.className = 'command-item__tag';
      hint.textContent = `Befehl: ${meta.command}${meta.triggeredBy ? ` · Auslöser: ${meta.triggeredBy}` : ''}`;
      article.appendChild(hint);
    }
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
  const streamUrl = `${API_BASE}/chat/stream?channel=${encodeURIComponent(normalized)}&apiPassword=${encodeURIComponent(apiPassword)}`;
  eventSource = new EventSource(streamUrl);
  eventSource.onopen = () => {
    appendMessage({
      type: 'system',
      channel: normalized,
      message: 'Chat-Stream aktiv.',
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
    updateTokenStatus(statusData.botToken);
    enableCommands(true);
    if (!commandsLoaded) {
      await loadCommands();
    } else {
      setCommandStatus(`Aktueller Präfix: ${commandsState.prefix} · Befehle: ${commandsState.items.length}`, 'ok');
    }
  } catch (error) {
    setStatus(`Fehler: ${error.message}`, 'error');
    oauthButton.disabled = true;
    connectChannelBtn.disabled = true;
    updateTokenStatus(null);
    enableCommands(false);
    throw error;
  }
}

function enableCommands(enabled) {
  commandsEditable = enabled;
  commandPrefixInput.disabled = !enabled;
  addCommandBtn.disabled = !enabled;
  saveCommandsBtn.disabled = !enabled;
  commandList.querySelectorAll('input, textarea, button').forEach(element => {
    if (element.dataset.keepEnabled === 'true') return;
    element.disabled = !enabled;
  });
  if (!enabled) {
    setCommandStatus('Bitte zuerst mit dem Backend verbinden.');
  }
}

function sanitizePrefix(value) {
  const trimmed = (value || '').replace(/\s+/g, '');
  return (trimmed || '!').slice(0, 5);
}

function updateCommandTitles() {
  commandList.querySelectorAll('[data-command-title]').forEach(titleEl => {
    const index = Number(titleEl.dataset.index);
    const command = commandsState.items[index];
    if (!command) return;
    titleEl.textContent = `${commandsState.prefix}${command.name}`;
  });
}

function createCommandItem(command, index) {
  const wrapper = document.createElement('article');
  wrapper.className = 'command-item';
  wrapper.dataset.index = String(index);

  const header = document.createElement('div');
  header.className = 'command-item__header';
  const title = document.createElement('h3');
  title.dataset.commandTitle = 'true';
  title.dataset.index = String(index);
  title.textContent = `${commandsState.prefix}${command.name}`;
  header.appendChild(title);

  const toggleLabel = document.createElement('label');
  toggleLabel.className = 'command-item__toggle';
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.checked = command.enabled !== false;
  toggle.disabled = !commandsEditable;
  toggle.addEventListener('change', () => {
    commandsState.items[index].enabled = toggle.checked;
  });
  toggleLabel.appendChild(toggle);
  toggleLabel.append(' Aktiv');
  header.appendChild(toggleLabel);

  wrapper.appendChild(header);

  const meta = document.createElement('div');
  meta.className = 'command-item__meta';

  const nameLabel = document.createElement('label');
  nameLabel.innerHTML = '<span>Befehlsname</span>';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = command.name;
  nameInput.disabled = !commandsEditable;
  nameInput.addEventListener('input', () => {
    commandsState.items[index].name = nameInput.value.trim();
    updateCommandTitles();
  });
  nameLabel.appendChild(nameInput);
  meta.appendChild(nameLabel);

  const descriptionLabel = document.createElement('label');
  descriptionLabel.innerHTML = '<span>Beschreibung</span>';
  const descriptionInput = document.createElement('textarea');
  descriptionInput.value = command.description || '';
  descriptionInput.disabled = !commandsEditable;
  descriptionInput.addEventListener('input', () => {
    commandsState.items[index].description = descriptionInput.value;
  });
  descriptionLabel.appendChild(descriptionInput);
  meta.appendChild(descriptionLabel);

  const responseLabel = document.createElement('label');
  responseLabel.innerHTML = '<span>Antwort</span>';
  const responseInput = document.createElement('textarea');
  responseInput.value = command.response || '';
  responseInput.disabled = !commandsEditable;
  responseInput.addEventListener('input', () => {
    commandsState.items[index].response = responseInput.value;
  });
  responseLabel.appendChild(responseInput);
  meta.appendChild(responseLabel);

  const cooldownLabel = document.createElement('label');
  cooldownLabel.innerHTML = '<span>Cooldown (Sek.)</span>';
  const cooldownInput = document.createElement('input');
  cooldownInput.type = 'number';
  cooldownInput.min = '0';
  cooldownInput.step = '1';
  cooldownInput.value = Number(command.cooldownSeconds || 0);
  cooldownInput.disabled = !commandsEditable;
  cooldownInput.addEventListener('input', () => {
    const value = Number.parseInt(cooldownInput.value, 10);
    commandsState.items[index].cooldownSeconds = Number.isFinite(value) && value >= 0 ? value : 0;
  });
  cooldownLabel.appendChild(cooldownInput);
  meta.appendChild(cooldownLabel);

  wrapper.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'command-item__actions';
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'secondary';
  removeBtn.textContent = 'Befehl entfernen';
  removeBtn.disabled = !commandsEditable;
  removeBtn.addEventListener('click', () => {
    commandsState.items.splice(index, 1);
    renderCommands();
  });
  actions.appendChild(removeBtn);
  wrapper.appendChild(actions);

  return wrapper;
}

function renderCommands() {
  commandList.innerHTML = '';
  commandPrefixInput.value = commandsState.prefix || '!';
  if (!commandsState.items.length) {
    const empty = document.createElement('p');
    empty.className = 'card__hint';
    empty.textContent = 'Noch keine Befehle vorhanden. Füge über den Button einen neuen Befehl hinzu.';
    commandList.appendChild(empty);
    return;
  }
  commandsState.items.forEach((command, index) => {
    commandList.appendChild(createCommandItem(command, index));
  });
  enableCommands(commandsEditable);
}

function generateCommandName(base = 'befehl') {
  let suffix = 1;
  let candidate = base;
  const existing = commandsState.items.map(item => item.name.toLowerCase());
  while (existing.includes(candidate.toLowerCase())) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  return candidate;
}

async function loadCommands() {
  try {
    const data = await apiFetch('/commands');
    commandsState = {
      prefix: sanitizePrefix(data.prefix),
      items: Array.isArray(data.items) ? data.items.map(item => ({
        name: item.name || '',
        description: item.description || '',
        response: item.response || '',
        cooldownSeconds: Number(item.cooldownSeconds || 0),
        enabled: item.enabled !== false
      })) : []
    };
    commandsLoaded = true;
    renderCommands();
    setCommandStatus(`Befehle geladen · Präfix: ${commandsState.prefix} · Anzahl: ${commandsState.items.length}`, 'ok');
  } catch (error) {
    console.error('Befehle konnten nicht geladen werden', error);
    setCommandStatus(`Befehle konnten nicht geladen werden: ${error.message}`, 'error');
  }
}

function addCommand() {
  const newCommand = {
    name: generateCommandName('befehl'),
    description: 'Antwort für einen neuen Befehl – bitte anpassen.',
    response: 'Hey {user}, dieser Befehl wurde noch nicht angepasst.',
    cooldownSeconds: 30,
    enabled: true
  };
  commandsState.items.push(newCommand);
  renderCommands();
  setCommandStatus('Neuer Befehl hinzugefügt. Vergiss nicht zu speichern!', 'ok');
}

async function saveCommands() {
  try {
    const payload = {
      prefix: sanitizePrefix(commandPrefixInput.value),
      items: commandsState.items
        .filter(item => item.name && item.response)
        .map(item => ({
          name: item.name.trim(),
          description: (item.description || '').trim(),
          response: item.response,
          cooldownSeconds: Number(item.cooldownSeconds || 0),
          enabled: item.enabled !== false
        }))
    };
    commandsState.prefix = payload.prefix;
    await apiFetch('/commands', {
      method: 'PUT',
      body: payload
    });
    renderCommands();
    setCommandStatus('Befehle erfolgreich gespeichert.', 'ok');
  } catch (error) {
    console.error('Befehle konnten nicht gespeichert werden', error);
    setCommandStatus(`Speichern fehlgeschlagen: ${error.message}`, 'error');
  }
}

async function applyOauthPayload(payload) {
  if (!payload) return;
  if (!apiPassword) {
    setOauthInfo('Bitte zuerst mit dem Backend verbinden.', 'error');
    return;
  }
  if (payload.error) {
    setOauthInfo(`OAuth-Fehler: ${payload.errorDescription || payload.error}`, 'error');
    return;
  }
  setOauthInfo('Speichere Token im Backend …');
  try {
    const result = await apiFetch('/oauth/apply', {
      method: 'POST',
      body: {
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        expiresIn: payload.expiresIn,
        scope: payload.scope
      }
    });
    setOauthInfo(
      `Bot-Token gespeichert${result.login ? ` für ${result.login}` : ''}.` +
        (result.hasRefresh ? ' Automatischer Refresh aktiv.' : ''),
      'ok'
    );
    await refreshStatus();
  } catch (error) {
    setOauthInfo(`Token konnte nicht gespeichert werden: ${error.message}`, 'error');
  }
}

connectionForm.addEventListener('submit', async event => {
  event.preventDefault();
  apiPassword = apiPasswordInput.value.trim();
  if (!apiPassword) {
    setStatus('Bitte ein API-Passwort angeben.', 'error');
    return;
  }
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
  updateTokenStatus(null);
  enableCommands(false);
  commandsLoaded = false;
  commandsState = { prefix: '!', items: [] };
  commandList.innerHTML = '';
  commandPrefixInput.value = '!';
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
  const expiresIn = data.payload?.expiresIn || '?';
  const scopes = Array.isArray(data.payload?.scope) ? data.payload.scope.join(', ') : '';
  setOauthInfo(`Token erhalten (läuft in ${expiresIn}s ab).${scopes ? ` Scopes: ${scopes}` : ''}`);
  applyOauthPayload(data.payload);
});

commandPrefixInput.addEventListener('input', () => {
  if (!commandsEditable) return;
  commandsState.prefix = sanitizePrefix(commandPrefixInput.value);
  commandPrefixInput.value = commandsState.prefix;
  updateCommandTitles();
});

addCommandBtn.addEventListener('click', () => {
  if (!commandsEditable) return;
  addCommand();
});

saveCommandsBtn.addEventListener('click', () => {
  if (!commandsEditable) return;
  saveCommands();
});

window.addEventListener('beforeunload', () => {
  closeStream();
});

setStatus('Bitte verbinde dich mit dem Backend.');
messageSubmit.disabled = true;
connectChannelBtn.disabled = true;
enableCommands(false);
updateTokenStatus(null);

setCommandStatus('Befehle noch nicht geladen.');

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    return;
  }
  if (apiPassword && currentChannel && !eventSource) {
    connectChannelBtn.click();
  }
});
