const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.documentElement.classList.toggle('reduced-motion', prefersReducedMotion);

const bodyDataset = document.body.dataset;
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
const navLinks = document.querySelectorAll('[data-nav]');
const sections = document.querySelectorAll('main section');
const backToTop = document.querySelector('.back-to-top');
const accordionGroups = document.querySelectorAll('[data-accordion-group]');
const yearTarget = document.getElementById('year');
const hero = document.getElementById('hero');
const heroFigure = document.querySelector('[data-parallax]');
const galleryItems = Array.from(document.querySelectorAll('[data-gallery-item]'));
const galleryLightbox = document.querySelector('[data-gallery-lightbox]');

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
if (accordionGroups.length > 0) {
  const accordionItems = [];

  accordionGroups.forEach((group) => {
    const items = Array.from(group.querySelectorAll('[data-accordion-item]'));
    const allowMultiple = group.hasAttribute('data-accordion-multiple');

    items.forEach((item) => {
      const trigger = item.querySelector('[data-accordion-trigger]');
      const panel = item.querySelector('[data-accordion-panel]');
      if (!trigger || !panel) return;

      const setState = (expanded) => {
        trigger.setAttribute('aria-expanded', String(expanded));
        panel.setAttribute('aria-hidden', String(!expanded));
        panel.style.maxHeight = expanded ? `${panel.scrollHeight}px` : '';
        item.classList.toggle('is-open', expanded);
      };

      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      setState(expanded);

      trigger.addEventListener('click', () => {
        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
        const willExpand = !isExpanded;

        if (willExpand && !allowMultiple) {
          items.forEach((otherItem) => {
            if (otherItem === item) return;
            const otherTrigger = otherItem.querySelector('[data-accordion-trigger]');
            const otherPanel = otherItem.querySelector('[data-accordion-panel]');
            if (!otherTrigger || !otherPanel) return;
            otherTrigger.setAttribute('aria-expanded', 'false');
            otherPanel.setAttribute('aria-hidden', 'true');
            otherPanel.style.maxHeight = '';
            otherItem.classList.remove('is-open');
          });
        }

        trigger.setAttribute('aria-expanded', String(willExpand));
        panel.setAttribute('aria-hidden', String(!willExpand));
        panel.style.maxHeight = willExpand ? `${panel.scrollHeight}px` : '';
        item.classList.toggle('is-open', willExpand);
      });

      accordionItems.push({ trigger, panel, item });
    });
  });

  const recalcOpenPanels = () => {
    accordionItems.forEach(({ panel, item, trigger }) => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      if (expanded && item.classList.contains('is-open')) {
        panel.style.maxHeight = `${panel.scrollHeight}px`;
      }
    });
  };

  let resizeFrame;
  window.addEventListener(
    'resize',
    () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(recalcOpenPanels);
    },
    { passive: true },
  );

  recalcOpenPanels();
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

const fetchLatestTweetUrl = async (handle) => {
  const normalized = handle.replace(/^@/, '');
  const response = await fetch(
    `https://cdn.syndication.twimg.com/widgets/timelines/profile?screen_name=${normalized}&dnt=true`,
  );
  if (!response.ok) {
    throw new Error('Timeline konnte nicht geladen werden');
  }
  const data = await response.json();
  const match = data?.body?.match(/data-tweet-id="(\d+)"/);
  if (!match) {
    throw new Error('Kein Tweet gefunden');
  }
  return `https://twitter.com/${normalized}/status/${match[1]}`;
};

const loadLatestTweetAutomatically = async (source) => {
  const container = document.getElementById('x-latest');
  const body = container?.querySelector('.card-body');
  if (!container || !body) return;

  const rawHandle = source?.split(':')[1]?.trim() || 'BehamotVT';
  const handle = rawHandle.replace(/^@/, '');
  body.innerHTML = '<p>Suche nach dem neuesten Beitrag…</p>';

  try {
    const tweetUrl = await fetchLatestTweetUrl(handle);
    await loadTweet('x-latest', tweetUrl);
  } catch (error) {
    body.innerHTML = `
      <p>Der aktuelle Beitrag konnte nicht automatisch geladen werden. Besuche das Profil direkt auf X.</p>
      <a class="btn btn-tertiary" href="https://x.com/${handle}" target="_blank" rel="noreferrer">Profil öffnen</a>
    `;
  }
};

