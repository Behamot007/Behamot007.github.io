import { renderSimpleNavigation } from '../modules/simpleNav.js';
import { fetchTracksFromUrl } from '../modules/spotifyApi.js';
import {
  STORAGE_KEYS,
  getStoredValue,
  setStoredValue,
  removeStoredValue
} from '../modules/storage.js';

const playlistInput = document.getElementById('playlistInput');
const playerCountInput = document.getElementById('playerCount');
const playerNamesContainer = document.getElementById('playerNames');
const setupSection = document.getElementById('setup');
const gameArea = document.getElementById('gameArea');
const qrCodeContainer = document.getElementById('qrCode');
const cardElement = document.getElementById('card');
const songInfo = document.getElementById('songInfo');
const currentPlayerDisplay = document.getElementById('currentPlayerDisplay');
const playerBoard = document.getElementById('playerBoard');
const historyModal = document.getElementById('historyModal');
const modalBody = document.getElementById('modalBody');
const chipsModal = document.getElementById('chipsModal');
const chipPlayerSelect = document.getElementById('chipPlayerSelect');
const chipCoins = document.getElementById('chipCoins');

const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const flipBtn = document.getElementById('flipBtn');
const correctBtn = document.getElementById('correctBtn');
const wrongBtn = document.getElementById('wrongBtn');
const chipsBtn = document.getElementById('chipsBtn');
const startBtn = document.getElementById('startBtn');

const spotifyStatusEl = document.getElementById('spotifyStatus');
const spotifyConnectBtn = document.getElementById('spotifyConnectBtn');
const spotifyDisconnectBtn = document.getElementById('spotifyDisconnectBtn');
const spotifyHintEl = document.getElementById('spotifyHint');

let playlistTracks = [];
let currentTrack = null;
let qrInstance = null;
let flipped = false;
let players = [];
let currentPlayerIndex = 0;
let isPlaying = false;

let spotifyAccessToken = null;
let spotifyRefreshToken = null;
let spotifyTokenExpiry = 0;

const SPOTIFY_AUTH_STATE_KEY = 'SPOTIFY_AUTH_STATE';
const SPOTIFY_SCOPES = ['user-read-playback-state', 'user-modify-playback-state'];
const SPOTIFY_REDIRECT_URI = window.location.origin + window.location.pathname;

function loadSpotifyAuthFromStorage() {
  spotifyAccessToken = getStoredValue(STORAGE_KEYS.spotifyAccessToken) || null;
  spotifyRefreshToken = getStoredValue(STORAGE_KEYS.spotifyRefreshToken) || null;
  spotifyTokenExpiry = Number(getStoredValue(STORAGE_KEYS.spotifyTokenExpiry)) || 0;
}

function saveSpotifyTokens({ access_token, refresh_token, expires_in }) {
  if (!access_token) return;
  spotifyAccessToken = access_token;
  if (refresh_token) {
    spotifyRefreshToken = refresh_token;
  }
  const expiresInSec = Math.max((expires_in ?? 3600) - 60, 60);
  spotifyTokenExpiry = Date.now() + expiresInSec * 1000;
  setStoredValue(STORAGE_KEYS.spotifyAccessToken, spotifyAccessToken);
  if (spotifyRefreshToken) {
    setStoredValue(STORAGE_KEYS.spotifyRefreshToken, spotifyRefreshToken);
  }
  setStoredValue(STORAGE_KEYS.spotifyTokenExpiry, String(spotifyTokenExpiry));
}

function clearSpotifyAuth() {
  spotifyAccessToken = null;
  spotifyRefreshToken = null;
  spotifyTokenExpiry = 0;
  removeStoredValue(STORAGE_KEYS.spotifyAccessToken);
  removeStoredValue(STORAGE_KEYS.spotifyRefreshToken);
  removeStoredValue(STORAGE_KEYS.spotifyTokenExpiry);
}

function getSpotifyCredentials() {
  return {
    clientId: getStoredValue(STORAGE_KEYS.spotifyClientId),
    clientSecret: getStoredValue(STORAGE_KEYS.spotifyClientSecret)
  };
}

function isSpotifyConnected() {
  return Boolean(spotifyAccessToken || spotifyRefreshToken);
}

