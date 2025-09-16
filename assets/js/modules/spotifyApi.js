import { STORAGE_KEYS, getStoredValue } from './storage.js';

export function extractPlaylistId(url) {
  if (!url) {
    return null;
  }
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export async function requestClientToken(credentials = {}, logger) {
  const clientId = credentials.clientId ?? getStoredValue(STORAGE_KEYS.spotifyClientId);
  const clientSecret = credentials.clientSecret ?? getStoredValue(STORAGE_KEYS.spotifyClientSecret);

  if (!clientId || !clientSecret) {
    throw new Error('Spotify Zugangsdaten fehlen. Hinterlege Client ID und Secret in den Konfigurationen.');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(`${clientId}:${clientSecret}`)
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Spotify Token Fehler: ${JSON.stringify(data)}`);
  }

  logger?.log('Spotify Token erhalten');
  return data.access_token;
}

export async function fetchPlaylistTracks(playlistId, token, logger) {
  if (!playlistId) {
    throw new Error('Ungültige Playlist-URL.');
  }
  if (!token) {
    throw new Error('Spotify Token fehlt.');
  }

  logger?.log('Lade Playlist-Daten…');

  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
  const tracks = [];

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: 'Bearer ' + token
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Spotify Tracks Fehler: ${JSON.stringify(data)}`);
    }

    data.items.forEach(item => {
      if (!item.track) return;
      const album = item.track.album ?? {};
      const releaseDate = album.release_date ?? '';
      tracks.push({
        name: item.track.name,
        artist: item.track.artists?.map(a => a.name).join(', ') ?? '',
        url: item.track.external_urls?.spotify ?? '',
        cover: album.images?.[0]?.url ?? '',
        year: releaseDate,
        preview: item.track.preview_url ?? null
      });
    });

    url = data.next;
  }

  logger?.log(`Gefundene Songs: ${tracks.length}`);
  return tracks;
}

export async function fetchTracksFromUrl(playlistUrl, options = {}) {
  const { logger, credentials } = options;
  const playlistId = extractPlaylistId(playlistUrl);
  if (!playlistId) {
    throw new Error('Bitte gib eine gültige Spotify-Playlist-URL an.');
  }
  const token = await requestClientToken(credentials, logger);
  return fetchPlaylistTracks(playlistId, token, logger);
}
