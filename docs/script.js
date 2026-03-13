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
const navLinks = Array.from(document.querySelectorAll('.nav a[href^="#"], .menu-pills a[href^="#"]'));
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
const menuItemLookup = new Map();
const searchStorageKey = 'la_miu_recent_items_v1';
const searchResultLimit = 8;
const recentResultLimit = 6;
let searchIndexPromise = null;
const reservationSlotCapacities = {
  '09:00': 8,
  '10:30': 10,
  '12:00': 12,
  '13:30': 10,
  '15:00': 8
};
const reservationDurationMinutes = 90;

const getHeaderOffset = () => (header ? header.getBoundingClientRect().height + 24 : 96);
const appConfig = window.LA_MIU_CONFIG || {};
const apiBase = String(appConfig.apiBase || window.location.origin).replace(/\/$/, '');
const menuApiUrl = `${apiBase}/api/menu`;
const getApiUrl = (path) => `${apiBase}${path}`;

const finishLoading = () => {
  body.classList.remove('is-loading');
  body.classList.add('is-ready');
};

const safeText = (value) => String(value || '').trim();
const formatPrice = (value) => `NT$ ${Number(value || 0)}`;
const getCategoryPageHref = (slug) => `${slug}.html`;
const getItemPageHref = (slug) => `item.html?slug=${encodeURIComponent(slug)}`;

const dietaryKeywords = {
  meat: ['培根', '火腿', '鮭魚', '鴨', '雞', '豬', '牛肉', '羊', '海鮮', '蝦', '蟹', '貝', '魚', '牛排'],
  eggDairy: ['蛋', '雞蛋', '水波蛋', '半熟蛋', '荷蘭醬', '牛奶', '鮮奶', '奶油', '鮮奶油', '乳酪', '起司', '優格', '奶泡', '奶霜', '奶香', '奶茶'],
  nuts: ['堅果', '杏仁', '核桃', '腰果', '榛果', '花生', '胡桃', '開心果'],
  gluten: ['麵包', '吐司', '麵粉', '麵團', '鬆餅', '蛋糕', '塔殼', '餅乾', '布里歐', '司康', '義大利麵', '麵條', '麩']
};

const dietaryBadgeConfig = [
  { key: 'vegetarian', label: '素食', className: 'tag-pill--veg' },
  { key: 'eggDairy', label: '含蛋奶', className: 'tag-pill--egg' },
  { key: 'nuts', label: '含堅果', className: 'tag-pill--nut' },
  { key: 'glutenFree', label: '無麩質', className: 'tag-pill--gf' }
];

const buildItemText = (item) => normalizeText([
  item.name,
  item.shortDescription,
  item.description,
  ...(item.tags || []),
  ...(item.ingredients || [])
].join(' '));

const hasKeyword = (text, keywords) => keywords.some((keyword) => text.includes(keyword));

const getDietaryProfile = (item) => {
  if (item && item._dietary) return item._dietary;
  const text = buildItemText(item);
  const tagText = normalizeText((item.tags || []).join(' '));
  const vegetarianTag = tagText.includes('素食') || tagText.includes('蔬食');
  const glutenFreeTag = tagText.includes('無麩質');
  const eggDairyTag = tagText.includes('含蛋奶');
  const nutTag = tagText.includes('含堅果');
  const hasMeat = hasKeyword(text, dietaryKeywords.meat);
  const hasEggDairy = eggDairyTag || hasKeyword(text, dietaryKeywords.eggDairy);
  const hasNuts = nutTag || hasKeyword(text, dietaryKeywords.nuts);
  const hasGluten = hasKeyword(text, dietaryKeywords.gluten);
  const profile = {
    vegetarian: vegetarianTag ? true : !hasMeat,
    eggDairy: hasEggDairy,
    nuts: hasNuts,
    glutenFree: glutenFreeTag ? true : !hasGluten
  };
  if (item) {
    item._dietary = profile;
  }
  return profile;
};

const getDietaryBadgesHtml = (item) => {
  const profile = getDietaryProfile(item);
  const tags = dietaryBadgeConfig
    .filter((badge) => profile[badge.key])
    .map((badge) => `<span class="tag-pill ${badge.className}">${badge.label}</span>`)
    .join('');
  return tags ? `<div class="menu-item-tags">${tags}</div>` : '';
};

const cacheMenuItems = (items) => {
  if (!Array.isArray(items)) return;
  items.forEach((item) => {
    if (item && item.slug) {
      menuItemLookup.set(item.slug, item);
    }
  });
};

const getPopularityScore = (item, index = 0) => {
  const base = Number.isFinite(item.popularity) ? item.popularity : Math.max(30, 60 - index * 2);
  const tags = item.tags || [];
  let boost = 0;
  if (tags.some((tag) => tag.includes('人氣'))) boost += 14;
  if (tags.some((tag) => tag.includes('招牌'))) boost += 10;
  if (tags.some((tag) => tag.includes('主廚推薦'))) boost += 8;
  if (tags.some((tag) => tag.includes('季節限定'))) boost += 4;
  return base + boost;
};

