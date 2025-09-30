(() => {
  const API_BASE = "/api/spotify";
  let configPromise = null;

  async function fetchFromBackend(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    const hasBody = options.body !== undefined && options.body !== null;
    if (hasBody && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const requestInit = {
      credentials: options.credentials ?? "same-origin",
      headers,
      method: options.method ?? (hasBody ? "POST" : "GET"),
      body: hasBody ? JSON.stringify(options.body) : undefined
    };

    const response = await fetch(`${API_BASE}${path}`, requestInit);
    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok) {
      const message = data?.error || data?.message || "Unbekannter Spotify-Fehler";
      const err = new Error(message);
      err.status = response.status;
      err.details = data;
      throw err;
    }

    return data;
  }

  async function getSpotifyConfig() {
    if (!configPromise) {
      configPromise = fetchFromBackend("/config");
    }
    return configPromise;
  }

  async function exchangeSpotifyCode(code, redirectUri) {
    return fetchFromBackend("/token", {
      method: "POST",
      body: { code, redirectUri }
    });
  }

  async function refreshSpotifyToken(refreshToken) {
    return fetchFromBackend("/refresh", {
      method: "POST",
      body: { refreshToken }
    });
  }

  async function fetchSpotifyPlaylistTracks(playlistId) {
    const result = await fetchFromBackend(`/playlists/${encodeURIComponent(playlistId)}/tracks`);
    return result?.tracks ?? [];
  }

  function extractPlaylistId(value) {
    if (!value) return null;
    const input = String(value).trim();
    const urlMatch = input.match(/playlist\/([a-zA-Z0-9]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    const uriMatch = input.match(/^spotify:playlist:([a-zA-Z0-9]+)/i);
    if (uriMatch) {
      return uriMatch[1];
    }
    if (/^[a-zA-Z0-9]{16,64}$/.test(input)) {
      return input;
    }
    return null;
  }

  window.spotifyApi = {
    getConfig: getSpotifyConfig,
    exchangeCode: exchangeSpotifyCode,
    refreshToken: refreshSpotifyToken,
    fetchPlaylistTracks: fetchSpotifyPlaylistTracks
  };

  window.extractPlaylistId = extractPlaylistId;
  window.getPlaylistTracks = fetchSpotifyPlaylistTracks;
})();
