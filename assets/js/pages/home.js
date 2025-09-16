import { HOME_ENTRY, NAV_GROUPS, DEV_GROUP, EXTERNAL_LINKS } from '../data/homeNavigation.js';
import { CONFIG_SECTIONS } from '../data/configSections.js';
import { renderConfigCards } from '../modules/configCards.js';

const searchParams = new URLSearchParams(window.location.search);
const SHOW_DEV_TOOLS = searchParams.has('dev') || searchParams.has('debug');

const NAV_ITEMS = [HOME_ENTRY, ...NAV_GROUPS];
if (SHOW_DEV_TOOLS) {
  NAV_ITEMS.push(DEV_GROUP);
}

const navContainer = document.getElementById('mainNav');
const viewMap = {
  home: document.getElementById('homeView'),
  config: document.getElementById('configView'),
  frame: document.getElementById('frameView')
};
const frameEl = document.getElementById('contentFrame');
const frameTitleEl = document.getElementById('frameTitle');
const frameDescriptionEl = document.getElementById('frameDescription');
const openExternalBtn = document.getElementById('openExternal');
const configGridEl = document.getElementById('configGrid');

const navIndex = new Map();
const navButtons = new Map();
const groupElements = new Map();
let configCards = new Map();

let activeNavId = null;
let currentFrameUrl = '';
let highlightTimeout = null;

function buildNavigation() {
  NAV_ITEMS.forEach(item => {
    if (item.type === 'home') {
      createHomeButton(item);
    } else if (item.type === 'group') {
      createGroup(item);
    }
  });

  EXTERNAL_LINKS.forEach(link => createExternalLink(link));
}

function createHomeButton(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-button';
  button.textContent = item.label;
  button.dataset.navId = item.id;
  button.addEventListener('click', () => selectNavById(item.id));

  navContainer.appendChild(button);
  navButtons.set(item.id, button);
  navIndex.set(item.id, { item, group: null });
}

function createGroup(group) {
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-group';
  if (group.highlight) wrapper.classList.add('nav-group--accent');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-group__toggle';
  toggle.textContent = group.label;
  toggle.dataset.groupId = group.id;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener('click', () => toggleGroup(group.id));

  const dropdown = document.createElement('div');
  dropdown.className = 'nav-dropdown';

  group.items.forEach(child => {
    const childBtn = document.createElement('button');
    childBtn.type = 'button';
    childBtn.className = 'nav-dropdown__item';
    childBtn.textContent = child.label;
    childBtn.dataset.navId = child.id;
    childBtn.addEventListener('click', () => {
      selectNavById(child.id);
      closeGroup(group.id);
    });

    dropdown.appendChild(childBtn);
    navButtons.set(child.id, childBtn);
    navIndex.set(child.id, { item: child, group });
  });

  wrapper.append(toggle, dropdown);
  navContainer.appendChild(wrapper);
  groupElements.set(group.id, { container: wrapper, toggle, dropdown, data: group });
}

function createExternalLink(link) {
  const anchor = document.createElement('a');
  anchor.className = 'nav-button nav-button--link';
  anchor.href = link.url;
  anchor.textContent = link.label;
  anchor.target = link.target || '_blank';
  anchor.rel = link.rel || 'noopener noreferrer';
  if (link.title) {
    anchor.title = link.title;
    anchor.setAttribute('aria-label', link.title);
  } else {
    anchor.setAttribute('aria-label', link.label);
  }
  navContainer.appendChild(anchor);
}

function toggleGroup(id) {
  const group = groupElements.get(id);
  if (!group) return;
  const isOpen = !group.container.classList.contains('open');
  closeAllGroups(id);
  if (isOpen) {
    group.container.classList.add('open');
    group.toggle.setAttribute('aria-expanded', 'true');
  } else {
    group.container.classList.remove('open');
    group.toggle.setAttribute('aria-expanded', 'false');
  }
}

function closeGroup(id) {
  const group = groupElements.get(id);
  if (!group) return;
  group.container.classList.remove('open');
  group.toggle.setAttribute('aria-expanded', 'false');
}

function closeAllGroups(exceptId) {
  groupElements.forEach((group, id) => {
    if (id === exceptId) return;
    group.container.classList.remove('open');
    group.toggle.setAttribute('aria-expanded', 'false');
  });
}

function setView(name) {
  Object.entries(viewMap).forEach(([key, view]) => {
    if (!view) return;
    if (key === name) {
      view.classList.add('view--active');
      view.removeAttribute('hidden');
    } else {
      view.classList.remove('view--active');
      view.setAttribute('hidden', '');
    }
  });
}

