import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import tmi from 'tmi.js';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const {
  PORT = 4010,
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
  TWITCH_REDIRECT_URI,
  TWITCH_BOT_USERNAME,
  TWITCH_BOT_OAUTH_TOKEN,
  TWITCH_DEFAULT_CHANNEL,
  TWITCH_API_PASSWORD,
  TWITCH_STATE_FILE
} = process.env;

if (!TWITCH_API_PASSWORD) {
  console.warn('[twitch-chat-controller] WARN: TWITCH_API_PASSWORD ist nicht gesetzt. Ohne Passwort wird jede Anfrage abgelehnt.');
}

if (!TWITCH_CLIENT_ID || !TWITCH_REDIRECT_URI) {
  console.warn('[twitch-chat-controller] WARN: OAuth-Konfiguration ist unvollständig. /api/twitch/oauth/* wird nicht funktionieren.');
} else if (!TWITCH_CLIENT_SECRET) {
  console.warn('[twitch-chat-controller] WARN: TWITCH_CLIENT_SECRET ist nicht gesetzt. OAuth-Flow verwendet PKCE ohne Client-Secret.');
}

if (!TWITCH_BOT_USERNAME || !TWITCH_BOT_OAUTH_TOKEN) {
  console.warn('[twitch-chat-controller] WARN: Bot-Zugangsdaten fehlen. Chat-Verbindungen können nicht aufgebaut werden.');
}

const STATE_FILE = TWITCH_STATE_FILE
  ? path.resolve(TWITCH_STATE_FILE)
  : path.resolve(process.cwd(), 'runtime-state.json');

const DEFAULT_COMMANDS = [
  {
    name: 'hallo',
    description: 'Begrüßt den Nutzer freundlich im Chat.',
    response: 'Hey {user}, willkommen im Stream! 👋',
    cooldownSeconds: 30,
    enabled: true
  },
  {
    name: 'discord',
    description: 'Teilt den Community-Discord-Link.',
    response: 'Komm auf unseren Discord-Server: https://discord.gg/deinlink',
    cooldownSeconds: 60,
    enabled: true
  },
  {
    name: 'socials',
    description: 'Verweist auf weitere Social-Media-Kanäle.',
    response: 'Folge Behamot auch auf Twitter & Instagram: https://twitter.com/deinprofil · https://instagram.com/deinprofil',
    cooldownSeconds: 120,
    enabled: true
  }
];

const runtimeState = {
  botToken: null,
  commands: {
    prefix: '!',
    items: DEFAULT_COMMANDS.map(item => ({ ...item }))
  }
};

let refreshTimeout = null;

async function ensureStateFileDir() {
  const dir = path.dirname(STATE_FILE);
  await fs.mkdir(dir, { recursive: true });
}

async function loadRuntimeState() {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (data.botToken) {
      runtimeState.botToken = {
        ...(runtimeState.botToken || {}),
        ...data.botToken
      };
    }
    if (data.commands) {
      const restoredItems = Array.isArray(data.commands.items)
        ? data.commands.items.map(entry => normalizeCommandItem(entry)).filter(Boolean)
        : [];
      runtimeState.commands = {
        ...runtimeState.commands,
        ...data.commands,
        items: restoredItems.length
          ? restoredItems
          : runtimeState.commands.items
      };
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[twitch-chat-controller] Konnte Zustand nicht laden:', error);
    }
  }
}

async function persistRuntimeState() {
  try {
    await ensureStateFileDir();
    const payload = JSON.stringify(runtimeState, null, 2);
    await fs.writeFile(STATE_FILE, payload, 'utf8');
  } catch (error) {
    console.error('[twitch-chat-controller] Zustand konnte nicht gespeichert werden:', error);
  }
}

function getStoredBotToken() {
  return runtimeState.botToken;
}

function getCommandConfiguration() {
  return runtimeState.commands || { prefix: '!', items: [] };
}

function computeExpiresAt(expiresIn) {
  if (!expiresIn || Number.isNaN(Number(expiresIn))) return null;
  const expiresMs = Date.now() + Number(expiresIn) * 1000;
  return new Date(expiresMs).toISOString();
}

