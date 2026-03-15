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
const pageType = body.dataset.page || '';
let ticking = false;
let heroPointerX = 0;
let heroPointerY = 0;
let heroPointerActive = false;
let adminState = null;
let adminSelectedSlug = '';

const getHeaderOffset = () => (header ? header.getBoundingClientRect().height + 24 : 96);
const appConfig = window.LA_MIU_CONFIG || {};
const apiBase = String(appConfig.apiBase || window.location.origin).replace(/\/$/, '');
const menuApiUrl = `${apiBase}/api/menu`;
const reservationApiUrl = `${apiBase}/api/reservations`;
const waitlistApiUrl = `${apiBase}/api/waitlist`;
const takeoutApiUrl = `${apiBase}/api/takeout`;
const getApiUrl = (path) => `${apiBase}${path}`;

const finishLoading = () => {
  body.classList.remove('is-loading');
  body.classList.add('is-ready');
};

const safeText = (value) => String(value || '').trim();
const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
const formatPrice = (value) => `NT$ ${Number(value || 0)}`;
const getCategoryPageHref = (slug) => `${slug}.html`;
const getItemPageHref = (slug) => `item.html?slug=${encodeURIComponent(slug)}`;

const finishLoadingAfterReady = () => {
  if (document.readyState === 'complete') {
    window.setTimeout(finishLoading, reduceMotion ? 0 : 450);
  } else {
    window.addEventListener('load', () => {
      window.setTimeout(finishLoading, reduceMotion ? 0 : 450);
    }, { once: true });
  }
};

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
  const name = safeText(formData.get('name'));
  const phone = safeText(formData.get('phone'));
  const email = safeText(formData.get('email'));
  const date = safeText(formData.get('date'));
  const time = safeText(formData.get('time'));
  const guests = safeText(formData.get('guests'));

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

const setupReservationForm = () => {
  if (!reservationForm) return;
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
};

const setupAnchorScroll = () => {
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
};

const setupHeroPointer = () => {
  if (!hero || reduceMotion) return;
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
};

const setupRevealAnimations = () => {
  if (reduceMotion) {
    revealNodes.forEach((node) => node.classList.add('reveal-visible'));
    return;
  }

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
};

const setupActiveSections = () => {
  if (!sectionTargets.length) return;
  const activeObserver = new IntersectionObserver((entries) => {
    const visibleEntries = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

    if (!visibleEntries.length) return;
    setActiveNav(visibleEntries[0].target.id);
  }, {
    threshold: [0.2, 0.4, 0.6],
    rootMargin: `-${Math.round(getHeaderOffset())}px 0px -45% 0px`
  });

  sectionTargets.forEach((section) => activeObserver.observe(section));
};

const fetchJson = async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
};

const createMenuCard = (item) => `
  <article class="menu-item-card">
    <div class="menu-item-photo" style="background-image:url('${item.image}')"></div>
    <div class="menu-item-copy">
      <h3>${item.name}</h3>
      <p>${item.shortDescription}</p>
      <span class="price">${formatPrice(item.price)}</span>
      <a class="text-link" href="${getItemPageHref(item.slug)}">查看單品介紹</a>
    </div>
  </article>
`;

const createCategoryDishCard = (item) => `
  <article class="category-dish-card">
    <div class="category-dish-photo" style="background-image:url('${item.image}')"></div>
    <div class="category-dish-copy">
      <h3>${item.name}</h3>
      <p>${item.shortDescription}</p>
      <span class="price">${formatPrice(item.price)}</span>
      <a class="text-link" href="${getItemPageHref(item.slug)}">查看單品介紹</a>
    </div>
  </article>
`;

const createSeasonalCard = (item) => `
  <article class="seasonal-card" style="background-image:url('${item.image}')">
    <div class="seasonal-card__copy">
      <p class="eyebrow small">${item.tags.join(' / ')}</p>
      <h3>${item.name}</h3>
      <p>${item.shortDescription}</p>
      <span class="price">${formatPrice(item.price)}</span>
      <a class="text-link text-link--light" href="${getItemPageHref(item.slug)}">查看詳情</a>
    </div>
  </article>
`;

