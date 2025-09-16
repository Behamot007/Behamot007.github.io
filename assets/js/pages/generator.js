import { renderSimpleNavigation } from '../modules/simpleNav.js';
import { createLogger } from '../modules/logger.js';
import { fetchTracksFromUrl } from '../modules/spotifyApi.js';
import { fetchPlaylistMetadata } from '../modules/aiClient.js';

const playlistInput = document.getElementById('playlistUrl');
const backgroundInput = document.getElementById('bgInput');
const useAiCheckbox = document.getElementById('useAI');
const startButton = document.getElementById('startBtn');
const cardGrid = document.getElementById('cardGrid');

const logger = createLogger('#log');
let backgroundDataUrl = '';

function normalise(value = '') {
  return value.toLowerCase().trim();
}

function buildMetadataMap(entries = []) {
  const map = new Map();
  entries.forEach(entry => {
    const key = `${normalise(entry.name)}|${normalise(entry.artist)}`;
    map.set(key, entry);
  });
  return map;
}

function renderCards(tracks, metadataEntries, options = {}) {
  const metadataMap = buildMetadataMap(metadataEntries);
  const useAi = options.useAi ?? false;
  cardGrid.innerHTML = '';

  tracks.forEach(track => {
    const qrCard = document.createElement('div');
    qrCard.className = 'tool-card tool-card--qr';
    if (backgroundDataUrl) {
      qrCard.style.backgroundImage = `url(${backgroundDataUrl})`;
    }

    const canvas = document.createElement('canvas');
    QRCode.toCanvas(canvas, track.url, { width: 180 });
    qrCard.appendChild(canvas);
    cardGrid.appendChild(qrCard);

    const infoCard = document.createElement('div');
    infoCard.className = 'tool-card tool-card--info';
    if (track.cover) {
      infoCard.style.setProperty('--cover-image', `url(${track.cover})`);
    }

    const title = document.createElement('div');
    title.className = 'tool-card__title editable';
    title.textContent = track.name;
    title.contentEditable = true;

    const artist = document.createElement('div');
    artist.className = 'tool-card__subtitle editable';
    artist.textContent = track.artist;
    artist.contentEditable = true;

    const metadataKey = `${normalise(track.name)}|${normalise(track.artist)}`;
    const metadata = metadataMap.get(metadataKey);
    const year = metadata?.year || metadata?.release_year;
    const infoText = useAi && year ? `Erscheinungsjahr: ${year}` : 'Jahr unbekannt – bearbeitbar';

    const info = document.createElement('div');
    info.className = 'tool-card__meta editable';
    info.textContent = infoText;
    info.contentEditable = true;

    infoCard.append(title, artist, info);
    cardGrid.appendChild(infoCard);
  });
}

async function handleGenerate() {
  logger.clear();
  cardGrid.innerHTML = '';

  const playlistUrl = playlistInput.value.trim();
  if (!playlistUrl) {
    logger.log('⚠ Bitte eine Spotify-Playlist-URL eingeben.');
    return;
  }

  startButton.disabled = true;

  try {
    const tracks = await fetchTracksFromUrl(playlistUrl, { logger });

    let metadata = [];
    if (useAiCheckbox.checked) {
      logger.log('Frage KI nach Zusatzinformationen…');
      metadata = await fetchPlaylistMetadata(tracks);
    }

    renderCards(tracks, metadata, { useAi: useAiCheckbox.checked });
    logger.log('✅ Fertig! Zum Drucken: STRG+P / CMD+P');
  } catch (error) {
    logger.log(`❌ Fehler: ${error.message}`);
  } finally {
    startButton.disabled = false;
  }
}

function bindEvents() {
  backgroundInput.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      backgroundDataUrl = reader.result;
      logger.log('Hintergrundbild geladen.');
    };
    reader.readAsDataURL(file);
  });

  startButton.addEventListener('click', () => {
    handleGenerate();
  });
}

function init() {
  renderSimpleNavigation('#globalNav', 'generator');
  bindEvents();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
