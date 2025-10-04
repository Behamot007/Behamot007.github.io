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
  TWITCH_STATE_FILE,
  OPENAI_API_KEY,
  OPENAI_DEFAULT_MODEL
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

const USER_LEVELS = [
  { id: 'everyone', label: 'Jeder' },
  { id: 'subscriber', label: 'Abonnenten' },
  { id: 'regular', label: 'Stammgast' },
  { id: 'vip', label: 'VIP' },
  { id: 'moderator', label: 'Moderator' },
  { id: 'super-moderator', label: 'Super-Moderator' },
  { id: 'broadcaster', label: 'Broadcaster' }
];

const RESPONSE_TYPES = ['say', 'mention', 'reply', 'whisper'];

const USER_LEVEL_ORDER = new Map(USER_LEVELS.map((entry, index) => [entry.id, index]));

const DEFAULT_COMMANDS = [
  {
    names: ['hallo'],
    response: 'Hey {user}, willkommen im Stream! 👋',
    cooldownSeconds: 30,
    autoIntervalSeconds: 0,
    minUserLevel: 'everyone',
    responseType: 'say',
    enabled: true,
    cost: 0
  },
  {
    names: ['discord'],
    response: 'Komm auf unseren Discord-Server: https://discord.gg/deinlink',
    cooldownSeconds: 60,
    autoIntervalSeconds: 0,
    minUserLevel: 'everyone',
    responseType: 'say',
    enabled: true,
    cost: 0
  },
  {
    names: ['socials'],
    response:
      'Folge Behamot auch auf Twitter & Instagram: https://twitter.com/deinprofil · https://instagram.com/deinprofil',
    cooldownSeconds: 120,
    autoIntervalSeconds: 0,
    minUserLevel: 'everyone',
    responseType: 'say',
    enabled: true,
    cost: 0
  }
];

const DEFAULT_CURRENCY_CONFIG = {
  name: 'Stream-Coins',
  accrual: {
    amount: 10,
    minutes: 5
  }
};

const DEFAULT_OPENAI_SYSTEM_PROMPT =
  'Du bist ein Twitch Zuschauer und schaust den Stream von Behamot. Verhalte dich wie ein Standard Twitch Zuschauer. Gebe eine kurze prägnante Nachricht. Gehe potentiell auf vorherige Nachrichten oder die aktuelle Szene des Streams ein. Behamot hat folgende Emojis: Behamot1Hi Nutze die Emojis sporadisch aber nicht zwingend.';
const DEFAULT_OPENAI_INTERVAL_SECONDS = 90;
const MIN_OPENAI_INTERVAL_SECONDS = 30;
const MAX_OPENAI_INTERVAL_SECONDS = 3600;
const TWITCH_PREVIEW_WIDTH = 640;
const TWITCH_PREVIEW_HEIGHT = 360;

const NUMBER_FORMATTER = new Intl.NumberFormat('de-DE');

function createDefaultOpenAiConfig() {
  return {
    enabled: false,
    intervalSeconds: DEFAULT_OPENAI_INTERVAL_SECONDS,
    systemPrompt: DEFAULT_OPENAI_SYSTEM_PROMPT,
    channel: ''
  };
}

const runtimeState = {
  botToken: null,
  commands: {
    prefix: '!',
    items: DEFAULT_COMMANDS.map(item => ({ ...item }))
  },
  currency: createDefaultCurrencyState(),
  openAiCompanion: createDefaultOpenAiConfig()
};

const openAiRuntime = {
  timer: null,
  running: false,
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  lastMessage: null,
  lastChannel: null,
  lastScreenshotBytes: 0,
  lastScreenshotAt: null,
  usage: null,
  consecutiveErrors: 0,
  nextRunAt: null,
  intervalSeconds: DEFAULT_OPENAI_INTERVAL_SECONDS
};

function createDefaultCurrencyState() {
  return {
    name: DEFAULT_CURRENCY_CONFIG.name,
    accrual: {
      amount: DEFAULT_CURRENCY_CONFIG.accrual.amount,
      minutes: DEFAULT_CURRENCY_CONFIG.accrual.minutes
    },
    balances: {}
  };
}

function normalizeCurrencyState(state = {}) {
  const base = createDefaultCurrencyState();
  const name = typeof state.name === 'string' && state.name.trim() ? state.name.trim() : base.name;
  const amountSource = state.accrual?.amount ?? state.amount;
  const minutesSource = state.accrual?.minutes ?? state.minutes;
  const amountValue = Number(amountSource);
  const minutesValue = Number(minutesSource);
  const amount = Number.isFinite(amountValue) ? Math.max(0, Math.round(amountValue)) : base.accrual.amount;
  const minutes = Number.isFinite(minutesValue) ? Math.max(1, Math.round(minutesValue)) : base.accrual.minutes;
  const balances = {};
  if (state.balances && typeof state.balances === 'object') {
    Object.entries(state.balances).forEach(([channelKey, entries]) => {
      const normalizedChannel = normalizeChannelName(channelKey);
      if (!normalizedChannel) {
        return;
      }
      if (!balances[normalizedChannel]) {
        balances[normalizedChannel] = {};
      }
      if (!entries || typeof entries !== 'object') {
        return;
      }
      Object.entries(entries).forEach(([userKey, entry]) => {
        if (!userKey) {
          return;
        }
        const source = entry && typeof entry === 'object' ? entry : { balance: entry };
        const balanceValue = Number(source.balance);
        if (!Number.isFinite(balanceValue) || balanceValue < 0) {
          return;
        }
        balances[normalizedChannel][userKey] = {
          balance: Math.max(0, Math.round(balanceValue)),
          userId: source.userId ? String(source.userId) : null,
          username: source.username ? String(source.username).toLowerCase() : null,
          displayName: source.displayName ? String(source.displayName) : null,
          updatedAt: source.updatedAt ? String(source.updatedAt) : null
        };
      });
    });
  }
  return {
    name,
    accrual: {
      amount,
      minutes
    },
    balances
  };
}

function getCurrencyConfiguration() {
  runtimeState.currency = normalizeCurrencyState(runtimeState.currency);
  return runtimeState.currency;
}

function serializeCurrencyConfig(config = getCurrencyConfiguration()) {
  return {
    name: config.name,
    accrual: {
      amount: config.accrual.amount,
      minutes: config.accrual.minutes
    }
  };
}