const getTimeSegment = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'morning';
  if (hour < 14) return 'midday';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

const getTimeSegmentLabel = (segment) => {
  switch (segment) {
    case 'morning':
      return '早晨推薦';
    case 'midday':
      return '午間推薦';
    case 'afternoon':
      return '午後推薦';
    default:
      return '晚間甜點推薦';
  }
};

const createSeededRandom = (seed) => {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
};

const getDailyRecommendations = (items) => {
  const segment = getTimeSegment();
  const weights = {
    morning: { breakfast: 3, coffee: 1, dessert: 0 },
    midday: { breakfast: 2, coffee: 2, dessert: 1 },
    afternoon: { breakfast: 1, coffee: 2, dessert: 2 },
    evening: { breakfast: 0, coffee: 1, dessert: 3 }
  }[segment];
  const today = new Date();
  const seed = hashString(`${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${segment}`);
  const random = createSeededRandom(seed);

  const ranked = items.map((item, index) => {
    const weight = weights[item.category] || 0;
    const score = getPopularityScore(item, index) + weight * 20 + random() * 6;
    return { item, score };
  }).sort((a, b) => b.score - a.score);

  return {
    segment,
    items: ranked.slice(0, 6).map((entry) => entry.item)
  };
};

const getHotItems = (items) => items
  .map((item, index) => ({ item, score: getPopularityScore(item, index) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 6)
  .map((entry) => entry.item);

const normalizeText = (value) => safeText(value).toLowerCase();
const tokenizeQuery = (query) => normalizeText(query).split(/\s+/).filter(Boolean);

const fuzzyScore = (query, text) => {
  const q = normalizeText(query);
  const t = normalizeText(text);
  if (!q || !t) return 0;
  if (t.includes(q)) {
    const lengthPenalty = Math.min(18, t.length - q.length);
    const startBoost = t.startsWith(q) ? 26 : 0;
    return 60 + startBoost + Math.min(24, q.length * 2) - lengthPenalty;
  }

  let score = 0;
  let lastIndex = 0;
  let streak = 0;
  for (let i = 0; i < q.length; i += 1) {
    const found = t.indexOf(q[i], lastIndex);
    if (found === -1) return 0;
    if (found === lastIndex) {
      streak += 1;
      score += 10 + streak * 2;
    } else {
      streak = 0;
      score += 4;
    }
    lastIndex = found + 1;
  }
  return score;
};

const scoreText = (query, text) => {
  const tokens = tokenizeQuery(query);
  if (!tokens.length) return 0;
  let total = 0;
  for (const token of tokens) {
    const score = fuzzyScore(token, text);
    if (!score) return 0;
    total += score;
  }
  return total;
};

const readRecentItems = () => {
  try {
    const raw = window.localStorage.getItem(searchStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const writeRecentItems = (items) => {
  try {
    window.localStorage.setItem(searchStorageKey, JSON.stringify(items));
  } catch (error) {
    // Ignore storage errors.
  }
};

const storeRecentItem = (item) => {
  if (!item || !item.slug) return;
  const entries = readRecentItems();
  const existing = entries.find((entry) => entry.slug === item.slug) || {};
  const next = {
    slug: item.slug,
    name: item.name || existing.name || '',
    category: item.category || existing.category || '',
    image: item.image || existing.image || '',
    shortDescription: item.shortDescription || existing.shortDescription || '',
    price: Number.isFinite(item.price) ? item.price : existing.price,
    ts: Date.now()
  };
  const merged = [next, ...entries.filter((entry) => entry.slug !== item.slug)].slice(0, recentResultLimit);
  writeRecentItems(merged);
};

const storeRecentSlug = (slug) => {
  if (!slug) return;
  storeRecentItem({ slug });
};

const buildSearchIndex = async () => {
  const data = await fetchJson(menuApiUrl);
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const items = Array.isArray(data.items) ? data.items : [];
  const categoryMap = new Map(categories.map((category) => [category.slug, category]));

  const indexedItems = items.map((item) => {
    const category = categoryMap.get(item.category) || {};
    return {
      type: 'item',
      slug: item.slug,
      title: item.name,
      description: item.shortDescription,
      image: item.image,
      price: item.price,
      categorySlug: item.category,
      categoryName: category.name || item.category,
      tags: item.tags || [],
      ingredients: item.ingredients || [],
      href: getItemPageHref(item.slug)
    };
  });

  const indexedCategories = categories.map((category) => ({
    type: 'category',
    slug: category.slug,
    title: category.name,
    description: category.description,
    english: category.english,
    tagline: category.tagline,
    href: getCategoryPageHref(category.slug)
  }));

  const indexedPages = [
    {
      type: 'page',
      title: '品牌首頁',
      description: 'La Miu 首頁、理念與空間敘事',
      keywords: '首頁 品牌 故事 空間',
      href: 'index.html'
    },
    {
      type: 'page',
      title: '線上訂位',
      description: '填寫訂位資訊，預留晨間座位',
      keywords: '訂位 預約 reserve',
      href: 'index.html#reserve'
    },
    {
      type: 'page',
      title: '菜單總覽',
      description: '完整菜單分類與推薦品項',
      keywords: '菜單 總覽 menu',
      href: 'menu.html'
    },
    {
      type: 'page',
      title: '季節餐點',
      description: '當季限定餐點與推薦',
      keywords: '季節 餐點 限定 seasonal',
      href: 'menu.html#seasonal-menu'
    },
    {
      type: 'page',
      title: '早餐頁',
      description: '招牌早餐盤與晨食選擇',
      keywords: '早餐 brunch',
      href: 'breakfast.html'
    },
    {
      type: 'page',
      title: '咖啡頁',
      description: '手沖咖啡與咖啡飲品',
      keywords: '咖啡 coffee',
      href: 'coffee.html'
    },
    {
      type: 'page',
      title: '甜點頁',
      description: '甜點與午茶選擇',
      keywords: '甜點 dessert',
      href: 'dessert.html'
    }
  ];

  return {
    items: indexedItems,
    categories: indexedCategories,
    pages: indexedPages,
    categoryMap
  };
};

const getSearchIndex = async () => {
  if (!searchIndexPromise) {
    searchIndexPromise = buildSearchIndex().catch((error) => {
      console.error(error);
      return { items: [], categories: [], pages: [], categoryMap: new Map() };
    });
  }
  return searchIndexPromise;
};

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

const getTodayString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const hashString = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getRemainingSeats = (date, time) => {
  if (!date || !time) return 0;
  const capacity = reservationSlotCapacities[time] || 6;
  const hash = hashString(`${date}-${time}`);
  const reserved = hash % (capacity + 2);
  const day = new Date(date).getDay();
  const weekendPenalty = day === 0 || day === 6 ? 1 : 0;
  return Math.max(0, capacity - reserved - weekendPenalty);
};

const formatIcsDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${min}00`;
};

const formatGoogleDate = (date) => {
  const iso = date.toISOString().replace(/[-:]/g, '').split('.')[0];
  return `${iso}Z`;
};

const formatUtcStamp = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

const escapeIcsText = (value) => safeText(value).replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');

const buildReservationCalendarLinks = (payload) => {
  const googleLink = document.querySelector('#calendar-google');
  const icsLink = document.querySelector('#calendar-ics');
  if (!googleLink || !icsLink) return;

  const start = new Date(`${payload.date}T${payload.time}:00`);
  const end = new Date(start.getTime() + reservationDurationMinutes * 60000);
  const title = '樂沐 La Miu 訂位';
  const location = '台南市中西區衛民街129號';
  const details = `訂位姓名：${payload.name}\n人數：${payload.guests} 位\n備註：${payload.notes || '無'}`;

  const googleParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatGoogleDate(start)}/${formatGoogleDate(end)}`,
    details,
    location
  });
  googleLink.href = `https://www.google.com/calendar/render?${googleParams.toString()}`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//La Miu//Reservation//ZH-TW',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@lamiu`,
    `DTSTAMP:${formatUtcStamp(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `DESCRIPTION:${escapeIcsText(details)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  icsLink.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsLines.join('\n'))}`;
};

const setupAvailabilityPanel = () => {
  if (!reservationForm) return null;
  const timeSelect = reservationForm.querySelector('select[name="time"]');
  const availabilitySlots = document.querySelector('#availability-slots');
  const availabilityNote = document.querySelector('#availability-note');
  if (!timeSelect || !availabilitySlots) return null;

  if (reservationDate && !reservationDate.value) {
    reservationDate.value = getTodayString();
  }

  const options = Array.from(timeSelect.options).filter((option) => option.value);
  options.forEach((option) => {
    if (!option.dataset.baseLabel) {
      option.dataset.baseLabel = option.textContent;
    }
  });

  const render = () => {
    const dateValue = reservationDate?.value || getTodayString();
    let availableCount = 0;
    options.forEach((option) => {
      const remaining = getRemainingSeats(dateValue, option.value);
      const label = remaining > 0 ? `剩餘 ${remaining}` : '已滿';
      option.textContent = `${option.dataset.baseLabel}（${label}）`;
      option.disabled = remaining <= 0;
      if (remaining > 0) availableCount += 1;
    });

    const selectedOption = options.find((option) => option.value === timeSelect.value);
    if (selectedOption && selectedOption.disabled) {
      timeSelect.value = '';
    }

    if (availabilityNote) {
      availabilityNote.textContent = `${dateValue} 可預約時段 ${availableCount} / ${options.length}`;
    }

    availabilitySlots.innerHTML = options.map((option) => {
      const remaining = getRemainingSeats(dateValue, option.value);
      const isSelected = timeSelect.value === option.value;
      const isFull = remaining <= 0;
      return `
        <button type="button" class="availability-slot${isSelected ? ' is-selected' : ''}${isFull ? ' is-full' : ''}" data-time="${option.value}" ${isFull ? 'disabled' : ''}>
          <span class="availability-slot__time">${option.value}</span>
          <span class="availability-slot__meta">${isFull ? '已滿' : `剩餘 ${remaining}`}</span>
        </button>
      `;
    }).join('');
  };

  availabilitySlots.addEventListener('click', (event) => {
    const target = event.target.closest('[data-time]');
    if (!target || target.disabled) return;
    timeSelect.value = target.dataset.time;
    render();
  });

  reservationDate?.addEventListener('change', render);
  timeSelect.addEventListener('change', render);
  render();
  return { render };
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

  if (getRemainingSeats(date, time) <= 0) {
    return '該時段已滿，請選擇其他時段。';
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
  const availability = setupAvailabilityPanel();
  const successPanel = document.querySelector('#reservation-success');
  const successSummary = document.querySelector('#reservation-success-summary');
  const hideSuccess = () => {
    if (successPanel) {
      successPanel.hidden = true;
    }
  };

  reservationForm.addEventListener('input', hideSuccess);
  reservationForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(reservationForm);
    const error = validateReservation(formData);

    if (error) {
      updateReservationStatus(error, 'error');
      return;
    }

    const payload = {
      date: safeText(formData.get('date')),
      time: safeText(formData.get('time')),
      guests: safeText(formData.get('guests')),
      name: safeText(formData.get('name')),
      notes: safeText(formData.get('notes'))
    };
    const summary = `${payload.date} ${payload.time}，${payload.guests} 位，${payload.name}。`;
    updateReservationStatus(`訂位需求已送出：${summary} 我們將以電話或 Email 與你確認。`, 'success');
    buildReservationCalendarLinks(payload);
    if (successSummary) {
      successSummary.textContent = `預約完成：${summary} 可點擊下方加入行事曆。`;
    }
    if (successPanel) {
      successPanel.hidden = false;
    }
    reservationForm.reset();
    setReservationMinDate();
    if (reservationDate) {
      reservationDate.value = getTodayString();
    }
    availability?.render();
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
    <div class="menu-item-photo" style="background-image:url('${item.image}')">
      <div class="card-photo-overlay">
        <span class="card-photo-overlay__label">Quick Preview</span>
        <button class="preview-button" type="button" data-preview-slug="${item.slug}" aria-label="快速預覽 ${item.name}">快速預覽</button>
      </div>
    </div>
    <div class="menu-item-copy">
      <h3>${item.name}</h3>
      <p>${item.shortDescription}</p>
      ${getDietaryBadgesHtml(item)}
      <span class="price">${formatPrice(item.price)}</span>
      <a class="text-link" href="${getItemPageHref(item.slug)}" data-item-link data-item-slug="${item.slug}" data-item-name="${item.name}" data-item-category="${item.category}" data-item-image="${item.image}" data-item-price="${item.price}" data-item-short="${item.shortDescription}">查看單品介紹</a>
    </div>
  </article>
`;

const createCategoryDishCard = (item) => `
  <article class="category-dish-card">
    <div class="category-dish-photo" style="background-image:url('${item.image}')">
      <div class="card-photo-overlay">
        <span class="card-photo-overlay__label">Quick Preview</span>
        <button class="preview-button" type="button" data-preview-slug="${item.slug}" aria-label="快速預覽 ${item.name}">快速預覽</button>
      </div>
    </div>
    <div class="category-dish-copy">
      <h3>${item.name}</h3>
      <p>${item.shortDescription}</p>
      ${getDietaryBadgesHtml(item)}
      <span class="price">${formatPrice(item.price)}</span>
      <a class="text-link" href="${getItemPageHref(item.slug)}" data-item-link data-item-slug="${item.slug}" data-item-name="${item.name}" data-item-category="${item.category}" data-item-image="${item.image}" data-item-price="${item.price}" data-item-short="${item.shortDescription}">查看單品介紹</a>
    </div>
  </article>
`;

const createSeasonalCard = (item) => `
  <article class="seasonal-card" style="background-image:url('${item.image}')">
    <div class="seasonal-card__copy">
      <p class="eyebrow small">${item.tags.join(' / ')}</p>
      <h3>${item.name}</h3>
      <p>${item.shortDescription}</p>
      ${getDietaryBadgesHtml(item)}
      <span class="price">${formatPrice(item.price)}</span>
      <button class="preview-button preview-button--light" type="button" data-preview-slug="${item.slug}" aria-label="快速預覽 ${item.name}">快速預覽</button>
      <a class="text-link text-link--light" href="${getItemPageHref(item.slug)}" data-item-link data-item-slug="${item.slug}" data-item-name="${item.name}" data-item-category="${item.category}" data-item-image="${item.image}" data-item-price="${item.price}" data-item-short="${item.shortDescription}">查看詳情</a>
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

const getRecentDisplayItems = (index) => {
  const entries = readRecentItems();
  const itemMap = new Map((index.items || []).map((item) => [item.slug, item]));
  return entries.map((entry) => {
    const item = itemMap.get(entry.slug) || {};
    return {
      type: 'item',
      slug: entry.slug,
      title: entry.name || item.title || entry.slug,
      description: entry.shortDescription || item.description || '',
      image: entry.image || item.image || '',
      price: Number.isFinite(entry.price) ? entry.price : item.price,
      categoryName: entry.category || item.categoryName || '',
      href: getItemPageHref(entry.slug)
    };
  }).filter((result) => result.title);
};

const filterItemsByDietary = (items, activeFilters) => {
  if (!activeFilters.length) return items;
  return items.filter((item) => {
    const profile = getDietaryProfile(item);
    return activeFilters.every((key) => profile[key]);
  });
};

const setupDietaryFilterPanel = (panel, items, grid, renderer) => {
  if (!panel || !grid) return;
  const inputs = Array.from(panel.querySelectorAll('input[type="checkbox"]'));
  const clearButton = panel.querySelector('.filter-clear');
  const statusNode = panel.parentElement ? panel.parentElement.querySelector('[data-filter-status]') : null;
  const totalCount = items.length;

  const render = () => {
    const activeFilters = inputs.filter((input) => input.checked).map((input) => input.value);
    const filtered = filterItemsByDietary(items, activeFilters);
    if (statusNode) {
      statusNode.textContent = `顯示 ${filtered.length} / ${totalCount} 項`;
    }
    if (!filtered.length) {
      grid.innerHTML = '<div class="menu-filter-empty">目前沒有符合條件的品項。</div>';
      return;
    }
    grid.innerHTML = filtered.map(renderer).join('');
  };

  inputs.forEach((input) => input.addEventListener('change', render));
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      inputs.forEach((input) => {
        input.checked = false;
      });
      render();
    });
  }
  render();
};

const getAvailabilityBucket = (availability) => {
  const text = safeText(availability);
  if (!text) return '';
  if (text.includes('週末')) return 'weekend';
  if (text.includes('全時段') || text.includes('輪替') || text.includes('每日')) return 'all-day';
  if (text.includes('季節') || text.includes('限定') || text.includes('春') || text.includes('夏') || text.includes('秋') || text.includes('冬')) {
    return 'seasonal';
  }
  return '';
};

const isPopularItem = (item) => {
  const tags = item.tags || [];
  return tags.some((tag) => ['人氣', '招牌', '主廚推薦'].some((keyword) => tag.includes(keyword)));
};

const sortMenuItems = (items, sortKey, orderMap) => {
  const sorted = [...items];
  switch (sortKey) {
    case 'price-asc':
      sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
      return sorted;
    case 'price-desc':
      sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
      return sorted;
    case 'popular':
      sorted.sort((a, b) => getPopularityScore(b) - getPopularityScore(a));
      return sorted;
    default:
      sorted.sort((a, b) => (orderMap.get(a.slug) ?? 0) - (orderMap.get(b.slug) ?? 0));
      return sorted;
  }
};

const setupMenuQuickFilters = (panel, items, grid, renderer) => {
  if (!panel || !grid) return;
  const toggleButtons = Array.from(panel.querySelectorAll('.filter-toggle'));
  const clearButton = panel.querySelector('.filter-clear');
  const sortSelect = panel.querySelector('[data-filter-sort]');
  const statusNode = panel.parentElement ? panel.parentElement.querySelector('[data-filter-status]') : null;
  const totalCount = items.length;
  const orderMap = new Map(items.map((item, index) => [item.slug, index]));
  const priceMatchers = {
    'under-200': (price) => price <= 200,
    '200-300': (price) => price > 200 && price <= 300,
    '300-400': (price) => price > 300 && price <= 400,
    'over-400': (price) => price > 400
  };

  const buildState = () => {
    const state = {
      price: new Set(),
      dietary: new Set(),
      availability: new Set(),
      popularity: false
    };
    toggleButtons.forEach((button) => {
      if (button.getAttribute('aria-pressed') !== 'true') return;
      const group = button.dataset.filterGroup;
      const value = button.dataset.filterValue;
      if (group === 'popularity') {
        state.popularity = true;
        return;
      }
      if (group && value && state[group]) {
        state[group].add(value);
      }
    });
    return state;
  };

  const applyFilters = () => {
    const state = buildState();
    let filtered = [...items];

    if (state.price.size) {
      filtered = filtered.filter((item) => {
        const price = Number(item.price || 0);
        return [...state.price].some((key) => (priceMatchers[key] ? priceMatchers[key](price) : false));
      });
    }

    if (state.availability.size) {
      filtered = filtered.filter((item) => state.availability.has(getAvailabilityBucket(item.availability)));
    }

    if (state.dietary.size) {
      filtered = filterItemsByDietary(filtered, [...state.dietary]);
    }

    if (state.popularity) {
      filtered = filtered.filter((item) => isPopularItem(item));
    }

    const sortKey = sortSelect ? sortSelect.value : 'default';
    filtered = sortMenuItems(filtered, sortKey, orderMap);

    if (statusNode) {
      statusNode.textContent = `顯示 ${filtered.length} / ${totalCount} 項`;
    }

    if (!filtered.length) {
      grid.innerHTML = '<div class="menu-filter-empty">目前沒有符合條件的品項。</div>';
      return;
    }

    grid.innerHTML = filtered.map(renderer).join('');
  };

  const toggleButton = (button) => {
    const isActive = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!isActive));
    button.classList.toggle('is-active', !isActive);
  };

  toggleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      toggleButton(button);
      applyFilters();
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener('change', applyFilters);
  }

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      toggleButtons.forEach((button) => {
        button.setAttribute('aria-pressed', 'false');
        button.classList.remove('is-active');
      });
      if (sortSelect) sortSelect.value = 'default';
      applyFilters();
    });
  }

  applyFilters();
};

const buildItemResultCard = (result) => {
  const priceText = Number.isFinite(result.price) ? formatPrice(result.price) : '';
  const meta = result.categoryName && priceText
    ? `${result.categoryName} · ${priceText}`
    : (result.categoryName || priceText);
  return `
    <a class="search-result" href="${result.href}" data-item-link data-item-slug="${result.slug}" data-item-name="${result.title}" data-item-category="${result.categoryName}" data-item-image="${result.image}" data-item-price="${result.price}" data-item-short="${result.description}" data-result-type="item">
      <div class="search-result__thumb" style="background-image:url('${result.image}')"></div>
      <div class="search-result__copy">
        <strong>${result.title}</strong>
        <p>${result.description || ''}</p>
        ${meta ? `<span class="search-result__meta">${meta}</span>` : ''}
      </div>
    </a>
  `;
};

const buildCategoryResultCard = (result) => `
  <a class="search-result" href="${result.href}" data-result-type="category">
    <div class="search-result__thumb search-result__thumb--icon">分類</div>
    <div class="search-result__copy">
      <strong>${result.title}</strong>
      <p>${result.description || result.tagline || ''}</p>
      <span class="search-result__meta">分類</span>
    </div>
  </a>
`;

const buildPageResultCard = (result) => `
  <a class="search-result" href="${result.href}" data-result-type="page">
    <div class="search-result__thumb search-result__thumb--icon">頁面</div>
    <div class="search-result__copy">
      <strong>${result.title}</strong>
      <p>${result.description || ''}</p>
      <span class="search-result__meta">頁面</span>
    </div>
  </a>
`;

const buildSearchGroup = (title, content) => `
  <div class="search-group">
    <div class="search-group__title">${title}</div>
    <div class="search-group__list">
      ${content}
    </div>
  </div>
`;

const buildPreviewTags = (item) => {
  const dietary = getDietaryProfile(item);
  const dietaryTags = dietaryBadgeConfig
    .filter((badge) => dietary[badge.key])
    .map((badge) => badge.label);
  const combinedTags = [...(item.tags || []), ...dietaryTags];
  return combinedTags.map((tag) => `<span class="tag">${tag}</span>`).join('');
};

const setupQuickPreview = () => {
  const modal = document.createElement('div');
  modal.className = 'preview-modal';
  modal.innerHTML = `
    <div class="preview-backdrop" data-preview-close></div>
    <div class="preview-card" role="dialog" aria-modal="true" aria-label="單品快速預覽">
      <div class="preview-photo"></div>
      <div class="preview-content">
        <p class="eyebrow small">Quick Preview</p>
        <h3 class="preview-title"></h3>
        <p class="preview-description"></p>
        <div class="preview-meta">
          <div><span>價格</span><strong class="preview-price"></strong></div>
          <div><span>供應</span><strong class="preview-availability"></strong></div>
          <div><span>搭配</span><strong class="preview-pairing"></strong></div>
        </div>
        <div class="tag-cloud preview-tags"></div>
        <div class="preview-actions">
          <a class="btn btn-primary preview-link" href="#">查看單品介紹</a>
          <button class="btn btn-secondary" type="button" data-preview-close>關閉</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const photoNode = modal.querySelector('.preview-photo');
  const titleNode = modal.querySelector('.preview-title');
  const descNode = modal.querySelector('.preview-description');
  const priceNode = modal.querySelector('.preview-price');
  const availabilityNode = modal.querySelector('.preview-availability');
  const pairingNode = modal.querySelector('.preview-pairing');
  const tagsNode = modal.querySelector('.preview-tags');
  const linkNode = modal.querySelector('.preview-link');

  const open = (item) => {
    if (!item) return;
    if (photoNode) {
      photoNode.style.backgroundImage = `url('${item.image}')`;
    }
    if (titleNode) titleNode.textContent = item.name || '';
    if (descNode) descNode.textContent = item.description || item.shortDescription || '';
    if (priceNode) priceNode.textContent = formatPrice(item.price);
    if (availabilityNode) availabilityNode.textContent = item.availability || '依現場供應';
    if (pairingNode) pairingNode.textContent = item.pairing || '請洽現場';
    if (tagsNode) tagsNode.innerHTML = buildPreviewTags(item);
    if (linkNode) linkNode.href = getItemPageHref(item.slug);
    document.body.classList.add('preview-open');
    modal.classList.add('is-visible');
  };

  const close = () => {
    document.body.classList.remove('preview-open');
    modal.classList.remove('is-visible');
  };

  modal.addEventListener('click', (event) => {
    if (event.target && event.target.closest('[data-preview-close]')) {
      close();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-visible')) {
      close();
    }
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-preview-slug]');
    if (!trigger) return;
    const slug = trigger.dataset.previewSlug;
    const item = menuItemLookup.get(slug);
    if (item) {
      open(item);
    }
  });
};