const createCategoryEntry = (category, count) => `
  <a class="menu-category-card" href="${getCategoryPageHref(category.slug)}">
    <span class="menu-category-card__eyebrow">${category.english}</span>
    <strong>${category.name}</strong>
    <p>${category.description}</p>
    <span class="menu-category-card__meta">${count} 項品項</span>
  </a>
`;

const renderMenuOverview = async () => {
  const data = await fetchJson(menuApiUrl);
  const categoryGrid = document.querySelector('#menu-category-grid');
  const featuredGrid = document.querySelector('#menu-featured-grid');
  const seasonalGrid = document.querySelector('#seasonal-grid');
  if (!categoryGrid || !featuredGrid || !seasonalGrid) return;

  categoryGrid.innerHTML = data.categories
    .map((category) => createCategoryEntry(category, data.items.filter((item) => item.category === category.slug).length))
    .join('');

  featuredGrid.innerHTML = data.items.slice(0, 4).map(createMenuCard).join('');
  const seasonalItems = data.items.filter((item) => Array.isArray(item.tags) && item.tags.includes('季節限定')).slice(0, 3);
  seasonalGrid.innerHTML = seasonalItems.map(createSeasonalCard).join('');
};

const renderCategoryPage = async () => {
  const slug = body.dataset.category;
  if (!slug) return;
  const payload = await fetchJson(`/api/categories/${encodeURIComponent(slug)}`);
  const { category, items } = payload;

  const setText = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  };

  setText('#category-eyebrow', category.english);
  setText('#category-tagline', category.tagline);
  setText('#category-title', category.name);
  setText('#category-description', category.description);
  setText('#category-list-title', `${category.name}品項`);
  setText('#category-note-title', category.noteTitle);
  setText('#category-note-text', category.noteText);

  const heroImage = document.querySelector('#category-hero-image');
  if (heroImage) {
    heroImage.style.backgroundImage = `url('${category.heroImage}')`;
  }

  const listGrid = document.querySelector('#category-list-grid');
  if (listGrid) {
    listGrid.innerHTML = items.map(createCategoryDishCard).join('');
    listGrid.classList.toggle('category-list-grid--three', items.length <= 6 && slug !== 'breakfast');
  }

  const pairingNode = document.querySelector('#category-pairings');
  if (pairingNode) {
    pairingNode.innerHTML = (category.pairings || []).map((link) => `<a class="btn btn-secondary" href="${link.href}">${link.label}</a>`).join('');
  }

  document.title = `樂沐 La Miu ${category.name}頁 | ${category.english}`;
};

const renderItemDetailPage = async () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  if (!slug) return;
  const payload = await fetchJson(`/api/items/${encodeURIComponent(slug)}`);
  const { item, category, related } = payload;

  const photo = document.querySelector('#item-detail-photo');
  if (photo) {
    photo.style.backgroundImage = `url('${item.image}')`;
  }

  const setText = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  };

  setText('#item-category-label', category ? `${category.name} / ${category.english}` : item.category);
  setText('#item-name', item.name);
  setText('#item-description', item.description);
  setText('#item-price', formatPrice(item.price));
  setText('#item-availability', item.availability || '依現場供應');
  setText('#item-pairing', item.pairing || '請洽現場');

  const ingredientsNode = document.querySelector('#item-ingredients');
  if (ingredientsNode) {
    ingredientsNode.innerHTML = (item.ingredients || []).map((entry) => `<li>${entry}</li>`).join('');
  }

  const tagsNode = document.querySelector('#item-tags');
  if (tagsNode) {
    tagsNode.innerHTML = (item.tags || []).map((tag) => `<span class="tag">${tag}</span>`).join('');
  }

  const relatedGrid = document.querySelector('#related-items-grid');
  if (relatedGrid) {
    relatedGrid.innerHTML = related.map(createCategoryDishCard).join('');
  }

  document.title = `樂沐 La Miu | ${item.name}`;
};