function getCurrencySummary() {
  const config = getCurrencyConfiguration();
  let totalUsers = 0;
  let totalBalance = 0;
  Object.values(config.balances || {}).forEach(channelBalances => {
    if (!channelBalances || typeof channelBalances !== 'object') {
      return;
    }
    Object.values(channelBalances).forEach(entry => {
      const value = Number(entry?.balance ?? 0);
      if (!Number.isFinite(value) || value < 0) {
        return;
      }
      totalUsers += 1;
      totalBalance += value;
    });
  });
  return {
    totalUsers,
    totalBalance: Math.max(0, Math.round(totalBalance))
  };
}

function ensureCurrencyChannelStore(channel) {
  const normalized = normalizeChannelName(channel);
  if (!normalized) {
    return null;
  }
  const config = getCurrencyConfiguration();
  if (!config.balances || typeof config.balances !== 'object') {
    config.balances = {};
  }
  if (!config.balances[normalized]) {
    config.balances[normalized] = {};
  }
  return config.balances[normalized];
}

function getCurrencyIdentity(tags) {
  if (!tags) {
    return null;
  }
  const userId = tags['user-id'] ? String(tags['user-id']) : null;
  const username = typeof tags.username === 'string' ? tags.username.toLowerCase() : null;
  const displayName = tags['display-name'] || tags.username || null;
  if (userId) {
    return { key: `id:${userId}`, userId, username, displayName };
  }
  if (username) {
    return { key: `name:${username}`, userId: null, username, displayName };
  }
  return null;
}

