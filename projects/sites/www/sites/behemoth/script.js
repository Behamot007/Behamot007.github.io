const header = document.querySelector('.site-header');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelectorAll('#primaryNav a');
const yearLabel = document.getElementById('currentYear');

const setYear = () => {
  if (yearLabel) {
    const year = new Date().getFullYear();
    yearLabel.textContent = year;
  }
};

const closeNav = () => {
  if (header && header.dataset.navState === 'open') {
    header.dataset.navState = 'closed';
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', 'false');
    }
  }
};

const toggleNav = () => {
  if (!header || !navToggle) return;
  const isOpen = header.dataset.navState === 'open';
  header.dataset.navState = isOpen ? 'closed' : 'open';
  navToggle.setAttribute('aria-expanded', String(!isOpen));
};

const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    closeNav();
  }
};

setYear();

document.addEventListener('keydown', handleKeyDown);

if (navToggle) {
  navToggle.addEventListener('click', toggleNav);
}

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    closeNav();
  });
});

document.addEventListener('click', (event) => {
  if (!header || header.dataset.navState !== 'open') return;
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  if (!header.contains(target)) {
    closeNav();
  }
});