const renderSearchResults = async (panel, query) => {
  const resultsNode = panel.querySelector('.search-results');
  const titleNode = panel.querySelector('.search-panel__title');
  const hintNode = panel.querySelector('.search-panel__hint');
  if (!resultsNode || !titleNode || !hintNode) return;

  const index = await getSearchIndex();
  const trimmedQuery = safeText(query);
  const hasQuery = Boolean(trimmedQuery);

  if (!hasQuery) {
    const recentItems = getRecentDisplayItems(index);
    const recentHtml = recentItems.length
      ? recentItems.map(buildItemResultCard).join('')
      : '<div class="search-empty">還沒有最近瀏覽的單品，試著點選菜單項目吧。</div>';
    const quickLinks = index.pages.slice(0, 4).map(buildPageResultCard).join('');
    const quickHtml = quickLinks ? buildSearchGroup('快速連結', quickLinks) : '';

    titleNode.textContent = '最近項目';
    hintNode.textContent = '輸入關鍵字可進行模糊搜尋';
    resultsNode.innerHTML = buildSearchGroup('最近瀏覽', recentHtml) + quickHtml;
    return;
  }

  const scoredItems = index.items.map((item) => {
    const fields = [
      { text: item.title, weight: 3.2 },
      { text: item.description, weight: 2 },
      { text: item.categoryName, weight: 1.4 },
      { text: item.tags.join(' '), weight: 1.4 },
      { text: item.ingredients.join(' '), weight: 1.2 }
    ];
    const score = fields.reduce((max, field) => Math.max(max, scoreText(trimmedQuery, field.text) * field.weight), 0);
    return { item, score };
  }).filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, searchResultLimit)
    .map((entry) => entry.item);

  const scoredCategories = index.categories.map((category) => {
    const fields = [
      { text: category.title, weight: 3 },
      { text: category.english, weight: 1.4 },
      { text: category.description, weight: 1.6 },
      { text: category.tagline, weight: 1.4 }
    ];
    const score = fields.reduce((max, field) => Math.max(max, scoreText(trimmedQuery, field.text) * field.weight), 0);
    return { category, score };
  }).filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((entry) => entry.category);

  const scoredPages = index.pages.map((page) => {
    const fields = [
      { text: page.title, weight: 2.6 },
      { text: page.description, weight: 1.6 },
      { text: page.keywords, weight: 1.4 }
    ];
    const score = fields.reduce((max, field) => Math.max(max, scoreText(trimmedQuery, field.text) * field.weight), 0);
    return { page, score };
  }).filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((entry) => entry.page);

  const totalResults = scoredItems.length + scoredCategories.length + scoredPages.length;
  titleNode.textContent = `搜尋結果（${totalResults}）`;
  hintNode.textContent = '可直接點選跳轉內容';

  if (!totalResults) {
    resultsNode.innerHTML = '<div class="search-empty">找不到符合的內容，試著改用其他關鍵字。</div>';
    return;
  }

  const itemHtml = scoredItems.length ? buildSearchGroup('菜單單品', scoredItems.map(buildItemResultCard).join('')) : '';
  const categoryHtml = scoredCategories.length ? buildSearchGroup('菜單分類', scoredCategories.map(buildCategoryResultCard).join('')) : '';
  const pageHtml = scoredPages.length ? buildSearchGroup('站內頁面', scoredPages.map(buildPageResultCard).join('')) : '';
  resultsNode.innerHTML = itemHtml + categoryHtml + pageHtml;
};

