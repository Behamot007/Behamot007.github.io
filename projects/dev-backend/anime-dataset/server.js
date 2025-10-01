import express from "express";
import fs from "fs";
import path from "path";
import bodyParser from "body-parser";
import cors from "cors";

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  try {
    const content = fs.readFileSync(envPath, "utf-8");
    content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#"))
      .forEach(line => {
        const equalsIndex = line.indexOf("=");
        if (equalsIndex === -1) return;
        const key = line.slice(0, equalsIndex).trim();
        const value = line.slice(equalsIndex + 1).trim();
        if (!key || process.env[key] !== undefined) return;
        const unquoted = value.replace(/^['"]|['"]$/g, "");
        process.env[key] = unquoted;
      });
  } catch (error) {
    console.warn(".env konnte nicht gelesen werden:", error);
  }
}

loadEnvFile();

const app = express();
const PORT = Number.parseInt(process.env.PORT, 10) || 3000;
const DATASET_PATH = path.resolve(
  process.env.DATASET_PATH ?? "dataset/characters.jsonl"
);
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ?? "";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET ?? "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const OPENAI_DEFAULT_MODEL = process.env.OPENAI_DEFAULT_MODEL ?? "gpt-4o-mini";

let cachedSpotifyToken = "";
let cachedSpotifyTokenExpiry = 0;

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
// Die Verwaltungsoberfläche wird im dedizierten Frontend-Service ausgeliefert.
// Das Backend stellt ausschließlich JSON-Endpunkte bereit.

function ensureSpotifyCredentials() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    const error = new Error("Spotify credentials are not configured");
    error.status = 503;
    throw error;
  }
}

function ensureOpenAiCredentials() {
  if (!OPENAI_API_KEY) {
    const error = new Error("OpenAI credentials are not configured");
    error.status = 503;
    throw error;
  }
}

async function requestSpotifyClientCredentialsToken() {
  ensureSpotifyCredentials();

  if (cachedSpotifyToken && Date.now() < cachedSpotifyTokenExpiry - 60000) {
    return cachedSpotifyToken;
  }

  const params = new URLSearchParams({ grant_type: "client_credentials" });
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`
    },
    body: params.toString()
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error_description || data?.error || "Spotify token request failed";
    const error = new Error(message);
    error.status = response.status || 500;
    error.details = data;
    throw error;
  }

  cachedSpotifyToken = data.access_token;
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
  cachedSpotifyTokenExpiry = Date.now() + expiresIn * 1000;
  return cachedSpotifyToken;
}

async function fetchSpotifyPlaylistTracks(playlistId) {
  if (!playlistId) {
    const error = new Error("Playlist ID is required");
    error.status = 400;
    throw error;
  }

  const token = await requestSpotifyClientCredentialsToken();
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
  const tracks = [];

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || "Spotify playlist request failed";
      const error = new Error(message);
      error.status = response.status || 500;
      error.details = data;
      throw error;
    }

    for (const item of data.items ?? []) {
      if (!item?.track) continue;
      const album = item.track.album ?? {};
      const releaseDate = album.release_date ?? "";
      tracks.push({
        name: item.track.name,
        artist: (item.track.artists ?? []).map(artist => artist.name).join(", "),
        url: item.track.external_urls?.spotify ?? "",
        cover: album.images?.[0]?.url ?? "",
        year: releaseDate,
        preview: item.track.preview_url ?? null
      });
    }

    url = data.next;
  }

  return tracks;
}

// Dataset laden
function loadCharacters() {
  if (!fs.existsSync(DATASET_PATH)) return [];

  try {
    const text = fs.readFileSync(DATASET_PATH, "utf-8");
    const characters = [];

    text
      .split("\n")
      .filter(Boolean)
      .forEach((line, index) => {
        try {
          characters.push(JSON.parse(line));
        } catch (error) {
          console.error(
            `Fehler beim Parsen der Zeile ${index + 1} aus ${DATASET_PATH}:`,
            error
          );
        }
      });

    return characters;
  } catch (error) {
    console.error(
      `Datensatz ${DATASET_PATH} konnte nicht gelesen werden:`,
      error
    );
    return [];
  }
}

// Dataset speichern
function saveCharacters(chars) {
  const text = chars.map(c => JSON.stringify(c)).join("\n");
  try {
    fs.mkdirSync(path.dirname(DATASET_PATH), { recursive: true });
    fs.writeFileSync(DATASET_PATH, text, "utf-8");
  } catch (error) {
    console.error(`Datensatz ${DATASET_PATH} konnte nicht gespeichert werden:`, error);
    throw error;
  }
}

// API: Alle Charaktere
app.get("/api/characters", (req, res) => {
  res.json(loadCharacters());
});

// API: Speichern
app.post("/api/characters", (req, res) => {
  const chars = req.body;
  if (!Array.isArray(chars)) return res.status(400).json({ error: "Expected array" });
  try {
    saveCharacters(chars);
    res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ error: "Failed to persist dataset" });
  }
});

app.get("/api/spotify/config", (req, res) => {
  res.json({
    clientId: SPOTIFY_CLIENT_ID || null,
    hasClientSecret: Boolean(SPOTIFY_CLIENT_SECRET)
  });
});

app.get("/api/spotify/playlists/:playlistId/tracks", async (req, res) => {
  try {
    const tracks = await fetchSpotifyPlaylistTracks(req.params.playlistId);
    res.json({ tracks });
  } catch (error) {
    console.error("Spotify playlist error:", error);
    res.status(error.status || 500).json({
      error: error.message || "Failed to fetch playlist",
      details: error.details ?? null
    });
  }
});

app.post("/api/spotify/token", async (req, res) => {
  try {
    ensureSpotifyCredentials();
    const { code, redirectUri } = req.body ?? {};
    if (!code || !redirectUri) {
      return res.status(400).json({ error: "code and redirectUri are required" });
    }

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    });

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`
      },
      body: params.toString()
    });

    const data = await response.json();
    if (!response.ok) {
      const message = data?.error_description || data?.error || "Spotify authorization failed";
      return res.status(response.status || 500).json({
        error: message,
        details: data
      });
    }

    res.json(data);
  } catch (error) {
    console.error("Spotify auth error:", error);
    res.status(error.status || 500).json({
      error: error.message || "Spotify token exchange failed",
      details: error.details ?? null
    });
  }
});

