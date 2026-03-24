const body = document.body;
const header = document.querySelector('.site-header');
const hero = document.querySelector('.hero');
const heroCard = document.querySelector('.hero-card');
const heroOverlay = document.querySelector('.hero-overlay');
const heroFloatingCard = document.querySelector('.hero-floating-card');
const reservationForm = document.querySelector('#reservation-form');
const reservationDate = document.querySelector('#reservation-date');
const reservationStatus = document.querySelector('#reservation-status');
const waitlistForm = document.querySelector('#waitlist-form');
const waitlistDate = document.querySelector('#waitlist-date');
const waitlistStatus = document.querySelector('#waitlist-status');
const takeoutForm = document.querySelector('#takeout-form');
const takeoutDate = document.querySelector('#takeout-date');
const takeoutStatus = document.querySelector('#takeout-status');
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
const favoriteStorageKey = 'la_miu_favorites_v1';
const compareStorageKey = 'la_miu_compare_items_v1';
const searchResultLimit = 8;
const recentResultLimit = 6;
const compareMaxItems = 3;
let searchIndexPromise = null;
let compareItems = [];
let compareUi = null;
let compareHandlersBound = false;
const reservationSlotCapacities = {
  '09:00': 8,
  '10:30': 10,
  '12:00': 12,
  '13:30': 10,
  '15:00': 8
};
const reservationDurationMinutes = 90;
const languageStorageKey = 'la_miu_lang_v1';
const supportedLangs = ['zh', 'en'];

const resolveLanguage = () => {
  const params = new URLSearchParams(window.location.search);
  const queryLang = (params.get('lang') || '').trim().toLowerCase();
  if (queryLang.startsWith('en')) return 'en';
  if (queryLang.startsWith('zh')) return 'zh';
  try {
    const stored = window.localStorage.getItem(languageStorageKey);
    if (stored && supportedLangs.includes(stored)) return stored;
  } catch (error) {
    // Ignore storage errors.
  }
  const docLang = (document.documentElement.lang || '').toLowerCase();
  if (docLang.startsWith('en')) return 'en';
  return 'zh';
};

let currentLang = resolveLanguage();

const i18n = window.LA_MIU_I18N || {};


const t = (key, params = {}) => {
  const dict = i18n[currentLang] || {};
  const fallback = i18n.zh || {};
  let template = dict[key] ?? fallback[key];
  if (!template) return key;
  Object.keys(params).forEach((param) => {
    template = template.replace(new RegExp(`\\{${param}\\}`, 'g'), String(params[param]));
  });
  return template;
};

const setCurrentLang = (nextLang) => {
  currentLang = nextLang === 'en' ? 'en' : 'zh';
  document.documentElement.lang = currentLang === 'en' ? 'en' : 'zh-Hant';
  document.documentElement.dataset.lang = currentLang;
  try {
    window.localStorage.setItem(languageStorageKey, currentLang);
  } catch (error) {
    // Ignore storage errors.
  }
};

setCurrentLang(currentLang);

const applyTranslations = () => {
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.dataset.i18n;
    const text = t(key);
    if (!text || text === key) return;
    node.textContent = text;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    const key = node.dataset.i18nPlaceholder;
    const text = t(key);
    if (!text || text === key) return;
    node.setAttribute('placeholder', text);
  });

  document.querySelectorAll('[data-i18n-aria]').forEach((node) => {
    const key = node.dataset.i18nAria;
    const text = t(key);
    if (!text || text === key) return;
    node.setAttribute('aria-label', text);
  });
};

const buildLangUrl = (lang, options = {}) => {
  const { preserveHash = false } = options;
  const url = new URL(window.location.href);
  if (!preserveHash) {
    url.hash = '';
  }
  if (lang === 'en') {
    url.searchParams.set('lang', 'en');
  } else {
    url.searchParams.delete('lang');
  }
  return url.toString();
};

const syncHreflang = () => {
  const entries = [
    { hreflang: 'zh-Hant', href: buildLangUrl('zh') },
    { hreflang: 'en', href: buildLangUrl('en') },
    { hreflang: 'x-default', href: buildLangUrl('zh') }
  ];

  entries.forEach(({ hreflang, href }) => {
    let link = document.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', hreflang);
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  });
};

const setupLanguageSwitcher = () => {
  const links = Array.from(document.querySelectorAll('[data-lang-switch]'));
  if (!links.length) return;
  links.forEach((link) => {
    const targetLang = link.dataset.langSwitch === 'en' ? 'en' : 'zh';
    link.setAttribute('href', buildLangUrl(targetLang, { preserveHash: true }));
    link.classList.toggle('is-active', currentLang === targetLang);
    link.addEventListener('click', () => {
      setCurrentLang(targetLang);
    });
  });
};

const syncLanguageLinks = () => {
  if (currentLang !== 'en') return;
  const links = Array.from(document.querySelectorAll('a[href]'));
  links.forEach((link) => {
    if (link.dataset.langSwitch) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
      return;
    }
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return;
    url.searchParams.set('lang', 'en');
    link.setAttribute('href', url.toString());
  });
};

const categoryTranslations = {
  breakfast: {
    name: 'Breakfast',
    tagline: 'Morning Plates',
    description: 'Signature breakfast plates, egg dishes, sourdough toast, and weekend skillets form La Miu\'s morning staples.',
    noteTitle: 'Breakfast is served until 4:30 PM. Weekends book up quickly.',
    noteText: 'If you would like a window seat or a table for 4+, add a note and we will arrange based on availability.',
    pairings: [
      { label: 'Pair with coffee', href: 'coffee.html' },
      { label: 'Pair with dessert', href: 'dessert.html' }
    ]
  },
  coffee: {
    name: 'Coffee',
    tagline: 'Espresso & Brew',
    description: 'From espresso to pour-over and warm milk drinks, this page gathers the best pairings for brunch and dessert.',
    noteTitle: 'If it\'s your first visit, start with a latte alongside pancakes or a cinnamon roll.',
    noteText: 'Beans and pour-over selections rotate seasonally - ask our team for today\'s list.',
    pairings: [
      { label: 'Pair with breakfast', href: 'breakfast.html' },
      { label: 'Pair with dessert', href: 'dessert.html' }
    ]
  },
  dessert: {
    name: 'Dessert',
    tagline: 'Pastry & Sweets',
    description: 'Cinnamon rolls, Basque cheesecake, seasonal fruit tarts, and limited sweets keep the same warm cadence as the brand.',
    noteTitle: 'Dessert availability depends on daily batches; popular items may sell out early.',
    noteText: 'If you\'re visiting for cinnamon rolls or seasonal specials, arrive around noon for the best selection.',
    pairings: [
      { label: 'Pair with coffee', href: 'coffee.html' },
      { label: 'View breakfast', href: 'breakfast.html' }
    ]
  }
};

const getCategoryContent = (category) => {
  if (!category) {
    return {
      eyebrow: '',
      title: '',
      description: '',
      noteTitle: '',
      noteText: '',
      pairings: []
    };
  }
  if (currentLang !== 'en') {
    return {
      eyebrow: category.english || category.name || '',
      title: category.name || '',
      description: category.description || '',
      noteTitle: category.noteTitle || '',
      noteText: category.noteText || '',
      pairings: category.pairings || []
    };
  }
  const translation = categoryTranslations[category.slug] || {};
  return {
    eyebrow: translation.tagline || category.tagline || category.english || category.name || '',
    title: translation.name || category.english || category.name || '',
    description: translation.description || category.description || '',
    noteTitle: translation.noteTitle || category.noteTitle || '',
    noteText: translation.noteText || category.noteText || '',
    pairings: translation.pairings || category.pairings || []
  };
};

const getHeaderOffset = () => (header ? header.getBoundingClientRect().height + 24 : 96);
const appConfig = window.LA_MIU_CONFIG || {};
const apiBase = String(appConfig.apiBase || window.location.origin).replace(/\/$/, '');
const menuApiUrl = `${apiBase}/api/menu`;
const getApiUrl = (path) => `${apiBase}${path}`;

const setupReviewCta = () => {
  const link = document.querySelector('[data-review-link]');
  if (!link) return;
  const reviewUrl = safeText(appConfig.googleReviewUrl);
  if (!reviewUrl) {
    link.style.display = 'none';
    return;
  }
  link.setAttribute('href', reviewUrl);
};

const setupNewsletterForms = () => {
  const forms = Array.from(document.querySelectorAll('[data-newsletter-form]'));
  if (!forms.length) return;

  const newsletterConfig = appConfig.newsletter || {};
  const action = safeText(newsletterConfig.action);
  const method = safeText(newsletterConfig.method || 'post').toLowerCase();
  const emailField = safeText(newsletterConfig.emailField || 'EMAIL');
  const sendingMessage = safeText(newsletterConfig.sendingMessage) || t('footer.newsletter.sending');
  const successMessage = safeText(newsletterConfig.successMessage) || t('footer.newsletter.success');
  const hiddenFields = newsletterConfig.hiddenFields && typeof newsletterConfig.hiddenFields === 'object'
    ? newsletterConfig.hiddenFields
    : null;

  forms.forEach((form) => {
    const status = form.querySelector('[data-newsletter-status]');
    const submitButton = form.querySelector('button[type="submit"]');
    const emailInput = form.querySelector('[data-newsletter-email]');

    if (emailInput && emailField) {
      emailInput.setAttribute('name', emailField);
    }

    if (!action) {
      if (submitButton) submitButton.disabled = true;
      if (status) {
        status.textContent = t('footer.newsletter.unconfigured');
        status.dataset.state = 'error';
      }
      form.addEventListener('submit', (event) => {
        event.preventDefault();
      });
      return;
    }

    form.setAttribute('action', action);
    form.setAttribute('method', method || 'post');

    const iframeName = `newsletter-target-${Math.random().toString(36).slice(2, 9)}`;
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.className = 'newsletter-iframe';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    form.appendChild(iframe);
    form.setAttribute('target', iframeName);

    if (hiddenFields) {
      Object.entries(hiddenFields).forEach(([name, value]) => {
        if (!name) return;
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = String(value ?? '');
        form.appendChild(input);
      });
    }

    form.addEventListener('submit', () => {
      if (status) {
        status.textContent = sendingMessage;
        status.dataset.state = '';
        window.setTimeout(() => {
          status.textContent = successMessage;
          status.dataset.state = 'success';
          if (emailInput) emailInput.value = '';
        }, 400);
      }
      if (submitButton) {
        submitButton.disabled = true;
        window.setTimeout(() => {
          submitButton.disabled = false;
        }, 1500);
      }
    });
  });
};

