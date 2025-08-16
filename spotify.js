function extractPlaylistId(url) {
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

async function getSpotifyAccessToken() {
  console.log("Hole Spotify Access Token...");
  const CLIENT_ID = localStorage.getItem("CLIENT_ID");
  const CLIENT_SECRET = localStorage.getItem("CLIENT_SECRET");
  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + btoa(CLIENT_ID + ":" + CLIENT_SECRET)
    },
    body: "grant_type=client_credentials"
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error("Spotify Token Fehler: " + JSON.stringify(data));
  try {
    log("Spotify Token erhalten");
  } catch {
    console.log("Spotify Token erhalten");
  }
  return data.access_token;
}

async function getPlaylistTracks(playlistId, token) {
  try {
    log("Lade Playlist-Daten...");
  } catch {
    console.log("Lade Playlist-Daten...");
  }

  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
  let tracks = [];

  while (url) {
    const resp = await fetch(url, {
      headers: {
        Authorization: "Bearer " + token
      }
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error("Spotify Tracks Fehler: " + JSON.stringify(data));

    data.items.forEach(item => {
      if (item.track) {
        const album = item.track.album || {};
        const releaseDate = album.release_date || "";
        const year = releaseDate ? releaseDate.slice(0, 4) : "unknown";

        tracks.push({
          name: item.track.name,
          artist: item.track.artists.map(a => a.name).join(", "),
          url: item.track.external_urls.spotify,
          cover: album.images?.[0]?.url || "",
          year: year
        });
      }
    });

    url = data.next;
  }

  try {
    log(`Gefundene Songs: ${tracks.length}`);
  } catch {
    console.log(`Gefundene Songs: ${tracks.length}`);
  }
  return tracks;
}