import { renderSimpleNavigation } from '../modules/simpleNav.js';

function init() {
  const statusDiv = document.getElementById('status');
  const openingContainer = document.getElementById('openingContainer');
  const openingNav = document.getElementById('openingNav');
  const prevBtn = document.getElementById('prevOpening');
  const nextBtn = document.getElementById('nextOpening');
  const charakterContainer = document.getElementById('charakterContainer');
  const revealCharBtn = document.getElementById('revealChar');
  const coverContainer = document.getElementById('coverContainer');
  const revealCoverBtn = document.getElementById('revealCover');
  const scoreDiv = document.getElementById('score');
  const roundDiv = document.getElementById('round');
  const nextRoundBtn = document.getElementById('nextRound');
  const newGameBtn = document.getElementById('newGame');
  const finalResultDiv = document.getElementById('finalResult');
  const answerSelect = document.getElementById('answerSelect');
  const submitAnswerBtn = document.getElementById('submitAnswer');
  const answerFeedback = document.getElementById('answerFeedback');

  let allAnime = [];
  let usedAnimeIds = [];
  let currentOpenings = [];
  let currentOpeningIndex = 0;
  let characters = [];
  let charIndex = 0;
  let score = 100;
  let round = 1;
  const maxRounds = 4;
  let totalScore = 0;
  let currentAnimeTitle = '';
  let answeredCorrectly = false;

  function loadSession() {
    totalScore = parseInt(localStorage.getItem('animeGameTotalScore')) || 0;
    round = parseInt(localStorage.getItem('animeGameRound')) || 1;
  }

  function saveSession() {
    localStorage.setItem('animeGameTotalScore', totalScore);
    localStorage.setItem('animeGameRound', round);
  }

  function updateScore(points) {
    score -= points;
    if (score < 0) score = 0;
    scoreDiv.textContent = `Punkte: ${score}`;
  }

  async function loadAllAnime() {
    allAnime = [];
    for (let page = 1; page <= 5; page += 1) {
      try {
        const res = await fetch(`https://api.jikan.moe/v4/top/anime?page=${page}&limit=25`);
        if (!res.ok) continue;
        const data = await res.json();
        if (data && data.data) allAnime = allAnime.concat(data.data);
        await new Promise(r => setTimeout(r, 1200));
      } catch (e) {
        console.error(e);
      }
    }
    pickRandomAnime();
    populateAnswerSelect();
    statusDiv.textContent = 'Fertig! Wähle zufälligen Anime...';
  }

  function pickRandomAnime() {
    const remaining = allAnime.filter(a => !usedAnimeIds.includes(a.mal_id));
    if (remaining.length === 0) {
      console.log('Keine neuen Animes mehr verfügbar');
      return;
    }
    const randomAnime = remaining[Math.floor(Math.random() * remaining.length)];
    usedAnimeIds.push(randomAnime.mal_id);
    currentAnimeTitle = randomAnime.title;
    populateAnswerSelect();
    loadAnimeDetails(randomAnime.mal_id);
  }

  function populateAnswerSelect() {
    answerSelect.innerHTML = '<option value="">Anime auswählen</option>';
    const titles = allAnime.map(a => a.title);
    titles.sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
    titles.forEach(title => {
      const option = document.createElement('option');
      option.value = title;
      option.textContent = title;
      answerSelect.appendChild(option);
    });
  }

  async function loadAnimeDetails(animeId) {
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime/${animeId}/full`);
      const data = await res.json();
      const anime = data.data;
      currentAnimeTitle = anime.title;
      answeredCorrectly = false;

      currentOpenings = anime.opening_themes || [];
      currentOpeningIndex = 0;
      showOpening();

      const charRes = await fetch(`https://api.jikan.moe/v4/anime/${animeId}/characters`);
      const charData = await charRes.json();
      characters = charData.data.slice(0, 4);
      charIndex = 0;
      charakterContainer.innerHTML = '';

      coverContainer.innerHTML = '';
      if (anime.images?.jpg?.image_url) {
        coverContainer.dataset.url = anime.images.jpg.image_url;
      }

      statusDiv.textContent = `Anime für Runde ${round} geladen!`;
    } catch (err) {
      console.error(err);
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

  revealCharBtn.addEventListener('click', () => {
    if (charIndex < characters.length) {
      const c = characters[charIndex];
      const div = document.createElement('div');
      div.className = 'char-card';
      div.innerHTML = `<img src="${c.character.images.jpg.image_url}" alt="${c.character.name}"><br>${c.character.name}`;
      charakterContainer.appendChild(div);
      charIndex += 1;
      updateScore(20);
    }
  });

  revealCoverBtn.addEventListener('click', () => {
    if (coverContainer.dataset.url && coverContainer.innerHTML === '') {
      const img = document.createElement('img');
      img.src = coverContainer.dataset.url;
      coverContainer.appendChild(img);
      updateScore(30);
    }
  });

  submitAnswerBtn.addEventListener('click', () => {
    const answer = answerSelect.value;
    if (!answer) return;

    if (answer === currentAnimeTitle) {
      totalScore += score;
      answerFeedback.textContent = `Richtig! Es war ${currentAnimeTitle}. Du bekommst ${score} Punkte.`;
    } else {
      answerFeedback.textContent = `Falsch! Es war ${currentAnimeTitle}. Du bekommst 0 Punkte.`;
    }

    answeredCorrectly = true;
    nextRoundBtn.style.display = 'inline-block';
    saveSession();
  });

  function startNewGame() {
    totalScore = 0;
    round = 1;
    score = 100;
    answeredCorrectly = false;
    currentAnimeTitle = '';
    usedAnimeIds = [];

    answerFeedback.textContent = '';
    finalResultDiv.textContent = '';
    scoreDiv.textContent = `Punkte: ${score}`;
    roundDiv.textContent = `Runde: ${round} / ${maxRounds}`;
    charakterContainer.innerHTML = '';
    coverContainer.innerHTML = '';
    openingContainer.innerHTML = '';
    answerSelect.innerHTML = '<option value="">Anime auswählen</option>';

    newGameBtn.style.display = 'none';
    nextRoundBtn.style.display = 'none';

    pickRandomAnime();
  }

  function startNextRound() {
    round += 1;

    if (round > maxRounds) {
      finalResultDiv.textContent = `Spiel vorbei! Gesamtscore: ${totalScore}`;
      nextRoundBtn.style.display = 'none';
      newGameBtn.style.display = 'inline-block';
      return;
    }

    score = 100;
    answeredCorrectly = false;
    scoreDiv.textContent = `Punkte: ${score}`;
    roundDiv.textContent = `Runde: ${round} / ${maxRounds}`;
    charakterContainer.innerHTML = '';
    coverContainer.innerHTML = '';
    answerFeedback.textContent = '';
    answerSelect.innerHTML = '<option value="">Anime auswählen</option>';
    openingContainer.innerHTML = '';
    nextRoundBtn.style.display = 'none';

    pickRandomAnime();
  }

  nextRoundBtn.addEventListener('click', startNextRound);
  newGameBtn.addEventListener('click', startNewGame);

  renderSimpleNavigation('#globalNav', 'anidle');
  loadSession();
  roundDiv.textContent = `Runde: ${round} / ${maxRounds}`;
  scoreDiv.textContent = `Punkte: ${score}`;
  loadAllAnime();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
