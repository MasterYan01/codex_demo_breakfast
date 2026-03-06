const body = document.body;
const header = document.querySelector('.site-header');
const hero = document.querySelector('.hero');
const heroCard = document.querySelector('.hero-card');
const revealNodes = document.querySelectorAll('.reveal-on-scroll');
const navLinks = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
const sectionTargets = navLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let ticking = false;

const getHeaderOffset = () => (header ? header.getBoundingClientRect().height + 24 : 96);

const finishLoading = () => {
  body.classList.remove('is-loading');
  body.classList.add('is-ready');
};

if (document.readyState === 'complete') {
  window.setTimeout(finishLoading, reduceMotion ? 0 : 450);
} else {
  window.addEventListener('load', () => {
    window.setTimeout(finishLoading, reduceMotion ? 0 : 450);
  }, { once: true });
}

const syncHeader = () => {
  if (!header) return;
  header.classList.toggle('is-stuck', window.scrollY > 24);
};

const syncHeroParallax = () => {
  if (!heroCard || reduceMotion) return;
  const heroRect = hero?.getBoundingClientRect();
  if (!heroRect) return;
  const viewportHeight = window.innerHeight || 1;
  const progress = Math.max(-1, Math.min(1, (viewportHeight - heroRect.top) / (viewportHeight + heroRect.height)));
  const translate = Math.max(-18, Math.min(28, progress * 26 - 8));
  const scale = 1.04;
  heroCard.style.transform = `translate3d(0, ${translate}px, 0) scale(${scale})`;
};

const syncScrollEffects = () => {
  syncHeader();
  syncHeroParallax();
  ticking = false;
};

const requestScrollSync = () => {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(syncScrollEffects);
};

const setActiveNav = (id) => {
  navLinks.forEach((link) => {
    const isActive = link.getAttribute('href') === `#${id}`;
    link.classList.toggle('is-active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
};

navLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    const targetId = link.getAttribute('href');
    const target = document.querySelector(targetId);
    if (!target) return;
    event.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - getHeaderOffset();
    window.history.replaceState(null, '', targetId);
    window.scrollTo({
      top,
      behavior: reduceMotion ? 'auto' : 'smooth'
    });
  });
});

syncHeader();
syncHeroParallax();
window.addEventListener('scroll', requestScrollSync, { passive: true });
window.addEventListener('resize', requestScrollSync);

if (reduceMotion) {
  revealNodes.forEach((node) => node.classList.add('reveal-visible'));
} else {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('reveal-visible');
      revealObserver.unobserve(entry.target);
    });
  }, {
    threshold: 0.16,
    rootMargin: '0px 0px -10% 0px'
  });

  revealNodes.forEach((node) => {
    if (node.dataset.reveal === 'hero') {
      node.classList.add('reveal-visible');
      return;
    }
    revealObserver.observe(node);
  });
}

if (sectionTargets.length) {
  const activeObserver = new IntersectionObserver((entries) => {
    const visibleEntries = entries.filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

    if (!visibleEntries.length) return;
    setActiveNav(visibleEntries[0].target.id);
  }, {
    threshold: [0.2, 0.4, 0.6],
    rootMargin: `-${Math.round(getHeaderOffset())}px 0px -45% 0px`
  });

  sectionTargets.forEach((section) => activeObserver.observe(section));
}
