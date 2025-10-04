const API_BASE = '/api/twitch';

const navButtons = document.querySelectorAll('.page-nav__link');
const sections = {
  config: document.getElementById('view-config'),
  chat: document.getElementById('view-chat'),
  commands: document.getElementById('view-commands'),
  currency: document.getElementById('view-currency'),
  openai: document.getElementById('view-openai')
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
const commandCostInput = document.getElementById('commandCost');
const commandCostLabel = document.getElementById('commandCostLabel');
const commandDeleteBtn = document.getElementById('commandDelete');
const commandModalError = document.getElementById('commandModalError');
const commandModalCloseBtn = document.querySelector('[data-command-modal-close]');
const commandModalCancelBtns = document.querySelectorAll('[data-command-modal-cancel]');

const currencyForm = document.getElementById('currencyForm');
const currencyNameInput = document.getElementById('currencyName');
const currencyAmountInput = document.getElementById('currencyAmount');
const currencyMinutesInput = document.getElementById('currencyMinutes');
const currencySaveBtn = document.getElementById('currencySave');
const currencyStatusEl = document.getElementById('currencyStatus');
const currencySummaryEl = document.getElementById('currencySummary');
const currencySummaryTotalEl = document.getElementById('currencySummaryTotal');
const currencySummaryUsersEl = document.getElementById('currencySummaryUsers');
const currencySummaryRateEl = document.getElementById('currencySummaryRate');

const openAiForm = document.getElementById('openAiForm');
const openAiEnabledInput = document.getElementById('openAiEnabled');
const openAiChannelInput = document.getElementById('openAiChannel');
const openAiIntervalInput = document.getElementById('openAiInterval');
const openAiPromptInput = document.getElementById('openAiPrompt');
const openAiSaveBtn = document.getElementById('openAiSave');
const openAiResetPromptBtn = document.getElementById('openAiResetPrompt');
const openAiStatusEl = document.getElementById('openAiStatus');
const openAiSummaryEl = document.getElementById('openAiSummary');
const openAiSummaryChannelEl = document.getElementById('openAiSummaryChannel');
const openAiSummaryIntervalEl = document.getElementById('openAiSummaryInterval');
const openAiSummaryNextRunEl = document.getElementById('openAiSummaryNextRun');
const openAiSummaryLastSuccessEl = document.getElementById('openAiSummaryLastSuccess');
const openAiSummaryStreamStatusEl = document.getElementById('openAiSummaryStreamStatus');
const openAiSummaryMessageEl = document.getElementById('openAiSummaryMessage');
const openAiSummaryTokensEl = document.getElementById('openAiSummaryTokens');
const openAiSummaryErrorEl = document.getElementById('openAiSummaryError');
const openAiDebugPanel = document.getElementById('openAiDebugPanel');
const openAiDebugMetaEl = document.getElementById('openAiDebugMeta');
const openAiDebugScreenshotWrapper = document.getElementById('openAiDebugScreenshotWrapper');
const openAiDebugScreenshotEl = document.getElementById('openAiDebugScreenshot');
const openAiDebugRequestEl = document.getElementById('openAiDebugRequest');
const openAiDebugResponseEl = document.getElementById('openAiDebugResponse');
const openAiDebugHistoryList = document.getElementById('openAiDebugHistory');
const openAiDebugEmptyEl = document.getElementById('openAiDebugEmpty');

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
const NUMBER_FORMATTER = new Intl.NumberFormat('de-DE');
const OPEN_AI_DEFAULT_PROMPT =
  'Du bist ein Twitch Zuschauer und schaust den Stream von Behamot. Verhalte dich wie ein Standard Twitch Zuschauer. Gebe eine kurze prägnante Nachricht. Gehe potentiell auf vorherige Nachrichten oder die aktuelle Szene des Streams ein. Behamot hat folgende Emojis: Behamot1Hi Nutze die Emojis sporadisch aber nicht zwingend.';

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
let currencyState = null;
let currencyLoaded = false;
let openAiConfig = null;
let openAiRuntimeState = null;
let openAiRuntimeRefreshTimeout = null;

const storedChannel = localStorage.getItem(STORAGE_KEYS.channel);
if (storedChannel) {
  channelInput.value = storedChannel;
}

if (currencySummaryEl) {
  currencySummaryEl.hidden = true;
}
if (currencyStatusEl) {
  currencyStatusEl.textContent = 'Bitte zuerst mit dem Backend verbinden.';
}
if (openAiSummaryEl) {
  openAiSummaryEl.hidden = true;
}
if (openAiStatusEl) {
  openAiStatusEl.textContent = 'Bitte zuerst mit dem Backend verbinden.';
}
if (openAiDebugPanel) {
  openAiDebugPanel.hidden = true;
}
if (openAiDebugMetaEl) {
  openAiDebugMetaEl.textContent = 'Keine Daten verfügbar.';
}
if (openAiDebugScreenshotWrapper) {
  openAiDebugScreenshotWrapper.hidden = true;
}
if (openAiDebugRequestEl) {
  openAiDebugRequestEl.textContent = '—';
}
if (openAiDebugResponseEl) {
  openAiDebugResponseEl.textContent = '—';
}
if (openAiDebugHistoryList) {
  openAiDebugHistoryList.innerHTML = '';
}
if (openAiDebugEmptyEl) {
  openAiDebugEmptyEl.hidden = false;
}
if (openAiPromptInput) {
  openAiPromptInput.value = OPEN_AI_DEFAULT_PROMPT;
}

function setActiveSection(target, { updateUrl = true } = {}) {
  if (!target || !sections[target]) {
    return;
  }
  navButtons.forEach(btn => {
    const isTarget = btn.dataset.target === target;
    btn.classList.toggle('is-active', isTarget);
  });
  Object.entries(sections).forEach(([key, section]) => {
    if (!section) return;
    const isTarget = key === target;
    section.classList.toggle('is-active', isTarget);
    if (typeof section.hidden === 'boolean') {
      section.hidden = !isTarget;
    }
  });
  if (updateUrl && typeof window !== 'undefined' && window.history?.replaceState) {
    try {
      const url = new URL(window.location.href);
      url.hash = `#${target}`;
      window.history.replaceState(null, '', url);
    } catch (error) {
      console.warn('Ansicht konnte nicht in der URL gespeichert werden:', error);
    }
  }
}

function resolveInitialSection() {
  if (typeof window === 'undefined') {
    return 'config';
  }
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('view');
  if (viewParam && sections[viewParam]) {
    return viewParam;
  }
  const hash = window.location.hash ? window.location.hash.replace(/^#/, '') : '';
  if (hash && sections[hash]) {
    return hash;
  }
  return 'config';
}

navButtons.forEach(button => {
  button.addEventListener('click', () => {
    const target = button.dataset.target;
    setActiveSection(target);
  });
});

setActiveSection(resolveInitialSection(), { updateUrl: false });

function getCurrencyName() {
  return currencyState?.name || 'Währung';
}

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

function setCurrencyStatus(text, variant = '') {
  if (!currencyStatusEl) return;
  currencyStatusEl.textContent = text;
  currencyStatusEl.classList.remove('status-box--ok', 'status-box--error');
  if (variant === 'ok') {
    currencyStatusEl.classList.add('status-box--ok');
  } else if (variant === 'error') {
    currencyStatusEl.classList.add('status-box--error');
  }
}

function setOpenAiStatus(text, variant = '') {
  if (!openAiStatusEl) return;
  openAiStatusEl.textContent = text;
  openAiStatusEl.classList.remove('status-box--ok', 'status-box--error');
  if (variant === 'ok') {
    openAiStatusEl.classList.add('status-box--ok');
  } else if (variant === 'error') {
    openAiStatusEl.classList.add('status-box--error');
  }
}

function enableOpenAi(enabled) {
  if (!openAiForm) return;
  const elements = Array.from(openAiForm.elements || []);
  elements.forEach(element => {
    if (!element) return;
    if (element === openAiEnabledInput) {
      element.disabled = !enabled;
    } else {
      element.disabled = !enabled;
    }
  });
  if (openAiSaveBtn) {
    openAiSaveBtn.disabled = !enabled;
  }
  if (!enabled) {
    setOpenAiStatus('Bitte zuerst mit dem Backend verbinden.');
  }
}

function resetOpenAiUi() {
  openAiConfig = null;
  openAiRuntimeState = null;
  if (openAiRuntimeRefreshTimeout) {
    clearTimeout(openAiRuntimeRefreshTimeout);
    openAiRuntimeRefreshTimeout = null;
  }
  if (openAiEnabledInput) openAiEnabledInput.checked = false;
  if (openAiChannelInput) openAiChannelInput.value = '';
  if (openAiIntervalInput) openAiIntervalInput.value = '';
  if (openAiPromptInput) openAiPromptInput.value = OPEN_AI_DEFAULT_PROMPT;
  if (openAiSummaryChannelEl) openAiSummaryChannelEl.textContent = '—';
  if (openAiSummaryIntervalEl) openAiSummaryIntervalEl.textContent = '—';
  if (openAiSummaryNextRunEl) openAiSummaryNextRunEl.textContent = '—';
  if (openAiSummaryLastSuccessEl) openAiSummaryLastSuccessEl.textContent = '—';
  if (openAiSummaryStreamStatusEl) openAiSummaryStreamStatusEl.textContent = '—';
  if (openAiSummaryMessageEl) openAiSummaryMessageEl.textContent = '—';
  if (openAiSummaryTokensEl) openAiSummaryTokensEl.textContent = '—';
  if (openAiSummaryErrorEl) {
    openAiSummaryErrorEl.textContent = '';
    openAiSummaryErrorEl.hidden = true;
  }
  if (openAiSummaryEl) {
    openAiSummaryEl.hidden = true;
  }
  renderOpenAiDebug(null);
  setOpenAiStatus('Bitte zuerst mit dem Backend verbinden.');
}

function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('de-DE');
}

function formatDebugJson(value) {
  if (value == null) {
    return '—';
  }
  if (typeof value === 'string') {
    return value.trim() ? value : '—';
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}

function renderOpenAiDebug(runtime = openAiRuntimeState) {
  if (!openAiDebugPanel) {
    return;
  }
  const history = Array.isArray(runtime?.history) ? runtime.history : [];
  if (!history.length) {
    openAiDebugPanel.hidden = true;
    if (openAiDebugMetaEl) {
      openAiDebugMetaEl.textContent = 'Keine Daten verfügbar.';
    }
    if (openAiDebugRequestEl) {
      openAiDebugRequestEl.textContent = '—';
    }
    if (openAiDebugResponseEl) {
      openAiDebugResponseEl.textContent = '—';
    }
    if (openAiDebugScreenshotWrapper) {
      openAiDebugScreenshotWrapper.hidden = true;
    }
    if (openAiDebugHistoryList) {
      openAiDebugHistoryList.innerHTML = '';
    }
    if (openAiDebugEmptyEl) {
      openAiDebugEmptyEl.hidden = false;
    }
    return;
  }

  openAiDebugPanel.hidden = false;
  const latest = history[0] || {};

  if (openAiDebugMetaEl) {
    const metaParts = [];
    if (latest.channel) {
      metaParts.push(`#${latest.channel}`);
    }
    if (latest.createdAt) {
      metaParts.push(formatTimestamp(latest.createdAt));
    }
    if (latest.reason) {
      metaParts.push(`Auslöser: ${latest.reason}`);
    }
    const tokenMeta = [];
    if (latest.promptTokens != null) {
      tokenMeta.push(`Prompt ${NUMBER_FORMATTER.format(latest.promptTokens)}`);
    }
    if (latest.completionTokens != null) {
      tokenMeta.push(`Completion ${NUMBER_FORMATTER.format(latest.completionTokens)}`);
    }
    if (tokenMeta.length) {
      metaParts.push(`Tokens: ${tokenMeta.join(' / ')}`);
    } else if (latest.totalTokens != null) {
      metaParts.push(`Tokens gesamt: ${NUMBER_FORMATTER.format(latest.totalTokens)}`);
    }
    openAiDebugMetaEl.textContent = metaParts.length ? metaParts.join(' · ') : 'Letzte Ausführung';
  }

  if (openAiDebugScreenshotWrapper) {
    if (latest.screenshotDataUrl) {
      openAiDebugScreenshotWrapper.hidden = false;
      if (openAiDebugScreenshotEl) {
        openAiDebugScreenshotEl.src = latest.screenshotDataUrl;
      }
    } else {
      openAiDebugScreenshotWrapper.hidden = true;
      if (openAiDebugScreenshotEl) {
        openAiDebugScreenshotEl.removeAttribute('src');
      }
    }
  }

  if (openAiDebugRequestEl) {
    openAiDebugRequestEl.textContent = formatDebugJson(latest.requestPayload);
  }
  if (openAiDebugResponseEl) {
    openAiDebugResponseEl.textContent = formatDebugJson(latest.responsePayload);
  }

  if (openAiDebugHistoryList) {
    openAiDebugHistoryList.innerHTML = '';
    history.forEach(entry => {
      const listItem = document.createElement('li');
      listItem.className = 'openai-debug__history-item';
      const time = document.createElement('time');
      time.dateTime = entry.createdAt || '';
      time.textContent = formatTimestamp(entry.createdAt);
      const message = document.createElement('p');
      message.textContent = entry.message || '—';
      const meta = document.createElement('p');
      meta.className = 'openai-debug__history-meta';
      const infoParts = [];
      if (entry.channel) {
        infoParts.push(`#${entry.channel}`);
      }
      if (entry.reason) {
        infoParts.push(`Auslöser: ${entry.reason}`);
      }
      const entryTokens = [];
      if (entry.promptTokens != null) {
        entryTokens.push(`Prompt ${NUMBER_FORMATTER.format(entry.promptTokens)}`);
      }
      if (entry.completionTokens != null) {
        entryTokens.push(`Completion ${NUMBER_FORMATTER.format(entry.completionTokens)}`);
      }
      if (entryTokens.length) {
        infoParts.push(`Tokens: ${entryTokens.join(' / ')}`);
      } else if (entry.totalTokens != null) {
        infoParts.push(`Tokens gesamt: ${NUMBER_FORMATTER.format(entry.totalTokens)}`);
      }
      if (entry.screenshotBytes != null) {
        infoParts.push(`${NUMBER_FORMATTER.format(entry.screenshotBytes)} Bytes`);
      }
      meta.textContent = infoParts.length ? infoParts.join(' · ') : '—';
      listItem.append(time, message, meta);
      openAiDebugHistoryList.appendChild(listItem);
    });
  }

  if (openAiDebugEmptyEl) {
    openAiDebugEmptyEl.hidden = history.length > 0;
  }
}

function scheduleOpenAiRuntimeRefresh(delay = 400) {
  if (!openAiForm) {
    return;
  }
  if (openAiRuntimeRefreshTimeout) {
    return;
  }
  openAiRuntimeRefreshTimeout = setTimeout(async () => {
    openAiRuntimeRefreshTimeout = null;
    try {
      const data = await apiFetch('/openai');
      if (data?.runtime) {
        openAiRuntimeState = data.runtime;
        updateOpenAiSummary(openAiRuntimeState, openAiConfig);
      }
    } catch (error) {
      console.error('OpenAI-Laufzeit konnte nicht aktualisiert werden', error);
    }
  }, delay);
}

function updateOpenAiSummary(runtime = openAiRuntimeState, config = openAiConfig) {
  if (!openAiSummaryEl) return;
  if (!runtime && !config) {
    openAiSummaryEl.hidden = true;
    return;
  }
  const targetChannel =
    runtime?.targetChannel ||
    config?.channel ||
    statusData?.openAi?.targetChannel ||
    statusData?.defaultChannel ||
    '';
  if (openAiSummaryChannelEl) {
    openAiSummaryChannelEl.textContent = targetChannel ? `#${targetChannel.replace(/^#/, '')}` : '—';
  }
  if (openAiSummaryIntervalEl) {
    const interval = Number(config?.intervalSeconds ?? statusData?.openAi?.intervalSeconds ?? 0);
    openAiSummaryIntervalEl.textContent = interval
      ? `${NUMBER_FORMATTER.format(Math.max(0, Math.round(interval)))} s`
      : '—';
  }
  if (openAiSummaryNextRunEl) {
    const nextRun = runtime?.nextRunAt || statusData?.openAi?.nextRunAt || null;
    openAiSummaryNextRunEl.textContent = formatTimestamp(nextRun);
  }
  if (openAiSummaryLastSuccessEl) {
    const last =
      runtime?.lastSuccessAt ||
      runtime?.lastRunAt ||
      statusData?.openAi?.lastSuccessAt ||
      statusData?.openAi?.lastRunAt ||
      null;
    openAiSummaryLastSuccessEl.textContent = formatTimestamp(last);
  }
  if (openAiSummaryStreamStatusEl) {
    const streamStatus = runtime?.lastStreamStatus || statusData?.openAi?.lastStreamStatus || null;
    let statusText = '—';
    if (streamStatus) {
      if (streamStatus.live === true) {
        const parts = ['Live'];
        if (streamStatus.title) {
          parts.push(streamStatus.title);
        }
        if (streamStatus.viewerCount != null) {
          parts.push(`${NUMBER_FORMATTER.format(streamStatus.viewerCount)} Zuschauer`);
        }
        statusText = parts.join(' · ');
      } else if (streamStatus.live === false) {
        const when = formatTimestamp(streamStatus.checkedAt);
        statusText = when && when !== '—' ? `Offline · ${when}` : 'Offline';
      } else if (streamStatus.live === null) {
        const when = formatTimestamp(streamStatus.checkedAt);
        statusText = when && when !== '—' ? `Status unbekannt · ${when}` : 'Status unbekannt';
      }
    }
    openAiSummaryStreamStatusEl.textContent = statusText;
  }
  if (openAiSummaryMessageEl) {
    openAiSummaryMessageEl.textContent = runtime?.lastMessage || statusData?.openAi?.lastMessage || '—';
  }
  if (openAiSummaryTokensEl) {
    const promptTokens =
      runtime?.usage?.promptTokens ?? statusData?.openAi?.usage?.promptTokens ?? null;
    const completionTokens =
      runtime?.usage?.completionTokens ?? statusData?.openAi?.usage?.completionTokens ?? null;
    if (promptTokens != null || completionTokens != null) {
      const parts = [];
      if (promptTokens != null) {
        parts.push(`Prompt: ${NUMBER_FORMATTER.format(promptTokens)}`);
      }
      if (completionTokens != null) {
        parts.push(`Completion: ${NUMBER_FORMATTER.format(completionTokens)}`);
      }
      openAiSummaryTokensEl.textContent = parts.length ? parts.join(' · ') : '—';
    } else {
      openAiSummaryTokensEl.textContent = '—';
    }
  }
  if (openAiSummaryErrorEl) {
    const error = runtime?.lastError || statusData?.openAi?.lastError || null;
    if (error?.message) {
      const timeLabel = formatTimestamp(error.occurredAt);
      openAiSummaryErrorEl.textContent = `${timeLabel !== '—' ? `${timeLabel}: ` : ''}${error.message}`;
      openAiSummaryErrorEl.hidden = false;
    } else {
      openAiSummaryErrorEl.textContent = '';
      openAiSummaryErrorEl.hidden = true;
    }
  }
  openAiSummaryEl.hidden = false;
  renderOpenAiDebug(runtime);
}

async function loadOpenAiSettings() {
  if (!openAiForm) return;
  try {
    setOpenAiStatus('Lade OpenAI-Konfiguration …');
    if (openAiSaveBtn) {
      openAiSaveBtn.disabled = true;
    }
    const data = await apiFetch('/openai');
    const config = {
      enabled: Boolean(data?.config?.enabled),
      intervalSeconds: Math.max(30, Math.round(Number(data?.config?.intervalSeconds ?? 90))),
      systemPrompt:
        typeof data?.config?.systemPrompt === 'string' && data.config.systemPrompt.trim()
          ? data.config.systemPrompt.trim()
          : OPEN_AI_DEFAULT_PROMPT,
      channel: typeof data?.config?.channel === 'string' ? data.config.channel : ''
    };
    openAiConfig = config;
    openAiRuntimeState = data?.runtime || null;

    if (openAiEnabledInput) openAiEnabledInput.checked = config.enabled;
    if (openAiIntervalInput) openAiIntervalInput.value = config.intervalSeconds;
    if (openAiPromptInput) openAiPromptInput.value = config.systemPrompt;
    if (openAiChannelInput) openAiChannelInput.value = config.channel || '';

    updateOpenAiSummary(openAiRuntimeState, config);

    if (!openAiRuntimeState?.hasApiKey) {
      setOpenAiStatus('OpenAI API-Key fehlt im Backend.', 'error');
    } else if (!config.enabled) {
      setOpenAiStatus('Automatik ist deaktiviert.');
    } else {
      const parts = [`Aktiv – alle ${NUMBER_FORMATTER.format(config.intervalSeconds)} s`];
      if (openAiRuntimeState?.nextRunAt) {
        parts.push(`Nächster Lauf: ${formatTimestamp(openAiRuntimeState.nextRunAt)}`);
      }
      setOpenAiStatus(parts.join(' · '), 'ok');
    }
  } catch (error) {
    console.error('OpenAI-Konfiguration konnte nicht geladen werden', error);
    setOpenAiStatus(`OpenAI konnte nicht geladen werden: ${error.message}`, 'error');
    if (openAiSummaryEl) {
      openAiSummaryEl.hidden = true;
    }
    renderOpenAiDebug(null);
  } finally {
    if (openAiSaveBtn) {
      openAiSaveBtn.disabled = false;
    }
  }
}

async function saveOpenAiSettings() {
  if (!openAiForm) return;
  if (!apiPassword) {
    setOpenAiStatus('Bitte zuerst mit dem Backend verbinden.', 'error');
    return;
  }
  const intervalValue = Number(openAiIntervalInput?.value ?? 0);
  if (!Number.isFinite(intervalValue) || intervalValue < 30) {
    setOpenAiStatus('Bitte einen Intervall von mindestens 30 Sekunden angeben.', 'error');
    return;
  }
  const prompt = (openAiPromptInput?.value || '').trim() || OPEN_AI_DEFAULT_PROMPT;
  const channel = (openAiChannelInput?.value || '').trim();
  const payload = {
    enabled: Boolean(openAiEnabledInput?.checked),
    intervalSeconds: Math.max(30, Math.round(intervalValue)),
    systemPrompt: prompt,
    channel
  };

  setOpenAiStatus('Speichere OpenAI-Konfiguration …');
  if (openAiSaveBtn) {
    openAiSaveBtn.disabled = true;
  }
  try {
    const result = await apiFetch('/openai', { method: 'PUT', body: payload });
    const config = {
      enabled: Boolean(result?.config?.enabled ?? payload.enabled),
      intervalSeconds: Math.max(30, Math.round(Number(result?.config?.intervalSeconds ?? payload.intervalSeconds))),
      systemPrompt:
        typeof result?.config?.systemPrompt === 'string' && result.config.systemPrompt.trim()
          ? result.config.systemPrompt.trim()
          : prompt,
      channel: typeof result?.config?.channel === 'string' ? result.config.channel : channel
    };
    openAiConfig = config;
    openAiRuntimeState = result?.runtime || openAiRuntimeState || null;

    if (openAiEnabledInput) openAiEnabledInput.checked = config.enabled;
    if (openAiIntervalInput) openAiIntervalInput.value = config.intervalSeconds;
    if (openAiPromptInput) openAiPromptInput.value = config.systemPrompt;
    if (openAiChannelInput) openAiChannelInput.value = config.channel || '';

    updateOpenAiSummary(openAiRuntimeState, config);

    if (!openAiRuntimeState?.hasApiKey) {
      setOpenAiStatus('Gespeichert, aber OpenAI API-Key fehlt im Backend.', 'error');
    } else if (!config.enabled) {
      setOpenAiStatus('Konfiguration gespeichert. Automatik ist deaktiviert.');
    } else {
      setOpenAiStatus('OpenAI-Automatik gespeichert.', 'ok');
    }
  } catch (error) {
    console.error('OpenAI-Konfiguration konnte nicht gespeichert werden', error);
    setOpenAiStatus(`Speichern fehlgeschlagen: ${error.message}`, 'error');
  } finally {
    if (openAiSaveBtn) {
      openAiSaveBtn.disabled = false;
    }
  }
}

function applyOpenAiRuntimeUpdate(meta = {}) {
  if (!meta || meta.source !== 'openai-viewer') {
    return;
  }
  if (!openAiRuntimeState) {
    openAiRuntimeState = {};
  }
  const sentAt = meta.sentAt || new Date().toISOString();
  openAiRuntimeState.lastRunAt = sentAt;
  openAiRuntimeState.lastSuccessAt = sentAt;
  openAiRuntimeState.lastError = null;
  if (!openAiRuntimeState.usage) {
    openAiRuntimeState.usage = {};
  }
  if (meta.promptTokens != null) {
    openAiRuntimeState.usage.promptTokens = meta.promptTokens;
  }
  if (meta.completionTokens != null) {
    openAiRuntimeState.usage.completionTokens = meta.completionTokens;
  }
  if (meta.targetChannel) {
    openAiRuntimeState.targetChannel = meta.targetChannel;
  }
  const message = typeof meta.message === 'string' ? meta.message : null;
  if (message) {
    openAiRuntimeState.lastMessage = message;
  }
  if (meta.intervalSeconds && (!openAiConfig || openAiConfig.intervalSeconds !== meta.intervalSeconds)) {
    openAiConfig = openAiConfig || {};
    openAiConfig.intervalSeconds = meta.intervalSeconds;
  }
  updateOpenAiSummary(openAiRuntimeState, openAiConfig);
  scheduleOpenAiRuntimeRefresh();
  if (apiPassword && openAiConfig?.enabled) {
    setOpenAiStatus('OpenAI-Antwort wurde gesendet.', 'ok');
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
      if (meta.source === 'openai-viewer') {
        info.push('Quelle: OpenAI Zuschauer');
        if (meta.intervalSeconds) {
          info.push(`Intervall: ${NUMBER_FORMATTER.format(meta.intervalSeconds)}s`);
        }
        const tokenParts = [];
        if (meta.promptTokens != null) {
          tokenParts.push(`Prompt ${NUMBER_FORMATTER.format(meta.promptTokens)}`);
        }
        if (meta.completionTokens != null) {
          tokenParts.push(`Completion ${NUMBER_FORMATTER.format(meta.completionTokens)}`);
        }
        if (tokenParts.length) {
          info.push(`Tokens: ${tokenParts.join(' / ')}`);
        }
      }
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
      if (meta.source === 'openai-viewer') {
        applyOpenAiRuntimeUpdate({ ...meta, message });
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
    enableCurrency(true);
    enableOpenAi(true);
    if (!commandsLoaded) {
      await loadCommands();
    } else {
      updateCommandStatusSummary();
    }
    await loadCurrencySettings();
    if (openAiForm) {
      await loadOpenAiSettings();
    }
  } catch (error) {
    setStatus(`Fehler: ${error.message}`, 'error');
    oauthButton.disabled = true;
    connectChannelBtn.disabled = true;
    updateTokenStatus(null);
    enableCommands(false);
    enableCurrency(false);
    enableOpenAi(false);
    resetOpenAiUi();
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
    enableCurrency(false);
  }
}

function enableCurrency(enabled) {
  const elements = [currencyNameInput, currencyAmountInput, currencyMinutesInput, currencySaveBtn];
  elements.forEach(element => {
    if (element) {
      element.disabled = !enabled;
    }
  });
  if (!enabled) {
    setCurrencyStatus('Bitte zuerst mit dem Backend verbinden.');
    if (currencySummaryEl) {
      currencySummaryEl.hidden = true;
    }
  }
}

function updateCommandCostLabel() {
  if (!commandCostLabel) return;
  commandCostLabel.textContent = `Kosten (${getCurrencyName()})`;
}

function updateCurrencySummary(summary = null, accrual = null) {
  if (!currencySummaryEl) return;
  if (!summary) {
    currencySummaryEl.hidden = true;
    return;
  }
  const totalBalance = Math.max(0, Number(summary.totalBalance || 0));
  const totalUsers = Math.max(0, Number(summary.totalUsers || 0));
  if (currencySummaryTotalEl) {
    currencySummaryTotalEl.textContent = NUMBER_FORMATTER.format(totalBalance);
  }
  if (currencySummaryUsersEl) {
    currencySummaryUsersEl.textContent = NUMBER_FORMATTER.format(totalUsers);
  }
  if (currencySummaryRateEl) {
    const amount = Math.max(0, Number(accrual?.amount || 0));
    const minutes = Math.max(0, Number(accrual?.minutes || 0));
    if (amount > 0 && minutes > 0) {
      currencySummaryRateEl.textContent = `${NUMBER_FORMATTER.format(amount)} ${getCurrencyName()} alle ${NUMBER_FORMATTER.format(minutes)} min`;
    } else {
      currencySummaryRateEl.textContent = 'Keine automatische Vergabe';
    }
  }
  currencySummaryEl.hidden = false;
}

async function loadCurrencySettings() {
  if (!currencyForm) return;
  try {
    const data = await apiFetch('/currency');
    const name = typeof data?.name === 'string' && data.name.trim() ? data.name.trim() : getCurrencyName();
    const amount = Math.max(0, Math.round(Number(data?.accrual?.amount || 0)));
    const minutes = Math.max(1, Math.round(Number(data?.accrual?.minutes || 0) || 1));
    currencyState = {
      name,
      accrual: { amount, minutes },
      summary: data?.summary || { totalUsers: 0, totalBalance: 0 }
    };
    currencyLoaded = true;
    if (currencyNameInput) currencyNameInput.value = name;
    if (currencyAmountInput) currencyAmountInput.value = amount;
    if (currencyMinutesInput) currencyMinutesInput.value = minutes;
    updateCurrencySummary(currencyState.summary, currencyState.accrual);
    updateCommandCostLabel();
    renderCommands();
    updateCommandStatusSummary();
    setCurrencyStatus('Währungseinstellungen geladen.', 'ok');
    console.info('Währungseinstellungen erfolgreich geladen.', data);
  } catch (error) {
    console.error('Währungseinstellungen konnten nicht geladen werden', error);
    setCurrencyStatus(`Währung konnte nicht geladen werden: ${error.message}`, 'error');
  }
}

async function saveCurrencySettings() {
  if (!currencyForm) return;
  const name = (currencyNameInput?.value || '').trim();
  const amountValue = Number(currencyAmountInput?.value ?? 0);
  const minutesValue = Number(currencyMinutesInput?.value ?? 0);
  if (!name) {
    setCurrencyStatus('Bitte einen Währungsnamen angeben.', 'error');
    return;
  }
  if (!Number.isFinite(amountValue) || amountValue < 0) {
    setCurrencyStatus('Bitte eine gültige Menge pro Vergabe angeben.', 'error');
    return;
  }
  if (!Number.isFinite(minutesValue) || minutesValue <= 0) {
    setCurrencyStatus('Bitte eine gültige Minutenangabe definieren.', 'error');
    return;
  }
  const payload = {
    name,
    accrual: {
      amount: Math.max(0, Math.round(amountValue)),
      minutes: Math.max(1, Math.round(minutesValue))
    }
  };
  setCurrencyStatus('Speichere Währungseinstellungen …');
  if (currencySaveBtn) {
    currencySaveBtn.disabled = true;
  }
  try {
    const result = await apiFetch('/currency', { method: 'PUT', body: payload });
    const config = result?.config || payload;
    const summary = result?.summary || { totalUsers: 0, totalBalance: 0 };
    currencyState = {
      name: config.name || payload.name,
      accrual: {
        amount: Math.max(0, Math.round(Number(config?.accrual?.amount ?? payload.accrual.amount))),
        minutes: Math.max(1, Math.round(Number(config?.accrual?.minutes ?? payload.accrual.minutes)))
      },
      summary
    };
    currencyLoaded = true;
    if (currencyNameInput) currencyNameInput.value = currencyState.name;
    if (currencyAmountInput) currencyAmountInput.value = currencyState.accrual.amount;
    if (currencyMinutesInput) currencyMinutesInput.value = currencyState.accrual.minutes;
    updateCurrencySummary(currencyState.summary, currencyState.accrual);
    updateCommandCostLabel();
    renderCommands();
    updateCommandStatusSummary();
    setCurrencyStatus('Währungseinstellungen gespeichert.', 'ok');
    console.info('Währungseinstellungen erfolgreich persistiert.', result);
  } catch (error) {
    console.error('Währungseinstellungen konnten nicht gespeichert werden', error);
    setCurrencyStatus(`Speichern fehlgeschlagen: ${error.message}`, 'error');
  } finally {
    if (currencySaveBtn) {
      currencySaveBtn.disabled = false;
    }
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
  const cost = Math.max(0, Number.parseInt(command.cost, 10) || 0);
  return {
    names: normalizedNames,
    response,
    cooldownSeconds,
    autoIntervalSeconds,
    minUserLevel,
    responseType,
    enabled: command.enabled !== false,
    cost
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
    enabled: item.enabled !== false,
    cost: Math.max(0, Number.parseInt(item.cost, 10) || 0)
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
  if (currencyState?.name) {
    parts.push(`Währung: ${currencyState.name}`);
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
  const cost = Math.max(0, Number.parseInt(command.cost, 10) || 0);
  const currencyName = getCurrencyName();
  badges.appendChild(
    createCommandBadge(
      cost ? `Kosten: ${cost} ${currencyName}` : `Kosten: 0 ${currencyName}`,
      cost ? '' : 'muted'
    )
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
  updateCommandCostLabel();
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
        enabled: true,
        cost: 0
      };
  commandDraft = baseCommand;
  if (!USER_LEVEL_LABEL.has(commandDraft.minUserLevel)) {
    commandDraft.minUserLevel = 'everyone';
  }
  if (!RESPONSE_TYPE_LABEL.has(commandDraft.responseType)) {
    commandDraft.responseType = 'say';
  }
  const draftCostValue = Number(commandDraft.cost);
  commandDraft.cost = Number.isFinite(draftCostValue) ? Math.max(0, Math.round(draftCostValue)) : 0;
  commandModalTitle.textContent = commandModalState.isNew
    ? 'Neuen Befehl erstellen'
    : `Befehl bearbeiten · ${commandsState.prefix}${commandDraft.names[0] || ''}`;
  commandEnabledInput.checked = commandDraft.enabled !== false;
  commandResponseInput.value = commandDraft.response || '';
  commandCooldownInput.value = Number(commandDraft.cooldownSeconds || 0);
  commandAutoIntervalInput.value = Number(commandDraft.autoIntervalSeconds || 0);
  commandUserLevelSelect.value = commandDraft.minUserLevel || 'everyone';
  commandResponseTypeSelect.value = commandDraft.responseType || 'say';
  if (commandCostInput) {
    commandCostInput.value = Number(commandDraft.cost || 0);
  }
  updateCommandCostLabel();
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
  if (commandCostInput) {
    const draftInputCost = Number(commandCostInput.value);
    commandDraft.cost = Number.isFinite(draftInputCost) ? Math.max(0, Math.round(draftInputCost)) : 0;
  }

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
    console.info('Befehlskonfiguration erfolgreich geladen.', data);
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
    console.info('Befehle erfolgreich persistiert.', payload);
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
  enableCurrency(false);
  commandsLoaded = false;
  commandsState = { prefix: '!', items: [] };
  commandList.innerHTML = '';
  commandPrefixInput.value = '!';
  closeCommandModal();
  closeStream();
  messageSubmit.disabled = true;
  setCommandStatus('Befehle noch nicht geladen.');
  currencyLoaded = false;
  currencyState = null;
  if (currencyNameInput) currencyNameInput.value = '';
  if (currencyAmountInput) currencyAmountInput.value = '';
  if (currencyMinutesInput) currencyMinutesInput.value = '';
  updateCurrencySummary(null);
  updateCommandCostLabel();
  setCurrencyStatus('Bitte zuerst mit dem Backend verbinden.');
  enableOpenAi(false);
  resetOpenAiUi();
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

if (currencyForm) {
  currencyForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!apiPassword) {
      setCurrencyStatus('Bitte zuerst mit dem Backend verbinden.', 'error');
      return;
    }
    await saveCurrencySettings();
  });
}

if (openAiForm) {
  openAiForm.addEventListener('submit', async event => {
    event.preventDefault();
    await saveOpenAiSettings();
  });
}

if (openAiResetPromptBtn) {
  openAiResetPromptBtn.addEventListener('click', () => {
    if (!openAiPromptInput) return;
    openAiPromptInput.value = OPEN_AI_DEFAULT_PROMPT;
    if (apiPassword) {
      setOpenAiStatus('Standard-Prompt wiederhergestellt. Speichern nicht vergessen.');
    }
  });
}

if (openAiEnabledInput) {
  openAiEnabledInput.addEventListener('change', () => {
    if (!apiPassword) return;
    if (openAiEnabledInput.checked) {
      setOpenAiStatus('Automatik wird nach dem Speichern aktiviert.');
    } else {
      setOpenAiStatus('Automatik wird nach dem Speichern deaktiviert.');
    }
  });
}

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
enableOpenAi(false);
resetOpenAiUi();

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    return;
  }
  if (apiPassword && currentChannel && !eventSource) {
    connectChannelBtn.click();
  }
});