function updatePlaybackButtonState() {
  const hasTrack = Boolean(currentTrack);
  const connected = isSpotifyConnected();
  playBtn.disabled = !(hasTrack && connected);
  stopBtn.disabled = !connected;
}

function updateSpotifyAuthUI() {
  const connected = isSpotifyConnected();
  if (spotifyStatusEl) {
    spotifyStatusEl.textContent = connected ? 'Spotify: verbunden' : 'Spotify: nicht verbunden';
  }
  if (spotifyConnectBtn) spotifyConnectBtn.style.display = connected ? 'none' : 'inline-block';
  if (spotifyDisconnectBtn) spotifyDisconnectBtn.style.display = connected ? 'inline-block' : 'none';
  if (spotifyHintEl) {
    spotifyHintEl.textContent = connected
      ? 'Öffne die Spotify App auf dem gewünschten Gerät und halte sie aktiv, damit die Wiedergabe hier gesteuert werden kann.'
      : 'Melde dich mit deinem Spotify Account an, um Songs direkt aus dem Spiel heraus abspielen oder pausieren zu können.';
  }
  if (connected && flipped && currentTrack) {
    showTrackInfo(currentTrack);
  }
  updatePlaybackButtonState();
}

function createRandomState(length = 16) {
  if (!window.crypto || !window.crypto.getRandomValues) {
    return Math.random().toString(36).slice(2, 2 + length);
  }
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = new Uint8Array(length);
  window.crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (val) => charset[val % charset.length]).join('');
}

function startSpotifyLogin() {
  const { clientId, clientSecret } = getSpotifyCredentials();
  if (!clientId || !clientSecret) {
    alert('Bitte hinterlege Client ID und Client Secret in den Konfigurationen, bevor du Spotify verbindest.');
    return;
  }
  const state = createRandomState(16);
  sessionStorage.setItem(SPOTIFY_AUTH_STATE_KEY, state);
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('scope', SPOTIFY_SCOPES.join(' '));
  authUrl.searchParams.set('redirect_uri', SPOTIFY_REDIRECT_URI);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('show_dialog', 'true');
  window.location.href = authUrl.toString();
}

async function exchangeSpotifyCode(code) {
  const { clientId, clientSecret } = getSpotifyCredentials();
  if (!clientId || !clientSecret) {
    alert('Spotify-Anmeldung fehlgeschlagen: Client ID oder Secret fehlen.');
    return false;
  }
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI
  });
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(`${clientId}:${clientSecret}`)
    },
    body: body.toString()
  });
  const data = await resp.json();
  if (!resp.ok) {
    console.error('Spotify Token Fehler:', data);
    alert('Spotify-Anmeldung fehlgeschlagen. Details siehe Konsole.');
    return false;
  }
  saveSpotifyTokens(data);
  return true;
}

async function refreshSpotifyAccessToken() {
  if (!spotifyRefreshToken) return false;
  const { clientId, clientSecret } = getSpotifyCredentials();
  if (!clientId || !clientSecret) return false;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: spotifyRefreshToken
  });

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(`${clientId}:${clientSecret}`)
    },
    body: body.toString()
  });

  const data = await resp.json();
  if (!resp.ok) {
    console.error('Spotify Refresh Fehler:', data);
    clearSpotifyAuth();
    return false;
  }

  saveSpotifyTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token || spotifyRefreshToken,
    expires_in: data.expires_in
  });
  return true;
}

async function ensureSpotifyAccessToken() {
  if (!spotifyAccessToken && !spotifyRefreshToken) return null;
  if (!spotifyAccessToken || Date.now() >= spotifyTokenExpiry - 60000) {
    const refreshed = await refreshSpotifyAccessToken();
    if (!refreshed) {
      updateSpotifyAuthUI();
      return null;
    }
  }
  return spotifyAccessToken;
}

