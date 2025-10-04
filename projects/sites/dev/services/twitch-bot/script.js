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
const commandModal = document.getElementById('commandModal');
const commandForm = document.getElementById('commandForm');
const commandModalTitle = document.getElementById('commandModalTitle');
const commandEnabledInput = document.getElementById('commandEnabled');
const commandNamesContainer = document.getElementById('commandNames');
const commandNameInput = document.getElementById('commandNameInput');
const commandNameAddBtn = document.getElementById('commandNameAdd');
const commandResponseInput = document.getElementById('commandResponse');
const commandCooldownInput = document.getElementById('commandCooldown');
const commandAutoIntervalInput = document.getElementById('commandAutoInterval');
const commandUserLevelSelect = document.getElementById('commandUserLevel');
const commandResponseTypeSelect = document.getElementById('commandResponseType');
const commandDeleteBtn = document.getElementById('commandDelete');
const commandModalError = document.getElementById('commandModalError');
const commandModalCloseBtn = document.querySelector('[data-command-modal-close]');
const commandModalCancelBtns = document.querySelectorAll('[data-command-modal-cancel]');

const USER_LEVEL_OPTIONS = [
  { value: 'everyone', label: 'Jeder' },
  { value: 'subscriber', label: 'Abonnenten' },
  { value: 'regular', label: 'Stammgast' },
  { value: 'vip', label: 'VIP' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'super-moderator', label: 'Super-Moderator' },
  { value: 'broadcaster', label: 'Broadcaster' }
];

const RESPONSE_TYPES = [
  { value: 'say', label: 'Sagen' },
  { value: 'mention', label: 'Erwähnen' },
  { value: 'reply', label: 'Antworten' },
  { value: 'whisper', label: 'Flüstern' }
];

const USER_LEVEL_LABEL = new Map(USER_LEVEL_OPTIONS.map(item => [item.value, item.label]));
const RESPONSE_TYPE_LABEL = new Map(RESPONSE_TYPES.map(item => [item.value, item.label]));
const DEFAULT_COMMAND_RESPONSE = 'Hey {user}, dieser Befehl wurde noch nicht angepasst.';

USER_LEVEL_OPTIONS.forEach(option => {
  if (!commandUserLevelSelect) return;
  const element = document.createElement('option');
  element.value = option.value;
  element.textContent = option.label;
  commandUserLevelSelect.appendChild(element);
});

RESPONSE_TYPES.forEach(option => {
  if (!commandResponseTypeSelect) return;
  const element = document.createElement('option');
  element.value = option.value;
  element.textContent = option.label;
  commandResponseTypeSelect.appendChild(element);
});

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
let commandModalState = { index: null, isNew: true };
let commandDraft = null;

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
    if (meta) {
      const prefix = commandsState?.prefix || '!';
      const names = Array.isArray(meta.aliases) && meta.aliases.length
        ? meta.aliases
        : meta.command
        ? [meta.command]
        : [];
      const info = [];
      if (names.length) {
        info.push(`Befehl: ${names.map(name => `${prefix}${name}`).join(', ')}`);
      }
      if (meta.trigger === 'auto') {
        info.push('Automatik');
      } else if (meta.triggeredBy) {
        info.push(`Auslöser: ${meta.triggeredBy}`);
      }
      if (meta.responseType) {
        const label = RESPONSE_TYPE_LABEL.get(meta.responseType) || meta.responseType;
        info.push(`Antwort: ${label}`);
      }
      if (meta.targetUser && meta.responseType === 'whisper') {
        info.push(`An: ${meta.targetUser}`);
      }
      if (info.length) {
        const hint = document.createElement('span');
        hint.className = 'command-meta';
        hint.textContent = info.join(' · ');
        article.appendChild(hint);
      }
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
      updateCommandStatusSummary();
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
  commandList.querySelectorAll('button.command-card').forEach(button => {
    button.disabled = !enabled;
  });
  if (!enabled) {
    setCommandStatus('Bitte zuerst mit dem Backend verbinden.');
    closeCommandModal();
  }
}

function sanitizePrefix(value) {
  const trimmed = (value || '').replace(/\s+/g, '');
  return (trimmed || '!').slice(0, 5);
}

function sanitizeCommandName(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const prefix = commandsState.prefix || '!';
  const withoutPrefix = trimmed.startsWith(prefix) ? trimmed.slice(prefix.length).trim() : trimmed;
  return withoutPrefix.replace(/\s+/g, '').toLowerCase();
}