const getAdminItemList = () => document.querySelector('#admin-item-list');
const getAdminForm = () => document.querySelector('#admin-item-form');
const getAdminStatus = () => document.querySelector('#admin-status');

const updateAdminStatus = (message, state) => {
  const status = getAdminStatus();
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
};

const fillAdminForm = (item) => {
  const form = getAdminForm();
  if (!form || !item) return;
  form.slug.value = item.slug || '';
  form.name.value = item.name || '';
  form.category.value = item.category || 'breakfast';
  form.price.value = item.price || 0;
  form.sortWeight.value = Number.isFinite(item.sortWeight) ? item.sortWeight : 0;
  form.status.value = item.status || 'active';
  form.image.value = item.image || '';
  form.shortDescription.value = item.shortDescription || '';
  form.description.value = item.description || '';
  form.pairing.value = item.pairing || '';
  form.availability.value = item.availability || '';
  form.ingredients.value = Array.isArray(item.ingredients) ? item.ingredients.join(', ') : '';
  form.tags.value = Array.isArray(item.tags) ? item.tags.join(', ') : '';
};

const renderAdminList = () => {
  const list = getAdminItemList();
  if (!list || !adminState) return;
  list.innerHTML = adminState.items.map((item) => `
    <button type="button" class="admin-item-button${item.slug === adminSelectedSlug ? ' is-selected' : ''}" data-slug="${item.slug}">
      <strong>${item.name}</strong>
      <span>${item.category} / ${formatPrice(item.price)} · 權重 ${Number.isFinite(item.sortWeight) ? item.sortWeight : 0}${item.status === 'inactive' ? ' · 下架' : ''}</span>
    </button>
  `).join('');

  list.querySelectorAll('.admin-item-button').forEach((button) => {
    button.addEventListener('click', () => {
      adminSelectedSlug = button.dataset.slug || '';
      const selected = adminState.items.find((item) => item.slug === adminSelectedSlug);
      fillAdminForm(selected);
      renderAdminList();
    });
  });
};

const getFormItemPayload = (form) => ({
  slug: safeText(form.slug.value),
  name: safeText(form.name.value),
  category: safeText(form.category.value),
  price: Number(form.price.value || 0),
  sortWeight: Number(form.sortWeight.value || 0),
  status: safeText(form.status.value) || 'active',
  image: safeText(form.image.value),
  shortDescription: safeText(form.shortDescription.value),
  description: safeText(form.description.value),
  pairing: safeText(form.pairing.value),
  availability: safeText(form.availability.value),
  ingredients: safeText(form.ingredients.value).split(',').map((entry) => safeText(entry)).filter(Boolean),
  tags: safeText(form.tags.value).split(',').map((entry) => safeText(entry)).filter(Boolean)
});

const formatReservationTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-TW', { hour12: false });
};

const renderReservationList = (items) => {
  const listNode = document.querySelector('#admin-reservation-list');
  if (!listNode) return;
  if (!items.length) {
    listNode.innerHTML = '<div class="admin-reservation-empty">目前沒有訂位資料。</div>';
    return;
  }
  listNode.innerHTML = items.map((entry) => {
    const notes = safeText(entry.notes);
    const meta = [
      `${escapeHtml(entry.phone || '')} · ${escapeHtml(entry.email || '')}`,
      escapeHtml(formatReservationTimestamp(entry.createdAt))
    ].filter(Boolean).join('<br>');
    return `
      <article class="admin-reservation-card">
        <strong>${escapeHtml(entry.name || '')} · ${escapeHtml(entry.guests || '')} 位</strong>
        <div>${escapeHtml(entry.date || '')} ${escapeHtml(entry.time || '')}</div>
        <div class="admin-reservation-meta">${meta}</div>
        ${notes ? `<div class="admin-reservation-note">備註：${escapeHtml(notes)}</div>` : ''}
      </article>
    `;
  }).join('');
};