async function startSpotifyPlayback(trackId, retry = true) {
  const token = await ensureSpotifyAccessToken();
  if (!token) {
    alert('Bitte verbinde zuerst deinen Spotify Account über den Button im Setup.');
    return false;
  }

  const resp = await fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uris: [`spotify:track:${trackId}`] })
  });

  if (resp.status === 401 && retry) {
    const refreshed = await refreshSpotifyAccessToken();
    if (refreshed) {
      return startSpotifyPlayback(trackId, false);
    }
    updateSpotifyAuthUI();
    alert('Spotify-Sitzung ist abgelaufen. Bitte melde dich erneut an.');
    return false;
  }

  if (resp.status === 404) {
    alert('Kein aktives Spotify-Gerät gefunden. Öffne Spotify auf dem gewünschten Gerät und versuche es erneut.');
    updatePlaybackButtonState();
    return false;
  }

  if (resp.status === 403) {
    alert('Zum Steuern der Wiedergabe wird ein Spotify Premium Account benötigt.');
    updatePlaybackButtonState();
    return false;
  }

  if (!resp.ok) {
    const errorText = await resp.text();
    console.error('Spotify Play Fehler:', errorText);
    alert('Spotify konnte den Song nicht starten. Details siehe Konsole.');
    updatePlaybackButtonState();
    return false;
  }

  isPlaying = true;
  updatePlaybackButtonState();
  return true;
}

async function pauseSpotifyPlayback(retry = true) {
  const token = await ensureSpotifyAccessToken();
  if (!token) return false;

  const resp = await fetch('https://api.spotify.com/v1/me/player/pause', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (resp.status === 401 && retry) {
    const refreshed = await refreshSpotifyAccessToken();
    if (refreshed) {
      return pauseSpotifyPlayback(false);
    }
    updateSpotifyAuthUI();
    return false;
  }

  if (!resp.ok && resp.status !== 403 && resp.status !== 404) {
    const errorText = await resp.text();
    console.warn('Spotify Pause Fehler:', errorText);
    return false;
  }

  return true;
}

function extractSpotifyTrackId(url) {
  if (!url) return null;
  const match = url.match(/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

async function handleSpotifyRedirect() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code) return;

  const storedState = sessionStorage.getItem(SPOTIFY_AUTH_STATE_KEY);
  sessionStorage.removeItem(SPOTIFY_AUTH_STATE_KEY);

  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : '') + url.hash);

  if (!storedState || storedState !== state) {
    console.warn('Spotify state mismatch.');
    alert('Spotify-Anmeldung konnte nicht verifiziert werden. Bitte versuche es erneut.');
    return;
  }

  await exchangeSpotifyCode(code);
}

async function initSpotifyAuth() {
  loadSpotifyAuthFromStorage();
  try {
    await handleSpotifyRedirect();
  } catch (err) {
    console.error('Spotify Redirect Fehler:', err);
  }
  if (spotifyAccessToken || spotifyRefreshToken) {
    await ensureSpotifyAccessToken();
  }
  updateSpotifyAuthUI();
}

function randomTrack() {
  if (!playlistTracks.length) return null;
  const idx = Math.floor(Math.random() * playlistTracks.length);
  return playlistTracks.splice(idx, 1)[0];
}

async function stopPlayback(force = false) {
  const wasPlaying = isPlaying;
  isPlaying = false;
  updatePlaybackButtonState();
  if (!isSpotifyConnected()) return;
  if (!force && !wasPlaying) return;
  try {
    await pauseSpotifyPlayback();
  } catch (err) {
    console.warn('Spotify Pause konnte nicht ausgeführt werden:', err);
  }
}

function prepareTrackPreview() {
  stopPlayback();
}

function updateQRCode(track) {
  if (qrInstance) {
    qrCodeContainer.innerHTML = '';
  }
  qrInstance = new QRCode(qrCodeContainer, {
    text: track.url,
    width: 220,
    height: 220
  });
}

function showTrackInfo(track) {
  const yearText = track.year ? track.year.slice(0, 4) : '-';
  const playbackText = isSpotifyConnected()
    ? '⏯ Über deinen Spotify Account steuerbar'
    : '🔒 Verbinde Spotify, um den Song abzuspielen';
  const coverHtml = track.cover ? `<img src="${track.cover}" alt="Albumcover">` : '';
  songInfo.innerHTML = `
    <h3>${track.name}</h3>
    <p>${track.artist}</p>
    <p>${yearText}</p>
    <p class="playback-info">${playbackText}</p>
    ${coverHtml}
  `;
}

function showAnswerButtons() {
  correctBtn.style.display = 'inline-block';
  wrongBtn.style.display = 'inline-block';
  correctBtn.disabled = false;
  wrongBtn.disabled = false;
}