function normalizeCommandDraft(command) {
  if (!command) return null;
  const names = Array.isArray(command.names) ? command.names : [];
  const seen = new Set();
  const normalizedNames = [];
  names.forEach(name => {
    const cleaned = sanitizeCommandName(name);
    if (!cleaned || seen.has(cleaned)) return;
    seen.add(cleaned);
    normalizedNames.push(cleaned);
  });
  const response = typeof command.response === 'string' ? command.response.trim() : '';
  if (!normalizedNames.length || !response) {
    return null;
  }
  const cooldownSeconds = Math.max(0, Number.parseInt(command.cooldownSeconds, 10) || 0);
  const autoIntervalSeconds = Math.max(0, Number.parseInt(command.autoIntervalSeconds, 10) || 0);
  const minUserLevel = USER_LEVEL_LABEL.has(command.minUserLevel) ? command.minUserLevel : 'everyone';
  const responseType = RESPONSE_TYPE_LABEL.has(command.responseType) ? command.responseType : 'say';
  return {
    names: normalizedNames,
    response,
    cooldownSeconds,
    autoIntervalSeconds,
    minUserLevel,
    responseType,
    enabled: command.enabled !== false
  };
}

function normalizeLoadedCommand(item) {
  if (!item) return null;
  const sourceNames = [];
  if (Array.isArray(item.names)) {
    item.names.forEach(name => {
      if (typeof name === 'string' && name.trim()) {
        sourceNames.push(name);
      }
    });
  } else if (typeof item.name === 'string' && item.name.trim()) {
    sourceNames.push(item.name);
  }
  const names = sourceNames
    .map(name => name.replace(/^!+/, '').replace(/\s+/g, '').toLowerCase())
    .filter(Boolean);
  const uniqueNames = Array.from(new Set(names));
  const response = typeof item.response === 'string' ? item.response : '';
  if (!uniqueNames.length || !response) {
    return null;
  }
  return {
    names: uniqueNames,
    response,
    cooldownSeconds: Math.max(0, Number.parseInt(item.cooldownSeconds, 10) || 0),
    autoIntervalSeconds: Math.max(0, Number.parseInt(item.autoIntervalSeconds, 10) || 0),
    minUserLevel: USER_LEVEL_LABEL.has(item.minUserLevel) ? item.minUserLevel : 'everyone',
    responseType: RESPONSE_TYPE_LABEL.has(item.responseType) ? item.responseType : 'say',
    enabled: item.enabled !== false
  };
}

function updateCommandStatusSummary() {
  if (!commandsLoaded) {
    setCommandStatus('Befehle noch nicht geladen.');
    return;
  }
  const total = commandsState.items.length;
  const automated = commandsState.items.filter(item => item.autoIntervalSeconds > 0 && item.enabled !== false).length;
  const parts = [`Präfix: ${commandsState.prefix}`, `Befehle: ${total}`];
  if (automated) {
    parts.push(`Automatik: ${automated}`);
  }
  setCommandStatus(parts.join(' · '), 'ok');
}

function createCommandBadge(text, variant = '') {
  const badge = document.createElement('span');
  badge.className = 'command-card__badge';
  if (variant === 'muted') {
    badge.classList.add('command-card__badge--muted');
  }
  badge.textContent = text;
  return badge;
}

function createCommandCard(command, index) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'command-card';
  if (command.enabled === false) {
    button.classList.add('command-card--inactive');
  }
  button.dataset.index = String(index);
  button.addEventListener('click', () => {
    if (!commandsEditable) return;
    openCommandModal(index);
  });

  const title = document.createElement('h3');
  title.className = 'command-card__title';
  const primaryName = Array.isArray(command.names) && command.names.length ? command.names[0] : 'befehl';
  title.textContent = `${commandsState.prefix}${primaryName}`;
  button.appendChild(title);

  if (Array.isArray(command.names) && command.names.length > 1) {
    const aliases = document.createElement('p');
    aliases.className = 'command-card__aliases';
    const others = command.names.slice(1).map(name => `${commandsState.prefix}${name}`).join(', ');
    aliases.textContent = `Weitere: ${others}`;
    button.appendChild(aliases);
  }

  const badges = document.createElement('div');
  badges.className = 'command-card__badges';
  const levelLabel = USER_LEVEL_LABEL.get(command.minUserLevel) || USER_LEVEL_LABEL.get('everyone');
  badges.appendChild(
    createCommandBadge(`Stufe: ${levelLabel}`, command.minUserLevel === 'everyone' ? 'muted' : '')
  );
  const responseLabel = RESPONSE_TYPE_LABEL.get(command.responseType) || RESPONSE_TYPE_LABEL.get('say');
  badges.appendChild(createCommandBadge(`Antwort: ${responseLabel}`, command.responseType === 'say' ? 'muted' : ''));
  const cooldown = Math.max(0, Number(command.cooldownSeconds || 0));
  badges.appendChild(
    createCommandBadge(
      cooldown ? `Cooldown: ${cooldown}s` : 'Cooldown: —',
      cooldown ? '' : 'muted'
    )
  );
  const interval = Math.max(0, Number(command.autoIntervalSeconds || 0));
  badges.appendChild(
    createCommandBadge(interval ? `Automatik: ${interval}s` : 'Automatik: aus', interval ? '' : 'muted')
  );
  if (command.enabled === false) {
    badges.appendChild(createCommandBadge('Deaktiviert', 'muted'));
  }
  button.appendChild(badges);

  return button;
}