app.post("/api/spotify/refresh", async (req, res) => {
  try {
    ensureSpotifyCredentials();
    const { refreshToken } = req.body ?? {};
    if (!refreshToken) {
      return res.status(400).json({ error: "refreshToken is required" });
    }

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken
    });

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`
      },
      body: params.toString()
    });

    const data = await response.json();
    if (!response.ok) {
      const message = data?.error_description || data?.error || "Spotify token refresh failed";
      return res.status(response.status || 500).json({
        error: message,
        details: data
      });
    }

    res.json(data);
  } catch (error) {
    console.error("Spotify refresh error:", error);
    res.status(error.status || 500).json({
      error: error.message || "Spotify refresh failed",
      details: error.details ?? null
    });
  }
});

app.get("/api/openai/status", (req, res) => {
  res.json({
    hasApiKey: Boolean(OPENAI_API_KEY),
    defaultModel: OPENAI_DEFAULT_MODEL || null
  });
});

app.post("/api/openai/chat", async (req, res) => {
  try {
    ensureOpenAiCredentials();

    const { messages, systemPrompt, userPrompt, model, temperature, maxTokens } = req.body ?? {};

    let preparedMessages = [];
    if (Array.isArray(messages) && messages.length > 0) {
      preparedMessages = messages
        .map(msg => ({
          role: typeof msg?.role === "string" ? msg.role : "user",
          content: typeof msg?.content === "string" ? msg.content : ""
        }))
        .filter(msg => msg.content);
    } else if (typeof systemPrompt === "string" || typeof userPrompt === "string") {
      if (!systemPrompt || !userPrompt) {
        return res
          .status(400)
          .json({ error: "systemPrompt and userPrompt are required when messages are omitted" });
      }
      preparedMessages = [
        { role: "system", content: String(systemPrompt) },
        { role: "user", content: String(userPrompt) }
      ];
    } else {
      return res.status(400).json({ error: "messages or prompts are required" });
    }

    if (preparedMessages.length === 0) {
      return res.status(400).json({ error: "valid messages are required" });
    }

    const payload = {
      model:
        typeof model === "string" && model.trim()
          ? model.trim()
          : OPENAI_DEFAULT_MODEL || "gpt-4o-mini",
      messages: preparedMessages.map(msg => ({
        role: msg.role === "assistant" ? "assistant" : msg.role === "system" ? "system" : "user",
        content: msg.content
      }))
    };

    if (Number.isFinite(temperature)) {
      payload.temperature = temperature;
    }
    if (Number.isFinite(maxTokens)) {
      const rounded = Math.max(1, Math.floor(maxTokens));
      payload.max_tokens = rounded;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      const message =
        data?.error?.message || data?.error_description || data?.error || "OpenAI request failed";
      return res.status(response.status || 500).json({
        error: message,
        details: data
      });
    }

    res.json(data);
  } catch (error) {
    console.error("OpenAI chat error:", error);
    res.status(error.status || 500).json({
      error: error.message || "OpenAI request failed",
      details: error.details ?? null
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
