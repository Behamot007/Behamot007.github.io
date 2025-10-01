const header = document.querySelector('.site-header');
const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('#siteNav');
const yearEl = document.querySelector('#year');

if (toggle && header) {
  toggle.addEventListener('click', () => {
    const isOpen = header.dataset.navState === 'open';
    header.dataset.navState = isOpen ? 'closed' : 'open';
    toggle.setAttribute('aria-expanded', String(!isOpen));
  });

  nav?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      header.dataset.navState = 'closed';
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}
