export const CONFIG_SECTIONS = [
  {
    id: 'config-spotify',
    title: 'Spotify & Hitster',
    description:
      'Client-ID und Secret werden für die Playlist-Generatoren sowie die Hitster-Oberflächen benötigt.',
    platform: {
      name: 'Spotify Developer Dashboard',
      url: 'https://developer.spotify.com/dashboard/'
    },
    usage: ['Playlist → QR Cards', 'Play Screen', 'Digital Mode'],
    fields: [
      {
        id: 'client-id',
        label: 'Client ID',
        storageKey: 'CLIENT_ID',
        placeholder: 'z. B. 1234abcd…',
        autocomplete: 'off'
      },
      {
        id: 'client-secret',
        label: 'Client Secret',
        storageKey: 'CLIENT_SECRET',
        type: 'password',
        placeholder: 'Client Secret',
        autocomplete: 'off'
      }
    ]
  },
  {
    id: 'config-openai',
    title: 'OpenAI Token',
    description: 'Token für OpenAI/ChatGPT – wird u. a. vom Anime Charakterdle verwendet.',
    platform: {
      name: 'OpenAI Platform',
      url: 'https://platform.openai.com/account/api-keys'
    },
    usage: ['Anime Charakter Rätsel', 'Anime Dataset Tools'],
    fields: [
      {
        id: 'openai-token',
        label: 'API Token',
        storageKey: 'OPENAPI_TOKEN',
        type: 'password',
        placeholder: 'sk-…',
        autocomplete: 'off'
      }
    ]
  },
  {
    id: 'config-riot',
    title: 'Riot Games API',
    description:
      'API-Key für League of Legends – notwendig für Arena Stats. Wird automatisch in das Tool übernommen.',
    platform: {
      name: 'Riot Developer Portal',
      url: 'https://developer.riotgames.com/'
    },
    usage: ['Arena Stats', 'Arena Match Analyzer'],
    fields: [
      {
        id: 'riot-api',
        label: 'Riot API-Key',
        storageKey: 'RIOT_API_KEY',
        type: 'password',
        placeholder: 'RGAPI-xxxx-xxxx-xxxx',
        autocomplete: 'off'
      }
    ]
  }
];