const syncSeoMeta = () => {
  const cleanUrl = currentLang === 'zh' ? buildLangUrl('zh') : window.location.href.split('#')[0];
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', cleanUrl);

  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (!ogUrl) {
    ogUrl = document.createElement('meta');
    ogUrl.setAttribute('property', 'og:url');
    document.head.appendChild(ogUrl);
  }
  ogUrl.setAttribute('content', cleanUrl);

  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) {
    const content = ogImage.getAttribute('content') || '';
    if (content && !content.startsWith('http')) {
      ogImage.setAttribute('content', new URL(content, window.location.href).toString());
    }
  }

  const twitterImage = document.querySelector('meta[name="twitter:image"]');
  if (twitterImage) {
    const content = twitterImage.getAttribute('content') || '';
    if (content && !content.startsWith('http')) {
      twitterImage.setAttribute('content', new URL(content, window.location.href).toString());
    }
  }
};

const upsertJsonLd = (id, payload) => {
  if (!payload) return;
  let node = document.querySelector(`script[data-jsonld="${id}"]`);
  if (!node) {
    node = document.createElement('script');
    node.type = 'application/ld+json';
    node.dataset.jsonld = id;
    document.head.appendChild(node);
  }
  node.textContent = JSON.stringify(payload);
};

const setMetaProperty = (property, content) => {
  if (!content) return;
  let node = document.querySelector(`meta[property="${property}"]`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute('property', property);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content);
};

const setMetaName = (name, content) => {
  if (!content) return;
  let node = document.querySelector(`meta[name="${name}"]`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute('name', name);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content);
};

const syncLanguageMeta = () => {
  setMetaProperty('og:locale', currentLang === 'en' ? 'en_US' : 'zh_TW');
  syncHreflang();
};

const applyPageMeta = () => {
  const pageKey = pageType === 'home' ? 'seo.home' : (pageType === 'menu-overview' ? 'seo.menu' : '');
  if (!pageKey) return;
  const titleKey = `${pageKey}.title`;
  const descKey = `${pageKey}.description`;
  const ogDescKey = `${pageKey}.ogDescription`;
  const twitterDescKey = `${pageKey}.twitterDescription`;
  const title = t(titleKey);
  const description = t(descKey);
  const ogDescription = t(ogDescKey);
  const twitterDescription = t(twitterDescKey);

  if (title && title !== titleKey) {
    document.title = title;
    setMetaProperty('og:title', title);
    setMetaName('twitter:title', title);
  }

  if (description && description !== descKey) {
    setMetaName('description', description);
    setMetaProperty('og:description', ogDescription !== ogDescKey ? ogDescription : description);
    setMetaName('twitter:description', twitterDescription !== twitterDescKey ? twitterDescription : description);
  }
};

const finishLoading = () => {
  body.classList.remove('is-loading');
  body.classList.add('is-ready');
};

const safeText = (value) => String(value || '').trim();
const formatPrice = (value) => `NT$ ${Number(value || 0)}`;
const getAttribution = () => {
  const params = new URLSearchParams(window.location.search);
  const utm = {
    source: safeText(params.get('utm_source')),
    medium: safeText(params.get('utm_medium')),
    campaign: safeText(params.get('utm_campaign')),
    content: safeText(params.get('utm_content')),
    term: safeText(params.get('utm_term'))
  };
  const hasUtm = Object.values(utm).some(Boolean);
  return {
    utm: hasUtm ? utm : {},
    referrer: safeText(document.referrer),
    landing: `${window.location.pathname}${window.location.search}`
  };
};
const attribution = getAttribution();
const withLangParam = (href) => {
  if (currentLang !== 'en') return href;
  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return href;
    url.searchParams.set('lang', 'en');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch (error) {
    return href;
  }
};
const getCategoryPageHref = (slug) => withLangParam(`${slug}.html`);
const getItemPageHref = (slug) => withLangParam(`item.html?slug=${encodeURIComponent(slug)}`);

const dietaryKeywords = {
  meat: [
    '培根', '火腿', '鮭魚', '鴨', '雞', '豬', '牛肉', '羊', '海鮮', '蝦', '蟹', '貝', '魚', '牛排',
    'bacon', 'ham', 'salmon', 'duck', 'chicken', 'pork', 'beef', 'lamb', 'seafood', 'shrimp', 'crab', 'fish', 'steak'
  ],
  eggDairy: [
    '蛋', '雞蛋', '水波蛋', '半熟蛋', '荷蘭醬', '牛奶', '鮮奶', '奶油', '鮮奶油', '乳酪', '起司', '優格', '奶泡', '奶霜', '奶香', '奶茶',
    'egg', 'omelet', 'hollandaise', 'milk', 'cream', 'cheese', 'yogurt', 'latte', 'dairy'
  ],
  nuts: [
    '堅果', '杏仁', '核桃', '腰果', '榛果', '花生', '胡桃', '開心果',
    'nut', 'almond', 'walnut', 'cashew', 'hazelnut', 'peanut', 'pistachio'
  ],
  gluten: [
    '麵包', '吐司', '麵粉', '麵團', '鬆餅', '蛋糕', '塔殼', '餅乾', '布里歐', '司康', '義大利麵', '麵條', '麩',
    'bread', 'toast', 'flour', 'pasta', 'noodle', 'cake', 'cookie', 'bagel', 'croissant'
  ]
};

