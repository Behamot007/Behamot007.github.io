import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import tmi from 'tmi.js';
import crypto from 'node:crypto';

const {
  PORT = 4010,
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
  TWITCH_REDIRECT_URI,
  TWITCH_BOT_USERNAME,
  TWITCH_BOT_OAUTH_TOKEN,
  TWITCH_DEFAULT_CHANNEL,
  TWITCH_API_PASSWORD
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

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

function normalizeChannelName(channel) {
  if (!channel) return '';
  return channel.replace(/^#/, '').trim().toLowerCase();
}

const joinedChannels = new Set();
const channelContexts = new Map();
const oauthStates = new Map();
let chatClientReady = false;
const pendingBotMessages = new Map();

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

async function ensureChatClientConnected() {
  if (!TWITCH_BOT_USERNAME || !TWITCH_BOT_OAUTH_TOKEN) {
    throw new Error('Bot Zugangsdaten sind nicht vollständig gesetzt.');
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
  const client = new tmi.Client({
    options: { debug: false },
    connection: { reconnect: true, secure: true },
    identity: {
      username: TWITCH_BOT_USERNAME,
      password: TWITCH_BOT_OAUTH_TOKEN
    },
    channels: TWITCH_DEFAULT_CHANNEL
      ? [`#${normalizeChannelName(TWITCH_DEFAULT_CHANNEL)}`]
      : []
  });

  client.on('connected', (_address, _port) => {
    chatClientReady = true;
    console.log('[twitch-chat-controller] Mit Twitch verbunden.');
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
  });

  client.on('join', (channel, username, self) => {
    if (!self) return;
    const normalized = normalizeChannelName(channel);
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
    if (TWITCH_DEFAULT_CHANNEL) {
      const normalized = normalizeChannelName(TWITCH_DEFAULT_CHANNEL);
      joinedChannels.add(normalized);
    }
  });

  return client;
}

function getChatClient() {
  return ensureChatClientConnected._client;
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
  res.json({
    ready: chatClientReady,
    joinedChannels: Array.from(joinedChannels),
    defaultChannel: TWITCH_DEFAULT_CHANNEL ? normalizeChannelName(TWITCH_DEFAULT_CHANNEL) : null,
    hasBotCredentials: Boolean(TWITCH_BOT_USERNAME && TWITCH_BOT_OAUTH_TOKEN),
    oauthConfigured: Boolean(TWITCH_CLIENT_ID && TWITCH_REDIRECT_URI)
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

app.listen(PORT, () => {
  console.log(`[twitch-chat-controller] Server läuft auf Port ${PORT}`);
});