function hideAnswerButtons() {
  correctBtn.style.display = 'none';
  wrongBtn.style.display = 'none';
  correctBtn.disabled = true;
  wrongBtn.disabled = true;
}

function flipCard() {
  flipped = !flipped;
  if (flipped) {
    showTrackInfo(currentTrack);
    cardElement.classList.add('flipped');
    showAnswerButtons();
  } else {
    cardElement.classList.remove('flipped');
    hideAnswerButtons();
    correctBtn.disabled = false;
    wrongBtn.disabled = false;
  }
}

function resetFlip() {
  flipped = false;
  cardElement.classList.remove('flipped');
}

function updatePlayerBoard() {
  playerBoard.innerHTML = '';
  if (!players.length) {
    currentPlayerDisplay.textContent = '';
    return;
  }
  players.forEach((player, idx) => {
    const years = player.cards.map(c => c.year).sort((a, b) => a - b);
    const div = document.createElement('div');
    div.className = 'player' + (idx === currentPlayerIndex ? ' active' : '');
    const yearsText = years.length ? years.join(', ') : '-';
    div.innerHTML = `<div class="name">${player.name}</div><div class="years">${yearsText}</div>`;
    div.addEventListener('click', () => showPlayerCards(idx));
    playerBoard.appendChild(div);
  });
  currentPlayerDisplay.textContent = `Aktueller Spieler: ${players[currentPlayerIndex].name}`;
}

function showPlayerCards(index) {
  const player = players[index];
  let historyHtml;
  if (!player.cards.length) {
    historyHtml = 'Keine Karten';
  } else {
    const sorted = player.cards.slice().sort((a, b) => a.year - b.year);
    historyHtml = sorted.map(c => `${c.year} - ${c.title} - ${c.artist}`).join('<br>');
  }
  modalBody.innerHTML = `
    <h3>${player.name}</h3>
    <p>BeatCoins: <span id="playerCoins">${player.coins}</span></p>
    ${historyHtml}
    <div style="margin-top:10px;"><button id="giveCoinBtn">BeatCoin geben</button></div>
  `;
  document.getElementById('giveCoinBtn').addEventListener('click', () => {
    player.coins += 1;
    document.getElementById('playerCoins').textContent = player.coins;
    updatePlayerBoard();
  });
  historyModal.style.display = 'flex';
}

function openChipsModal() {
  chipPlayerSelect.innerHTML = '';
  players.forEach((player, idx) => {
    const option = document.createElement('option');
    option.value = idx;
    option.textContent = player.name;
    chipPlayerSelect.appendChild(option);
  });
  chipPlayerSelect.value = String(currentPlayerIndex);
  updateChipActionsState();
  chipsModal.style.display = 'flex';
}

function updateChipActionsState() {
  const selected = parseInt(chipPlayerSelect.value, 10);
  const selectedCoins = players[selected].coins;
  chipCoins.textContent = `BeatCoins: ${selectedCoins}`;
  document.getElementById('modalSkipBtn').disabled = selected !== currentPlayerIndex || selectedCoins < 1;
  document.getElementById('stealBtn').disabled = selected === currentPlayerIndex || selectedCoins < 1;
  document.getElementById('giftBtn').disabled = selectedCoins < 3;
}

function closeModalsOnBackdrop(event) {
  if (event.target === historyModal) historyModal.style.display = 'none';
  if (event.target === chipsModal) chipsModal.style.display = 'none';
}

function nextPlayer() {
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  updatePlayerBoard();
}

function nextTrack() {
  resetFlip();
  currentTrack = randomTrack();
  if (!currentTrack) {
    alert('Keine weiteren Songs in der Playlist.');
    prepareTrackPreview();
    flipBtn.disabled = true;
    return;
  }
  updateQRCode(currentTrack);
  prepareTrackPreview();
  flipBtn.disabled = false;
  hideAnswerButtons();
}

function handleAnswer(correct) {
  if (correct && currentTrack) {
    players[currentPlayerIndex].cards.push({
      year: parseInt(currentTrack.year.slice(0, 4), 10),
      title: currentTrack.name,
      artist: currentTrack.artist
    });
  }
  nextPlayer();
  nextTrack();
}

