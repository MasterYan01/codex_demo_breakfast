const body = document.body;
const header = document.querySelector('.site-header');
const revealNodes = document.querySelectorAll('.reveal-on-scroll');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });

if (reduceMotion) {
  revealNodes.forEach((node) => node.classList.add('reveal-visible'));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('reveal-visible');
      observer.unobserve(entry.target);
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
    observer.observe(node);
  });
}
