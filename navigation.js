function buildNavigation(containerId) {
  const nav = document.getElementById(containerId);
  if (!nav || typeof pages === 'undefined') return;
  pages.forEach(page => {
    const a = document.createElement('a');
    a.href = page.url;
    a.textContent = page.title;
    if (/^https?:/i.test(page.url)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    nav.appendChild(a);
  });
}