function normalizeOauthToken(token) {
  if (!token) return null;
  return token.startsWith('oauth:') ? token : `oauth:${token}`;
}

function getBotPassword() {
  const token = getStoredBotToken()?.accessToken;
  if (token) {
    return normalizeOauthToken(token);
  }
  if (TWITCH_BOT_OAUTH_TOKEN) {
    return normalizeOauthToken(TWITCH_BOT_OAUTH_TOKEN);
  }
  return null;
}

function scheduleTokenRefresh() {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }
  const token = getStoredBotToken();
  if (!token?.refreshToken || !token?.expiresAt) {
    return;
  }
  if (!TWITCH_CLIENT_ID) {
    console.warn('[twitch-chat-controller] Token-Refresh nicht möglich: TWITCH_CLIENT_ID fehlt.');
    return;
  }
  if (!TWITCH_CLIENT_SECRET) {
    console.warn('[twitch-chat-controller] Token-Refresh nicht möglich: TWITCH_CLIENT_SECRET fehlt.');
    return;
  }
  const expiresAt = new Date(token.expiresAt).getTime();
  if (!Number.isFinite(expiresAt)) {
    return;
  }
  const leadTime = 2 * 60 * 1000;
  const delay = Math.max(expiresAt - Date.now() - leadTime, 5_000);
  refreshTimeout = setTimeout(() => {
    refreshBotToken().catch(error => {
      console.error('[twitch-chat-controller] Automatischer Token-Refresh fehlgeschlagen:', error);
    });
  }, delay);
  refreshTimeout.unref?.();
}

async function refreshBotToken() {
  const stored = getStoredBotToken();
  if (!stored?.refreshToken) {
    console.warn('[twitch-chat-controller] Kein Refresh-Token vorhanden.');
    return;
  }
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    console.warn('[twitch-chat-controller] Refresh-Token kann ohne Client-ID und Client-Secret nicht verwendet werden.');
    return;
  }
  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    client_secret: TWITCH_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: stored.refreshToken
  });
  const response = await axios.post('https://id.twitch.tv/oauth2/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  const data = response.data || {};
  await applyBotToken({
    accessToken: data.access_token,
    refreshToken: data.refresh_token || stored.refreshToken,
    expiresIn: data.expires_in,
    scope: data.scope
  }, { validate: false });
}

async function applyBotToken(payload, options = {}) {
  const { accessToken, refreshToken, expiresIn, scope, login } = payload;
  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error('Ungültiges Access-Token.');
  }
  runtimeState.botToken = {
    accessToken,
    refreshToken: refreshToken || runtimeState.botToken?.refreshToken || null,
    scope: scope || runtimeState.botToken?.scope || [],
    expiresAt: computeExpiresAt(expiresIn) || runtimeState.botToken?.expiresAt || null,
    obtainedAt: new Date().toISOString(),
    login: login || runtimeState.botToken?.login || null
  };
  await persistRuntimeState();
  scheduleTokenRefresh();
  if (!options.skipReconnect) {
    await restartChatClient();
  }
}

async function applyCommandConfiguration(config) {
  const prefix = typeof config?.prefix === 'string' ? config.prefix.trim() : '!';
  const normalizedPrefix = prefix.length ? prefix : '!';
  const items = Array.isArray(config?.items) ? config.items : [];
  const normalizedItems = items
    .map(item => normalizeCommandItem(item))
    .filter(Boolean);
  runtimeState.commands = {
    prefix: normalizedPrefix,
    items: normalizedItems.length ? normalizedItems : DEFAULT_COMMANDS.map(item => ({ ...item }))
  };
  await persistRuntimeState();
  resetCommandCooldowns();
}

function normalizeCommandItem(item) {
  if (!item) return null;
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  const response = typeof item.response === 'string' ? item.response.trim() : '';
  if (!name || !response) {
    return null;
  }
  const description = typeof item.description === 'string' ? item.description.trim() : '';
  const cooldownSeconds = Number.isFinite(Number(item.cooldownSeconds))
    ? Math.max(0, Number(item.cooldownSeconds))
    : 0;
  return {
    name,
    response,
    description,
    cooldownSeconds,
    enabled: item.enabled !== false
  };
}

function resetCommandCooldowns() {
  commandCooldowns.clear();
}