function getCurrencyBalance(channel, identityOrKey) {
  const store = ensureCurrencyChannelStore(channel);
  if (!store) {
    return 0;
  }
  const key = typeof identityOrKey === 'string' ? identityOrKey : identityOrKey?.key;
  if (!key) {
    return 0;
  }
  const entry = store[key];
  const value = Number(entry?.balance ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

async function addCurrencyBalance(channel, identity, amount) {
  if (!identity || !Number.isFinite(Number(amount)) || amount <= 0) {
    return getCurrencyBalance(channel, identity);
  }
  const store = ensureCurrencyChannelStore(channel);
  if (!store) {
    return 0;
  }
  const key = identity.key;
  const existing =
    store[key] && typeof store[key] === 'object'
      ? { ...store[key] }
      : {
          balance: 0,
          userId: null,
          username: null,
          displayName: null,
          updatedAt: null
        };
  const currentBalance = Number(existing.balance) || 0;
  existing.balance = Math.max(0, Math.round(currentBalance + amount));
  existing.userId = identity.userId || existing.userId || null;
  existing.username = identity.username || existing.username || null;
  existing.displayName = identity.displayName || existing.displayName || null;
  existing.updatedAt = new Date().toISOString();
  store[key] = existing;
  await persistRuntimeState();
  return existing.balance;
}

async function spendCurrencyBalance(channel, identity, amount) {
  if (!identity || !Number.isFinite(Number(amount)) || amount <= 0) {
    return getCurrencyBalance(channel, identity);
  }
  const store = ensureCurrencyChannelStore(channel);
  if (!store) {
    throw new Error('Währungsspeicher nicht verfügbar.');
  }
  const key = identity.key;
  const existing =
    store[key] && typeof store[key] === 'object'
      ? { ...store[key] }
      : {
          balance: 0,
          userId: null,
          username: null,
          displayName: null,
          updatedAt: null
        };
  const currentBalance = Number(existing.balance) || 0;
  if (currentBalance < amount) {
    const error = new Error('Nicht genügend Guthaben.');
    error.code = 'INSUFFICIENT_FUNDS';
    throw error;
  }
  existing.balance = Math.max(0, Math.round(currentBalance - amount));
  existing.userId = identity.userId || existing.userId || null;
  existing.username = identity.username || existing.username || null;
  existing.displayName = identity.displayName || existing.displayName || null;
  existing.updatedAt = new Date().toISOString();
  store[key] = existing;
  await persistRuntimeState();
  return existing.balance;
}

async function applyCurrencyConfiguration(update) {
  const current = getCurrencyConfiguration();
  const nextName = typeof update?.name === 'string' && update.name.trim() ? update.name.trim() : current.name;
  const amountSource = update?.accrual?.amount ?? update?.amount;
  const minutesSource = update?.accrual?.minutes ?? update?.minutes;
  const amountValue = Number(amountSource);
  const minutesValue = Number(minutesSource);
  const amount = Number.isFinite(amountValue) ? Math.max(0, Math.round(amountValue)) : current.accrual.amount;
  const minutes = Number.isFinite(minutesValue) ? Math.max(1, Math.round(minutesValue)) : current.accrual.minutes;
  runtimeState.currency = normalizeCurrencyState({
    ...current,
    name: nextName,
    accrual: { amount, minutes }
  });
  await persistRuntimeState();
  currencyActivity.clear();
  return serializeCurrencyConfig(runtimeState.currency);
}

function normalizeOpenAiConfig(config = {}) {
  const base = createDefaultOpenAiConfig();
  const enabled = config.enabled === true || config.enabled === 'true';
  const intervalSource = config.intervalSeconds ?? config.interval ?? base.intervalSeconds;
  const intervalValue = Number(intervalSource);
  const intervalSeconds = Number.isFinite(intervalValue)
    ? Math.min(
        MAX_OPENAI_INTERVAL_SECONDS,
        Math.max(MIN_OPENAI_INTERVAL_SECONDS, Math.round(intervalValue))
      )
    : base.intervalSeconds;
  const prompt =
    typeof config.systemPrompt === 'string' && config.systemPrompt.trim()
      ? config.systemPrompt.trim()
      : base.systemPrompt;
  const channel = typeof config.channel === 'string' ? config.channel.trim() : '';
  return {
    enabled,
    intervalSeconds,
    systemPrompt: prompt,
    channel
  };
}

function getOpenAiConfiguration() {
  runtimeState.openAiCompanion = normalizeOpenAiConfig(runtimeState.openAiCompanion);
  return runtimeState.openAiCompanion;
}

function serializeOpenAiConfig(config = getOpenAiConfiguration()) {
  return {
    enabled: Boolean(config.enabled),
    intervalSeconds: Number.isFinite(Number(config.intervalSeconds))
      ? Number(config.intervalSeconds)
      : DEFAULT_OPENAI_INTERVAL_SECONDS,
    systemPrompt: config.systemPrompt || DEFAULT_OPENAI_SYSTEM_PROMPT,
    channel: typeof config.channel === 'string' ? config.channel : ''
  };
}

function getOpenAiTargetChannel(config = getOpenAiConfiguration()) {
  const normalized = normalizeChannelName(config.channel);
  if (normalized) {
    return normalized;
  }
  return getDefaultChannelName();
}

async function applyOpenAiConfiguration(update) {
  const current = getOpenAiConfiguration();
  const merged = {
    ...current,
    ...(update || {})
  };
  const normalized = normalizeOpenAiConfig(merged);
  runtimeState.openAiCompanion = normalized;
  await persistRuntimeState();
  restartOpenAiScheduler();
  return normalized;
}

function getOpenAiRuntimeInfo() {
  const config = getOpenAiConfiguration();
  return {
    hasApiKey: Boolean(OPENAI_API_KEY),
    running: openAiRuntime.running,
    lastRunAt: openAiRuntime.lastRunAt,
    lastSuccessAt: openAiRuntime.lastSuccessAt,
    lastError: openAiRuntime.lastError,
    lastMessage: openAiRuntime.lastMessage,
    lastChannel: openAiRuntime.lastChannel,
    lastScreenshotBytes: openAiRuntime.lastScreenshotBytes,
    lastScreenshotAt: openAiRuntime.lastScreenshotAt,
    usage: openAiRuntime.usage,
    consecutiveErrors: openAiRuntime.consecutiveErrors,
    nextRunAt: openAiRuntime.nextRunAt,
    intervalSeconds: config.intervalSeconds,
    targetChannel: getOpenAiTargetChannel(config)
  };
}

function clearOpenAiTimer() {
  if (openAiRuntime.timer) {
    clearTimeout(openAiRuntime.timer);
    openAiRuntime.timer = null;
  }
  openAiRuntime.nextRunAt = null;
}

function scheduleOpenAiTimer(delayMs) {
  clearOpenAiTimer();
  const config = getOpenAiConfiguration();
  if (!config.enabled) {
    return;
  }
  const targetChannel = getOpenAiTargetChannel(config);
  if (!targetChannel) {
    openAiRuntime.lastError = {
      message: 'Kein Ziel-Channel für den OpenAI-Zuschauer konfiguriert.',
      occurredAt: new Date().toISOString()
    };
    return;
  }
  const intervalMs = Math.max(MIN_OPENAI_INTERVAL_SECONDS * 1000, Math.round(config.intervalSeconds * 1000));
  const baseDelay = Number.isFinite(Number(delayMs)) && delayMs > 0 ? Number(delayMs) : intervalMs;
  const errorMultiplier = openAiRuntime.consecutiveErrors > 0 ? Math.min(4, openAiRuntime.consecutiveErrors + 1) : 1;
  const delay = Math.min(baseDelay * errorMultiplier, MAX_OPENAI_INTERVAL_SECONDS * 1000);
  openAiRuntime.nextRunAt = new Date(Date.now() + delay).toISOString();
  openAiRuntime.lastChannel = targetChannel;
  openAiRuntime.intervalSeconds = config.intervalSeconds;
  openAiRuntime.timer = setTimeout(() => {
    openAiRuntime.timer = null;
    runOpenAiCompanionCycle('timer')
      .catch(error => {
        console.error('[twitch-chat-controller] OpenAI-Zuschauerlauf fehlgeschlagen:', error);
      })
      .finally(() => {
        const latest = getOpenAiConfiguration();
        if (latest.enabled) {
          scheduleOpenAiTimer();
        } else {
          openAiRuntime.nextRunAt = null;
        }
      });
  }, delay);
  openAiRuntime.timer.unref?.();
}

function restartOpenAiScheduler() {
  clearOpenAiTimer();
  const config = getOpenAiConfiguration();
  if (!config.enabled) {
    return;
  }
  if (!OPENAI_API_KEY) {
    openAiRuntime.lastError = {
      message: 'OPENAI_API_KEY ist nicht gesetzt.',
      occurredAt: new Date().toISOString()
    };
    return;
  }
  const targetChannel = getOpenAiTargetChannel(config);
  if (!targetChannel) {
    openAiRuntime.lastError = {
      message: 'Kein Ziel-Channel für den OpenAI-Zuschauer konfiguriert.',
      occurredAt: new Date().toISOString()
    };
    return;
  }
  openAiRuntime.consecutiveErrors = 0;
  scheduleOpenAiTimer(Math.min(config.intervalSeconds * 1000, 5_000));
}

async function fetchTwitchScreenshot(channel) {
  const normalized = normalizeChannelName(channel);
  if (!normalized) {
    throw new Error('Kein Channel für Screenshot angegeben.');
  }
  const cacheBust = Date.now();
  const url = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${normalized}-${TWITCH_PREVIEW_WIDTH}x${TWITCH_PREVIEW_HEIGHT}.jpg?${cacheBust}`;
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10_000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; BehamotTwitchBot/1.0; +https://www.behamot.de)',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
      }
    });
    const buffer = Buffer.from(response.data);
    if (!buffer.length) {
      throw new Error('Screenshot war leer.');
    }
    const contentType = response.headers['content-type'] || 'image/jpeg';
    return {
      dataUrl: `data:${contentType};base64,${buffer.toString('base64')}`,
      bytes: buffer.length,
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    const status = error?.response?.status || error.status;
    const message =
      status === 404
        ? 'Stream-Vorschau nicht verfügbar (Stream eventuell offline).'
        : error?.message || 'Screenshot konnte nicht geladen werden.';
    const err = new Error(message);
    if (status) {
      err.status = status;
    }
    throw err;
  }
}

function buildChatTranscript(channel, limit = 12) {
  const context = getOrCreateChannelContext(channel);
  if (!context || !Array.isArray(context.backlog)) {
    return [];
  }
  const relevantTypes = new Set(['message', 'self', 'outgoing']);
  return context.backlog
    .filter(entry => relevantTypes.has(entry.type) && typeof entry.message === 'string' && entry.message.trim())
    .slice(-limit)
    .map(entry => {
      const username =
        entry.username ||
        entry.userId ||
        (entry.type === 'outgoing' ? TWITCH_BOT_USERNAME || 'Bot' : 'Unbekannt');
      return `${username}: ${entry.message}`;
    });
}

function extractAssistantMessage(message) {
  if (!message) {
    return '';
  }
  const content = message.content;
  if (typeof content === 'string') {
    return content.trim();
  }
  if (Array.isArray(content)) {
    const parts = content
      .map(part => {
        if (!part) return '';
        if (typeof part.text === 'string') {
          return part.text;
        }
        if (typeof part.value === 'string') {
          return part.value;
        }
        if (part?.type === 'output_text' && typeof part?.text === 'string') {
          return part.text;
        }
        return '';
      })
      .filter(Boolean);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }
  return '';
}

async function requestOpenAiViewerResponse({ systemPrompt, instruction, screenshotDataUrl }) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY ist nicht gesetzt.');
  }
  const model = OPENAI_DEFAULT_MODEL || 'gpt-4o-mini';
  const userContent = [{ type: 'text', text: instruction }];
  if (screenshotDataUrl) {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: screenshotDataUrl,
        detail: 'low'
      }
    });
  }
  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content: [{ type: 'text', text: systemPrompt }]
      },
      {
        role: 'user',
        content: userContent
      }
    ],
    temperature: 0.9,
    max_tokens: 200
  };

  const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    timeout: 30_000
  });

  const choice = response.data?.choices?.[0];
  const messageText = extractAssistantMessage(choice?.message);
  const usage = response.data?.usage
    ? {
        promptTokens: response.data.usage.prompt_tokens ?? null,
        completionTokens: response.data.usage.completion_tokens ?? null,
        totalTokens: response.data.usage.total_tokens ?? null
      }
    : null;

  return {
    message: messageText,
    usage,
    id: response.data?.id || null
  };
}

async function runOpenAiCompanionCycle(reason = 'timer') {
  const config = getOpenAiConfiguration();
  if (!config.enabled) {
    return;
  }
  if (openAiRuntime.running) {
    return;
  }
  if (!OPENAI_API_KEY) {
    openAiRuntime.lastError = {
      message: 'OPENAI_API_KEY ist nicht gesetzt.',
      occurredAt: new Date().toISOString()
    };
    return;
  }

  const channel = getOpenAiTargetChannel(config);
  if (!channel) {
    openAiRuntime.lastError = {
      message: 'Kein Ziel-Channel für den OpenAI-Zuschauer konfiguriert.',
      occurredAt: new Date().toISOString()
    };
    return;
  }

  openAiRuntime.running = true;
  openAiRuntime.lastRunAt = new Date().toISOString();
  openAiRuntime.lastChannel = channel;
  openAiRuntime.intervalSeconds = config.intervalSeconds;

  try {
    await ensureChatClientConnected();
    const client = getChatClient();
    if (!client) {
      throw new Error('Chat-Client ist nicht verbunden.');
    }
    if (!joinedChannels.has(channel)) {
      await client.join(`#${channel}`);
      joinedChannels.add(channel);
    }

    const screenshot = await fetchTwitchScreenshot(channel);
    openAiRuntime.lastScreenshotBytes = screenshot.bytes;
    openAiRuntime.lastScreenshotAt = screenshot.fetchedAt;

    const transcriptLines = buildChatTranscript(channel, 12);
    const transcript = transcriptLines.length
      ? `Letzte Chatnachrichten (neueste zuletzt):\n${transcriptLines.join('\n')}`
      : 'Der Chat war zuletzt ruhig. Erzeuge eine neue Nachricht, die zur aktuellen Szene passt.';
    const instruction = `${transcript}\n\nFormuliere eine einzige Twitch-Chat-Nachricht auf Deutsch (max. 220 Zeichen). Greife, wenn möglich, die Szene aus dem Screenshot auf und bleibe locker.`;

    const result = await requestOpenAiViewerResponse({
      systemPrompt: config.systemPrompt || DEFAULT_OPENAI_SYSTEM_PROMPT,
      instruction,
      screenshotDataUrl: screenshot.dataUrl
    });

    const assistantMessage = (result.message || '').replace(/\s+/g, ' ').trim();
    if (!assistantMessage) {
      throw new Error('Die OpenAI-Antwort war leer.');
    }

    const truncatedMessage = assistantMessage.length > 280 ? `${assistantMessage.slice(0, 277)}…` : assistantMessage;

    const sentAt = new Date().toISOString();
    await sendChatMessage(channel, truncatedMessage, {
      source: 'openai-viewer',
      sentAt,
      intervalSeconds: config.intervalSeconds,
      targetChannel: channel,
      promptTokens: result.usage?.promptTokens ?? null,
      completionTokens: result.usage?.completionTokens ?? null,
      reason
    });

    openAiRuntime.lastMessage = truncatedMessage;
    openAiRuntime.lastSuccessAt = sentAt;
    openAiRuntime.usage = result.usage || null;
    openAiRuntime.lastError = null;
    openAiRuntime.consecutiveErrors = 0;
  } catch (error) {
    const status = error?.status || error?.response?.status || null;
    const message = error?.message || 'OpenAI-Automatik fehlgeschlagen.';
    const errorEntry = {
      message,
      occurredAt: new Date().toISOString()
    };
    if (status) {
      errorEntry.status = status;
    }
    const detailsSource = error?.response?.data?.error || error?.response?.data || error?.details;
    if (detailsSource && typeof detailsSource === 'object') {
      const details = {};
      if (detailsSource.message) details.message = detailsSource.message;
      if (detailsSource.code) details.code = detailsSource.code;
      if (detailsSource.type) details.type = detailsSource.type;
      if (Object.keys(details).length) {
        errorEntry.details = details;
      }
    }
    openAiRuntime.lastError = errorEntry;
    openAiRuntime.consecutiveErrors += 1;
    throw error;
  } finally {
    openAiRuntime.running = false;
  }
}

