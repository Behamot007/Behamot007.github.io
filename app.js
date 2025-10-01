(() => {
  'use strict';

  const NAV_ITEMS = [
    { type: 'home', id: 'home', label: 'Übersicht' },
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
          label: 'Spotify-Integration',
          targetCardId: 'config-spotify'
        },
        {
          type: 'config',
          id: 'config-openai',
          label: 'OpenAI Token',
          targetCardId: 'config-openai'
        }
      ]
    },
    {
      type: 'group',
      id: 'hitster',
      label: 'Hitster Digital',
      items: [
        {
          type: 'page',
          id: 'digital-mode',
          label: 'Digital Mode',
          url: 'gameModeDigital.html',
          description: 'Vollständig digitales Hitster-Brettspiel mit Spotify-Steuerung und KI-Hilfen.'
        }
      ]
    },
    {
      type: 'group',
      id: 'everyday',
      label: 'Alltag & Planung',
      items: [
        {
          type: 'page',
          id: 'bill-splitter',
          label: 'Kostenkalkulation',
          url: 'bill-splitter.html',
          description: 'Berechne faire Anteile für gemeinsame Rechnungen und Freunde.'
        }
      ]
    },
    {
      type: 'group',
      id: 'anime',
      label: 'Anime Rätsel',
      items: [
        {
          type: 'page',
          id: 'anime-riddle',
          label: 'Rätsel Chat',
          url: 'animeCharakterdle.html',
          description: 'Errate Anime-Charaktere über das Chat-Interface mit KI-Unterstützung.'
        }
      ]
    }
  ];

  const EXTERNAL_LINKS = [];

  const CONFIG_SECTIONS = [
    {
      id: 'config-spotify',
      title: 'Spotify-Integration',
      description: 'Die Spotify-Zugangsdaten werden serverseitig verwaltet und stehen dem Digital Mode automatisch zur Verfügung.',
      platform: {
        name: 'Spotify Developer Dashboard',
        url: 'https://developer.spotify.com/dashboard/'
      },
      usage: ['Digital Mode'],
      managed: {
        message: 'Die Konfiguration erfolgt über die Backend-.env und ist im Frontend nicht sichtbar.',
        async loadStatus() {
          try {
            const response = await fetch('/api/spotify/config', {
              method: 'GET',
              headers: { 'Accept': 'application/json' }
            });
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data?.error || 'Status konnte nicht geladen werden');
            }
            if (!data?.clientId) {
              return { text: '❌ Keine Spotify Client-ID im Backend hinterlegt.', variant: 'error' };
            }
            if (!data?.hasClientSecret) {
              return { text: '⚠️ Client-ID vorhanden, aber kein Client-Secret konfiguriert.', variant: 'warning' };
            }
            return { text: '✅ Spotify-Zugangsdaten werden serverseitig bereitgestellt.', variant: 'success' };
          } catch (error) {
            console.error('Spotify Status Fehler:', error);
            return { text: '❌ Spotify-Status konnte nicht geladen werden.', variant: 'error' };
          }
        }
      }
    },
    {
      id: 'config-openai',
      title: 'OpenAI Token',
      description: 'Der OpenAI-Schlüssel liegt ausschließlich im Backend. Browser-Clients greifen über geschützte API-Endpunkte zu.',
      platform: {
        name: 'OpenAI Platform',
        url: 'https://platform.openai.com/account/api-keys'
      },
      usage: ['Anime Charakter Rätsel', 'Kostenkalkulation (Bon-Scan)', 'Digital Mode (KI-Hinweise)'],
      managed: {
        message: 'Der Schlüssel ist nicht im Browser gespeichert und bleibt verborgen.',
        async loadStatus() {
          if (!window.openAiClient || typeof window.openAiClient.getStatus !== 'function') {
            return { text: '❌ OpenAI-Client im Frontend nicht verfügbar.', variant: 'error' };
          }
          try {
            const status = await window.openAiClient.getStatus();
            if (!status?.hasApiKey) {
              return { text: '❌ Kein OpenAI-API-Key im Backend hinterlegt.', variant: 'error' };
            }
            const modelInfo = status?.defaultModel ? ` (Standardmodell: ${status.defaultModel})` : '';
            return { text: `✅ Backend stellt den OpenAI-Zugang bereit${modelInfo}.`, variant: 'success' };
          } catch (error) {
            console.error('OpenAI Status Fehler:', error);
            return { text: '❌ OpenAI-Status konnte nicht geladen werden.', variant: 'error' };
          }
        }
      }
    }
  ];

  const navContainer = document.getElementById('mainNav');
  const navToggleButton = document.getElementById('navToggle');
  const mobileNavQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 720px)')
      : null;
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
  const frameViewEl = viewMap.frame;

  const navIndex = new Map();
  const navButtons = new Map();
  const groupElements = new Map();
  const configCards = new Map();

  let activeNavId = null;
  let currentFrameUrl = '';
  let highlightTimeout = null;
  let isMobileNavOpen = false;

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

  function isMobileViewport() {
    if (mobileNavQuery) {
      return mobileNavQuery.matches;
    }
    return typeof window !== 'undefined' ? window.innerWidth <= 720 : false;
  }

  function setMobileNavState(open) {
    isMobileNavOpen = open;
    if (navToggleButton) {
      navToggleButton.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggleButton.classList.toggle('is-active', open);
    }
    if (navContainer) {
      navContainer.classList.toggle('main-nav--open', open);
    }
  }

  function toggleMobileNav(force) {
    const shouldOpen = typeof force === 'boolean' ? force : !isMobileNavOpen;
    setMobileNavState(shouldOpen);
    if (!shouldOpen) {
      closeAllGroups();
    }
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

    if (isMobileViewport()) {
      toggleMobileNav(false);
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
    if (frameViewEl) {
      frameViewEl.classList.remove('view--frame-header-hidden');
    }
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
        const scrollOptions = { behavior: 'smooth', block: 'center' };
        if (options.ensureVisible) {
          element.scrollIntoView(scrollOptions);
        } else {
          element.scrollIntoView(scrollOptions);
        }
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

    if (frameViewEl) {
      frameViewEl.classList.remove('view--frame-header-hidden');
    }

    if (item.description) {
      frameDescriptionEl.textContent = item.description;
      frameDescriptionEl.hidden = false;
    } else {
      frameDescriptionEl.textContent = '';
      frameDescriptionEl.hidden = true;
    }

    currentFrameUrl = item.url || '';
    if (currentFrameUrl) {
      openExternalBtn.hidden = false;
    } else {
      openExternalBtn.hidden = true;
    }

    if (frameEl.dataset.src !== currentFrameUrl) {
      frameEl.classList.add('content-frame--loading');
      frameEl.dataset.src = currentFrameUrl;
      frameEl.src = currentFrameUrl || 'about:blank';
    } else {
      handleFrameLoad();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleFrameLoad() {
    frameEl.classList.remove('content-frame--loading');

    if (!frameViewEl) return;

    try {
      const doc = frameEl.contentDocument;
      if (!doc) {
        frameViewEl.classList.remove('view--frame-header-hidden');
        return;
      }

      const hasPageHeader = Boolean(
        doc.querySelector('header, .page-header, .app-header, [data-page-header]')
      );

      frameViewEl.classList.toggle('view--frame-header-hidden', hasPageHeader);
    } catch (error) {
      frameViewEl.classList.remove('view--frame-header-hidden');
    }
  }

  function buildConfigCards() {
    if (!configGridEl) return;
    configGridEl.innerHTML = '';
    configCards.clear();

    CONFIG_SECTIONS.forEach(section => {
      const card = document.createElement('article');
      card.className = 'config-card';
      card.id = section.id;

      const header = document.createElement('div');
      header.className = 'config-card__header';

      const title = document.createElement('h2');
      title.className = 'config-card__title';
      title.textContent = section.title;
      header.appendChild(title);

      if (section.platform) {
        const link = document.createElement('a');
        link.className = 'config-card__link';
        link.href = section.platform.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = section.platform.name;
        header.appendChild(link);
      }

      card.appendChild(header);

      if (section.description) {
        const description = document.createElement('p');
        description.className = 'config-card__description';
        description.textContent = section.description;
        card.appendChild(description);
      }

      if (Array.isArray(section.usage) && section.usage.length > 0) {
        const usageWrapper = document.createElement('div');
        usageWrapper.className = 'config-card__usage';
        section.usage.forEach(text => {
          const chip = document.createElement('span');
          chip.className = 'config-usage-chip';
          chip.textContent = text;
          usageWrapper.appendChild(chip);
        });
        card.appendChild(usageWrapper);
      }

      const fieldsWrapper = document.createElement('div');
      fieldsWrapper.className = 'config-card__fields';
      const inputs = [];
      let managedStatusEl = null;

      if (Array.isArray(section.fields) && section.fields.length > 0) {
        section.fields.forEach(field => {
          const fieldId = `${section.id}-${field.id}`;
          const label = document.createElement('label');
          label.className = 'config-card__field';
          label.setAttribute('for', fieldId);

          const caption = document.createElement('span');
          caption.textContent = field.label;
          label.appendChild(caption);

          const input = field.multiline ? document.createElement('textarea') : document.createElement('input');
          input.id = fieldId;
          if (!field.multiline) {
            input.type = field.type || 'text';
          }
          input.placeholder = field.placeholder || '';
          input.dataset.storageKey = field.storageKey;
          input.value = localStorage.getItem(field.storageKey) || '';
          input.setAttribute('autocomplete', field.autocomplete || 'off');
          if (field.maxLength) input.maxLength = field.maxLength;
          if (field.spellcheck === false) input.spellcheck = false;

          label.appendChild(input);
          fieldsWrapper.appendChild(label);
          inputs.push(input);
        });
      } else if (section.managed) {
        fieldsWrapper.classList.add('config-card__fields--managed');
        if (section.managed.message) {
          const info = document.createElement('p');
          info.className = 'config-card__managed-hint';
          info.textContent = section.managed.message;
          fieldsWrapper.appendChild(info);
        }
        if (typeof section.managed.loadStatus === 'function') {
          managedStatusEl = document.createElement('p');
          managedStatusEl.className = 'config-card__managed-status';
          managedStatusEl.textContent = 'Status wird geladen…';
          fieldsWrapper.appendChild(managedStatusEl);

          Promise.resolve()
            .then(() => section.managed.loadStatus())
            .then(result => {
              if (!managedStatusEl) return;
              if (result?.text) managedStatusEl.textContent = result.text;
              managedStatusEl.dataset.status = result?.variant || 'info';
            })
            .catch(error => {
              console.error('Status Fehler:', error);
              if (managedStatusEl) {
                managedStatusEl.textContent = '❌ Status konnte nicht geladen werden.';
                managedStatusEl.dataset.status = 'error';
              }
            });
        }
      }

      if (fieldsWrapper.childElementCount > 0) {
        card.appendChild(fieldsWrapper);
      }

      if (inputs.length > 0) {
        const actions = document.createElement('div');
        actions.className = 'config-card__actions';

        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'button button--accent';
        saveButton.textContent = section.saveLabel || 'Speichern';
        actions.appendChild(saveButton);

        const status = document.createElement('span');
        status.className = 'config-card__status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        actions.appendChild(status);

        card.appendChild(actions);

        saveButton.addEventListener('click', () => {
          inputs.forEach(input => {
            const key = input.dataset.storageKey;
            if (!key) return;
            localStorage.setItem(key, input.value.trim());
          });
          status.textContent = 'Gespeichert.';
          card.classList.add('config-card--saved');
          window.setTimeout(() => card.classList.remove('config-card--saved'), 700);
          window.setTimeout(() => {
            if (status.textContent === 'Gespeichert.') status.textContent = '';
          }, 3200);
        });

        inputs.forEach(input => {
          input.addEventListener('input', () => {
            status.textContent = '';
          });
        });

        configCards.set(section.id, { element: card, inputs, status });
      } else {
        configCards.set(section.id, { element: card, inputs: [], status: managedStatusEl });
      }

      configGridEl.appendChild(card);
    });
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
    frameEl.addEventListener('load', handleFrameLoad);

    openExternalBtn.addEventListener('click', () => {
      if (!currentFrameUrl) return;
      window.open(currentFrameUrl, '_blank', 'noopener');
    });
  }

  function bindOutsideClick() {
    document.addEventListener('click', evt => {
      const clickedInsideNav = navContainer ? navContainer.contains(evt.target) : false;
      const clickedToggle = navToggleButton ? navToggleButton.contains(evt.target) : false;
      if (clickedInsideNav || clickedToggle) return;

      closeAllGroups();
      if (isMobileNavOpen && isMobileViewport()) {
        toggleMobileNav(false);
      }
    });
  }

  function bindMobileNavigation() {
    if (!navToggleButton) return;

    setMobileNavState(false);

    navToggleButton.addEventListener('click', () => {
      toggleMobileNav();
    });

    if (navContainer) {
      navContainer.addEventListener('click', evt => {
        const link = evt.target.closest('a.nav-button--link');
        if (link && isMobileViewport()) {
          toggleMobileNav(false);
        }
      });
    }

    const handleBreakpointChange = event => {
      if (!event.matches) {
        toggleMobileNav(false);
      }
    };

    if (mobileNavQuery) {
      if (typeof mobileNavQuery.addEventListener === 'function') {
        mobileNavQuery.addEventListener('change', handleBreakpointChange);
      } else if (typeof mobileNavQuery.addListener === 'function') {
        mobileNavQuery.addListener(handleBreakpointChange);
      }
    }

    document.addEventListener('keydown', evt => {
      if (evt.key === 'Escape' && isMobileNavOpen && isMobileViewport()) {
        toggleMobileNav(false);
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
    buildConfigCards();
    bindNavTargets();
    bindFrameLoading();
    bindMobileNavigation();
    bindOutsideClick();
    handleHashNavigation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