function renderCommands() {
  commandList.innerHTML = '';
  commandPrefixInput.value = commandsState.prefix || '!';
  enableCommands(commandsEditable);
  if (!commandsState.items.length) {
    const empty = document.createElement('p');
    empty.className = 'card__hint';
    empty.textContent = 'Noch keine Befehle vorhanden. Füge über den Button einen neuen Befehl hinzu.';
    commandList.appendChild(empty);
    return;
  }
  commandsState.items.forEach((command, index) => {
    commandList.appendChild(createCommandCard(command, index));
  });
}

function generateCommandName(base = 'befehl') {
  let suffix = 1;
  let candidate = base;
  const existing = commandsState.items.flatMap(item => (Array.isArray(item.names) ? item.names : [])).map(name => name.toLowerCase());
  while (existing.includes(candidate.toLowerCase())) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function openCommandModal(index = null) {
  if (!commandsEditable) return;
  const isEditing = typeof index === 'number' && commandsState.items[index];
  commandModalState = { index: isEditing ? index : null, isNew: !isEditing };
  const baseCommand = isEditing
    ? { ...commandsState.items[index], names: [...commandsState.items[index].names] }
    : {
        names: [generateCommandName('befehl')],
        response: DEFAULT_COMMAND_RESPONSE,
        cooldownSeconds: 30,
        autoIntervalSeconds: 0,
        minUserLevel: 'everyone',
        responseType: 'say',
        enabled: true
      };
  commandDraft = baseCommand;
  if (!USER_LEVEL_LABEL.has(commandDraft.minUserLevel)) {
    commandDraft.minUserLevel = 'everyone';
  }
  if (!RESPONSE_TYPE_LABEL.has(commandDraft.responseType)) {
    commandDraft.responseType = 'say';
  }
  commandModalTitle.textContent = commandModalState.isNew
    ? 'Neuen Befehl erstellen'
    : `Befehl bearbeiten · ${commandsState.prefix}${commandDraft.names[0] || ''}`;
  commandEnabledInput.checked = commandDraft.enabled !== false;
  commandResponseInput.value = commandDraft.response || '';
  commandCooldownInput.value = Number(commandDraft.cooldownSeconds || 0);
  commandAutoIntervalInput.value = Number(commandDraft.autoIntervalSeconds || 0);
  commandUserLevelSelect.value = commandDraft.minUserLevel || 'everyone';
  commandResponseTypeSelect.value = commandDraft.responseType || 'say';
  resetCommandModalError();
  renderCommandNames();
  commandDeleteBtn.hidden = commandModalState.isNew;
  commandDeleteBtn.disabled = commandModalState.isNew;
  commandNameInput.value = '';
  commandModal.removeAttribute('hidden');
  document.body.classList.add('modal-open');
  setTimeout(() => {
    commandNameInput.focus();
  }, 0);
}

function closeCommandModal() {
  if (!commandModal || commandModal.hasAttribute('hidden')) {
    commandDraft = null;
    commandModalState = { index: null, isNew: true };
    return;
  }
  commandModal.setAttribute('hidden', '');
  document.body.classList.remove('modal-open');
  resetCommandModalError();
  commandDraft = null;
  commandModalState = { index: null, isNew: true };
}

function resetCommandModalError() {
  if (commandModalError) {
    commandModalError.hidden = true;
    commandModalError.textContent = '';
  }
}

function renderCommandNames() {
  commandNamesContainer.innerHTML = '';
  if (!commandDraft || !Array.isArray(commandDraft.names)) {
    return;
  }
  commandDraft.names.forEach((name, index) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    const label = document.createElement('span');
    label.textContent = `${commandsState.prefix}${name}`;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.innerHTML = '×';
    removeBtn.addEventListener('click', () => {
      commandDraft.names.splice(index, 1);
      renderCommandNames();
    });
    tag.appendChild(label);
    tag.appendChild(removeBtn);
    commandNamesContainer.appendChild(tag);
  });
}

function addCommandNameFromInput() {
  const value = commandNameInput.value;
  if (!commandDraft) return;
  const sanitized = sanitizeCommandName(value);
  if (!sanitized) {
    commandNameInput.value = '';
    return;
  }
  if (!Array.isArray(commandDraft.names)) {
    commandDraft.names = [];
  }
  if (commandDraft.names.includes(sanitized)) {
    commandNameInput.value = '';
    return;
  }
  commandDraft.names.push(sanitized);
  commandNameInput.value = '';
  resetCommandModalError();
  renderCommandNames();
}