const dietaryBadgeConfig = [
  { key: 'vegetarian', labelKey: 'dietary.vegetarian', className: 'tag-pill--veg' },
  { key: 'eggDairy', labelKey: 'dietary.eggDairy', className: 'tag-pill--egg' },
  { key: 'nuts', labelKey: 'dietary.nuts', className: 'tag-pill--nut' },
  { key: 'glutenFree', labelKey: 'dietary.glutenFree', className: 'tag-pill--gf' }
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
  const vegetarianTag = tagText.includes('素食') || tagText.includes('蔬食') || tagText.includes('vegetarian') || tagText.includes('vegan');
  const glutenFreeTag = tagText.includes('無麩質') || tagText.includes('gluten-free') || tagText.includes('gluten free');
  const eggDairyTag = tagText.includes('含蛋奶') || tagText.includes('egg') || tagText.includes('dairy');
  const nutTag = tagText.includes('含堅果') || tagText.includes('nuts') || tagText.includes('nut');
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
    .map((badge) => `<span class="tag-pill ${badge.className}">${t(badge.labelKey)}</span>`)
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
  if (tags.some((tag) => /人氣|popular/i.test(tag))) boost += 14;
  if (tags.some((tag) => /招牌|signature/i.test(tag))) boost += 10;
  if (tags.some((tag) => /主廚推薦|chef/i.test(tag))) boost += 8;
  if (tags.some((tag) => /季節限定|seasonal/i.test(tag))) boost += 4;
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
      return t('menu.today.segment.morning');
    case 'midday':
      return t('menu.today.segment.midday');
    case 'afternoon':
      return t('menu.today.segment.afternoon');
    default:
      return t('menu.today.segment.evening');
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

const isItemActive = (item) => item && (item.status || 'active') === 'active';

const getSortWeight = (item) => {
  const weight = Number(item?.sortWeight);
  return Number.isFinite(weight) ? weight : 0;
};

const sortItemsForDisplay = (items, orderMap) => {
  const sorted = [...items];
  sorted.sort((a, b) => {
    const weightDiff = getSortWeight(b) - getSortWeight(a);
    if (weightDiff !== 0) return weightDiff;
    return (orderMap.get(a.slug) ?? 0) - (orderMap.get(b.slug) ?? 0);
  });
  return sorted;
};

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
  const items = Array.isArray(data.items) ? data.items.filter(isItemActive) : [];
  const categoryMap = new Map(categories.map((category) => [category.slug, category]));

  const indexedItems = items.map((item) => {
    const category = categoryMap.get(item.category) || {};
    const categoryCopy = getCategoryContent(category);
    return {
      type: 'item',
      slug: item.slug,
      title: item.name,
      description: item.shortDescription,
      image: item.image,
      price: item.price,
      categorySlug: item.category,
      categoryName: categoryCopy.title || category.name || item.category,
      tags: item.tags || [],
      ingredients: item.ingredients || [],
      href: getItemPageHref(item.slug)
    };
  });

  const indexedCategories = categories.map((category) => ({
    type: 'category',
    slug: category.slug,
    title: getCategoryContent(category).title,
    description: getCategoryContent(category).description,
    english: category.english,
    tagline: category.tagline,
    href: getCategoryPageHref(category.slug)
  }));

  const indexedPages = [
    {
      type: 'page',
      title: t('search.page.home.title'),
      description: t('search.page.home.description'),
      keywords: t('search.page.home.keywords'),
      href: withLangParam('index.html')
    },
    {
      type: 'page',
      title: t('search.page.reserve.title'),
      description: t('search.page.reserve.description'),
      keywords: t('search.page.reserve.keywords'),
      href: withLangParam('index.html#reserve')
    },
    {
      type: 'page',
      title: t('search.page.menu.title'),
      description: t('search.page.menu.description'),
      keywords: t('search.page.menu.keywords'),
      href: withLangParam('menu.html')
    },
    {
      type: 'page',
      title: t('search.page.seasonal.title'),
      description: t('search.page.seasonal.description'),
      keywords: t('search.page.seasonal.keywords'),
      href: withLangParam('menu.html#seasonal-menu')
    },
    {
      type: 'page',
      title: t('search.page.breakfast.title'),
      description: t('search.page.breakfast.description'),
      keywords: t('search.page.breakfast.keywords'),
      href: withLangParam('breakfast.html')
    },
    {
      type: 'page',
      title: t('search.page.coffee.title'),
      description: t('search.page.coffee.description'),
      keywords: t('search.page.coffee.keywords'),
      href: withLangParam('coffee.html')
    },
    {
      type: 'page',
      title: t('search.page.dessert.title'),
      description: t('search.page.dessert.description'),
      keywords: t('search.page.dessert.keywords'),
      href: withLangParam('dessert.html')
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

const setMinDate = (input) => {
  if (!input) return;
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  input.min = `${yyyy}-${mm}-${dd}`;
};

const setReservationMinDate = () => {
  setMinDate(reservationDate);
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

const parseGuestCount = (value) => {
  const text = safeText(value);
  if (!text) return 0;
  const numeric = Number(text.replace('+', ''));
  return Number.isFinite(numeric) ? numeric : 0;
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
  const title = t('reserve.calendar.title');
  const location = t('access.address.value');
  const details = [
    t('reserve.calendar.details.name', { name: payload.name }),
    t('reserve.calendar.details.guests', { count: payload.guests }),
    t('reserve.calendar.details.notes', { notes: payload.notes || t('reserve.calendar.details.none') })
  ].join('\n');

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
  const guestsSelect = reservationForm.querySelector('select[name="guests"]');
  const availabilitySlots = document.querySelector('#availability-slots');
  const availabilityNote = document.querySelector('#availability-note');
  const availabilityRecommend = document.querySelector('#availability-recommend');
  const availabilityRecommendNote = document.querySelector('#availability-recommend-note');
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
    const guestCount = parseGuestCount(guestsSelect?.value || '');
    let availableCount = 0;
    options.forEach((option) => {
      const remaining = getRemainingSeats(dateValue, option.value);
      const label = remaining > 0
        ? t('availability.remaining', { count: remaining })
        : t('availability.full');
      option.textContent = `${option.dataset.baseLabel}（${label}）`;
      option.disabled = remaining <= 0;
      if (remaining > 0) availableCount += 1;
    });

    const selectedOption = options.find((option) => option.value === timeSelect.value);
    if (selectedOption && selectedOption.disabled) {
      timeSelect.value = '';
    }

    if (availabilityNote) {
      availabilityNote.textContent = t('availability.dateSummary', {
        date: dateValue,
        available: availableCount,
        total: options.length
      });
    }

    if (availabilityRecommend) {
      const slotData = options.map((option) => ({
        time: option.value,
        remaining: getRemainingSeats(dateValue, option.value)
      })).filter((slot) => slot.remaining > 0);

      const preferred = guestCount
        ? slotData.filter((slot) => slot.remaining >= guestCount)
        : slotData;
      const ranked = (preferred.length ? preferred : slotData)
        .sort((a, b) => b.remaining - a.remaining)
        .slice(0, 3);

      availabilityRecommend.innerHTML = ranked.map((slot) => {
        const isSelected = timeSelect.value === slot.time;
        return `
          <button type="button" class="availability-recommend__slot${isSelected ? ' is-selected' : ''}" data-time="${slot.time}">
            ${t('availability.slot', { time: slot.time, remaining: slot.remaining })}
          </button>
        `;
      }).join('');

      if (availabilityRecommendNote) {
        const target = guestCount
          ? t('availability.recommend.guests', { count: guestCount })
          : t('availability.recommend.today');
        availabilityRecommendNote.textContent = ranked.length
          ? t('availability.recommend.note', { target })
          : t('availability.recommend.none');
      }
    }

    availabilitySlots.innerHTML = options.map((option) => {
      const remaining = getRemainingSeats(dateValue, option.value);
      const isSelected = timeSelect.value === option.value;
      const isFull = remaining <= 0;
      const meta = isFull
        ? t('availability.full')
        : t('availability.remaining', { count: remaining });
      return `
        <button type="button" class="availability-slot${isSelected ? ' is-selected' : ''}${isFull ? ' is-full' : ''}" data-time="${option.value}" ${isFull ? 'disabled' : ''}>
          <span class="availability-slot__time">${option.value}</span>
          <span class="availability-slot__meta">${meta}</span>
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

  availabilityRecommend?.addEventListener('click', (event) => {
    const target = event.target.closest('[data-time]');
    if (!target) return;
    timeSelect.value = target.dataset.time;
    render();
  });

  reservationDate?.addEventListener('change', render);
  timeSelect.addEventListener('change', render);
  guestsSelect?.addEventListener('change', render);
  render();
  return { render };
};

const isValidPhone = (value) => {
  const phone = safeText(value);
  return /^09\d{2}-?\d{3}-?\d{3}$/.test(phone) || /^0\d{1,2}-?\d{6,8}$/.test(phone);
};

const validateReservation = (formData) => {
  const name = safeText(formData.get('name'));
  const phone = safeText(formData.get('phone'));
  const email = safeText(formData.get('email'));
  const date = safeText(formData.get('date'));
  const time = safeText(formData.get('time'));
  const guests = safeText(formData.get('guests'));

  if (!date || !time || !guests || !name || !phone || !email) {
    return t('reserve.validation.required');
  }

  if (!isValidPhone(phone)) {
    return t('reserve.validation.phone');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return t('reserve.validation.email');
  }

  if (getRemainingSeats(date, time) <= 0) {
    return t('reserve.validation.full');
  }

  return '';
};

const validateWaitlist = (formData) => {
  const name = safeText(formData.get('name'));
  const phone = safeText(formData.get('phone'));
  const date = safeText(formData.get('date'));
  const time = safeText(formData.get('time'));
  const guests = safeText(formData.get('guests'));

  if (!date || !time || !guests || !name || !phone) {
    return t('waitlist.validation.required');
  }

  if (!isValidPhone(phone)) {
    return t('waitlist.validation.phone');
  }

  return '';
};

const validateTakeout = (formData) => {
  const name = safeText(formData.get('name'));
  const phone = safeText(formData.get('phone'));
  const date = safeText(formData.get('date'));
  const time = safeText(formData.get('time'));
  const items = safeText(formData.get('items'));

  if (!date || !time || !items || !name || !phone) {
    return t('takeout.validation.required');
  }

  if (!isValidPhone(phone)) {
    return t('takeout.validation.phone');
  }

  return '';
};

const updateReservationStatus = (message, status) => {
  if (!reservationStatus) return;
  reservationStatus.textContent = message;
  reservationStatus.dataset.state = status;
};

const updateWaitlistStatus = (message, status) => {
  if (!waitlistStatus) return;
  waitlistStatus.textContent = message;
  waitlistStatus.dataset.state = status;
};

const updateTakeoutStatus = (message, status) => {
  if (!takeoutStatus) return;
  takeoutStatus.textContent = message;
  takeoutStatus.dataset.state = status;
};

const setupReservationSteps = () => {
  if (!reservationForm) return null;
  const steps = Array.from(reservationForm.querySelectorAll('[data-step]'));
  const indicators = Array.from(reservationForm.querySelectorAll('[data-step-indicator]'));
  const nextButtons = Array.from(reservationForm.querySelectorAll('[data-step-next]'));
  const prevButtons = Array.from(reservationForm.querySelectorAll('[data-step-prev]'));
  const summaryNode = reservationForm.querySelector('#reservation-summary');
  const summaryFields = summaryNode
    ? Array.from(summaryNode.querySelectorAll('[data-summary]'))
    : [];
  const totalSteps = steps.length;
  let currentStep = 0;

  const updateIndicators = () => {
    indicators.forEach((indicator, index) => {
      indicator.classList.toggle('is-active', index === currentStep);
      indicator.classList.toggle('is-complete', index < currentStep);
    });
  };

  const updateSummary = () => {
    if (!summaryFields.length) return;
    const formData = new FormData(reservationForm);
    summaryFields.forEach((field) => {
      const key = field.dataset.summary;
      field.textContent = safeText(formData.get(key)) || '-';
    });
  };

  const showStep = (index) => {
    currentStep = Math.max(0, Math.min(totalSteps - 1, index));
    steps.forEach((step, idx) => step.classList.toggle('is-active', idx === currentStep));
    updateIndicators();
    updateSummary();
    updateReservationStatus('', '');
  };

  const validateStep = (index) => {
    const formData = new FormData(reservationForm);
    if (index === 0) {
      const date = safeText(formData.get('date'));
      const time = safeText(formData.get('time'));
      const guests = safeText(formData.get('guests'));
      if (!date || !time || !guests) {
        updateReservationStatus(t('reserve.step.error.basic'), 'error');
        return false;
      }
    }
    if (index === 1) {
      const name = safeText(formData.get('name'));
      const phone = safeText(formData.get('phone'));
      const email = safeText(formData.get('email'));
      if (!name || !phone || !email) {
        updateReservationStatus(t('reserve.step.error.contact'), 'error');
        return false;
      }
      if (!/^09\d{2}-?\d{3}-?\d{3}$/.test(phone) && !/^0\d{1,2}-?\d{6,8}$/.test(phone)) {
        updateReservationStatus(t('reserve.validation.phone'), 'error');
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        updateReservationStatus(t('reserve.validation.email'), 'error');
        return false;
      }
    }
    return true;
  };

  nextButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (!validateStep(currentStep)) return;
      showStep(currentStep + 1);
    });
  });

  prevButtons.forEach((button) => {
    button.addEventListener('click', () => showStep(currentStep - 1));
  });

  reservationForm.addEventListener('input', updateSummary);
  showStep(0);
  return {
    reset: () => showStep(0)
  };
};

const setupReservationForm = () => {
  if (!reservationForm) return;
  setReservationMinDate();
  const availability = setupAvailabilityPanel();
  const steps = setupReservationSteps();
  const successPanel = document.querySelector('#reservation-success');
  const successSummary = document.querySelector('#reservation-success-summary');
  const submitButton = reservationForm.querySelector('.reservation-submit');
  const submitDebounceMs = 1200;
  let isSubmitting = false;
  let isLocked = false;
  let lastSubmitAt = 0;
  const hideSuccess = () => {
    if (successPanel) {
      successPanel.hidden = true;
    }
  };
  const updateSubmitState = () => {
    if (!submitButton) return;
    submitButton.disabled = isSubmitting || isLocked;
  };
  const unlockAfterInput = () => {
    if (!isLocked) return;
    isLocked = false;
    updateSubmitState();
  };

  reservationForm.addEventListener('input', () => {
    hideSuccess();
    unlockAfterInput();
  });
  reservationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (isLocked) {
      updateReservationStatus(t('reserve.submit.already'), 'success');
      return;
    }
    const now = Date.now();
    if (now - lastSubmitAt < submitDebounceMs) {
      updateReservationStatus(t('reserve.submit.sending'), 'loading');
      return;
    }
    lastSubmitAt = now;
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
      phone: safeText(formData.get('phone')),
      email: safeText(formData.get('email')),
      notes: safeText(formData.get('notes')),
      utm: attribution.utm,
      referrer: attribution.referrer,
      landing: attribution.landing
    };
    const summary = t('reserve.summary.inline', {
      date: payload.date,
      time: payload.time,
      guests: payload.guests,
      name: payload.name
    });
    updateReservationStatus(t('reserve.submit.sending'), 'loading');
    isSubmitting = true;
    updateSubmitState();
    try {
      const response = await fetch(getApiUrl('/api/reservations'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) {
        throw new Error(result.error || `Request failed: ${response.status}`);
      }
      updateReservationStatus(t('reserve.submit.success', { summary }), 'success');
      buildReservationCalendarLinks(payload);
      if (successSummary) {
        successSummary.textContent = t('reserve.submit.successSummary', { summary });
      }
      if (successPanel) {
        successPanel.hidden = false;
        successPanel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      }
      isLocked = true;
      updateSubmitState();
      setReservationMinDate();
      availability?.render();
    } catch (submitError) {
      console.warn(submitError);
      updateReservationStatus(t('reserve.submit.error'), 'error');
    } finally {
      isSubmitting = false;
      updateSubmitState();
    }
  });
};

const setupWaitlistForm = () => {
  if (!waitlistForm) return;
  setMinDate(waitlistDate);
  const submitButton = waitlistForm.querySelector('button[type="submit"]');
  const submitDebounceMs = 1200;
  let isSubmitting = false;
  let isLocked = false;
  let lastSubmitAt = 0;

  const updateSubmitState = () => {
    if (!submitButton) return;
    submitButton.disabled = isSubmitting || isLocked;
  };

  const unlockAfterInput = () => {
    if (!isLocked) return;
    isLocked = false;
    updateSubmitState();
  };

  waitlistForm.addEventListener('input', () => {
    unlockAfterInput();
    updateWaitlistStatus('', '');
  });
  waitlistForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (isLocked) {
      updateWaitlistStatus(t('waitlist.submit.already'), 'success');
      return;
    }
    const now = Date.now();
    if (now - lastSubmitAt < submitDebounceMs) {
      updateWaitlistStatus(t('waitlist.submit.sending'), 'loading');
      return;
    }
    lastSubmitAt = now;

    const formData = new FormData(waitlistForm);
    const error = validateWaitlist(formData);
    if (error) {
      updateWaitlistStatus(error, 'error');
      return;
    }

    const payload = {
      date: safeText(formData.get('date')),
      time: safeText(formData.get('time')),
      guests: safeText(formData.get('guests')),
      name: safeText(formData.get('name')),
      phone: safeText(formData.get('phone')),
      notes: safeText(formData.get('notes')),
      utm: attribution.utm,
      referrer: attribution.referrer,
      landing: attribution.landing
    };
    const summary = t('waitlist.summary.inline', {
      date: payload.date,
      time: payload.time,
      guests: payload.guests,
      name: payload.name
    });
    updateWaitlistStatus(t('waitlist.submit.sending'), 'loading');
    isSubmitting = true;
    updateSubmitState();
    try {
      const response = await fetch(getApiUrl('/api/waitlist'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) {
        throw new Error(result.error || `Request failed: ${response.status}`);
      }
      updateWaitlistStatus(t('waitlist.submit.success', { summary }), 'success');
      isLocked = true;
      updateSubmitState();
    } catch (submitError) {
      console.warn(submitError);
      updateWaitlistStatus(t('waitlist.submit.error'), 'error');
    } finally {
      isSubmitting = false;
      updateSubmitState();
    }
  });
};

const setupTakeoutForm = () => {
  if (!takeoutForm) return;
  setMinDate(takeoutDate);
  const submitButton = takeoutForm.querySelector('button[type="submit"]');
  const submitDebounceMs = 1200;
  let isSubmitting = false;
  let isLocked = false;
  let lastSubmitAt = 0;

  const updateSubmitState = () => {
    if (!submitButton) return;
    submitButton.disabled = isSubmitting || isLocked;
  };

  const unlockAfterInput = () => {
    if (!isLocked) return;
    isLocked = false;
    updateSubmitState();
  };

  takeoutForm.addEventListener('input', () => {
    unlockAfterInput();
    updateTakeoutStatus('', '');
  });
  takeoutForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (isLocked) {
      updateTakeoutStatus(t('takeout.submit.already'), 'success');
      return;
    }
    const now = Date.now();
    if (now - lastSubmitAt < submitDebounceMs) {
      updateTakeoutStatus(t('takeout.submit.sending'), 'loading');
      return;
    }
    lastSubmitAt = now;

    const formData = new FormData(takeoutForm);
    const error = validateTakeout(formData);
    if (error) {
      updateTakeoutStatus(error, 'error');
      return;
    }

    const payload = {
      date: safeText(formData.get('date')),
      time: safeText(formData.get('time')),
      name: safeText(formData.get('name')),
      phone: safeText(formData.get('phone')),
      items: safeText(formData.get('items')),
      notes: safeText(formData.get('notes')),
      utm: attribution.utm,
      referrer: attribution.referrer,
      landing: attribution.landing
    };
    const summary = t('takeout.summary.inline', {
      date: payload.date,
      time: payload.time,
      name: payload.name
    });
    updateTakeoutStatus(t('takeout.submit.sending'), 'loading');
    isSubmitting = true;
    updateSubmitState();
    try {
      const response = await fetch(getApiUrl('/api/takeout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) {
        throw new Error(result.error || `Request failed: ${response.status}`);
      }
      updateTakeoutStatus(t('takeout.submit.success', { summary }), 'success');
      isLocked = true;
      updateSubmitState();
    } catch (submitError) {
      console.warn(submitError);
      updateTakeoutStatus(t('takeout.submit.error'), 'error');
    } finally {
      isSubmitting = false;
      updateSubmitState();
    }
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
      const nextUrl = new URL(window.location.href);
      nextUrl.hash = targetId;
      window.history.replaceState(null, '', nextUrl.toString());
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

const normalizeCompareItem = (entry) => {
  if (!entry || !entry.slug) return null;
  return {
    slug: String(entry.slug).trim(),
    name: String(entry.name || '').trim(),
    category: String(entry.category || '').trim(),
    image: String(entry.image || '').trim(),
    price: Number(entry.price || 0),
    shortDescription: String(entry.shortDescription || '').trim(),
    ingredients: Array.isArray(entry.ingredients) ? entry.ingredients.map((value) => String(value).trim()).filter(Boolean).slice(0, 6) : [],
    tags: Array.isArray(entry.tags) ? entry.tags.map((value) => String(value).trim()).filter(Boolean).slice(0, 6) : [],
    availability: String(entry.availability || '').trim(),
    pairing: String(entry.pairing || '').trim(),
    vegetarian: Boolean(entry.vegetarian),
    eggDairy: Boolean(entry.eggDairy),
    nuts: Boolean(entry.nuts),
    glutenFree: Boolean(entry.glutenFree)
  };
};

const readCompareItems = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(compareStorageKey) || '[]');
    if (!Array.isArray(raw)) return [];
    const unique = [];
    const seen = new Set();
    raw.forEach((entry) => {
      const normalized = normalizeCompareItem(entry);
      if (!normalized || !normalized.slug || seen.has(normalized.slug)) return;
      seen.add(normalized.slug);
      unique.push(normalized);
    });
    return unique.slice(0, compareMaxItems);
  } catch (error) {
    console.warn(error);
    return [];
  }
};

const writeCompareItems = () => {
  try {
    localStorage.setItem(compareStorageKey, JSON.stringify(compareItems.slice(0, compareMaxItems)));
  } catch (error) {
    console.warn(error);
  }
};

const isItemCompared = (slug) => compareItems.some((entry) => entry.slug === slug);

const getCompareToggleLabel = (slug) => (
  isItemCompared(slug) ? t('compare.button.selected') : t('compare.button.add')
);

const getCompareItemBySlug = (slug) => {
  if (!slug) return null;
  const current = menuItemLookup.get(slug);
  const existing = compareItems.find((entry) => entry.slug === slug) || {};
  return normalizeCompareItem({
    slug,
    name: current?.name || existing.name || '',
    category: current?.category || existing.category || '',
    image: current?.image || existing.image || '',
    price: current?.price ?? existing.price ?? 0,
    shortDescription: current?.shortDescription || existing.shortDescription || '',
    ingredients: current?.ingredients || existing.ingredients || [],
    tags: current?.tags || existing.tags || [],
    availability: current?.availability || existing.availability || '',
    pairing: current?.pairing || existing.pairing || '',
    vegetarian: current?.vegetarian ?? existing.vegetarian,
    eggDairy: current?.eggDairy ?? existing.eggDairy,
    nuts: current?.nuts ?? existing.nuts,
    glutenFree: current?.glutenFree ?? existing.glutenFree
  });
};

const createCompareToggleButton = (item) => {
  const active = isItemCompared(item.slug);
  return `<button class="compare-toggle${active ? ' is-active' : ''}" type="button" data-compare-toggle data-compare-slug="${item.slug}" aria-pressed="${active ? 'true' : 'false'}">${getCompareToggleLabel(item.slug)}</button>`;
};

const createCardActions = (item, options = {}) => {
  const { linkClass = 'text-link' } = options;
  return `
    <div class="menu-card-actions">
      ${createCompareToggleButton(item)}
      <a class="${linkClass}" href="${getItemPageHref(item.slug)}" data-item-link data-item-slug="${item.slug}" data-item-name="${item.name}" data-item-category="${item.category}" data-item-image="${item.image}" data-item-price="${item.price}" data-item-short="${item.shortDescription}">${t('preview.action.view')}</a>
    </div>
  `;
};

const createMenuCard = (item) => `
  <article class="menu-item-card">
    <div class="menu-item-photo" style="background-image:url('${item.image}')">
      <div class="card-photo-overlay">
        <span class="card-photo-overlay__label">${t('preview.label')}</span>
        <button class="preview-button" type="button" data-preview-slug="${item.slug}" aria-label="${t('preview.button.aria', { name: item.name })}">${t('preview.button')}</button>
      </div>
    </div>
    <div class="menu-item-copy">
      <h3>${item.name}</h3>
      <p>${item.shortDescription}</p>
      ${getDietaryBadgesHtml(item)}
      <span class="price">${formatPrice(item.price)}</span>
      ${createCardActions(item)}
    </div>
  </article>
`;

const createCategoryDishCard = (item) => `
  <article class="category-dish-card">
    <div class="category-dish-photo" style="background-image:url('${item.image}')">
      <div class="card-photo-overlay">
        <span class="card-photo-overlay__label">${t('preview.label')}</span>
        <button class="preview-button" type="button" data-preview-slug="${item.slug}" aria-label="${t('preview.button.aria', { name: item.name })}">${t('preview.button')}</button>
      </div>
    </div>
    <div class="category-dish-copy">
      <h3>${item.name}</h3>
      <p>${item.shortDescription}</p>
      ${getDietaryBadgesHtml(item)}
      <span class="price">${formatPrice(item.price)}</span>
      ${createCardActions(item)}
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
      <button class="preview-button preview-button--light" type="button" data-preview-slug="${item.slug}" aria-label="${t('preview.button.aria', { name: item.name })}">${t('preview.button')}</button>
      <a class="text-link text-link--light" href="${getItemPageHref(item.slug)}" data-item-link data-item-slug="${item.slug}" data-item-name="${item.name}" data-item-category="${item.category}" data-item-image="${item.image}" data-item-price="${item.price}" data-item-short="${item.shortDescription}">${t('preview.action.view')}</a>
    </div>
  </article>
`;

const createCategoryEntry = (category, count) => {
  const copy = getCategoryContent(category);
  const eyebrow = currentLang === 'en' ? copy.eyebrow : (category.english || copy.eyebrow);
  return `
    <a class="menu-category-card" href="${getCategoryPageHref(category.slug)}">
      <span class="menu-category-card__eyebrow">${eyebrow}</span>
      <strong>${copy.title}</strong>
      <p>${copy.description}</p>
      <span class="menu-category-card__meta">${t('menu.category.count', { count })}</span>
    </a>
  `;
};

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
  }).filter((result) => {
    const item = itemMap.get(result.slug);
    if (item && !isItemActive(item)) return false;
    return result.title;
  });
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
      statusNode.textContent = t('filter.status', { shown: filtered.length, total: totalCount });
    }
    if (!filtered.length) {
      grid.innerHTML = `<div class="menu-filter-empty">${t('filter.empty')}</div>`;
      syncCompareButtons();
      return;
    }
    grid.innerHTML = filtered.map(renderer).join('');
    syncCompareButtons();
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
  const text = normalizeText(availability);
  if (!text) return '';
  if (text.includes('週末') || text.includes('weekend')) return 'weekend';
  if (text.includes('全時段') || text.includes('輪替') || text.includes('每日') || text.includes('all day') || text.includes('all-day') || text.includes('daily')) {
    return 'all-day';
  }
  if (text.includes('季節') || text.includes('限定') || text.includes('春') || text.includes('夏') || text.includes('秋') || text.includes('冬')
    || text.includes('seasonal') || text.includes('limited') || text.includes('spring') || text.includes('summer') || text.includes('autumn') || text.includes('winter')) {
    return 'seasonal';
  }
  return '';
};

const isPopularItem = (item) => {
  const tags = item.tags || [];
  return tags.some((tag) => {
    const text = normalizeText(tag);
    return ['人氣', '招牌', '主廚推薦', 'popular', 'signature', 'chef'].some((keyword) => text.includes(keyword));
  });
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
      statusNode.textContent = t('filter.status', { shown: filtered.length, total: totalCount });
    }

    if (!filtered.length) {
      grid.innerHTML = `<div class="menu-filter-empty">${t('filter.empty')}</div>`;
      syncCompareButtons();
      return;
    }

    grid.innerHTML = filtered.map(renderer).join('');
    syncCompareButtons();
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
    <div class="search-result__thumb search-result__thumb--icon">${t('search.result.category')}</div>
    <div class="search-result__copy">
      <strong>${result.title}</strong>
      <p>${result.description || result.tagline || ''}</p>
      <span class="search-result__meta">${t('search.result.category')}</span>
    </div>
  </a>
`;

const buildPageResultCard = (result) => `
  <a class="search-result" href="${result.href}" data-result-type="page">
    <div class="search-result__thumb search-result__thumb--icon">${t('search.result.page')}</div>
    <div class="search-result__copy">
      <strong>${result.title}</strong>
      <p>${result.description || ''}</p>
      <span class="search-result__meta">${t('search.result.page')}</span>
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
    .map((badge) => t(badge.labelKey));
  const combinedTags = [...(item.tags || []), ...dietaryTags];
  return combinedTags.map((tag) => `<span class="tag">${tag}</span>`).join('');
};

const readFavorites = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(favoriteStorageKey) || '[]');
    return new Set(Array.isArray(stored) ? stored : []);
  } catch (error) {
    console.warn(error);
    return new Set();
  }
};

const writeFavorites = (favorites) => {
  localStorage.setItem(favoriteStorageKey, JSON.stringify([...favorites]));
};

const getCompareTags = (item) => {
  const dietary = getDietaryProfile(item);
  const dietaryTags = dietaryBadgeConfig
    .filter((badge) => dietary[badge.key])
    .map((badge) => t(badge.labelKey));
  return [...new Set([...(item.tags || []), ...dietaryTags])].filter(Boolean);
};

const createCompareCard = (item) => {
  const ingredientText = (item.ingredients || []).slice(0, 4).join('、') || '-';
  const tagsText = getCompareTags(item).slice(0, 6).join('、') || '-';
  const availabilityText = item.availability || t('item.fallback.availability');
  const pairingText = item.pairing || t('item.fallback.pairing');
  return `
    <article class="compare-card">
      <div class="compare-card__photo" style="background-image:url('${item.image || ''}')"></div>
      <div class="compare-card__content">
        <div class="compare-card__head">
          <h3>${item.name || item.slug}</h3>
          <button class="compare-card__remove" type="button" data-compare-remove="${item.slug}">${t('compare.panel.remove')}</button>
        </div>
        <p class="compare-card__desc">${item.shortDescription || ''}</p>
        <div class="compare-card__meta">
          <div><span>${t('preview.meta.price')}</span><strong>${formatPrice(item.price)}</strong></div>
          <div><span>${t('compare.meta.ingredients')}</span><strong>${ingredientText}</strong></div>
          <div><span>${t('compare.meta.tags')}</span><strong>${tagsText}</strong></div>
          <div><span>${t('compare.meta.availability')}</span><strong>${availabilityText}</strong></div>
          <div><span>${t('compare.meta.pairing')}</span><strong>${pairingText}</strong></div>
        </div>
        <a class="text-link" href="${getItemPageHref(item.slug)}">${t('preview.action.view')}</a>
      </div>
    </article>
  `;
};

const ensureCompareUi = () => {
  if (compareUi) return compareUi;
  const dock = document.createElement('div');
  dock.className = 'compare-dock';
  dock.hidden = true;
  dock.innerHTML = `
    <div class="compare-dock__copy">
      <p class="compare-dock__count"></p>
      <p class="compare-dock__status" aria-live="polite"></p>
    </div>
    <div class="compare-dock__actions">
      <button class="btn btn-primary compare-dock__open" type="button" data-compare-open>${t('compare.dock.open')}</button>
      <button class="btn btn-secondary compare-dock__clear" type="button" data-compare-clear>${t('compare.dock.clear')}</button>
    </div>
  `;
  document.body.appendChild(dock);

  const panel = document.createElement('div');
  panel.className = 'compare-panel';
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = `
    <div class="compare-panel__backdrop" data-compare-close></div>
    <div class="compare-panel__card" role="dialog" aria-modal="true" aria-label="${t('compare.panel.aria')}">
      <div class="compare-panel__head">
        <h3>${t('compare.panel.title')}</h3>
        <button class="compare-panel__close" type="button" data-compare-close>${t('compare.panel.close')}</button>
      </div>
      <p class="compare-panel__hint"></p>
      <div class="compare-panel__grid"></div>
    </div>
  `;
  document.body.appendChild(panel);

  compareUi = {
    dock,
    panel,
    countNode: dock.querySelector('.compare-dock__count'),
    statusNode: dock.querySelector('.compare-dock__status'),
    openButton: dock.querySelector('[data-compare-open]'),
    gridNode: panel.querySelector('.compare-panel__grid'),
    hintNode: panel.querySelector('.compare-panel__hint')
  };
  return compareUi;
};

const setCompareStatus = (message = '') => {
  const ui = ensureCompareUi();
  if (!ui.statusNode) return;
  ui.statusNode.textContent = message;
};

const syncCompareButtons = () => {
  const buttons = Array.from(document.querySelectorAll('[data-compare-toggle]'));
  buttons.forEach((button) => {
    const slug = button.dataset.compareSlug;
    const active = isItemCompared(slug);
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
    button.textContent = getCompareToggleLabel(slug);
  });
};

const renderComparePanel = () => {
  const ui = ensureCompareUi();
  if (!ui.gridNode || !ui.hintNode) return;
  if (!compareItems.length) {
    ui.gridNode.innerHTML = `<div class="compare-panel__empty">${t('compare.panel.empty')}</div>`;
    ui.hintNode.textContent = t('compare.panel.empty');
    return;
  }
  ui.gridNode.innerHTML = compareItems.map(createCompareCard).join('');
  ui.hintNode.textContent = compareItems.length < 2
    ? t('compare.dock.tip')
    : t('compare.dock.ready');
};

const closeComparePanel = () => {
  const ui = ensureCompareUi();
  document.body.classList.remove('compare-open');
  ui.panel.classList.remove('is-visible');
  ui.panel.setAttribute('aria-hidden', 'true');
};

const openComparePanel = () => {
  const ui = ensureCompareUi();
  if (compareItems.length < 2) {
    setCompareStatus(t('compare.dock.tip'));
    return;
  }
  renderComparePanel();
  document.body.classList.add('compare-open');
  ui.panel.classList.add('is-visible');
  ui.panel.setAttribute('aria-hidden', 'false');
};

const refreshCompareUi = () => {
  const ui = ensureCompareUi();
  const count = compareItems.length;
  ui.dock.hidden = count === 0;
  if (ui.countNode) {
    ui.countNode.textContent = t('compare.dock.count', { count, max: compareMaxItems });
  }
  if (ui.openButton) {
    ui.openButton.disabled = count < 2;
  }
  if (!ui.panel.classList.contains('is-visible')) {
    if (count === 0) setCompareStatus('');
  } else {
    renderComparePanel();
  }
  syncCompareButtons();
};

const toggleCompareItem = (slug) => {
  if (!slug) return;
  const existingIndex = compareItems.findIndex((entry) => entry.slug === slug);
  if (existingIndex >= 0) {
    const [removed] = compareItems.splice(existingIndex, 1);
    writeCompareItems();
    setCompareStatus(t('compare.status.removed', { name: removed?.name || slug }));
    if (!compareItems.length) {
      closeComparePanel();
    }
    refreshCompareUi();
    return;
  }
  if (compareItems.length >= compareMaxItems) {
    setCompareStatus(t('compare.status.limit', { max: compareMaxItems }));
    return;
  }
  const item = getCompareItemBySlug(slug);
  if (!item) {
    setCompareStatus(t('compare.status.missing'));
    return;
  }
  compareItems.push(item);
  writeCompareItems();
  setCompareStatus(t('compare.status.added', { name: item.name || slug }));
  refreshCompareUi();
};

const setupMenuCompareMode = () => {
  if (!['menu-overview', 'category', 'item-detail'].includes(pageType)) return;
  compareItems = readCompareItems();
  ensureCompareUi();
  refreshCompareUi();
  if (compareHandlersBound) return;

  document.addEventListener('click', (event) => {
    const toggleButton = event.target.closest('[data-compare-toggle]');
    if (toggleButton) {
      toggleCompareItem(toggleButton.dataset.compareSlug || '');
      return;
    }
    if (event.target.closest('[data-compare-open]')) {
      openComparePanel();
      return;
    }
    if (event.target.closest('[data-compare-clear]')) {
      compareItems = [];
      writeCompareItems();
      setCompareStatus('');
      closeComparePanel();
      refreshCompareUi();
      return;
    }
    if (event.target.closest('[data-compare-close]')) {
      closeComparePanel();
      return;
    }
    const removeButton = event.target.closest('[data-compare-remove]');
    if (removeButton) {
      toggleCompareItem(removeButton.getAttribute('data-compare-remove') || '');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const ui = ensureCompareUi();
      if (ui.panel.classList.contains('is-visible')) {
        closeComparePanel();
      }
    }
  });

  compareHandlersBound = true;
};

const copyToClipboard = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const temp = document.createElement('textarea');
  temp.value = text;
  temp.style.position = 'fixed';
  temp.style.opacity = '0';
  document.body.appendChild(temp);
  temp.select();
  const success = document.execCommand('copy');
  temp.remove();
  return success;
};

const buildShareUrl = (slug) => new URL(getItemPageHref(slug), window.location.href).toString();

const setupQuickPreview = () => {
  const modal = document.createElement('div');
  modal.className = 'preview-modal';
  modal.innerHTML = `
    <div class="preview-backdrop" data-preview-close></div>
    <div class="preview-card" role="dialog" aria-modal="true" aria-label="${t('preview.dialog.aria')}">
      <div class="preview-photo">
        <button class="preview-nav preview-nav--prev" type="button" aria-label="${t('preview.nav.prev')}" data-preview-nav="prev">←</button>
        <button class="preview-nav preview-nav--next" type="button" aria-label="${t('preview.nav.next')}" data-preview-nav="next">→</button>
      </div>
      <div class="preview-content">
        <div class="preview-toolbar">
          <p class="eyebrow small">${t('preview.label')}</p>
          <div class="preview-toolbar__actions">
            <button class="preview-action" type="button" data-preview-favorite>${t('preview.action.favorite')}</button>
            <button class="preview-action" type="button" data-preview-share>${t('preview.action.share')}</button>
          </div>
        </div>
        <h3 class="preview-title"></h3>
        <p class="preview-description"></p>
        <div class="preview-meta">
          <div><span>${t('preview.meta.price')}</span><strong class="preview-price"></strong></div>
          <div><span>${t('preview.meta.availability')}</span><strong class="preview-availability"></strong></div>
          <div><span>${t('preview.meta.pairing')}</span><strong class="preview-pairing"></strong></div>
        </div>
        <div class="tag-cloud preview-tags"></div>
        <p class="preview-feedback" role="status" aria-live="polite"></p>
        <div class="preview-actions">
          <a class="btn btn-primary preview-link" href="#">${t('preview.action.view')}</a>
          <button class="btn btn-secondary" type="button" data-preview-close>${t('preview.action.close')}</button>
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
  const feedbackNode = modal.querySelector('.preview-feedback');
  const favoriteButton = modal.querySelector('[data-preview-favorite]');
  const shareButton = modal.querySelector('[data-preview-share]');
  const prevButton = modal.querySelector('[data-preview-nav="prev"]');
  const nextButton = modal.querySelector('[data-preview-nav="next"]');
  let previewOrder = [];
  let previewIndex = 0;
  let currentItem = null;

  const setFeedback = (message) => {
    if (!feedbackNode) return;
    feedbackNode.textContent = message;
  };

  const buildPreviewOrder = () => {
    const nodes = Array.from(document.querySelectorAll('[data-preview-slug]'));
    const slugs = nodes.map((node) => node.dataset.previewSlug).filter(Boolean);
    const unique = [...new Set(slugs)];
    return unique.length ? unique : Array.from(menuItemLookup.keys());
  };

  const updateNavState = () => {
    const disabled = previewOrder.length <= 1;
    if (prevButton) prevButton.disabled = disabled;
    if (nextButton) nextButton.disabled = disabled;
  };

  const updateFavoriteState = () => {
    if (!favoriteButton || !currentItem) return;
    const favorites = readFavorites();
    const isFav = favorites.has(currentItem.slug);
    favoriteButton.textContent = isFav ? t('preview.action.favorited') : t('preview.action.favorite');
    favoriteButton.classList.toggle('is-active', isFav);
    favoriteButton.setAttribute('aria-pressed', String(isFav));
  };

  const open = (item, { keepOrder = false } = {}) => {
    if (!item) return;
    currentItem = item;
    if (photoNode) {
      photoNode.style.backgroundImage = `url('${item.image}')`;
    }
    if (titleNode) titleNode.textContent = item.name || '';
    if (descNode) descNode.textContent = item.description || item.shortDescription || '';
    if (priceNode) priceNode.textContent = formatPrice(item.price);
    if (pairingNode) pairingNode.textContent = item.pairing || t('item.fallback.pairing');
    if (availabilityNode) availabilityNode.textContent = item.availability || t('item.fallback.availability');
    if (tagsNode) tagsNode.innerHTML = buildPreviewTags(item);
    if (linkNode) linkNode.href = getItemPageHref(item.slug);
    if (!keepOrder) {
      previewOrder = buildPreviewOrder();
    }
    previewIndex = Math.max(0, previewOrder.indexOf(item.slug));
    updateNavState();
    updateFavoriteState();
    setFeedback('');
    document.body.classList.add('preview-open');
    modal.classList.add('is-visible');
  };

  const close = () => {
    document.body.classList.remove('preview-open');
    modal.classList.remove('is-visible');
  };

  const openByOffset = (offset) => {
    if (!previewOrder.length) return;
    const nextIndex = (previewIndex + offset + previewOrder.length) % previewOrder.length;
    const slug = previewOrder[nextIndex];
    const item = menuItemLookup.get(slug);
    if (item) {
      previewIndex = nextIndex;
      open(item, { keepOrder: true });
    }
  };

  modal.addEventListener('click', (event) => {
    if (event.target && event.target.closest('[data-preview-close]')) {
      close();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!modal.classList.contains('is-visible')) return;
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key === 'ArrowRight') {
      openByOffset(1);
    }
    if (event.key === 'ArrowLeft') {
      openByOffset(-1);
    }
  });

  if (prevButton) {
    prevButton.addEventListener('click', () => openByOffset(-1));
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => openByOffset(1));
  }

  if (favoriteButton) {
    favoriteButton.addEventListener('click', () => {
      if (!currentItem) return;
      const favorites = readFavorites();
      if (favorites.has(currentItem.slug)) {
        favorites.delete(currentItem.slug);
        setFeedback(t('preview.feedback.removed'));
      } else {
        favorites.add(currentItem.slug);
        setFeedback(t('preview.feedback.added'));
      }
      writeFavorites(favorites);
      updateFavoriteState();
    });
  }

  if (shareButton) {
    shareButton.addEventListener('click', async () => {
      if (!currentItem) return;
      const url = buildShareUrl(currentItem.slug);
      try {
        if (navigator.share) {
          await navigator.share({
            title: t('seo.item.title', { name: currentItem.name }),
            text: currentItem.shortDescription || '',
            url
          });
          setFeedback(t('preview.feedback.shareOpen'));
        } else {
          const success = await copyToClipboard(url);
          setFeedback(success ? t('preview.feedback.linkCopied') : t('preview.feedback.linkCopyFail'));
        }
      } catch (error) {
        console.warn(error);
        setFeedback(t('preview.feedback.shareCancel'));
      }
    });
  }

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

const setupSpaceCarousel = () => {
  const track = document.querySelector('[data-space-track]');
  const slides = Array.from(document.querySelectorAll('[data-space-slide]'));
  const dots = Array.from(document.querySelectorAll('[data-space-dot]'));
  const prevButton = document.querySelector('[data-space-prev]');
  const nextButton = document.querySelector('[data-space-next]');
  if (!track || !slides.length) return;
  let index = 0;

  const update = () => {
    track.style.transform = `translateX(-${index * 100}%)`;
    slides.forEach((slide, idx) => slide.classList.toggle('is-active', idx === index));
    dots.forEach((dot, idx) => dot.classList.toggle('is-active', idx === index));
  };

  const goTo = (next) => {
    index = (next + slides.length) % slides.length;
    update();
  };

  prevButton?.addEventListener('click', () => goTo(index - 1));
  nextButton?.addEventListener('click', () => goTo(index + 1));
  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => goTo(idx));
  });
  update();
};

const setupMobileQuickActions = () => {
  const scrollButton = document.querySelector('[data-scroll-top]');
  if (!scrollButton) return;
  const toggleButtons = () => {
    const hidden = window.scrollY < 240;
    scrollButton.classList.toggle('is-hidden', hidden);
  };

  scrollButton.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? 'auto' : 'smooth'
    });
  });

  window.addEventListener('scroll', toggleButtons, { passive: true });
  toggleButtons();
};

