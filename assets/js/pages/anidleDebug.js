import { renderSimpleNavigation } from '../modules/simpleNav.js';

function init() {
  const animeSelect = document.getElementById('animeSelect');
  const bilderContainer = document.getElementById('bilderContainer');
  const charakterContainer = document.getElementById('charakterContainer');
  const openingContainer = document.getElementById('openingContainer');
  const jsonContainer = document.getElementById('jsonContainer');
  const statusDiv = document.getElementById('status');
  const prevBtn = document.getElementById('prevOpening');
  const nextBtn = document.getElementById('nextOpening');
  const openingNav = document.getElementById('openingNav');

  let currentOpenings = [];
  let currentOpeningIndex = 0;

  async function loadAnimeList() {
    animeSelect.innerHTML = '';
    statusDiv.textContent = 'Lade Anime Liste...';

    for (let page = 1; page <= 4; page += 1) {
      try {
        statusDiv.textContent = `Lade Seite ${page} von 4...`;
        const res = await fetch(`https://api.jikan.moe/v4/top/anime?page=${page}&limit=25`);
        if (!res.ok) {
          console.warn(`Seite ${page} konnte nicht geladen werden (Status ${res.status})`);
          continue;
        }
        const data = await res.json();
        if (data?.data?.length) {
          data.data.forEach(anime => {
            const opt = document.createElement('option');
            opt.value = anime.mal_id;
            opt.textContent = anime.title;
            animeSelect.appendChild(opt);
          });
        }
        await new Promise(resolve => setTimeout(resolve, 1200));
      } catch (err) {
        console.error(`Fehler beim Laden der Anime-Liste (Seite ${page}):`, err);
      }
    }
    statusDiv.textContent = 'Anime Liste geladen.';

    if (animeSelect.options.length > 0) {
      loadAnimeDetails(animeSelect.options[0].value);
    }
  }

  async function loadAnimeDetails(animeId) {
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime/${animeId}/full`);
      if (!res.ok) {
        jsonContainer.textContent = `Fehler beim Laden der Anime-Details (Status ${res.status})`;
        return;
      }
      const animeData = await res.json();
      const anime = animeData.data;

      if (!anime) {
        jsonContainer.textContent = 'Keine Daten gefunden.';
        return;
      }

      bilderContainer.innerHTML = '';
      const images = [
        anime.images?.jpg?.image_url,
        anime.images?.webp?.image_url,
        anime.images?.jpg?.large_image_url,
        anime.images?.webp?.large_image_url
      ];
      images.slice(0, 4).forEach(url => {
        if (url) {
          const img = document.createElement('img');
          img.src = url;
          bilderContainer.appendChild(img);
        }
      });

      const charRes = await fetch(`https://api.jikan.moe/v4/anime/${animeId}/characters`);
      if (charRes.ok) {
        const charData = await charRes.json();
        charakterContainer.innerHTML = '';
        charData?.data?.slice(0, 4).forEach(c => {
          const div = document.createElement('div');
          div.className = 'char-card';
          div.innerHTML = `<img src="${c.character.images.jpg.image_url}" alt="${c.character.name}"><br>${c.character.name}`;
          charakterContainer.appendChild(div);
        });
      }

      currentOpenings = anime.theme?.openings || [];
      currentOpeningIndex = 0;
      showOpening();

      jsonContainer.textContent = JSON.stringify(anime, null, 2);
    } catch (err) {
      console.error('Fehler beim Laden der Anime-Details:', err);
    }
  }

  function showOpening() {
    openingContainer.innerHTML = '';
    if (currentOpenings.length === 0) {
      openingContainer.textContent = 'Keine Opening-Infos gefunden.';
      openingNav.hidden = true;
      return;
    }

    const openingText = currentOpenings[currentOpeningIndex];
    const ytMatch = openingText.match(/https?:\/\/[^\s]+/);
    if (ytMatch) {
      openingContainer.innerHTML = `<iframe width="560" height="315" src="${ytMatch[0].replace('watch?v=', 'embed/')}" frameborder="0" allowfullscreen></iframe>`;
    } else {
      openingContainer.textContent = openingText;
    }

    openingNav.hidden = false;
  }

  prevBtn.addEventListener('click', () => {
    if (currentOpenings.length > 0) {
      currentOpeningIndex = (currentOpeningIndex - 1 + currentOpenings.length) % currentOpenings.length;
      showOpening();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentOpenings.length > 0) {
      currentOpeningIndex = (currentOpeningIndex + 1) % currentOpenings.length;
      showOpening();
    }
  });

  animeSelect.addEventListener('change', event => loadAnimeDetails(event.target.value));

  renderSimpleNavigation('#globalNav', 'anidle-debug');
  loadAnimeList();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