const setupRecentItemTracking = () => {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    if (link.dataset.itemLink !== undefined) {
      storeRecentItem({
        slug: link.dataset.itemSlug,
        name: link.dataset.itemName,
        category: link.dataset.itemCategory,
        image: link.dataset.itemImage,
        price: Number(link.dataset.itemPrice),
        shortDescription: link.dataset.itemShort
      });
      return;
    }
    const href = link.getAttribute('href') || '';
    const match = href.match(/item\.html\?slug=([^&#]+)/);
    if (match) {
      storeRecentSlug(decodeURIComponent(match[1]));
    }
  });
};

const setupGlobalSearch = () => {
  const nav = document.querySelector('.nav');
  if (!nav || nav.querySelector('.nav-search-trigger')) return;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'nav-search-trigger';
  trigger.innerHTML = '<span>搜尋</span><span class="nav-search-trigger__hint">/</span>';
  nav.appendChild(trigger);

  const panel = document.createElement('div');
  panel.className = 'search-panel';
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = `
    <div class="search-panel__backdrop" data-search-close></div>
    <div class="search-panel__content" role="dialog" aria-label="全站搜尋">
      <div class="search-panel__bar">
        <span class="search-panel__icon" aria-hidden="true"></span>
        <input class="search-input" type="search" placeholder="搜尋菜單、分類或頁面" autocomplete="off" />
        <button class="search-clear" type="button">清除</button>
        <button class="search-close" type="button" data-search-close>Esc</button>
      </div>
      <div class="search-panel__meta">
        <p class="search-panel__title">最近項目</p>
        <span class="search-panel__hint">輸入關鍵字可進行模糊搜尋</span>
      </div>
      <div class="search-results" role="listbox" aria-label="搜尋結果"></div>
    </div>
  `;
  document.body.appendChild(panel);

  const input = panel.querySelector('.search-input');
  const clearButton = panel.querySelector('.search-clear');
  const closeButtons = panel.querySelectorAll('[data-search-close]');
  let searchTimer = 0;

  const openSearch = () => {
    document.body.classList.add('search-open');
    panel.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => {
      input?.focus();
      input?.select();
    }, 0);
    renderSearchResults(panel, input?.value || '');
  };

  const closeSearch = () => {
    document.body.classList.remove('search-open');
    panel.setAttribute('aria-hidden', 'true');
  };

  trigger.addEventListener('click', openSearch);
  closeButtons.forEach((button) => button.addEventListener('click', closeSearch));

  panel.addEventListener('click', (event) => {
    if (event.target && event.target.closest('[data-search-close]')) {
      closeSearch();
    }
    if (event.target && event.target.closest('.search-result')) {
      closeSearch();
    }
  });

  if (input) {
    input.addEventListener('input', () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => renderSearchResults(panel, input.value), 140);
    });
  }

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      if (!input) return;
      input.value = '';
      renderSearchResults(panel, '');
      input.focus();
    });
  }

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const isTypingField = target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
    if (event.key === 'Escape' && document.body.classList.contains('search-open')) {
      closeSearch();
      return;
    }
    if (isTypingField) return;
    if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || event.key === '/') {
      event.preventDefault();
      openSearch();
    }
  });
};