const setupReservationInbox = async () => {
  const listNode = document.querySelector('#admin-reservation-list');
  if (!listNode) return;
  const refreshButton = document.querySelector('#admin-reservation-refresh');
  const statusNode = document.querySelector('#admin-reservation-status');

  const updateStatus = (message, status) => {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.dataset.state = status;
  };

  const load = async () => {
    updateStatus('載入訂位資料中…', '');
    try {
      const payload = await fetchJson(`${reservationApiUrl}?limit=50`);
      renderReservationList(payload.reservations || []);
      updateStatus('已更新最新訂位。', 'success');
    } catch (error) {
      updateStatus(`載入失敗：${error.message}`, 'error');
    }
  };

  refreshButton?.addEventListener('click', load);
  await load();
};

const renderWaitlistList = (items) => {
  const listNode = document.querySelector('#admin-waitlist-list');
  if (!listNode) return;
  if (!items.length) {
    listNode.innerHTML = '<div class="admin-reservation-empty">目前沒有候位資料。</div>';
    return;
  }
  listNode.innerHTML = items.map((entry) => {
    const notes = safeText(entry.notes);
    const notifiedAt = safeText(entry.notifiedAt);
    const meta = [
      `${escapeHtml(entry.phone || '')}`,
      escapeHtml(formatReservationTimestamp(entry.createdAt))
    ].filter(Boolean).join('<br>');
    const notifyBlock = notifiedAt
      ? `<div class="admin-reservation-note">已通知：${escapeHtml(formatReservationTimestamp(notifiedAt))}</div>`
      : `<div class="admin-waitlist-actions"><button class="btn btn-secondary" type="button" data-waitlist-id="${escapeHtml(entry.id || '')}">發送簡訊</button></div>`;
    return `
      <article class="admin-reservation-card">
        <strong>${escapeHtml(entry.name || '')} · ${escapeHtml(entry.guests || '')} 位</strong>
        <div>${escapeHtml(entry.date || '')} ${escapeHtml(entry.time || '')}</div>
        <div class="admin-reservation-meta">${meta}</div>
        ${notes ? `<div class="admin-reservation-note">備註：${escapeHtml(notes)}</div>` : ''}
        ${notifyBlock}
      </article>
    `;
  }).join('');
};

