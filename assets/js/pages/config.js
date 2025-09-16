import { renderSimpleNavigation } from '../modules/simpleNav.js';
import { CONFIG_SECTIONS } from '../data/configSections.js';
import { renderConfigCards } from '../modules/configCards.js';

function init() {
  renderSimpleNavigation('#globalNav', 'config');
  const grid = document.getElementById('configGrid');
  renderConfigCards(grid, CONFIG_SECTIONS);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
