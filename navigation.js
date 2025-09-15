function buildNavigation(containerId) {
  const nav = document.getElementById(containerId);
  if (!nav || typeof pages === 'undefined') return;
  pages.forEach(page => {
    const a = document.createElement('a');
    a.href = page.url;
    a.textContent = page.title;
    nav.appendChild(a);
  });
}