function handleCommandFormSubmit(event) {
  event.preventDefault();
  if (!commandsEditable || !commandDraft) return;
  resetCommandModalError();
  commandDraft.enabled = commandEnabledInput.checked;
  commandDraft.response = commandResponseInput.value;
  commandDraft.cooldownSeconds = Number(commandCooldownInput.value || 0);
  commandDraft.autoIntervalSeconds = Number(commandAutoIntervalInput.value || 0);
  commandDraft.minUserLevel = commandUserLevelSelect.value;
  commandDraft.responseType = commandResponseTypeSelect.value;

  const normalized = normalizeCommandDraft(commandDraft);
  if (!normalized) {
    commandModalError.textContent = 'Bitte mindestens einen gültigen Befehlsnamen und eine Antwort angeben.';
    commandModalError.hidden = false;
    return;
  }

  if (commandModalState.isNew) {
    commandsState.items.push(normalized);
  } else if (typeof commandModalState.index === 'number') {
    commandsState.items.splice(commandModalState.index, 1, normalized);
  }

  closeCommandModal();
  renderCommands();
  commandsLoaded = true;
  updateCommandStatusSummary();
  setCommandStatus('Befehl aktualisiert. Vergiss nicht zu speichern!', 'ok');
}

async function loadCommands() {
  try {
    const data = await apiFetch('/commands');
    const prefix = sanitizePrefix(data.prefix);
    const items = Array.isArray(data.items) ? data.items.map(normalizeLoadedCommand).filter(Boolean) : [];
    commandsState = { prefix, items };
    commandsLoaded = true;
    renderCommands();
    updateCommandStatusSummary();
  } catch (error) {
    console.error('Befehle konnten nicht geladen werden', error);
    setCommandStatus(`Befehle konnten nicht geladen werden: ${error.message}`, 'error');
  }
}

function addCommand() {
  openCommandModal(null);
}

async function saveCommands() {
  try {
    const prefix = sanitizePrefix(commandPrefixInput.value);
    const sanitizedItems = commandsState.items.map(normalizeCommandDraft).filter(Boolean);
    if (!sanitizedItems.length && commandsState.items.length) {
      setCommandStatus('Bitte alle Befehle vollständig konfigurieren, bevor du speicherst.', 'error');
      return;
    }
    if (sanitizedItems.length !== commandsState.items.length) {
      setCommandStatus('Einige Befehle sind unvollständig. Bitte ergänzen oder löschen.', 'error');
      return;
    }
    const payload = {
      prefix,
      items: sanitizedItems
    };
    commandsState.prefix = prefix;
    commandsState.items = sanitizedItems.map(item => ({ ...item }));
    await apiFetch('/commands', {
      method: 'PUT',
      body: payload
    });
    renderCommands();
    updateCommandStatusSummary();
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
  closeCommandModal();
  closeStream();
  messageSubmit.disabled = true;
  setCommandStatus('Befehle noch nicht geladen.');
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
  renderCommands();
  updateCommandStatusSummary();
  if (commandDraft && !commandModal.hasAttribute('hidden')) {
    renderCommandNames();
  }
});

addCommandBtn.addEventListener('click', () => {
  if (!commandsEditable) return;
  addCommand();
});

saveCommandsBtn.addEventListener('click', () => {
  if (!commandsEditable) return;
  saveCommands();
});

if (commandNameAddBtn) {
  commandNameAddBtn.addEventListener('click', () => {
    addCommandNameFromInput();
  });
}

if (commandNameInput) {
  commandNameInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addCommandNameFromInput();
    }
  });
}

if (commandForm) {
  commandForm.addEventListener('submit', handleCommandFormSubmit);
}

if (commandModalCloseBtn) {
  commandModalCloseBtn.addEventListener('click', () => {
    closeCommandModal();
  });
}

commandModalCancelBtns.forEach(button => {
  button.addEventListener('click', () => {
    closeCommandModal();
  });
});

if (commandDeleteBtn) {
  commandDeleteBtn.addEventListener('click', () => {
    if (!commandsEditable || commandModalState.isNew || typeof commandModalState.index !== 'number') {
      closeCommandModal();
      return;
    }
    commandsState.items.splice(commandModalState.index, 1);
    closeCommandModal();
    renderCommands();
    updateCommandStatusSummary();
    setCommandStatus('Befehl entfernt. Vergiss nicht zu speichern!', 'ok');
  });
}

if (commandModal) {
  commandModal.addEventListener('click', event => {
    if (event.target === commandModal) {
      closeCommandModal();
    }
  });
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && commandModal && !commandModal.hasAttribute('hidden')) {
    closeCommandModal();
  }
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