const setupBackgroundAudio = () => {
  if (pageType !== 'home') return;
  const audioRoot = document.querySelector('.bg-audio');
  if (!audioRoot) return;
  const playerHost = audioRoot.querySelector('#yt-bg-player');
  const toggle = audioRoot.querySelector('.bg-audio-toggle');
  const label = audioRoot.querySelector('.bg-audio-label');
  const videoId = (audioRoot.dataset.youtubeId || '').trim();
  if (!playerHost || !toggle || !label || !videoId) return;

  let player = null;
  let isReady = false;
  let isMuted = true;

  const setLabel = (key) => {
    label.textContent = t(key);
  };

  const syncToggle = () => {
    toggle.setAttribute('aria-pressed', String(!isMuted));
    toggle.classList.toggle('is-playing', !isMuted);
    setLabel(isMuted ? 'audio.toggle.on' : 'audio.toggle.off');
  };

  const ensureApi = () => new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') {
        previous();
      }
      resolve();
    };
  });

  const playMuted = () => {
    if (!player || !isReady) return;
    player.mute();
    player.setVolume(60);
    player.playVideo();
    isMuted = true;
    syncToggle();
  };

  const enableSound = () => {
    if (!player || !isReady) return;
    player.unMute();
    player.setVolume(60);
    player.playVideo();
    isMuted = false;
    syncToggle();
  };

  const disableSound = () => {
    if (!player || !isReady) return;
    player.mute();
    isMuted = true;
    syncToggle();
  };

  toggle.addEventListener('click', () => {
    if (!isReady) return;
    if (isMuted) {
      enableSound();
    } else {
      disableSound();
    }
  });

  setLabel('audio.toggle.loading');

  ensureApi().then(() => {
    const origin = window.location.origin || '';
    const playerVars = {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      playsinline: 1,
      loop: 1,
      playlist: videoId,
      modestbranding: 1,
      rel: 0,
      mute: 1
    };
    if (origin.startsWith('http')) {
      playerVars.origin = origin;
    }

    player = new YT.Player(playerHost, {
      videoId,
      playerVars,
      events: {
        onReady: () => {
          isReady = true;
          playMuted();
        }
      }
    });
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
      : `<div class="search-empty">${t('search.empty.recent')}</div>`;
    const quickLinks = index.pages.slice(0, 4).map(buildPageResultCard).join('');
    const quickHtml = quickLinks ? buildSearchGroup(t('search.group.quick'), quickLinks) : '';

    titleNode.textContent = t('search.panel.title.recent');
    hintNode.textContent = t('search.panel.hint.default');
    resultsNode.innerHTML = buildSearchGroup(t('search.group.recent'), recentHtml) + quickHtml;
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
  titleNode.textContent = t('search.panel.title.results', { count: totalResults });
  hintNode.textContent = t('search.panel.hint.results');

  if (!totalResults) {
    resultsNode.innerHTML = `<div class="search-empty">${t('search.empty.results')}</div>`;
    return;
  }

  const itemHtml = scoredItems.length ? buildSearchGroup(t('search.group.items'), scoredItems.map(buildItemResultCard).join('')) : '';
  const categoryHtml = scoredCategories.length ? buildSearchGroup(t('search.group.categories'), scoredCategories.map(buildCategoryResultCard).join('')) : '';
  const pageHtml = scoredPages.length ? buildSearchGroup(t('search.group.pages'), scoredPages.map(buildPageResultCard).join('')) : '';
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
  trigger.innerHTML = `<span>${t('search.trigger.label')}</span><span class="nav-search-trigger__hint">/</span>`;
  nav.appendChild(trigger);

  const panel = document.createElement('div');
  panel.className = 'search-panel';
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = `
    <div class="search-panel__backdrop" data-search-close></div>
    <div class="search-panel__content" role="dialog" aria-label="${t('search.panel.aria')}">
      <div class="search-panel__bar">
        <span class="search-panel__icon" aria-hidden="true"></span>
        <input class="search-input" type="search" placeholder="${t('search.input.placeholder')}" autocomplete="off" />
        <button class="search-clear" type="button">${t('search.clear')}</button>
        <button class="search-close" type="button" data-search-close>${t('search.close')}</button>
      </div>
      <div class="search-panel__meta">
        <p class="search-panel__title">${t('search.panel.title.recent')}</p>
        <span class="search-panel__hint">${t('search.panel.hint.default')}</span>
      </div>
      <div class="search-results" role="listbox" aria-label="${t('search.results.aria')}"></div>
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
  const activeItems = Array.isArray(data.items) ? data.items.filter(isItemActive) : [];
  const orderMap = new Map((data.items || []).map((item, index) => [item.slug, index]));
  const displayItems = sortItemsForDisplay(activeItems, orderMap);
  const categoryGrid = document.querySelector('#menu-category-grid');
  const featuredGrid = document.querySelector('#menu-featured-grid');
  const seasonalGrid = document.querySelector('#seasonal-grid');
  if (!categoryGrid || !featuredGrid || !seasonalGrid) return;

  categoryGrid.innerHTML = data.categories
    .map((category) => createCategoryEntry(category, activeItems.filter((item) => item.category === category.slug).length))
    .join('');

  featuredGrid.innerHTML = displayItems.slice(0, 4).map(createMenuCard).join('');
  const seasonalItems = displayItems.filter((item) => Array.isArray(item.tags)
    && item.tags.some((tag) => /季節限定|seasonal/i.test(tag))).slice(0, 3);
  seasonalGrid.innerHTML = seasonalItems.map(createSeasonalCard).join('');

  const todayGrid = document.querySelector('#today-picks-grid');
  const hotGrid = document.querySelector('#hot-picks-grid');
  const todayNote = document.querySelector('#today-picks-note');
  if (todayGrid) {
    const today = getDailyRecommendations(displayItems);
    todayGrid.innerHTML = today.items.map(createMenuCard).join('');
    if (todayNote) {
      todayNote.textContent = t('menu.today.note', { segment: getTimeSegmentLabel(today.segment) });
    }
  }
  if (hotGrid) {
    hotGrid.innerHTML = getHotItems(displayItems).map(createMenuCard).join('');
  }

  const filterToolbar = document.querySelector('[data-menu-filter]');
  const filterPanel = document.querySelector('[data-filter-target="menu-filter-grid"]');
  const filterGrid = document.querySelector('#menu-filter-grid');
  if (filterToolbar && filterGrid) {
    setupMenuQuickFilters(filterToolbar, displayItems, filterGrid, createMenuCard);
  } else if (filterPanel && filterGrid) {
    setupDietaryFilterPanel(filterPanel, displayItems, filterGrid, createMenuCard);
  }
  syncCompareButtons();

  if (data && data.categories) {
    const menuSchema = {
      '@context': 'https://schema.org',
      '@type': 'Menu',
      name: `${data.brand?.name || '樂沐 La Miu'} 菜單`,
      hasMenuSection: data.categories.map((category) => ({
        '@type': 'MenuSection',
        name: category.name,
        description: category.description,
        hasMenuItem: displayItems
          .filter((item) => item.category === category.slug)
          .map((item) => ({
            '@type': 'MenuItem',
            name: item.name,
            description: item.shortDescription,
            offers: {
              '@type': 'Offer',
              price: Number(item.price || 0),
              priceCurrency: 'TWD'
            }
          }))
      }))
    };
    upsertJsonLd('menu', menuSchema);
  }
};

const renderCategoryPage = async () => {
  const slug = body.dataset.category;
  if (!slug) return;
  const payload = await fetchJson(getApiUrl(`/api/categories/${encodeURIComponent(slug)}`));
  const { category, items } = payload;
  cacheMenuItems(items);
  const activeItems = Array.isArray(items) ? items.filter(isItemActive) : [];
  const orderMap = new Map((items || []).map((item, index) => [item.slug, index]));
  const displayItems = sortItemsForDisplay(activeItems, orderMap);

  const setText = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  };

  const categoryCopy = getCategoryContent(category);
  setText('#category-eyebrow', category.english || categoryCopy.eyebrow);
  setText('#category-tagline', category.tagline || categoryCopy.eyebrow);
  setText('#category-title', categoryCopy.title);
  setText('#category-description', categoryCopy.description);
  setText('#category-list-title', t('category.list.title', { name: categoryCopy.title }));
  setText('#category-note-title', categoryCopy.noteTitle);
  setText('#category-note-text', categoryCopy.noteText);

  const heroImage = document.querySelector('#category-hero-image');
  if (heroImage) {
    heroImage.style.backgroundImage = `url('${category.heroImage}')`;
  }

  const listGrid = document.querySelector('#category-list-grid');
  if (listGrid) {
    const filterPanel = document.querySelector('[data-filter-target="category-list-grid"]');
    if (filterPanel) {
      setupDietaryFilterPanel(filterPanel, displayItems, listGrid, createCategoryDishCard);
    } else {
      listGrid.innerHTML = displayItems.map(createCategoryDishCard).join('');
    }
    listGrid.classList.toggle('category-list-grid--three', displayItems.length <= 6 && slug !== 'breakfast');
  }
  syncCompareButtons();

  const pairingNode = document.querySelector('#category-pairings');
  if (pairingNode) {
    pairingNode.innerHTML = (categoryCopy.pairings || [])
      .map((link) => `<a class="btn btn-secondary" href="${withLangParam(link.href)}">${link.label}</a>`)
      .join('');
  }

  if (category) {
    const sectionSchema = {
      '@context': 'https://schema.org',
      '@type': 'MenuSection',
      name: categoryCopy.title,
      description: categoryCopy.description,
      hasMenuItem: displayItems.map((item) => ({
        '@type': 'MenuItem',
        name: item.name,
        description: item.shortDescription,
        offers: {
          '@type': 'Offer',
          price: Number(item.price || 0),
          priceCurrency: 'TWD'
        }
      }))
    };
    upsertJsonLd(`menu-section-${slug}`, sectionSchema);
  }

  const categoryTitle = t('seo.category.title', { name: categoryCopy.title, english: category.english || categoryCopy.title });
  document.title = categoryTitle;
  setMetaProperty('og:title', categoryTitle);
  setMetaName('twitter:title', categoryTitle);
  if (categoryCopy.description) {
    setMetaName('description', categoryCopy.description);
    setMetaProperty('og:description', categoryCopy.description);
    setMetaName('twitter:description', categoryCopy.description);
  }
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

  const categoryCopy = getCategoryContent(category);
  const categoryLabel = category
    ? (currentLang === 'en' ? categoryCopy.title : `${category.name} / ${category.english}`)
    : item.category;
  setText('#item-category-label', categoryLabel);
  setText('#item-name', item.name);
  setText('#item-description', item.description);
  setText('#item-price', formatPrice(item.price));
  setText('#item-availability', item.availability || t('item.fallback.availability'));
  setText('#item-pairing', item.pairing || t('item.fallback.pairing'));

  const ingredientsNode = document.querySelector('#item-ingredients');
  if (ingredientsNode) {
    ingredientsNode.innerHTML = (item.ingredients || []).map((entry) => `<li>${entry}</li>`).join('');
  }

  const tagsNode = document.querySelector('#item-tags');
  if (tagsNode) {
    const dietary = getDietaryProfile(item);
    const dietaryTags = dietaryBadgeConfig
      .filter((badge) => dietary[badge.key])
      .map((badge) => t(badge.labelKey));
    const combinedTags = [...(item.tags || []), ...dietaryTags];
    tagsNode.innerHTML = combinedTags.map((tag) => `<span class="tag">${tag}</span>`).join('');
  }

  const relatedGrid = document.querySelector('#related-items-grid');
  if (relatedGrid) {
    relatedGrid.innerHTML = related.map(createCategoryDishCard).join('');
  }
  syncCompareButtons();

  if (item) {
    const itemSchema = {
      '@context': 'https://schema.org',
      '@type': 'MenuItem',
      name: item.name,
      description: item.description || item.shortDescription,
      image: item.image,
      offers: {
        '@type': 'Offer',
        price: Number(item.price || 0),
        priceCurrency: 'TWD'
      }
    };
    upsertJsonLd(`menu-item-${item.slug}`, itemSchema);

    const titleText = t('seo.item.title', { name: item.name });
    const descText = item.shortDescription || item.description || '';
    setMetaProperty('og:title', titleText);
    setMetaProperty('og:description', descText);
    setMetaProperty('og:image', item.image);
    setMetaName('description', descText);
    setMetaName('twitter:title', titleText);
    setMetaName('twitter:description', descText);
    setMetaName('twitter:image', item.image);
  }

  document.title = t('seo.item.title', { name: item.name });
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
      statusNode.textContent = t('status.loadError');
    }
  }
};

const deferNonCriticalInit = (callback, timeout = 1200) => {
  if (typeof callback !== 'function') return;
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => callback(), { timeout });
    return;
  }
  window.setTimeout(callback, 320);
};

applyTranslations();
setupLanguageSwitcher();
syncLanguageLinks();
applyPageMeta();
syncSeoMeta();
syncLanguageMeta();
setupReviewCta();
setupNewsletterForms();
setupReservationForm();
setupWaitlistForm();
setupTakeoutForm();
setupAnchorScroll();
setupHeroPointer();
syncHeader();
syncHeroParallax();
window.addEventListener('scroll', requestScrollSync, { passive: true });
window.addEventListener('resize', requestScrollSync);
setupRevealAnimations();
setupActiveSections();
setupRecentItemTracking();
setupMenuCompareMode();
window.LaMiuDeferredInit = {
  setupGlobalSearch,
  setupQuickPreview,
  setupSpaceCarousel,
  setupMobileQuickActions,
  setupBackgroundAudio,
  deferNonCriticalInit
};
finishLoadingAfterReady();
initDataDrivenPages();