async function handleStartGame() {
  const count = parseInt(playerCountInput.value, 10) || 0;
  if (!playlistInput.value.trim() || count < 1) {
    alert('Bitte Playlist-URL und Spieleranzahl angeben.');
    return;
  }

  const nameInputs = playerNamesContainer.querySelectorAll('.playerName');
  players = Array.from(nameInputs).map((input, idx) => ({
    name: input.value || `Spieler ${idx + 1}`,
    cards: [],
    coins: 2
  }));

  try {
    playlistTracks = await fetchTracksFromUrl(playlistInput.value.trim());
  } catch (error) {
    alert(`Playlist konnte nicht geladen werden: ${error.message}`);
    return;
  }

  players.forEach(player => {
    const track = randomTrack();
    if (track) {
      player.cards.push({
        year: parseInt(track.year.slice(0, 4), 10),
        title: track.name,
        artist: track.artist
      });
    }
  });

  setupSection.style.display = 'none';
  gameArea.style.display = 'block';
  currentPlayerIndex = 0;
  updatePlayerBoard();
  nextTrack();
}

function initPlayerInputs() {
  const count = parseInt(playerCountInput.value, 10) || 0;
  playerNamesContainer.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Spieler ${i + 1} Name`;
    input.className = 'playerName';
    playerNamesContainer.appendChild(input);
  }
}

function bindEvents() {
  playerCountInput.addEventListener('change', initPlayerInputs);
  startBtn.addEventListener('click', handleStartGame);
  flipBtn.addEventListener('click', () => {
    if (currentTrack) {
      flipCard();
    }
  });
  correctBtn.addEventListener('click', () => handleAnswer(true));
  wrongBtn.addEventListener('click', () => handleAnswer(false));
  chipsBtn.addEventListener('click', openChipsModal);

  document.getElementById('modalClose').addEventListener('click', () => {
    historyModal.style.display = 'none';
  });
  document.getElementById('chipsModalClose').addEventListener('click', () => {
    chipsModal.style.display = 'none';
  });

  chipPlayerSelect.addEventListener('change', updateChipActionsState);
  document.getElementById('modalSkipBtn').addEventListener('click', () => {
    const actor = parseInt(chipPlayerSelect.value, 10);
    if (players[actor].coins < 1) return;
    players[actor].coins -= 1;
    updatePlayerBoard();
    nextTrack();
    chipsModal.style.display = 'none';
  });
  document.getElementById('stealBtn').addEventListener('click', () => {
    const actor = parseInt(chipPlayerSelect.value, 10);
    if (players[actor].coins < 1) return;
    players[actor].coins -= 1;
    players[actor].cards.push({
      year: parseInt(currentTrack.year.slice(0, 4), 10),
      title: currentTrack.name,
      artist: currentTrack.artist
    });
    updatePlayerBoard();
    nextPlayer();
    nextTrack();
    chipsModal.style.display = 'none';
  });
  document.getElementById('giftBtn').addEventListener('click', () => {
    const actor = parseInt(chipPlayerSelect.value, 10);
    if (players[actor].coins < 3) return;
    const track = randomTrack();
    if (!track) {
      alert('Keine Songs im Pool.');
      return;
    }
    players[actor].coins -= 3;
    players[actor].cards.push({
      year: parseInt(track.year.slice(0, 4), 10),
      title: track.name,
      artist: track.artist
    });
    updatePlayerBoard();
    chipsModal.style.display = 'none';
  });

  playBtn.addEventListener('click', async () => {
    if (!currentTrack) return;
    const trackId = extractSpotifyTrackId(currentTrack.url);
    if (!trackId) {
      alert('Spotify-Track-ID konnte nicht ermittelt werden.');
      return;
    }
    await startSpotifyPlayback(trackId);
  });

  stopBtn.addEventListener('click', () => {
    stopPlayback(true);
  });

  spotifyConnectBtn.addEventListener('click', startSpotifyLogin);
  spotifyDisconnectBtn.addEventListener('click', async () => {
    await stopPlayback(true);
    clearSpotifyAuth();
    updateSpotifyAuthUI();
  });

  window.addEventListener('click', closeModalsOnBackdrop);
}

function init() {
  renderSimpleNavigation('#globalNav', 'digital-mode');
  bindEvents();
  initSpotifyAuth();
  updatePlaybackButtonState();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