const currencyActivity = new Map();

function getCurrencyActivityStore(channel) {
  const normalized = normalizeChannelName(channel);
  if (!normalized) {
    return new Map();
  }
  if (!currencyActivity.has(normalized)) {
    currencyActivity.set(normalized, new Map());
  }
  return currencyActivity.get(normalized);
}

async function handleCurrencyViewerActivity(channel, tags) {
  const normalizedChannel = normalizeChannelName(channel);
  if (!normalizedChannel) {
    return;
  }
  const config = getCurrencyConfiguration();
  const grantAmount = Number(config.accrual?.amount || 0);
  const grantIntervalMinutes = Number(config.accrual?.minutes || 0);
  if (!Number.isFinite(grantAmount) || grantAmount <= 0) {
    return;
  }
  if (!Number.isFinite(grantIntervalMinutes) || grantIntervalMinutes <= 0) {
    return;
  }
  const identity = getCurrencyIdentity(tags);
  if (!identity) {
    return;
  }
  const intervalMs = grantIntervalMinutes * 60_000;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return;
  }
  const store = getCurrencyActivityStore(normalizedChannel);
  const tracker = store.get(identity.key) || { lastSeen: 0, lastGrant: Date.now() };
  const now = Date.now();
  if (!Number.isFinite(tracker.lastGrant)) {
    tracker.lastGrant = now;
  }
  const elapsed = now - tracker.lastGrant;
  const grants = Math.floor(elapsed / intervalMs);
  if (grants > 0) {
    const totalAmount = grants * grantAmount;
    try {
      await addCurrencyBalance(normalizedChannel, identity, totalAmount);
      tracker.lastGrant += grants * intervalMs;
    } catch (error) {
      console.error('[twitch-chat-controller] Währung konnte nicht gutgeschrieben werden:', error);
    }
  }
  tracker.lastSeen = now;
  store.set(identity.key, tracker);
}