function selectNavById(id, options = {}) {
  const entry = navIndex.get(id);
  if (!entry) return;

  const { item } = entry;
  if (!options.force && activeNavId === id) {
    if (item.type === 'config') {
      showConfig(item.targetCardId || null, { ensureVisible: true });
    }
    return;
  }

  activeNavId = id;
  updateNavHighlight(entry, id);
  closeAllGroups();

  switch (item.type) {
    case 'home':
      showHome();
      break;
    case 'config':
      showConfig(item.targetCardId || null);
      break;
    case 'page':
      showPage(item);
      break;
    default:
      showHome();
  }

  if (options.updateHash !== false) {
    const hash = `#${id}`;
    if (window.location.hash !== hash) {
      history.replaceState(null, '', hash);
    }
  }
}

function updateNavHighlight(entry, id) {
  navButtons.forEach((btn, key) => {
    btn.classList.toggle('is-active', key === id);
  });

  groupElements.forEach(group => {
    const isActive = entry.group && entry.group.id === group.data.id;
    group.toggle.classList.toggle('is-active', isActive);
    group.container.classList.toggle('is-active', isActive);
  });
}

function showHome() {
  setView('home');
  document.title = 'Behamot Toolkit';
  frameEl.dataset.src = frameEl.dataset.src || '';
  openExternalBtn.hidden = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showConfig(targetCardId, options = {}) {
  setView('config');
  document.title = 'Behamot Toolkit – Konfigurationen';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (highlightTimeout) {
    clearTimeout(highlightTimeout);
    highlightTimeout = null;
  }

  configCards.forEach(({ element }) => element.classList.remove('config-card--focus'));

  if (targetCardId && configCards.has(targetCardId)) {
    const { element } = configCards.get(targetCardId);
    requestAnimationFrame(() => {
      element.classList.add('config-card--focus');
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightTimeout = window.setTimeout(() => {
        element.classList.remove('config-card--focus');
        highlightTimeout = null;
      }, 1600);
    });
  }
}

function showPage(item) {
  setView('frame');
  document.title = `Behamot Toolkit – ${item.label}`;
  frameTitleEl.textContent = item.label;

  if (item.description) {
    frameDescriptionEl.textContent = item.description;
    frameDescriptionEl.hidden = false;
  } else {
    frameDescriptionEl.textContent = '';
    frameDescriptionEl.hidden = true;
  }

  currentFrameUrl = item.url || '';
  openExternalBtn.hidden = !currentFrameUrl;

  if (frameEl.dataset.src !== currentFrameUrl) {
    frameEl.classList.add('content-frame--loading');
    frameEl.dataset.src = currentFrameUrl;
    frameEl.src = currentFrameUrl || 'about:blank';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildConfigView() {
  configCards = renderConfigCards(configGridEl, CONFIG_SECTIONS);
}

function bindNavTargets() {
  document.querySelectorAll('[data-nav-target]').forEach(node => {
    const target = node.getAttribute('data-nav-target');
    if (!target) return;
    node.addEventListener('click', () => {
      if (navIndex.has(target)) {
        selectNavById(target);
      }
    });
  });
}

function bindFrameLoading() {
  frameEl.addEventListener('load', () => {
    frameEl.classList.remove('content-frame--loading');
  });

  openExternalBtn.addEventListener('click', () => {
    if (!currentFrameUrl) return;
    window.open(currentFrameUrl, '_blank', 'noopener');
  });
}

function bindOutsideClick() {
  document.addEventListener('click', evt => {
    if (!navContainer.contains(evt.target)) {
      closeAllGroups();
    }
  });
}

function handleHashNavigation() {
  const initial = (window.location.hash || '').replace('#', '');
  if (initial && navIndex.has(initial)) {
    selectNavById(initial, { updateHash: false, force: true });
  } else {
    selectNavById('home', { updateHash: false, force: true });
  }

  window.addEventListener('hashchange', () => {
    const hash = (window.location.hash || '').replace('#', '');
    if (!hash) {
      selectNavById('home', { updateHash: false, force: true });
      return;
    }
    if (navIndex.has(hash)) {
      selectNavById(hash, { updateHash: false, force: true });
    }
  });
}

function start() {
  if (!navContainer) return;
  buildNavigation();
  buildConfigView();
  bindNavTargets();
  bindFrameLoading();
  bindOutsideClick();
  handleHashNavigation();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
