import { SITE_LINKS } from '../data/siteLinks.js';

export function renderSimpleNavigation(container, activeId) {
  const nav = typeof container === 'string' ? document.querySelector(container) : container;
  if (!nav) return;

  nav.innerHTML = '';

  SITE_LINKS.forEach(link => {
    const anchor = document.createElement('a');
    anchor.className = 'nav-button';
    anchor.textContent = link.label;
    anchor.href = link.url;

    if (link.external) {
      anchor.target = link.target || '_blank';
      anchor.rel = link.rel || 'noopener noreferrer';
      anchor.classList.add('nav-button--link');
    }

    if (link.id === activeId) {
      anchor.classList.add('is-active');
      anchor.setAttribute('aria-current', 'page');
    }

    nav.appendChild(anchor);
  });
}