const automaticCommandTimers = new Map();

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
    if (data.currency) {
      runtimeState.currency = normalizeCurrencyState({
        ...runtimeState.currency,
        ...data.currency,
        balances: data.currency.balances || runtimeState.currency.balances
      });
    }
    if (data.openAiCompanion) {
      runtimeState.openAiCompanion = normalizeOpenAiConfig({
        ...runtimeState.openAiCompanion,
        ...data.openAiCompanion
      });
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
    throw error;
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
  setupAutomaticCommands();
}

function normalizeCommandItem(item) {
  if (!item) return null;

  const names = [];
  if (Array.isArray(item.names)) {
    item.names.forEach(name => {
      if (typeof name === 'string') {
        const trimmed = name.trim();
        if (trimmed) {
          names.push(trimmed);
        }
      }
    });
  }
  if (typeof item.name === 'string' && item.name.trim()) {
    names.push(item.name.trim());
  }
  const sanitizedNames = [];
  const seenNames = new Set();
  for (const raw of names) {
    const cleaned = raw.replace(/\s+/g, '').replace(/^!+/, '');
    if (!cleaned) continue;
    const lower = cleaned.toLowerCase();
    if (seenNames.has(lower)) continue;
    seenNames.add(lower);
    sanitizedNames.push(cleaned.toLowerCase());
  }
  const response = typeof item.response === 'string' ? item.response.trim() : '';
  if (!sanitizedNames.length || !response) {
    return null;
  }
  const cooldownSeconds = Number.isFinite(Number(item.cooldownSeconds))
    ? Math.max(0, Number(item.cooldownSeconds))
    : 0;
  const autoIntervalSeconds = Number.isFinite(Number(item.autoIntervalSeconds))
    ? Math.max(0, Number(item.autoIntervalSeconds))
    : 0;
  const minUserLevel = USER_LEVEL_ORDER.has(item.minUserLevel) ? item.minUserLevel : 'everyone';
  const responseType = RESPONSE_TYPES.includes(item.responseType) ? item.responseType : 'say';
  const cost = Number.isFinite(Number(item.cost)) ? Math.max(0, Math.round(Number(item.cost))) : 0;
  return {
    names: sanitizedNames,
    response,
    cooldownSeconds,
    autoIntervalSeconds,
    minUserLevel,
    responseType,
    enabled: item.enabled !== false,
    cost
  };
}

function commandKey(command) {
  if (!command) return '';
  if (Array.isArray(command.names) && command.names.length) {
    return command.names.map(name => name.toLowerCase()).sort().join('|');
  }
  if (typeof command.name === 'string' && command.name.trim()) {
    return command.name.trim().toLowerCase();
  }
  return '';
}

function clearAutomaticCommands() {
  for (const timer of automaticCommandTimers.values()) {
    clearInterval(timer);
  }
  automaticCommandTimers.clear();
}

async function runAutomaticCommand(command) {
  if (!command || command.enabled === false) {
    return;
  }
  const targets = joinedChannels.size ? Array.from(joinedChannels) : [];
  if (!targets.length) {
    const fallback = getDefaultChannelName();
    if (fallback) {
      targets.push(fallback);
    }
  }
  if (!targets.length) {
    return;
  }
  for (const channel of targets) {
    try {
      await dispatchCommandResponse(command, {
        channel,
        tags: null,
        userDisplayName: null,
        remainder: '',
        trigger: 'auto',
        usedAlias: null
      });
    } catch (error) {
      console.error(
        '[twitch-chat-controller] Automatik-Befehl konnte nicht ausgeführt werden:',
        command.names?.[0] || command.name,
        error
      );
    }
  }
}

function setupAutomaticCommands() {
  clearAutomaticCommands();
  const config = getCommandConfiguration();
  const items = Array.isArray(config?.items) ? config.items : [];
  items.forEach(command => {
    if (!command || command.enabled === false) {
      return;
    }
    const intervalSeconds = Number(command.autoIntervalSeconds || 0);
    if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
      return;
    }
    const key = commandKey(command);
    if (!key) {
      return;
    }
    const intervalMs = intervalSeconds * 1000;
    const timer = setInterval(() => {
      const latestConfig = getCommandConfiguration();
      const latestCommand = Array.isArray(latestConfig?.items)
        ? latestConfig.items.find(entry => commandKey(entry) === key)
        : null;
      if (!latestCommand || latestCommand.enabled === false) {
        return;
      }
      runAutomaticCommand(latestCommand).catch(error => {
        console.error('[twitch-chat-controller] Automatik-Befehl fehlgeschlagen:', error);
      });
    }, intervalMs);
    timer.unref?.();
    automaticCommandTimers.set(key, timer);
  });
}

function resetCommandCooldowns() {
  commandCooldowns.clear();
}

