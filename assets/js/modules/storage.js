export const STORAGE_KEYS = {
  spotifyClientId: 'CLIENT_ID',
  spotifyClientSecret: 'CLIENT_SECRET',
  openAiToken: 'OPENAPI_TOKEN',
  riotApiKey: 'RIOT_API_KEY',
  spotifyAccessToken: 'SPOTIFY_ACCESS_TOKEN',
  spotifyRefreshToken: 'SPOTIFY_REFRESH_TOKEN',
  spotifyTokenExpiry: 'SPOTIFY_TOKEN_EXPIRY'
};

export function getStoredValue(key, fallback = '') {
  const value = localStorage.getItem(key);
  return value ?? fallback;
}

export function setStoredValue(key, value) {
  if (value === undefined || value === null) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, value);
}

export function removeStoredValue(key) {
  localStorage.removeItem(key);
}

export function getStoredNumber(key, fallback = 0) {
  const value = localStorage.getItem(key);
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function getMany(keys) {
  return keys.reduce((acc, key) => {
    acc[key] = getStoredValue(key, '');
    return acc;
  }, {});
}

export function setMany(entries) {
  entries.forEach(([key, value]) => setStoredValue(key, value));
}