async function initializeRuntime() {
  await loadRuntimeState();
  scheduleTokenRefresh();
}

await initializeRuntime();

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

function normalizeChannelName(channel) {
  if (!channel) return '';
  return channel.replace(/^#/, '').trim().toLowerCase();
}

const NORMALIZED_DEFAULT_CHANNEL = normalizeChannelName(TWITCH_DEFAULT_CHANNEL);

function getDefaultChannelName() {
  return NORMALIZED_DEFAULT_CHANNEL;
}

const joinedChannels = new Set();
const channelContexts = new Map();
const oauthStates = new Map();
let chatClientReady = false;
const pendingBotMessages = new Map();
const commandCooldowns = new Map();

function addPendingBotMessage(channel, message) {
  const normalizedChannel = normalizeChannelName(channel);
  if (!normalizedChannel || !message) return;
  const entry = {
    message: message.trim(),
    addedAt: Date.now()
  };
  if (!pendingBotMessages.has(normalizedChannel)) {
    pendingBotMessages.set(normalizedChannel, [entry]);
    return;
  }
  const list = pendingBotMessages.get(normalizedChannel);
  list.push(entry);
  cleanupPendingBotMessages(normalizedChannel);
}

function consumePendingBotMessage(channel, message) {
  const normalizedChannel = normalizeChannelName(channel);
  if (!normalizedChannel || !message) return false;
  if (!pendingBotMessages.has(normalizedChannel)) return false;
  const trimmed = message.trim();
  const list = pendingBotMessages.get(normalizedChannel);
  const now = Date.now();
  for (let index = 0; index < list.length; index += 1) {
    const item = list[index];
    if (now - item.addedAt > 10_000) {
      continue;
    }
    if (item.message === trimmed) {
      list.splice(index, 1);
      if (!list.length) {
        pendingBotMessages.delete(normalizedChannel);
      }
      return true;
    }
  }
  cleanupPendingBotMessages(normalizedChannel);
  return false;
}

function cleanupPendingBotMessages(channel) {
  const normalizedChannel = normalizeChannelName(channel);
  if (!normalizedChannel || !pendingBotMessages.has(normalizedChannel)) return;
  const list = pendingBotMessages.get(normalizedChannel);
  const cutoff = Date.now() - 10_000;
  const filtered = list.filter(item => item.addedAt >= cutoff);
  if (filtered.length) {
    pendingBotMessages.set(normalizedChannel, filtered);
  } else {
    pendingBotMessages.delete(normalizedChannel);
  }
}

function toBase64Url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function createCodeVerifier() {
  return toBase64Url(crypto.randomBytes(32));
}

function createCodeChallenge(verifier) {
  return toBase64Url(crypto.createHash('sha256').update(verifier).digest());
}

function getOrCreateChannelContext(channel) {
  const normalized = normalizeChannelName(channel);
  if (!channelContexts.has(normalized)) {
    channelContexts.set(normalized, {
      channel: normalized,
      watchers: new Set(),
      backlog: [],
      lastId: 0
    });
  }
  return channelContexts.get(normalized);
}

function serializeEvent(event) {
  return `id: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`;
}

function pushBacklog(context, payload) {
  context.lastId += 1;
  const event = { id: context.lastId, ...payload };
  context.backlog.push(event);
  if (context.backlog.length > 100) {
    context.backlog.shift();
  }
  return event;
}

function broadcastToChannel(channel, payload) {
  const context = getOrCreateChannelContext(channel);
  const event = pushBacklog(context, payload);
  const serialized = serializeEvent(event);
  context.watchers.forEach(res => {
    res.write(serialized);
  });
}

function attemptDefaultChannelJoin(client, attempt = 0) {
  const defaultChannel = getDefaultChannelName();
  if (!client || !defaultChannel) {
    return;
  }

  const formatted = `#${defaultChannel}`;
  const channelList = typeof client.getChannels === 'function' ? client.getChannels() : [];
  const alreadyJoined = Array.isArray(channelList)
    ? channelList.map(ch => normalizeChannelName(ch)).includes(defaultChannel)
    : false;

  if (alreadyJoined || joinedChannels.has(defaultChannel)) {
    joinedChannels.add(defaultChannel);
    return;
  }

  client
    .join(formatted)
    .then(() => {
      joinedChannels.add(defaultChannel);
      console.log(`[twitch-chat-controller] Lausche auf Standard-Channel #${defaultChannel}.`);
    })
    .catch(error => {
      const retryDelay = Math.min(120_000, 30_000 * Math.max(1, attempt + 1));
      console.error('[twitch-chat-controller] Standard-Channel konnte nicht betreten werden:', error);
      const timer = setTimeout(() => attemptDefaultChannelJoin(client, attempt + 1), retryDelay);
      timer.unref?.();
    });
}

async function ensureChatClientConnected() {
  if (!TWITCH_BOT_USERNAME) {
    throw new Error('Bot Benutzername ist nicht gesetzt.');
  }
  if (!getBotPassword()) {
    throw new Error('Bot OAuth-Token ist nicht verfügbar.');
  }
  if (chatClientReady) return;
  if (ensureChatClientConnected._connecting) {
    return ensureChatClientConnected._connecting;
  }
  const client = createChatClient();
  ensureChatClientConnected._client = client;
  const promise = client.connect()
    .then(() => {
      chatClientReady = true;
      console.log('[twitch-chat-controller] Chat-Client verbunden.');
      return client;
    })
    .catch(error => {
      console.error('[twitch-chat-controller] Chat-Client konnte nicht verbunden werden:', error);
      throw error;
    })
    .finally(() => {
      ensureChatClientConnected._connecting = null;
    });
  ensureChatClientConnected._connecting = promise;
  return promise;
}

function createChatClient() {
  const password = getBotPassword();
  if (!password) {
    throw new Error('Bot OAuth-Token ist nicht verfügbar.');
  }
  const client = new tmi.Client({
    options: { debug: false },
    connection: { reconnect: true, secure: true },
    identity: {
      username: TWITCH_BOT_USERNAME,
      password
    },
    channels: TWITCH_DEFAULT_CHANNEL
      ? [`#${normalizeChannelName(TWITCH_DEFAULT_CHANNEL)}`]
      : []
  });

  client.on('connected', (_address, _port) => {
    chatClientReady = true;
    console.log('[twitch-chat-controller] Mit Twitch verbunden.');
    attemptDefaultChannelJoin(client);
  });

  client.on('reconnect', () => {
    console.log('[twitch-chat-controller] Versuche Twitch-Reconnect...');
  });

  client.on('disconnected', reason => {
    chatClientReady = false;
    console.warn('[twitch-chat-controller] Twitch-Verbindung getrennt:', reason);
  });

  client.on('message', (channel, tags, message, self) => {
    const normalized = normalizeChannelName(channel);
    if (self && consumePendingBotMessage(normalized, message)) {
      return;
    }
    const payload = {
      type: self ? 'self' : 'message',
      channel: normalized,
      userId: tags['user-id'] || null,
      username: tags['display-name'] || tags.username,
      message,
      color: tags.color || null,
      badges: tags.badges || null,
      timestamp: new Date().toISOString()
    };
    broadcastToChannel(normalized, payload);
    if (!self) {
      handleCommandExecution(normalized, tags, message).catch(error => {
        console.error('[twitch-chat-controller] Fehler beim Ausführen eines Befehls:', error);
      });
    }
  });

  client.on('join', (channel, username, self) => {
    if (!self) return;
    const normalized = normalizeChannelName(channel);
    joinedChannels.add(normalized);
    broadcastToChannel(normalized, {
      type: 'system',
      channel: normalized,
      message: `Bot ist dem Channel #${normalized} beigetreten.`,
      timestamp: new Date().toISOString()
    });
  });

  client.on('part', (channel, username, self) => {
    if (!self) return;
    const normalized = normalizeChannelName(channel);
    joinedChannels.delete(normalized);
    broadcastToChannel(normalized, {
      type: 'system',
      channel: normalized,
      message: `Bot hat Channel #${normalized} verlassen.`,
      timestamp: new Date().toISOString()
    });
  });

  client.on('connected', async () => {
    const defaultChannel = getDefaultChannelName();
    if (!defaultChannel) return;
    joinedChannels.add(defaultChannel);
  });

  return client;
}

function getChatClient() {
  return ensureChatClientConnected._client;
}

async function restartChatClient() {
  const client = getChatClient();
  const channelsToRejoin = new Set(joinedChannels);
  for (const key of channelContexts.keys()) {
    if (key) {
      channelsToRejoin.add(key);
    }
  }
  if (client) {
    try {
      await client.disconnect();
    } catch (error) {
      console.warn('[twitch-chat-controller] Chat-Client konnte nicht sauber getrennt werden:', error);
    }
  }
  chatClientReady = false;
  ensureChatClientConnected._client = null;
  ensureChatClientConnected._connecting = null;
  joinedChannels.clear();
  try {
    const newClient = await ensureChatClientConnected();
    for (const channel of channelsToRejoin) {
      try {
        await newClient.join(`#${channel}`);
        joinedChannels.add(channel);
        broadcastToChannel(channel, {
          type: 'system',
          channel,
          message: 'Bot-Verbindung wurde mit aktualisiertem Token neu aufgebaut.',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('[twitch-chat-controller] Channel konnte nach Tokenwechsel nicht erneut verbunden werden:', error);
        broadcastToChannel(channel, {
          type: 'system',
          channel,
          message: 'Bot konnte nach Tokenwechsel nicht erneut verbinden. Bitte manuell neu abonnieren.',
          timestamp: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error('[twitch-chat-controller] Neuaufbau nach Tokenwechsel fehlgeschlagen:', error);
  }
}

async function validateAccessToken(accessToken) {
  if (!accessToken) return null;
  try {
    const response = await axios.get('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: `OAuth ${accessToken}` }
    });
    return response.data;
  } catch (error) {
    console.warn('[twitch-chat-controller] OAuth-Token konnte nicht validiert werden:', error?.response?.data || error.message);
    return null;
  }
}

async function handleCommandExecution(channel, tags, message) {
  const config = getCommandConfiguration();
  const prefix = config.prefix || '!';
  if (!prefix || !message.startsWith(prefix)) {
    return;
  }
  const withoutPrefix = message.slice(prefix.length).trim();
  if (!withoutPrefix) {
    return;
  }
  const [commandNameRaw, ...args] = withoutPrefix.split(/\s+/);
  const commandName = commandNameRaw?.toLowerCase();
  if (!commandName) {
    return;
  }
  const command = (config.items || []).find(item => item.enabled !== false && item.name.toLowerCase() === commandName);
  if (!command) {
    return;
  }
  const cooldownKey = `${channel}::${command.name.toLowerCase()}`;
  const now = Date.now();
  const cooldownMs = (Number(command.cooldownSeconds) || 0) * 1000;
  if (cooldownMs > 0) {
    const lastExecution = commandCooldowns.get(cooldownKey) || 0;
    if (now - lastExecution < cooldownMs) {
      return;
    }
    commandCooldowns.set(cooldownKey, now);
  }
  const userDisplayName = tags['display-name'] || tags.username || 'Zuschauer';
  const rawResponse = command.response || '';
  if (!rawResponse) {
    return;
  }
  const remainder = args.join(' ');
  const replacements = new Map([
    ['{user}', userDisplayName],
    ['{channel}', channel],
    ['{message}', remainder]
  ]);
  let responseMessage = rawResponse;
  replacements.forEach((value, key) => {
    responseMessage = responseMessage.replace(new RegExp(key, 'gi'), value);
  });
  if (!responseMessage.trim()) {
    return;
  }
  await ensureChatClientConnected();
  const client = getChatClient();
  if (!client) {
    throw new Error('Chat-Client ist nicht verbunden.');
  }
  addPendingBotMessage(channel, responseMessage.trim());
  await client.say(`#${channel}`, responseMessage.trim());
  broadcastToChannel(channel, {
    type: 'outgoing',
    channel,
    username: TWITCH_BOT_USERNAME,
    message: responseMessage.trim(),
    timestamp: new Date().toISOString(),
    meta: {
      triggeredBy: userDisplayName,
      command: command.name
    }
  });
}

function getPasswordFromRequest(req) {
  const header = req.get('x-api-password');
  if (header) return header;
  const auth = req.get('authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7);
  }
  if (req.query && (req.query.apiPassword || req.query.password)) {
    return req.query.apiPassword || req.query.password;
  }
  if (req.body && typeof req.body === 'object') {
    if (req.body.apiPassword) return req.body.apiPassword;
    if (req.body.password) return req.body.password;
  }
  return null;
}

function isPublicRoute(req) {
  return req.path === '/api/twitch/oauth/callback';
}

app.use((req, res, next) => {
  if (isPublicRoute(req)) {
    return next();
  }
  if (!TWITCH_API_PASSWORD) {
    return res.status(500).json({ error: 'API-Passwort ist im Backend nicht konfiguriert.' });
  }
  const provided = getPasswordFromRequest(req);
  if (provided !== TWITCH_API_PASSWORD) {
    return res.status(401).json({ error: 'Ungültiges API-Passwort.' });
  }
  return next();
});

app.get('/api/twitch/status', (_req, res) => {
  const token = getStoredBotToken();
  const commands = getCommandConfiguration();
  res.json({
    ready: chatClientReady,
    joinedChannels: Array.from(joinedChannels),
    defaultChannel: TWITCH_DEFAULT_CHANNEL ? normalizeChannelName(TWITCH_DEFAULT_CHANNEL) : null,
    hasBotCredentials: Boolean(TWITCH_BOT_USERNAME && getBotPassword()),
    oauthConfigured: Boolean(TWITCH_CLIENT_ID && TWITCH_REDIRECT_URI),
    botToken: token
      ? {
          login: token.login || null,
          expiresAt: token.expiresAt || null,
          obtainedAt: token.obtainedAt || null,
          hasRefresh: Boolean(token.refreshToken)
        }
      : null,
    commands: {
      prefix: commands.prefix,
      total: Array.isArray(commands.items) ? commands.items.length : 0
    }
  });
});

app.get('/api/twitch/config', (_req, res) => {
  res.json({
    defaultChannel: TWITCH_DEFAULT_CHANNEL ? normalizeChannelName(TWITCH_DEFAULT_CHANNEL) : '',
    redirectUri: TWITCH_REDIRECT_URI || '',
    clientId: TWITCH_CLIENT_ID || '',
    scopes: ['chat:read', 'chat:edit', 'channel:moderate']
  });
});

app.get('/api/twitch/commands', (_req, res) => {
  const config = getCommandConfiguration();
  res.json({
    prefix: config.prefix,
    items: config.items
  });
});

app.put('/api/twitch/commands', async (req, res) => {
  try {
    await applyCommandConfiguration(req.body || {});
    res.json({ success: true });
  } catch (error) {
    console.error('[twitch-chat-controller] Befehle konnten nicht aktualisiert werden:', error);
    res.status(400).json({ error: error.message || 'Befehle konnten nicht gespeichert werden.' });
  }
});

app.get('/api/twitch/chat/stream', async (req, res) => {
  const channel = normalizeChannelName(req.query.channel);
  if (!channel) {
    return res.status(400).json({ error: 'Parameter "channel" fehlt.' });
  }
  try {
    await ensureChatClientConnected();
  } catch (error) {
    return res.status(500).json({ error: 'Twitch-Client konnte nicht verbunden werden.', details: error.message });
  }
  const client = getChatClient();
  if (!joinedChannels.has(channel)) {
    try {
      await client.join(`#${channel}`);
      joinedChannels.add(channel);
    } catch (error) {
      return res.status(500).json({ error: `Channel #${channel} konnte nicht betreten werden.`, details: error.message });
    }
  }
  const context = getOrCreateChannelContext(channel);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders?.();
  res.write('\n');

  context.watchers.add(res);
  const heartbeat = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(heartbeat);
      context.watchers.delete(res);
      return;
    }
    res.write(': ping\n\n');
  }, 30_000);
  heartbeat.unref?.();

  context.backlog.forEach(event => {
    res.write(serializeEvent(event));
  });

  req.on('close', () => {
    context.watchers.delete(res);
    clearInterval(heartbeat);
  });
});

app.get('/api/twitch/chat/history', (req, res) => {
  const channel = normalizeChannelName(req.query.channel);
  if (!channel) {
    return res.status(400).json({ error: 'Parameter "channel" fehlt.' });
  }
  const context = getOrCreateChannelContext(channel);
  res.json({ messages: context.backlog.slice(-50) });
});

app.post('/api/twitch/chat/send', async (req, res) => {
  const channel = normalizeChannelName(req.body?.channel || TWITCH_DEFAULT_CHANNEL);
  const message = req.body?.message;
  if (!channel) {
    return res.status(400).json({ error: 'Channel fehlt in der Anfrage.' });
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Nachricht ist leer.' });
  }
  try {
    await ensureChatClientConnected();
    const client = getChatClient();
    if (!joinedChannels.has(channel)) {
      await client.join(`#${channel}`);
      joinedChannels.add(channel);
    }
    addPendingBotMessage(channel, message.trim());
    await client.say(`#${channel}`, message.trim());
    broadcastToChannel(channel, {
      type: 'outgoing',
      channel,
      username: TWITCH_BOT_USERNAME,
      message: message.trim(),
      timestamp: new Date().toISOString()
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[twitch-chat-controller] Nachricht konnte nicht gesendet werden:', error);
    res.status(500).json({ error: 'Nachricht konnte nicht gesendet werden.', details: error.message });
  }
});

app.get('/api/twitch/oauth/authorize', (req, res) => {
  if (!TWITCH_CLIENT_ID || !TWITCH_REDIRECT_URI) {
    return res.status(500).json({ error: 'OAuth ist nicht vollständig konfiguriert.' });
  }
  const scopes = Array.isArray(req.query.scope)
    ? req.query.scope
    : (typeof req.query.scope === 'string' ? req.query.scope.split(',').map(s => s.trim()).filter(Boolean) : ['chat:read', 'chat:edit']);
  const state = crypto.randomBytes(24).toString('hex');
  const usePkce = !TWITCH_CLIENT_SECRET;
  let codeVerifier = null;
  if (usePkce) {
    codeVerifier = createCodeVerifier();
  }
  oauthStates.set(state, { createdAt: Date.now(), scopes, codeVerifier, usePkce });
  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    redirect_uri: TWITCH_REDIRECT_URI,
    response_type: 'code',
    scope: scopes.join(' '),
    state
  });
  if (usePkce && codeVerifier) {
    params.set('code_challenge', createCodeChallenge(codeVerifier));
    params.set('code_challenge_method', 'S256');
  }
  res.json({
    url: `https://id.twitch.tv/oauth2/authorize?${params.toString()}`,
    state,
    scopes,
    pkce: usePkce
  });
});

app.get('/api/twitch/oauth/callback', async (req, res) => {
  const { state, code, error, error_description: errorDescription } = req.query;
  if (error) {
    return renderOauthResult(res, { error, errorDescription });
  }
  if (!state || !code) {
    return renderOauthResult(res, { error: 'invalid_request', errorDescription: 'Parameter state oder code fehlt.' });
  }
  const entry = oauthStates.get(state);
  if (!entry) {
    return renderOauthResult(res, { error: 'invalid_state', errorDescription: 'State ist unbekannt oder abgelaufen.' });
  }
  oauthStates.delete(state);
  if (!TWITCH_CLIENT_ID || !TWITCH_REDIRECT_URI) {
    return renderOauthResult(res, { error: 'server_error', errorDescription: 'OAuth ist serverseitig nicht vollständig konfiguriert.' });
  }
  try {
    const params = new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      code,
      grant_type: 'authorization_code',
      redirect_uri: TWITCH_REDIRECT_URI
    });
    if (TWITCH_CLIENT_SECRET) {
      params.set('client_secret', TWITCH_CLIENT_SECRET);
    } else if (entry.codeVerifier) {
      params.set('code_verifier', entry.codeVerifier);
    } else {
      return renderOauthResult(res, { error: 'invalid_request', errorDescription: 'PKCE-Code-Verifier fehlt.' });
    }
    const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return renderOauthResult(res, {
      accessToken: tokenResponse.data?.access_token,
      refreshToken: tokenResponse.data?.refresh_token,
      scope: tokenResponse.data?.scope || entry.scopes,
      expiresIn: tokenResponse.data?.expires_in
    });
  } catch (err) {
    console.error('[twitch-chat-controller] OAuth-Token konnte nicht geholt werden:', err?.response?.data || err);
    const errorPayload = err?.response?.data || {};
    const errorCode = errorPayload.error || errorPayload.status || 'token_error';
    const description =
      errorPayload.error_description ||
      errorPayload.message ||
      err.message;

    return renderOauthResult(res, {
      error: errorCode,
      errorDescription: description,
      details: errorPayload
    });
  }
});

app.post('/api/twitch/oauth/apply', async (req, res) => {
  try {
    const { accessToken, refreshToken, expiresIn, scope } = req.body || {};
    if (!accessToken || typeof accessToken !== 'string') {
      return res.status(400).json({ error: 'Access-Token fehlt oder ist ungültig.' });
    }
    const validation = await validateAccessToken(accessToken);
    await applyBotToken(
      {
        accessToken,
        refreshToken: typeof refreshToken === 'string' && refreshToken ? refreshToken : null,
        expiresIn: Number(expiresIn) || null,
        scope: scope,
        login: validation?.login || null
      },
      { skipReconnect: false }
    );
    res.json({
      success: true,
      login: validation?.login || null,
      expiresAt: runtimeState.botToken?.expiresAt || null,
      hasRefresh: Boolean(runtimeState.botToken?.refreshToken)
    });
  } catch (error) {
    console.error('[twitch-chat-controller] OAuth-Token konnte nicht übernommen werden:', error);
    const message = error?.response?.data?.message || error.message || 'Token konnte nicht gespeichert werden.';
    res.status(500).json({ error: message });
  }
});

function renderOauthResult(res, payload) {
  const data = JSON.stringify(payload);
  const html = `<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <title>Twitch OAuth Ergebnis</title>
    <style>
      body { font-family: system-ui, sans-serif; background: #0f0f0f; color: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; }
      main { background: rgba(255,255,255,0.05); border-radius: 16px; padding: 2rem; max-width: 480px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.35); }
      h1 { margin-top: 0; font-size: 1.5rem; }
      pre { background: rgba(0,0,0,0.35); padding: 1rem; border-radius: 12px; overflow: auto; font-size: 0.85rem; }
      button { margin-top: 1.5rem; padding: 0.75rem 1.5rem; border-radius: 999px; border: none; background: #9146ff; color: #fff; font-size: 1rem; cursor: pointer; }
      button:hover { background: #772ce8; }
    </style>
  </head>
  <body>
    <main>
      <h1>OAuth Ergebnis</h1>
      <p>Das Fenster kann geschlossen werden. Die Daten wurden an die ursprüngliche Seite gesendet.</p>
      <pre>${data.replace(/</g, '&lt;')}</pre>
      <button onclick="window.close()">Fenster schließen</button>
    </main>
    <script>
      (function() {
        const payload = ${data};
        if (window.opener) {
          window.opener.postMessage({ type: 'twitch-oauth', payload }, '*');
        }
      })();
    </script>
  </body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
}

setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [state, entry] of oauthStates.entries()) {
    if (entry.createdAt < cutoff) {
      oauthStates.delete(state);
    }
  }
}, 60 * 1000).unref?.();

async function ensurePersistentDefaultChannelConnection() {
  const defaultChannel = getDefaultChannelName();
  if (!defaultChannel) {
    return;
  }

  const attemptConnection = async () => {
    const scheduleRetry = () => {
      const retryDelay = 30_000;
      const timer = setTimeout(attemptConnection, retryDelay);
      timer.unref?.();
    };

    try {
      if (!TWITCH_BOT_USERNAME || !getBotPassword()) {
        console.warn('[twitch-chat-controller] Standard-Channel kann nicht verbunden werden: Bot-Zugangsdaten fehlen.');
        scheduleRetry();
        return;
      }
      await ensureChatClientConnected();
      attemptDefaultChannelJoin(getChatClient());
    } catch (error) {
      console.error('[twitch-chat-controller] Standard-Channel konnte nicht dauerhaft verbunden werden:', error);
      scheduleRetry();
    }
  };

  attemptConnection();
}

app.listen(PORT, () => {
  console.log(`[twitch-chat-controller] Server läuft auf Port ${PORT}`);
});

ensurePersistentDefaultChannelConnection();