const setupWaitlistInbox = async () => {
  const listNode = document.querySelector('#admin-waitlist-list');
  if (!listNode) return;
  const refreshButton = document.querySelector('#admin-waitlist-refresh');
  const statusNode = document.querySelector('#admin-waitlist-status');

  const updateStatus = (message, status) => {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.dataset.state = status;
  };

  const load = async () => {
    updateStatus('載入候位資料中…', '');
    try {
      const payload = await fetchJson(`${waitlistApiUrl}?limit=50`);
      renderWaitlistList(payload.waitlist || []);
      updateStatus('已更新候位清單。', 'success');
    } catch (error) {
      updateStatus(`載入失敗：${error.message}`, 'error');
    }
  };

  listNode.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-waitlist-id]');
    if (!button) return;
    const id = button.dataset.waitlistId;
    updateStatus('發送簡訊中…', '');
    try {
      await fetchJson(`${waitlistApiUrl}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      updateStatus('已發送簡訊通知。', 'success');
      await load();
    } catch (error) {
      updateStatus(`發送失敗：${error.message}`, 'error');
    }
  });

  refreshButton?.addEventListener('click', load);
  await load();
};

const renderTakeoutList = (items) => {
  const listNode = document.querySelector('#admin-takeout-list');
  if (!listNode) return;
  if (!items.length) {
    listNode.innerHTML = '<div class="admin-reservation-empty">目前沒有外帶訂單。</div>';
    return;
  }
  listNode.innerHTML = items.map((entry) => {
    const notes = safeText(entry.notes);
    const meta = [
      `${escapeHtml(entry.phone || '')}`,
      escapeHtml(formatReservationTimestamp(entry.createdAt))
    ].filter(Boolean).join('<br>');
    return `
      <article class="admin-reservation-card">
        <strong>${escapeHtml(entry.name || '')}</strong>
        <div>取餐：${escapeHtml(entry.date || '')} ${escapeHtml(entry.time || '')}</div>
        <div class="admin-reservation-meta">${meta}</div>
        <div class="admin-reservation-note">內容：${escapeHtml(entry.items || '')}</div>
        ${notes ? `<div class="admin-reservation-note">備註：${escapeHtml(notes)}</div>` : ''}
      </article>
    `;
  }).join('');
};

const setupTakeoutInbox = async () => {
  const listNode = document.querySelector('#admin-takeout-list');
  if (!listNode) return;
  const refreshButton = document.querySelector('#admin-takeout-refresh');
  const statusNode = document.querySelector('#admin-takeout-status');

  const updateStatus = (message, status) => {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.dataset.state = status;
  };

  const load = async () => {
    updateStatus('載入外帶訂單中…', '');
    try {
      const payload = await fetchJson(`${takeoutApiUrl}?limit=50`);
      renderTakeoutList(payload.takeout || []);
      updateStatus('已更新外帶訂單。', 'success');
    } catch (error) {
      updateStatus(`載入失敗：${error.message}`, 'error');
    }
  };

  refreshButton?.addEventListener('click', load);
  await load();
};

const getSourceLabel = (entry) => {
  const utm = entry.utm || {};
  const source = safeText(utm.source);
  const medium = safeText(utm.medium);
  if (source) {
    return medium ? `${source} / ${medium}` : source;
  }
  const referrer = safeText(entry.referrer || entry.source);
  if (!referrer) return 'Direct';
  try {
    const url = new URL(referrer);
    return url.hostname || referrer;
  } catch (error) {
    return referrer;
  }
};

const buildCountList = (entries, keyFn) => {
  const map = new Map();
  entries.forEach((entry) => {
    const key = safeText(keyFn(entry));
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
};

const renderBarList = (node, items, emptyText) => {
  if (!node) return;
  if (!items.length) {
    node.innerHTML = `<div class="admin-bar-empty">${emptyText}</div>`;
    return;
  }
  const max = Math.max(...items.map((item) => item.count));
  node.innerHTML = items.slice(0, 8).map((item) => {
    const width = max ? Math.round((item.count / max) * 100) : 0;
    return `
      <div class="admin-bar-row">
        <span class="admin-bar-label">${escapeHtml(item.label)}</span>
        <span class="admin-bar-track"><span class="admin-bar-fill" style="width:${width}%"></span></span>
        <span class="admin-bar-value">${item.count}</span>
      </div>
    `;
  }).join('');
};

const setupAnalyticsDashboard = async () => {
  const refreshButton = document.querySelector('#admin-analytics-refresh');
  const statusNode = document.querySelector('#admin-analytics-status');
  const reservationNode = document.querySelector('#analytics-reservation-times');
  const waitlistNode = document.querySelector('#analytics-waitlist-times');
  const takeoutNode = document.querySelector('#analytics-takeout-times');
  const sourceNode = document.querySelector('#analytics-sources');
  if (!reservationNode || !waitlistNode || !takeoutNode || !sourceNode) return;

  const updateStatus = (message, status) => {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.dataset.state = status;
  };

  const load = async () => {
    updateStatus('載入分析資料中…', '');
    try {
      const [reservationPayload, waitlistPayload, takeoutPayload] = await Promise.all([
        fetchJson(`${reservationApiUrl}?limit=200`),
        fetchJson(`${waitlistApiUrl}?limit=200`),
        fetchJson(`${takeoutApiUrl}?limit=200`)
      ]);
      const reservations = reservationPayload.reservations || [];
      const waitlist = waitlistPayload.waitlist || [];
      const takeout = takeoutPayload.takeout || [];
      const sources = buildCountList([...reservations, ...waitlist, ...takeout], getSourceLabel);
      renderBarList(reservationNode, buildCountList(reservations, (entry) => entry.time), '目前沒有訂位資料。');
      renderBarList(waitlistNode, buildCountList(waitlist, (entry) => entry.time), '目前沒有候位資料。');
      renderBarList(takeoutNode, buildCountList(takeout, (entry) => entry.time), '目前沒有外帶資料。');
      renderBarList(sourceNode, sources, '目前沒有來源資料。');
      updateStatus('已更新分析資料。', 'success');
    } catch (error) {
      updateStatus(`載入失敗：${error.message}`, 'error');
    }
  };

  refreshButton?.addEventListener('click', load);
  await load();
};

const setupAdminPage = async () => {
  adminState = await fetchJson(menuApiUrl);
  adminSelectedSlug = adminState.items[0]?.slug || '';
  fillAdminForm(adminState.items[0]);
  renderAdminList();

  const form = getAdminForm();
  const addButton = document.querySelector('#admin-add-item');
  const saveButton = document.querySelector('#admin-save-button');
  const deleteButton = document.querySelector('#admin-delete-item');

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const payload = getFormItemPayload(form);
      if (!payload.slug || !payload.name) {
        updateAdminStatus('Slug 與名稱為必填。', 'error');
        return;
      }

      const currentIndex = adminState.items.findIndex((item) => item.slug === adminSelectedSlug || item.slug === payload.slug);
      if (currentIndex >= 0) {
        adminState.items[currentIndex] = payload;
      } else {
        adminState.items.unshift(payload);
      }
      adminSelectedSlug = payload.slug;
      renderAdminList();
      updateAdminStatus('已更新暫存內容，記得按上方「儲存全部變更」。', 'success');
    });
  }

  if (addButton) {
    addButton.addEventListener('click', () => {
      adminSelectedSlug = '';
      form.reset();
      form.category.value = 'breakfast';
      form.sortWeight.value = 0;
      form.status.value = 'active';
      renderAdminList();
      updateAdminStatus('已建立空白單品表單。', 'success');
    });
  }

  if (deleteButton) {
    deleteButton.addEventListener('click', () => {
      if (!adminSelectedSlug) {
        updateAdminStatus('目前沒有選定可刪除的單品。', 'error');
        return;
      }
      adminState.items = adminState.items.filter((item) => item.slug !== adminSelectedSlug);
      adminSelectedSlug = adminState.items[0]?.slug || '';
      fillAdminForm(adminState.items[0] || {
        slug: '', name: '', category: 'breakfast', price: 0, sortWeight: 0, status: 'active', image: '', shortDescription: '', description: '', pairing: '', availability: '', ingredients: [], tags: []
      });
      renderAdminList();
      updateAdminStatus('已從暫存內容移除此單品。記得儲存全部變更。', 'success');
    });
  }

  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      try {
        await fetchJson(menuApiUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adminState)
        });
        updateAdminStatus('菜單資料已寫入後端，前台頁面重新整理後會看到最新內容。', 'success');
      } catch (error) {
        updateAdminStatus(`儲存失敗：${error.message}`, 'error');
      }
    });
  }

  await setupReservationInbox();
  await setupWaitlistInbox();
  await setupTakeoutInbox();
  await setupAnalyticsDashboard();
};

const initDataDrivenPages = async () => {
  try {
    if (pageType === 'menu-overview') {
      await renderMenuOverview();
    }
    if (pageType === 'category') {
      await renderCategoryPage();
    }
    if (pageType === 'item-detail') {
      await renderItemDetailPage();
    }
    if (pageType === 'admin') {
      await setupAdminPage();
    }
  } catch (error) {
    console.error(error);
    const statusNode = getAdminStatus() || document.querySelector('.hero-text') || document.querySelector('.menu-page-note p');
    if (statusNode) {
      statusNode.textContent = '資料載入失敗，請確認 Render API 已啟動，且 config.js 的 apiBase 設定正確。';
    }
  }
};

setupReservationForm();
setupAnchorScroll();
setupHeroPointer();
syncHeader();
syncHeroParallax();
window.addEventListener('scroll', requestScrollSync, { passive: true });
window.addEventListener('resize', requestScrollSync);
setupRevealAnimations();
setupActiveSections();
finishLoadingAfterReady();
initDataDrivenPages();