async function initializeRuntime() {
  await loadRuntimeState();
  scheduleTokenRefresh();
  setupAutomaticCommands();
  restartOpenAiScheduler();
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

  client.on('message', async (channel, tags, message, self) => {
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
      try {
        await handleCurrencyViewerActivity(normalized, tags);
      } catch (error) {
        console.error('[twitch-chat-controller] Fehler bei der Währungsberechnung:', error);
      }
      try {
        await handleCommandExecution(normalized, tags, message);
      } catch (error) {
        console.error('[twitch-chat-controller] Fehler beim Ausführen eines Befehls:', error);
      }
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

const REGULAR_BADGE_KEYS = new Set([
  'founder',
  'sub-gifter',
  'bits',
  'bits-leader',
  'moments',
  'predictions',
  'predictions-leader',
  'power-gifter'
]);

function hasBadge(badges, key) {
  if (!badges || typeof badges !== 'object') return false;
  return Object.prototype.hasOwnProperty.call(badges, key);
}

function getUserLevel(tags) {
  if (!tags) {
    return 'everyone';
  }
  const badges = tags.badges || {};
  const userType = tags['user-type'];
  if (hasBadge(badges, 'broadcaster')) {
    return 'broadcaster';
  }
  if (userType && ['admin', 'staff', 'global_mod'].includes(userType)) {
    return 'super-moderator';
  }
  if (tags.mod === true || tags.mod === '1' || hasBadge(badges, 'moderator')) {
    return hasBadge(badges, 'vip') ? 'super-moderator' : 'moderator';
  }
  if (hasBadge(badges, 'vip')) {
    return 'vip';
  }
  const isRegular = Array.from(REGULAR_BADGE_KEYS).some(key => hasBadge(badges, key));
  if (isRegular) {
    return 'regular';
  }
  if (tags.subscriber === true || tags.subscriber === '1' || hasBadge(badges, 'subscriber')) {
    return 'subscriber';
  }
  return 'everyone';
}

function isUserLevelAllowed(required, actual) {
  const requiredRank = USER_LEVEL_ORDER.get(required) ?? 0;
  const actualRank = USER_LEVEL_ORDER.get(actual) ?? 0;
  return actualRank >= requiredRank;
}

async function notifyInsufficientPermission(channel, tags, command, userLevel, prefix) {
  const normalizedChannel = normalizeChannelName(channel);
  const displayName = tags?.['display-name'] || tags?.username || 'Nutzer';
  const primary = Array.isArray(command?.names) && command.names.length ? command.names[0] : command?.name;
  const commandDisplay = primary ? `${prefix}${primary}` : 'diesen Befehl';

  try {
    await ensureChatClientConnected();
  } catch (error) {
    console.warn('[twitch-chat-controller] Whisper bei fehlender Berechtigung nicht möglich:', error?.message || error);
  }
  const client = getChatClient();
  if (client && tags?.username) {
    const whisperMessage = `Hey ${displayName}, du hast keine Berechtigung für ${commandDisplay}.`;
    try {
      await client.whisper(tags.username, whisperMessage);
    } catch (error) {
      console.warn('[twitch-chat-controller] Flüstern bei fehlender Berechtigung fehlgeschlagen:', error?.message || error);
    }
    if (tags.id) {
      try {
        await client.deletemessage(`#${normalizedChannel}`, tags.id);
      } catch (error) {
        console.warn('[twitch-chat-controller] Nachricht konnte nicht gelöscht werden:', error?.message || error);
      }
    }
  }

  broadcastToChannel(normalizedChannel, {
    type: 'system',
    channel: normalizedChannel,
    message: `${displayName} hat nicht die erforderliche Berechtigung (${command?.minUserLevel || 'everyone'}) für ${commandDisplay}.`,
    timestamp: new Date().toISOString(),
    meta: {
      command: Array.isArray(command?.names) ? command.names[0] : command?.name || null,
      aliases: Array.isArray(command?.names)
        ? command.names
        : command?.name
        ? [command.name]
        : [],
      levelRequired: command?.minUserLevel || 'everyone',
      levelProvided: userLevel || 'everyone',
      reason: 'insufficient_permissions'
    }
  });
}

async function notifyInsufficientCurrency(channel, tags, command, currencyConfig, balance, cost, prefix) {
  const normalizedChannel = normalizeChannelName(channel);
  const displayName = tags?.['display-name'] || tags?.username || 'Nutzer';
  const primary = Array.isArray(command?.names) && command.names.length ? command.names[0] : command?.name;
  const commandDisplay = primary ? `${prefix}${primary}` : 'diesen Befehl';
  const currencyName = currencyConfig?.name || 'Währung';
  const formattedBalance = NUMBER_FORMATTER.format(Math.max(0, Math.round(balance || 0)));
  const formattedCost = NUMBER_FORMATTER.format(Math.max(0, Math.round(cost || 0)));

  try {
    await ensureChatClientConnected();
  } catch (error) {
    console.warn('[twitch-chat-controller] Whisper bei unzureichender Währung nicht möglich:', error?.message || error);
  }
  const client = getChatClient();
  if (client && tags?.username) {
    const whisperMessage = `Hey ${displayName}, du benötigst ${formattedCost} ${currencyName} für ${commandDisplay}, hast aber nur ${formattedBalance}.`;
    try {
      await client.whisper(tags.username, whisperMessage);
    } catch (error) {
      console.warn('[twitch-chat-controller] Flüstern bei unzureichender Währung fehlgeschlagen:', error?.message || error);
    }
    if (tags.id) {
      try {
        await client.deletemessage(`#${normalizedChannel}`, tags.id);
      } catch (error) {
        console.warn('[twitch-chat-controller] Nachricht konnte nicht gelöscht werden:', error?.message || error);
      }
    }
  }

  broadcastToChannel(normalizedChannel, {
    type: 'system',
    channel: normalizedChannel,
    message: `${displayName} hatte nicht genügend ${currencyName} (${formattedBalance}/${formattedCost}) für ${commandDisplay}.`,
    timestamp: new Date().toISOString(),
    meta: {
      command: Array.isArray(command?.names) ? command.names[0] : command?.name || null,
      aliases: Array.isArray(command?.names)
        ? command.names
        : command?.name
        ? [command.name]
        : [],
      currencyName,
      requiredCurrency: cost,
      availableCurrency: balance,
      reason: 'insufficient_currency'
    }
  });
}

async function notifyCurrencyProcessingFailure(channel, tags, command, currencyConfig, prefix, reason) {
  const normalizedChannel = normalizeChannelName(channel);
  const displayName = tags?.['display-name'] || tags?.username || 'Nutzer';
  const primary = Array.isArray(command?.names) && command.names.length ? command.names[0] : command?.name;
  const commandDisplay = primary ? `${prefix}${primary}` : 'diesen Befehl';
  const currencyName = currencyConfig?.name || 'Währung';

  try {
    await ensureChatClientConnected();
  } catch (error) {
    console.warn('[twitch-chat-controller] Whisper bei Währungsfehler nicht möglich:', error?.message || error);
  }
  const client = getChatClient();
  if (client && tags?.username) {
    const whisperMessage = `Hey ${displayName}, leider konnte ${commandDisplay} nicht ausgeführt werden, da es einen Fehler im ${currencyName}-System gab.`;
    try {
      await client.whisper(tags.username, whisperMessage);
    } catch (error) {
      console.warn('[twitch-chat-controller] Flüstern bei Währungsfehler fehlgeschlagen:', error?.message || error);
    }
  }

  broadcastToChannel(normalizedChannel, {
    type: 'system',
    channel: normalizedChannel,
    message: `${commandDisplay} wurde wegen eines Währungsfehlers nicht ausgeführt.`,
    timestamp: new Date().toISOString(),
    meta: {
      command: Array.isArray(command?.names) ? command.names[0] : command?.name || null,
      aliases: Array.isArray(command?.names)
        ? command.names
        : command?.name
        ? [command.name]
        : [],
      currencyName,
      reason: 'currency_processing_error',
      details: reason || 'unknown'
    }
  });
}

async function dispatchCommandResponse(command, context) {
  if (!command) return;
  const {
    channel,
    tags,
    userDisplayName,
    remainder,
    trigger,
    usedAlias
  } = context;
  const normalizedChannel = normalizeChannelName(channel);
  if (!normalizedChannel) {
    return;
  }

  await ensureChatClientConnected();
  const client = getChatClient();
  if (!client) {
    throw new Error('Chat-Client ist nicht verbunden.');
  }

  const fallbackUser =
    userDisplayName ||
    tags?.['display-name'] ||
    tags?.username ||
    (trigger === 'auto' ? normalizedChannel : 'Zuschauer');
  const replacements = new Map([
    ['{user}', fallbackUser],
    ['{channel}', normalizedChannel],
    ['{message}', remainder || '']
  ]);

  let responseMessage = command.response || '';
  replacements.forEach((value, key) => {
    responseMessage = responseMessage.replace(new RegExp(key, 'gi'), value);
  });
  responseMessage = responseMessage.trim();
  if (!responseMessage) {
    return;
  }

  let deliveryMode = command.responseType || 'say';
  if ((deliveryMode === 'mention' || deliveryMode === 'reply' || deliveryMode === 'whisper') && !tags?.username) {
    deliveryMode = 'say';
  }

  const metaAliases = Array.isArray(command.names)
    ? command.names
    : command.name
    ? [command.name]
    : [];
  const triggeredLabel = trigger === 'auto' ? 'Automatik' : userDisplayName || null;
  const targetChannel = `#${normalizedChannel}`;
  let deliveredMessage = responseMessage;
  let finalMode = deliveryMode;

  if (deliveryMode === 'whisper') {
    try {
      await client.whisper(tags.username, responseMessage);
    } catch (error) {
      console.warn('[twitch-chat-controller] Whisper konnte nicht gesendet werden:', error?.message || error);
      finalMode = 'say';
    }
  }

  if (finalMode === 'mention') {
    const mention = userDisplayName ? `@${userDisplayName}` : '';
    deliveredMessage = [mention, responseMessage].filter(Boolean).join(' ').trim();
    addPendingBotMessage(normalizedChannel, deliveredMessage);
    await client.say(targetChannel, deliveredMessage);
  } else if (finalMode === 'reply') {
    if (typeof client.reply === 'function' && tags?.id) {
      await client.reply(targetChannel, responseMessage, tags.id);
    } else {
      const mention = userDisplayName ? `@${userDisplayName}` : '';
      deliveredMessage = [mention, responseMessage].filter(Boolean).join(' ').trim();
      addPendingBotMessage(normalizedChannel, deliveredMessage);
      await client.say(targetChannel, deliveredMessage);
      finalMode = 'mention';
    }
  } else if (finalMode === 'whisper') {
    // Whisper wurde bereits versendet
  } else {
    addPendingBotMessage(normalizedChannel, deliveredMessage);
    await client.say(targetChannel, deliveredMessage);
  }

  const botUsername = TWITCH_BOT_USERNAME || 'Bot';

  broadcastToChannel(normalizedChannel, {
    type: 'outgoing',
    channel: normalizedChannel,
    username: botUsername,
    message: finalMode === 'whisper' ? responseMessage : deliveredMessage,
    timestamp: new Date().toISOString(),
    meta: {
      command: metaAliases[0] || null,
      aliases: metaAliases,
      triggeredBy: triggeredLabel,
      trigger,
      usedAlias,
      responseType: finalMode,
      targetUser: finalMode === 'whisper' ? tags?.username || null : null
    }
  });
}

async function handleCommandExecution(channel, tags, message) {
  const normalizedChannel = normalizeChannelName(channel);
  if (!normalizedChannel) {
    return;
  }
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
  const command = (config.items || []).find(item => {
    if (!item || item.enabled === false) {
      return false;
    }
    if (Array.isArray(item.names) && item.names.length) {
      return item.names.some(name => name.toLowerCase() === commandName);
    }
    if (typeof item.name === 'string') {
      return item.name.toLowerCase() === commandName;
    }
    return false;
  });
  if (!command) {
    return;
  }

  const userLevel = getUserLevel(tags);
  const requiredLevel = command.minUserLevel || 'everyone';
  if (!isUserLevelAllowed(requiredLevel, userLevel)) {
    await notifyInsufficientPermission(normalizedChannel, tags, command, userLevel, prefix);
    return;
  }

  const cooldownIdentifier = Array.isArray(command.names) && command.names.length
    ? command.names.map(name => name.toLowerCase()).sort().join('|')
    : command.name?.toLowerCase() || commandName;
  const cooldownKey = `${normalizedChannel}::${cooldownIdentifier}`;
  const cooldownMs = (Number(command.cooldownSeconds) || 0) * 1000;
  if (cooldownMs > 0) {
    const lastExecution = commandCooldowns.get(cooldownKey) || 0;
    if (Date.now() - lastExecution < cooldownMs) {
      return;
    }
  }

  const userDisplayName = tags['display-name'] || tags.username || 'Zuschauer';
  const primaryName = Array.isArray(command.names) && command.names.length ? command.names[0] : command.name || commandName;
  const cost = Number.isFinite(Number(command.cost)) ? Math.max(0, Math.round(Number(command.cost))) : 0;
  if (cost > 0) {
    const currencyConfig = getCurrencyConfiguration();
    const identity = getCurrencyIdentity(tags);
    if (!identity) {
      await notifyCurrencyProcessingFailure(normalizedChannel, tags, command, currencyConfig, prefix, 'missing_identity');
      return;
    }
    const currentBalance = getCurrencyBalance(normalizedChannel, identity);
    if (currentBalance < cost) {
      await notifyInsufficientCurrency(normalizedChannel, tags, command, currencyConfig, currentBalance, cost, prefix);
      return;
    }
    try {
      const newBalance = await spendCurrencyBalance(normalizedChannel, identity, cost);
      const formattedCost = NUMBER_FORMATTER.format(cost);
      const formattedBalance = NUMBER_FORMATTER.format(Math.max(0, Math.round(newBalance)));
      const aliases = Array.isArray(command.names)
        ? command.names
        : command.name
        ? [command.name]
        : [];
      broadcastToChannel(normalizedChannel, {
        type: 'system',
        channel: normalizedChannel,
        message: `${userDisplayName} hat ${formattedCost} ${currencyConfig.name} für ${prefix}${primaryName} ausgegeben (Rest: ${formattedBalance}).`,
        timestamp: new Date().toISOString(),
        meta: {
          command: aliases[0] || null,
          aliases,
          currencyName: currencyConfig.name,
          cost,
          balance: newBalance,
          reason: 'currency_spent'
        }
      });
    } catch (error) {
      if (error?.code === 'INSUFFICIENT_FUNDS') {
        const latestBalance = getCurrencyBalance(normalizedChannel, identity);
        await notifyInsufficientCurrency(normalizedChannel, tags, command, currencyConfig, latestBalance, cost, prefix);
      } else {
        console.error('[twitch-chat-controller] Währung konnte nicht abgebucht werden:', error);
        await notifyCurrencyProcessingFailure(
          normalizedChannel,
          tags,
          command,
          currencyConfig,
          prefix,
          error?.code || 'persist_failed'
        );
      }
      return;
    }
  }

  const remainder = args.join(' ');
  await dispatchCommandResponse(command, {
    channel: normalizedChannel,
    tags,
    userDisplayName,
    remainder,
    trigger: 'user',
    usedAlias: commandName
  });

  if (cooldownMs > 0) {
    commandCooldowns.set(cooldownKey, Date.now());
  }
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
  const currencyConfig = serializeCurrencyConfig();
  const currencySummary = getCurrencySummary();
  const openAiConfig = serializeOpenAiConfig();
  const openAiRuntimeInfo = getOpenAiRuntimeInfo();
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
    },
    currency: {
      name: currencyConfig.name,
      accrual: currencyConfig.accrual,
      summary: currencySummary
    },
    openAi: {
      enabled: openAiConfig.enabled,
      intervalSeconds: openAiConfig.intervalSeconds,
      targetChannel: openAiRuntimeInfo.targetChannel,
      hasApiKey: openAiRuntimeInfo.hasApiKey,
      lastRunAt: openAiRuntimeInfo.lastRunAt,
      lastSuccessAt: openAiRuntimeInfo.lastSuccessAt,
      nextRunAt: openAiRuntimeInfo.nextRunAt,
      lastError: openAiRuntimeInfo.lastError,
      lastMessage: openAiRuntimeInfo.lastMessage
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

app.get('/api/twitch/currency', (_req, res) => {
  const config = serializeCurrencyConfig();
  const summary = getCurrencySummary();
  res.json({
    name: config.name,
    accrual: config.accrual,
    summary
  });
});

app.put('/api/twitch/currency', async (req, res) => {
  try {
    const config = await applyCurrencyConfiguration(req.body || {});
    const summary = getCurrencySummary();
    res.json({ success: true, config, summary });
  } catch (error) {
    console.error('[twitch-chat-controller] Währungskonfiguration konnte nicht aktualisiert werden:', error);
    res.status(400).json({ error: error.message || 'Währungskonfiguration konnte nicht gespeichert werden.' });
  }
});

app.get('/api/twitch/openai', (_req, res) => {
  const config = serializeOpenAiConfig();
  const runtime = getOpenAiRuntimeInfo();
  res.json({ config, runtime });
});

app.put('/api/twitch/openai', async (req, res) => {
  try {
    const config = await applyOpenAiConfiguration(req.body || {});
    const runtime = getOpenAiRuntimeInfo();
    res.json({ success: true, config: serializeOpenAiConfig(config), runtime });
  } catch (error) {
    console.error('[twitch-chat-controller] OpenAI-Konfiguration konnte nicht aktualisiert werden:', error);
    res.status(400).json({ error: error.message || 'OpenAI-Konfiguration konnte nicht gespeichert werden.' });
  }
});

async function sendChatMessage(channel, message, meta = null) {
  const normalizedChannel = normalizeChannelName(channel);
  if (!normalizedChannel) {
    throw new Error('Channel fehlt oder ist ungültig.');
  }
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) {
    throw new Error('Nachricht ist leer.');
  }

  await ensureChatClientConnected();
  const client = getChatClient();
  if (!client) {
    throw new Error('Chat-Client ist nicht verbunden.');
  }
  if (!joinedChannels.has(normalizedChannel)) {
    await client.join(`#${normalizedChannel}`);
    joinedChannels.add(normalizedChannel);
  }

  addPendingBotMessage(normalizedChannel, text);
  await client.say(`#${normalizedChannel}`, text);

  const payload = {
    type: 'outgoing',
    channel: normalizedChannel,
    username: TWITCH_BOT_USERNAME,
    message: text,
    timestamp: new Date().toISOString()
  };
  if (meta && typeof meta === 'object' && Object.keys(meta).length > 0) {
    payload.meta = meta;
  }
  broadcastToChannel(normalizedChannel, payload);
  return text;
}

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
  const channel = req.body?.channel || TWITCH_DEFAULT_CHANNEL;
  const message = req.body?.message;
  if (!channel) {
    return res.status(400).json({ error: 'Channel fehlt in der Anfrage.' });
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Nachricht ist leer.' });
  }
  try {
    await sendChatMessage(channel, message);
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
