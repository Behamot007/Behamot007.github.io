const cardGrid = document.getElementById('cardGrid');
let bgDataUrl = "";

document.getElementById('bgInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    bgDataUrl = reader.result;
    log("Hintergrundbild geladen");
  };
  reader.readAsDataURL(file);
});

function renderCards(tracks, aiInfos, useAI) {
  cardGrid.innerHTML = "";
  tracks.forEach(track => {
    // erstes Paar: QR + gewählter Hintergrund
    const card1 = document.createElement("div");
    card1.className = "card qr";
    if (bgDataUrl) card1.style.backgroundImage = `url(${bgDataUrl})`;

    const canvas = document.createElement("canvas");
    QRCode.toCanvas(canvas, track.url, {
      width: 150
    });

    card1.appendChild(canvas);
    cardGrid.appendChild(card1);

    // zweites Paar: Infos + Album-Cover, untereinander
    const card2 = document.createElement("div");
    card2.className = "card";
    if (track.cover) card2.style.backgroundImage = `url(${track.cover})`;

    const title = document.createElement("div");
    title.className = "song-title editable";
    title.contentEditable = true;
    title.textContent = track.name;

    const artist = document.createElement("div");
    artist.className = "artist editable";
    artist.contentEditable = true;
    artist.textContent = track.artist;

    let animeText;
    if (useAI) {
      const info = aiInfos.find(i => i.song.toLowerCase().includes(track.name.toLowerCase())) || {};
      animeText = info.anime ? `${info.anime} – ${info.type}` : "Anime unbekannt";
    } else {
      animeText = "Anime unbekannt – Opening/Ending";
    }

    const anime = document.createElement("div");
    anime.className = "anime editable";
    anime.contentEditable = true;
    anime.textContent = animeText;

    card2.appendChild(title);
    card2.appendChild(artist);
    card2.appendChild(anime);
    cardGrid.appendChild(card2);
  });
}