const initTwitterEmbeds = async () => {
  if (bodyDataset.xPinnedUrl) {
    await loadTweet('x-pinned', bodyDataset.xPinnedUrl);
  }

  if (!bodyDataset.xLatestUrl) return;

  if (bodyDataset.xLatestUrl.startsWith('auto')) {
    await loadLatestTweetAutomatically(bodyDataset.xLatestUrl);
    return;
  }

  await loadTweet('x-latest', bodyDataset.xLatestUrl);
};

initTwitterEmbeds();

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

// Gallery lightbox handling
if (galleryItems.length > 0 && galleryLightbox) {
  const lightboxImage = galleryLightbox.querySelector('[data-gallery-image]');
  const lightboxCaption = galleryLightbox.querySelector('[data-gallery-caption]');
  const closeControls = galleryLightbox.querySelectorAll('[data-gallery-close]');
  const nextButton = galleryLightbox.querySelector('[data-gallery-next]');
  const prevButton = galleryLightbox.querySelector('[data-gallery-prev]');
  galleryLightbox.setAttribute('aria-hidden', 'true');

  const categoryMap = new Map();
  const entries = galleryItems
    .map((element) => {
      const entry = {
        element,
        category: element.dataset.galleryCategory || 'default',
        src: element.dataset.gallerySrc || '',
        alt: element.dataset.galleryAlt || '',
        caption: element.dataset.galleryCaption || '',
        index: 0,
      };
      if (!entry.src) return null;
      if (!categoryMap.has(entry.category)) {
        categoryMap.set(entry.category, []);
      }
      const group = categoryMap.get(entry.category);
      entry.index = group.length;
      group.push(entry);
      return entry;
    })
    .filter(Boolean);

  let activeEntries = [];
  let activeIndex = 0;
  let lastFocusedElement = null;

  const setNavDisabled = (button, disabled) => {
    if (!button) return;
    button.disabled = disabled;
    button.setAttribute('aria-disabled', String(disabled));
    if (disabled) {
      button.setAttribute('tabindex', '-1');
    } else {
      button.removeAttribute('tabindex');
    }
  };

  const updateLightbox = () => {
    const current = activeEntries[activeIndex];
    if (!current || !lightboxImage || !lightboxCaption) return;
    lightboxImage.src = current.src;
    lightboxImage.alt = current.alt || current.caption || '';
    lightboxCaption.textContent = current.caption || current.alt || '';
    const disableNav = activeEntries.length <= 1;
    setNavDisabled(nextButton, disableNav);
    setNavDisabled(prevButton, disableNav);
  };

  const openLightbox = (category, index) => {
    const group = categoryMap.get(category);
    if (!group || !group[index] || !lightboxImage || !lightboxCaption) return;
    activeEntries = group;
    activeIndex = index;
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    updateLightbox();
    galleryLightbox.hidden = false;
    galleryLightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    const focusTarget = galleryLightbox.querySelector('.gallery-lightbox__close');
    requestAnimationFrame(() => focusTarget?.focus());
  };

  const closeLightbox = () => {
    galleryLightbox.hidden = true;
    galleryLightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (lightboxImage) {
      lightboxImage.src = '';
      lightboxImage.alt = '';
    }
    if (lightboxCaption) {
      lightboxCaption.textContent = '';
    }
    if (lastFocusedElement) {
      requestAnimationFrame(() => lastFocusedElement?.focus());
    }
  };

  const showNext = () => {
    if (activeEntries.length <= 1) return;
    activeIndex = (activeIndex + 1) % activeEntries.length;
    updateLightbox();
  };

  const showPrev = () => {
    if (activeEntries.length <= 1) return;
    activeIndex = (activeIndex - 1 + activeEntries.length) % activeEntries.length;
    updateLightbox();
  };

  entries.forEach((entry) => {
    entry.element.addEventListener('click', () => {
      openLightbox(entry.category, entry.index);
    });
  });

  closeControls.forEach((control) => {
    control.addEventListener('click', closeLightbox);
  });

  nextButton?.addEventListener('click', showNext);
  prevButton?.addEventListener('click', showPrev);

  window.addEventListener('keydown', (event) => {
    if (galleryLightbox.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      showNext();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showPrev();
    }
  });
}

// Twitch status placeholder (optional manual toggle)
const twitchStatus = document.querySelector('.twitch-status');
if (twitchStatus) {
  twitchStatus.hidden = true;
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

