const body = document.body;
const header = document.querySelector('.site-header');
const hero = document.querySelector('.hero');
const heroCard = document.querySelector('.hero-card');
const heroOverlay = document.querySelector('.hero-overlay');
const heroFloatingCard = document.querySelector('.hero-floating-card');
const reservationForm = document.querySelector('#reservation-form');
const reservationDate = document.querySelector('#reservation-date');
const reservationStatus = document.querySelector('#reservation-status');
const revealNodes = document.querySelectorAll('.reveal-on-scroll');
const navLinks = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
const sectionTargets = navLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let ticking = false;
let heroPointerX = 0;
let heroPointerY = 0;
let heroPointerActive = false;

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
  const translateY = Math.max(-18, Math.min(28, progress * 26 - 8));
  const pointerX = heroPointerActive ? heroPointerX * 10 : 0;
  const pointerY = heroPointerActive ? heroPointerY * 8 : 0;
  const rotateY = heroPointerActive ? heroPointerX * 2.6 : 0;
  const rotateX = heroPointerActive ? heroPointerY * -1.8 : 0;
  heroCard.style.transform = `translate3d(${pointerX}px, ${translateY + pointerY}px, 0) scale(1.04) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

  if (heroOverlay) {
    heroOverlay.style.transform = `translate3d(${pointerX * -0.35}px, ${pointerY * -0.35}px, 0)`;
  }

  if (heroFloatingCard) {
    heroFloatingCard.style.transform = `translate3d(${pointerX * -0.28}px, ${pointerY * -0.18}px, 0)`;
  }
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

const setReservationMinDate = () => {
  if (!reservationDate) return;
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  reservationDate.min = `${yyyy}-${mm}-${dd}`;
};

const validateReservation = (formData) => {
  const name = String(formData.get('name') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const date = String(formData.get('date') || '').trim();
  const time = String(formData.get('time') || '').trim();
  const guests = String(formData.get('guests') || '').trim();

  if (!date || !time || !guests || !name || !phone || !email) {
    return '請完整填寫日期、時段、人數與聯絡資訊。';
  }

  if (!/^09\d{2}-?\d{3}-?\d{3}$/.test(phone) && !/^0\d{1,2}-?\d{6,8}$/.test(phone)) {
    return '請輸入正確的手機或電話格式。';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return '請輸入正確的 Email 格式。';
  }

  return '';
};

const updateReservationStatus = (message, status) => {
  if (!reservationStatus) return;
  reservationStatus.textContent = message;
  reservationStatus.dataset.state = status;
};

if (reservationForm) {
  setReservationMinDate();
  reservationForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(reservationForm);
    const error = validateReservation(formData);

    if (error) {
      updateReservationStatus(error, 'error');
      return;
    }

    const summary = `${formData.get('date')} ${formData.get('time')}，${formData.get('guests')} 位，${formData.get('name')}。`;
    updateReservationStatus(`訂位需求已送出：${summary} 我們將以電話或 Email 與你確認。`, 'success');
    reservationForm.reset();
    setReservationMinDate();
  });
}

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

if (hero && !reduceMotion) {
  hero.addEventListener('mousemove', (event) => {
    const rect = hero.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const py = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    heroPointerX = Math.max(-1, Math.min(1, px));
    heroPointerY = Math.max(-1, Math.min(1, py));
    heroPointerActive = true;
    requestScrollSync();
  });

  hero.addEventListener('mouseleave', () => {
    heroPointerX = 0;
    heroPointerY = 0;
    heroPointerActive = false;
    requestScrollSync();
  });
}

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