const renderMenuOverview = async () => {
  const data = await fetchJson(menuApiUrl);
  cacheMenuItems(data.items);
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

  const todayGrid = document.querySelector('#today-picks-grid');
  const hotGrid = document.querySelector('#hot-picks-grid');
  const todayNote = document.querySelector('#today-picks-note');
  if (todayGrid) {
    const today = getDailyRecommendations(data.items);
    todayGrid.innerHTML = today.items.map(createMenuCard).join('');
    if (todayNote) {
      todayNote.textContent = `${getTimeSegmentLabel(today.segment)}，依當前時間更新`;
    }
  }
  if (hotGrid) {
    hotGrid.innerHTML = getHotItems(data.items).map(createMenuCard).join('');
  }

  const filterToolbar = document.querySelector('[data-menu-filter]');
  const filterPanel = document.querySelector('[data-filter-target="menu-filter-grid"]');
  const filterGrid = document.querySelector('#menu-filter-grid');
  if (filterToolbar && filterGrid) {
    setupMenuQuickFilters(filterToolbar, data.items, filterGrid, createMenuCard);
  } else if (filterPanel && filterGrid) {
    setupDietaryFilterPanel(filterPanel, data.items, filterGrid, createMenuCard);
  }
};

const renderCategoryPage = async () => {
  const slug = body.dataset.category;
  if (!slug) return;
  const payload = await fetchJson(getApiUrl(`/api/categories/${encodeURIComponent(slug)}`));
  const { category, items } = payload;
  cacheMenuItems(items);

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
    const filterPanel = document.querySelector('[data-filter-target="category-list-grid"]');
    if (filterPanel) {
      setupDietaryFilterPanel(filterPanel, items, listGrid, createCategoryDishCard);
    } else {
      listGrid.innerHTML = items.map(createCategoryDishCard).join('');
    }
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
  const payload = await fetchJson(getApiUrl(`/api/items/${encodeURIComponent(slug)}`));
  const { item, category, related } = payload;
  cacheMenuItems([item, ...related]);
  storeRecentItem({
    slug: item.slug,
    name: item.name,
    category: item.category,
    image: item.image,
    shortDescription: item.shortDescription,
    price: item.price
  });

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
    const dietary = getDietaryProfile(item);
    const dietaryTags = dietaryBadgeConfig
      .filter((badge) => dietary[badge.key])
      .map((badge) => badge.label);
    const combinedTags = [...(item.tags || []), ...dietaryTags];
    tagsNode.innerHTML = combinedTags.map((tag) => `<span class="tag">${tag}</span>`).join('');
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
      <span>${item.category} / ${formatPrice(item.price)}</span>
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
  image: safeText(form.image.value),
  shortDescription: safeText(form.shortDescription.value),
  description: safeText(form.description.value),
  pairing: safeText(form.pairing.value),
  availability: safeText(form.availability.value),
  ingredients: safeText(form.ingredients.value).split(',').map((entry) => safeText(entry)).filter(Boolean),
  tags: safeText(form.tags.value).split(',').map((entry) => safeText(entry)).filter(Boolean)
});

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
        slug: '', name: '', category: 'breakfast', price: 0, image: '', shortDescription: '', description: '', pairing: '', availability: '', ingredients: [], tags: []
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
setupRecentItemTracking();
setupGlobalSearch();
setupQuickPreview();
finishLoadingAfterReady();
initDataDrivenPages();
