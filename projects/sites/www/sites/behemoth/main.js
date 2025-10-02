const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.documentElement.classList.toggle('reduced-motion', prefersReducedMotion);

const bodyDataset = document.body.dataset;
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
const navLinks = document.querySelectorAll('[data-nav]');
const sections = document.querySelectorAll('main section');
const backToTop = document.querySelector('.back-to-top');
const accordion = document.querySelector('[data-accordion]');
const yearTarget = document.getElementById('year');
const hero = document.getElementById('hero');
const heroFigure = document.querySelector('[data-parallax]');

if (yearTarget) {
  yearTarget.textContent = new Date().getFullYear();
}

// Navigation toggle for mobile
if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    siteNav.classList.toggle('open');
  });

  siteNav.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      navToggle.setAttribute('aria-expanded', 'false');
      siteNav.classList.remove('open');
    }
  });
}

// Active navigation state based on scroll
const setActiveNav = (id) => {
  navLinks.forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return;
    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
  });
};

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        if (id) {
          setActiveNav(id);
        }
      }
    });
  },
  {
    rootMargin: '-40% 0px -55% 0px',
    threshold: 0,
  },
);

sections.forEach((section) => sectionObserver.observe(section));

// Fade-in animations
if (!prefersReducedMotion) {
  const animateObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 },
  );

  document.querySelectorAll('[data-animate]').forEach((el) => animateObserver.observe(el));
} else {
  document.querySelectorAll('[data-animate]').forEach((el) => el.classList.add('is-visible'));
}

// Back to top visibility
const toggleBackToTop = () => {
  if (!backToTop) return;
  const shouldShow = window.scrollY > window.innerHeight * 0.4;
  backToTop.classList.toggle('visible', shouldShow);
};

if (backToTop) {
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });
  window.addEventListener('scroll', toggleBackToTop, { passive: true });
  toggleBackToTop();
}

// Accordion logic
if (accordion) {
  const trigger = accordion.querySelector('.accordion-trigger');
  const panel = accordion.querySelector('.accordion-panel');

  if (trigger && panel) {
    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!expanded));
      panel.setAttribute('aria-hidden', String(expanded));
      panel.style.maxHeight = expanded ? '' : `${panel.scrollHeight}px`;
    });
  }
}

// Helper to inject HTML safely into card
const renderEmbed = (container, html) => {
  if (!container) return;
  container.classList.add('card--loaded');
  const body = container.querySelector('.card-body');
  if (!body) return;
  body.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'embed-content';
  wrapper.innerHTML = html;
  body.appendChild(wrapper);
};

// Twitter oEmbed loading
const loadTweet = async (containerId, url) => {
  if (!url) return;
  const container = document.getElementById(containerId);
  if (!container) return;
  const body = container.querySelector('.card-body');
  if (!body) return;
  body.innerHTML = '<p>Lade Beitrag…</p>';
  try {
    const response = await fetch(`https://publish.twitter.com/oembed?omit_script=1&dnt=1&theme=light&lang=de&url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error('oEmbed fehlgeschlagen');
    const data = await response.json();
    renderEmbed(container, data.html);
  } catch (error) {
    body.innerHTML = '<p>Der Beitrag konnte nicht geladen werden. Bitte direkt auf X ansehen.</p>';
  }
};

loadTweet('x-pinned', bodyDataset.xPinnedUrl);
loadTweet('x-latest', bodyDataset.xLatestUrl);

// TikTok embed
const loadTikTok = () => {
  const url = bodyDataset.tiktokLatest;
  if (!url) return;
  const container = document.getElementById('tiktok-card');
  if (!container) return;
  const body = container.querySelector('.card-body');
  if (!body) return;
  body.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'embed-content';

  // Expect full TikTok URL; extract video ID for blockquote
  const videoIdMatch = url.match(/video\/(\d+)/);
  const videoId = videoIdMatch ? videoIdMatch[1] : '';
  wrapper.innerHTML = `
    <blockquote class="tiktok-embed" cite="${url}" data-video-id="${videoId}" style="max-width: 605px; min-width: 325px;">
      <section></section>
    </blockquote>
  `;
  body.appendChild(wrapper);

  if (!document.querySelector('script[src="https://www.tiktok.com/embed.js"]')) {
    const script = document.createElement('script');
    script.src = 'https://www.tiktok.com/embed.js';
    script.async = true;
    document.body.appendChild(script);
  }
};

loadTikTok();

// YouTube embed
const loadYouTube = () => {
  const videoId = bodyDataset.youtubeVideoId;
  const container = document.getElementById('youtube-card');
  if (!container) return;
  const body = container.querySelector('.card-body');
  if (!body) return;
  if (!videoId) return;

  body.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'aspect-video frame';
  wrapper.innerHTML = `
    <iframe class="w-full h-full" src="https://www.youtube.com/embed/${videoId}" title="Behamot Trailer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  `;
  body.appendChild(wrapper);
};

loadYouTube();

// Twitch offline fallback placeholder (optional manual toggle)
const offlineMessage = document.querySelector('.offline-message');
if (offlineMessage) {
  offlineMessage.hidden = true;
}

// Parallax effect on hero figure and ornaments
if (!prefersReducedMotion && hero && heroFigure) {
  hero.setAttribute('data-parallax-active', 'true');
  const ornaments = hero.querySelectorAll('.hero-ornament');
  const parallaxHandler = (event) => {
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    heroFigure.style.transform = `translate3d(${x * 12}px, ${y * 12}px, 0)`;
    ornaments.forEach((ornament, index) => {
      const factor = (index + 1) * 6;
      const base = ornament.dataset.baseTransform || '';
      const translation = `translate3d(${x * factor}px, ${y * factor}px, 0)`;
      ornament.style.transform = `${translation} ${base}`.trim();
    });
  };

  hero.addEventListener('mousemove', parallaxHandler);

  hero.addEventListener('mouseleave', () => {
    heroFigure.style.transform = '';
    ornaments.forEach((ornament) => {
      ornament.style.transform = ornament.dataset.baseTransform || '';
    });
  });
}

// Close nav when resizing from mobile to desktop
let lastIsDesktop = window.innerWidth >= 940;
window.addEventListener('resize', () => {
  const isDesktop = window.innerWidth >= 940;
  if (isDesktop !== lastIsDesktop) {
    lastIsDesktop = isDesktop;
    if (isDesktop) {
      siteNav?.classList.remove('open');
      navToggle?.setAttribute('aria-expanded', 'false');
    }
  }
});

