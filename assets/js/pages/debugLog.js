import { renderSimpleNavigation } from '../modules/simpleNav.js';
import { createLogger } from '../modules/logger.js';
import { fetchAnimeQuizHints } from '../modules/aiClient.js';

const logElement = document.getElementById('log');
const runDemoButton = document.getElementById('runDemo');

const logger = createLogger(logElement);

async function runDemo() {
  logger.clear();
  logger.log('Starte Demo für fetchAnimeQuizHints…');
  try {
    const result = await fetchAnimeQuizHints({
      title: 'Rakudai Kishi no Cavalry',
      description:
        "There exist few humans in this world with the ability to manipulate their souls to form powerful weapons. Dubbed 'Blazers', these people study and train at the prestigious Hagun Academy to become Mage-Knights." 
    });
    logger.log(result);
  } catch (error) {
    logger.log(`❌ Fehler: ${error.message}`);
  }
}

function init() {
  renderSimpleNavigation('#globalNav', 'debug-log');
  if (runDemoButton) {
    runDemoButton.addEventListener('click', runDemo);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
