export const HOME_ENTRY = { type: 'home', id: 'home', label: 'Übersicht' };

export const NAV_GROUPS = [
  {
    type: 'group',
    id: 'config',
    label: 'Konfigurationen',
    highlight: true,
    items: [
      { type: 'config', id: 'config-overview', label: 'Übersicht' },
      {
        type: 'config',
        id: 'config-spotify',
        label: 'Spotify & Hitster',
        targetCardId: 'config-spotify'
      },
      {
        type: 'config',
        id: 'config-openai',
        label: 'OpenAI Token',
        targetCardId: 'config-openai'
      },
      {
        type: 'config',
        id: 'config-riot',
        label: 'Riot Games API',
        targetCardId: 'config-riot'
      }
    ]
  },
  {
    type: 'group',
    id: 'arena',
    label: 'Arena Tools',
    items: [
      {
        type: 'page',
        id: 'arena-stats',
        label: 'Arena Stats',
        url: 'arena-stats.html',
        description: 'Analysiere aktuelle Arena-Spiele direkt über die Riot Games API.'
      },
      {
        type: 'page',
        id: 'arena-analyzer',
        label: 'Arena Match Analyzer',
        url: 'arena-match-history.html',
        description: 'Untersuche exportierte Datensätze aus Arena Stats und entdecke Muster.'
      }
    ]
  },
  {
    type: 'group',
    id: 'hitster',
    label: 'Hitster & Spotify',
    items: [
      {
        type: 'page',
        id: 'generator',
        label: 'Playlist → QR Cards',
        url: 'generator.html',
        description: 'Wandle Spotify-Playlists in Hitster-Karten mit QR-Codes um.'
      },
      {
        type: 'page',
        id: 'play-screen',
        label: 'Play Screen',
        url: 'gameModeScan.html',
        description: 'Begleitender Bildschirm für analoge Hitster-Runden.'
      },
      {
        type: 'page',
        id: 'digital-mode',
        label: 'Digital Mode',
        url: 'gameModeDigital.html',
        description: 'Vollständig digitales Hitster-Brettspiel für Remote-Runden.'
      }
    ]
  },
  {
    type: 'group',
    id: 'anime',
    label: 'Anime Charakter',
    items: [
      {
        type: 'page',
        id: 'anime-riddle',
        label: 'Rätsel Chat',
        url: 'animeCharakterdle.html',
        description: 'Errate Anime-Charaktere über das Chat-Interface mit KI-Unterstützung.'
      },
      {
        type: 'page',
        id: 'anime-dataset',
        label: 'Dataset Verwaltung',
        url: 'anime-dataset/public/index.html',
        description: 'Pflege und erweitere den Charakter-Datensatz direkt im Browser.'
      },
      {
        type: 'page',
        id: 'anime-dataset-game',
        label: 'Dataset Guess Game',
        url: 'anime-dataset/public/game.html',
        description: 'Nutze den Datensatz für eine schnelle Ratesession ohne Chat.'
      }
    ]
  }
];

export const DEV_GROUP = {
  type: 'group',
  id: 'dev',
  label: 'Dev',
  items: [
    {
      type: 'page',
      id: 'anidle',
      label: 'Anidle',
      url: 'anidle.html',
      description: 'Idle-Game-Experiment für kurze Pausen.'
    },
    {
      type: 'page',
      id: 'anidle-debug',
      label: 'Anidle Debug',
      url: 'anidleDebug.html',
      description: 'Debug-Ansicht mit tieferen Einsichten in Anidle-Läufe.'
    },
    {
      type: 'page',
      id: 'legacy-config',
      label: 'Standalone Konfiguration',
      url: 'config.html',
      description: 'Separate Konfigurationsoberfläche aus einer frühen Toolkit-Version.'
    },
    {
      type: 'page',
      id: 'debug-log',
      label: 'Debug Log',
      url: 'debugLog.html',
      description: 'Zeige gespeicherte Debug-Informationen direkt im Browser an.'
    }
  ]
};

export const EXTERNAL_LINKS = [
  {
    id: 'contact',
    label: 'Kontakt',
    url: 'https://github.com/Behamot007/Behamot007.github.io/discussions',
    target: '_blank',
    rel: 'noopener noreferrer',
    title: 'Feedback & Verbesserungen auf GitHub diskutieren'
  }
];
