const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.documentElement.classList.toggle('reduced-motion', prefersReducedMotion);

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

// Gallery lightbox handling
if (galleryItems.length > 0 && galleryLightbox) {
  if (galleryLightbox.parentElement && galleryLightbox.parentElement !== document.body) {
    document.body.appendChild(galleryLightbox);
  }
  galleryLightbox.hidden = true;
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

const galleryCarousels = document.querySelectorAll('[data-gallery-carousel]');
if (galleryCarousels.length > 0) {
  galleryCarousels.forEach((carousel) => {
    const track = carousel.querySelector('[data-gallery-track]');
    if (!track) return;
    const prevButton = carousel.querySelector('[data-gallery-carousel-prev]');
    const nextButton = carousel.querySelector('[data-gallery-carousel-next]');

    const scrollByAmount = () => track.clientWidth * 0.8;

    const setNavAvailability = (button, available) => {
      if (!button) return;
      if (available) {
        button.removeAttribute('aria-hidden');
        button.removeAttribute('tabindex');
      } else {
        button.setAttribute('aria-hidden', 'true');
        button.setAttribute('tabindex', '-1');
      }
    };

    const updateNavState = () => {
      const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth);
      const canScroll = maxScrollLeft > 1;

      carousel.classList.toggle('gallery-carousel--nav-hidden', !canScroll);
      setNavAvailability(prevButton, canScroll);
      setNavAvailability(nextButton, canScroll);

      if (!canScroll) {
        if (track.scrollLeft !== 0) {
          track.scrollLeft = 0;
        }
        if (prevButton) prevButton.disabled = true;
        if (nextButton) nextButton.disabled = true;
        return;
      }

      if (prevButton) prevButton.disabled = false;
      if (nextButton) nextButton.disabled = false;
    };

    let scrollFrame;
    const handleScroll = () => {
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(updateNavState);
    };

    prevButton?.addEventListener('click', () => {
      const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth);
      if (maxScrollLeft <= 1) return;
      if (track.scrollLeft <= 1) {
        track.scrollTo({ left: maxScrollLeft, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      } else {
        track.scrollBy({ left: -scrollByAmount(), behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    });

    nextButton?.addEventListener('click', () => {
      const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth);
      if (maxScrollLeft <= 1) return;
      if (track.scrollLeft >= maxScrollLeft - 1) {
        track.scrollTo({ left: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      } else {
        track.scrollBy({ left: scrollByAmount(), behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    });

    track.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(updateNavState);
      observer.observe(track);
    }

    if (document.readyState !== 'complete') {
      window.addEventListener('load', updateNavState, { once: true });
    }

    updateNavState();
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

