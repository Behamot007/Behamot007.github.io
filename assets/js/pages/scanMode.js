import { renderSimpleNavigation } from '../modules/simpleNav.js';
import { STORAGE_KEYS, getStoredValue } from '../modules/storage.js';

const readerContainer = document.getElementById('reader');
const actionBtn = document.getElementById('actionBtn');
const nextBtn = document.getElementById('nextBtn');
const scanResult = document.getElementById('scanResult');

let html5QrCode = null;
let scanning = false;
let playing = false;
let player = null;
let deviceId = null;

function getSpotifyToken() {
  return getStoredValue(STORAGE_KEYS.spotifyAccessToken) || '';
}

function updateActionBtn() {
  if (scanning) {
    actionBtn.textContent = '📷 Scannen läuft...';
  } else if (playing) {
    actionBtn.textContent = '⏸ Pause';
  } else {
    actionBtn.textContent = '▶ Play';
  }
}

async function setActiveDevice(token, id) {
  const resp = await fetch('https://api.spotify.com/v1/me/player', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ device_ids: [id], play: false })
  });
  if (!resp.ok) {
    console.error('Device konnte nicht gesetzt werden:', await resp.text());
  }
}

async function playTrack(token, trackId) {
  if (!deviceId) {
    console.error('Kein Spotify Device aktiv.');
    return;
  }
  const resp = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uris: [`spotify:track:${trackId}`] })
  });
  if (!resp.ok) {
    console.error('Fehler beim Starten:', await resp.text());
    return;
  }
  playing = true;
  updateActionBtn();
}

async function pauseTrack(token) {
  await fetch('https://api.spotify.com/v1/me/player/pause', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  playing = false;
  updateActionBtn();
}

function startScanner() {
  if (scanning) return;
  const token = getSpotifyToken();
  if (!token) {
    scanResult.textContent = 'Kein Spotify Token gefunden. Bitte verbinde dich im Digital Mode neu.';
    return;
  }
  html5QrCode = new Html5Qrcode('reader');
  scanning = true;
  updateActionBtn();

  html5QrCode
    .start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 250 },
      msg => {
        if (msg.includes('spotify.com/track/')) {
          const trackId = msg.split('track/')[1].split('?')[0];
          html5QrCode.stop().then(() => {
            scanning = false;
            updateActionBtn();
            playTrack(token, trackId);
            scanResult.textContent = '✅ Song gestartet!';
          });
        }
      },
      () => {}
    )
    .catch(err => console.error('Scanner Fehler:', err));
}

function setupSpotifyPlayer() {
  const token = getSpotifyToken();
  if (!token) {
    scanResult.textContent = 'Kein Spotify Token gefunden. Bitte verbinde dich im Digital Mode neu.';
    return;
  }

  window.onSpotifyWebPlaybackSDKReady = () => {
    player = new Spotify.Player({
      name: 'QR Player',
      getOAuthToken: cb => cb(token)
    });

    player.addListener('ready', ({ device_id }) => {
      console.log('Spotify Player ready:', device_id);
      deviceId = device_id;
      setActiveDevice(token, device_id);
    });

    player.addListener('not_ready', ({ device_id }) => {
      console.warn('Gerät offline:', device_id);
    });

    player.connect();
  };
}

function bindEvents() {
  actionBtn.addEventListener('click', async () => {
    if (scanning) return;
    const token = getSpotifyToken();
    if (!token) {
      scanResult.textContent = 'Kein Spotify Token gefunden. Bitte verbinde dich im Digital Mode neu.';
      return;
    }
    if (!playing) {
      startScanner();
    } else {
      await pauseTrack(token);
    }
  });

  nextBtn.addEventListener('click', async () => {
    const token = getSpotifyToken();
    if (playing && token) {
      await pauseTrack(token);
    }
    startScanner();
  });
}

function init() {
  renderSimpleNavigation('#globalNav', 'play-screen');
  bindEvents();
  setupSpotifyPlayer();
  updateActionBtn();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
