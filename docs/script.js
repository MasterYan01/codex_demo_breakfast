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

const i18n = {
  zh: {
    'nav.menu': '完整菜單',
    'nav.story': '餐廳理念',
    'nav.space': '空間風格',
    'nav.reserve': '預約用餐',
    'nav.home': '品牌首頁',
    'nav.menuOverview': '菜單總覽',
    'nav.seasonal': '季節餐點',
    'nav.breakfast': '早餐頁',
    'nav.coffee': '咖啡頁',
    'nav.dessert': '甜點頁',
    'hero.title': '以安靜晨光、木質餐桌與細緻料理，款待每一段早晨時光。',
    'hero.text': '樂沐 La Miu 位於台南市中西區衛民街，延續飯店餐廳的待客節奏，將光線、器皿、料理與服務收斂為一致而克制的晨間體驗。',
    'hero.cta.reserve': '預約座位',
    'hero.cta.menu': '完整菜單',
    'hero.fact.hours': '營業時段',
    'hero.fact.hoursValue': '09:00 - 16:30',
    'hero.fact.vibe': '餐廳語彙',
    'hero.fact.vibeValue': '暖木、咖啡、晨光',
    'hero.fact.booking': '訂位安排',
    'hero.fact.bookingValue': '現場候位與預約席次',
    'hero.overlay.label': 'House Signature',
    'hero.overlay.title': '鬆餅、咖啡與晨間光影，構成 La Miu 最經典的餐桌景致',
    'hero.float.label': 'Dining Note',
    'hero.float.title': '以節制留白，保留用餐的從容',
    'hero.float.text': '桌距、光線與服務節奏皆經過安排，讓每一次入座都維持安定而舒適的質地。',
    'signature.eyebrow': 'Seasonal Selections',
    'signature.title': '本日餐桌選粹',
    'story.eyebrow': 'About La Miu',
    'story.title': '樂沐 La Miu 相信，早餐應當被端放在一個安定、講究且足以承接日常的空間裡。',
    'story.text1': '從木作桌面、器皿色澤到餐點風味，我們都維持一致的節制與比例。沒有過度鋪陳，只有恰到好處的光、溫度與服務，讓網站畫面與實際入座時的感受維持相同語彙。',
    'story.text2': '對樂沐而言，一頓早餐不只是餐食本身，更是城市裡少數能夠讓節奏緩下來的時刻。這也是我們始終希望保留的待客方式，以及品牌攝影與網站內容所共同描寫的場景。',
    'editorial.eyebrow': 'Editorial Narrative',
    'editorial.title': '品牌內容與攝影整合，從首頁延伸到每一道實際上桌的料理。',
    'editorial.text': '我們以相同的木質桌面、暖色晨光、低飽和器皿與留白比例呈現品牌。首頁主視覺、菜單頁照片與空間敘事共用一致攝影方向，讓網站不只是資訊入口，而是先一步建立用餐預期。',
    'editorial.cta': '查看季節餐點',
    'space.eyebrow': 'Dining Atmosphere',
    'space.title': '空間、光線與餐桌比例，共同構成用餐的完整感受。',
    'space.carousel.1': '晨間自然光與木質桌面',
    'space.carousel.2': '主廚備餐的靜謐節奏',
    'space.carousel.3': '季節食材與暖調器皿',
    'space.card.material.title': '材質',
    'space.card.material.text': '淺橡木、奶油白牆面與霧面陶器，使空間保持溫潤而不繁複。',
    'space.card.light.title': '光線',
    'space.card.light.text': '晨間自然光落在桌面與餐盤上，是 La Miu 最重要也最克制的視覺語言。',
    'space.card.rhythm.title': '節奏',
    'space.card.rhythm.text': '不擁擠、不急促，讓每一位客人都能在自己的時間裡完成一頓早餐。',
    'reserve.eyebrow': 'Reservations',
    'reserve.title': '為晨間的相聚，預留一席安靜而妥貼的座位。',
    'reserve.text': '平日 09:00 - 16:30，假日 08:30 - 17:00。若希望安排窗邊席次，建議提前來訊預約。',
    'reserve.note1.label': '訂位須知',
    'reserve.note1.title': '保留 10 分鐘',
    'reserve.note1.text': '若逾時未到，座位將視現場候位情況釋出。',
    'reserve.note2.label': '來店提醒',
    'reserve.note2.title': '4 人以上請備註',
    'reserve.note2.text': '我們會依當日桌況為你安排最合適的座位。',
    'reserve.form.eyebrow': 'Online Booking',
    'reserve.form.title': '線上訂位',
    'reserve.form.text': '填寫以下資訊後，我們會同步通知店家並保留你的預約需求。',
    'reserve.step1': '選擇時段',
    'reserve.step2': '聯絡資訊',
    'reserve.step3': '完成預約',
    'reserve.field.date': '日期',
    'reserve.field.time': '時段',
    'reserve.field.time.placeholder': '請選擇時段',
    'reserve.field.guests': '人數',
    'reserve.field.guests.placeholder': '請選擇人數',
    'reserve.field.guests.1': '1 位',
    'reserve.field.guests.2': '2 位',
    'reserve.field.guests.3': '3 位',
    'reserve.field.guests.4': '4 位',
    'reserve.field.guests.5': '5 位',
    'reserve.field.guests.6': '6 位以上',
    'reserve.availability.eyebrow': 'Availability',
    'reserve.availability.title': '剩餘時段',
    'reserve.availability.recommend': 'Recommended',
    'reserve.availability.recommend.note': '根據當日座位狀況推薦。',
    'reserve.availability.note': '選擇日期後會更新剩餘席次。',
    'reserve.step.next': '下一步',
    'reserve.step.prev': '上一步',
    'reserve.field.name': '姓名',
    'reserve.field.name.placeholder': '請輸入訂位姓名',
    'reserve.field.phone': '手機',
    'reserve.field.phone.placeholder': '09xx-xxx-xxx',
    'reserve.field.email': 'Email',
    'reserve.field.email.placeholder': 'name@example.com',
    'reserve.field.notes': '備註',
    'reserve.field.notes.placeholder': '例如：窗邊座位、嬰兒椅、6 位以上需求',
    'reserve.summary.date': '日期',
    'reserve.summary.time': '時段',
    'reserve.summary.guests': '人數',
    'reserve.summary.name': '姓名',
    'reserve.submit': '送出訂位需求',
    'reserve.success.eyebrow': 'Reservation',
    'reserve.success.title': '訂位成功！',
    'reserve.success.google': '加入 Google 日曆',
    'reserve.success.ics': '下載 .ics',
    'service.eyebrow': 'Guest Services',
    'service.title': '候位與外帶服務',
    'waitlist.eyebrow': 'Waitlist',
    'waitlist.title': '即時候位',
    'waitlist.text': '加入候位後，現場有座位將以簡訊通知。',
    'waitlist.field.date': '日期',
    'waitlist.field.time': '時段',
    'waitlist.field.guests': '人數',
    'waitlist.field.guests.placeholder': '請選擇人數',
    'waitlist.field.guests.1': '1 位',
    'waitlist.field.guests.2': '2 位',
    'waitlist.field.guests.3': '3 位',
    'waitlist.field.guests.4': '4 位',
    'waitlist.field.guests.5': '5 位',
    'waitlist.field.guests.6': '6 位以上',
    'waitlist.field.name': '姓名',
    'waitlist.field.name.placeholder': '請輸入姓名',
    'waitlist.field.phone': '手機',
    'waitlist.field.phone.placeholder': '09xx-xxx-xxx',
    'waitlist.field.notes': '備註',
    'waitlist.field.notes.placeholder': '例如：希望窗邊、兒童椅',
    'waitlist.submit': '加入候位',
    'waitlist.submit.sending': '候位送出中，請稍候。',
    'waitlist.submit.success': '已加入候位：{summary} 我們會以簡訊通知。',
    'waitlist.submit.error': '候位送出失敗，請稍後再試或直接來電。',
    'waitlist.submit.already': '已送出候位，如需更新請修改資料後再送出。',
    'waitlist.summary.inline': '{date} {time}，{guests} 位，{name}。',
    'waitlist.validation.required': '請完整填寫日期、時段、人數與聯絡資訊。',
    'waitlist.validation.phone': '請輸入正確的手機或電話格式。',
    'takeout.eyebrow': 'Takeout',
    'takeout.title': '外帶預訂',
    'takeout.text': '填寫外帶品項與取餐時間，我們會先為你保留。',
    'takeout.field.date': '取餐日期',
    'takeout.field.time': '取餐時段',
    'takeout.field.name': '姓名',
    'takeout.field.name.placeholder': '請輸入姓名',
    'takeout.field.phone': '手機',
    'takeout.field.phone.placeholder': '09xx-xxx-xxx',
    'takeout.field.items': '外帶品項',
    'takeout.field.items.placeholder': '例如：晨光鬆餅早餐盤 x1、拿鐵 x1',
    'takeout.field.notes': '備註',
    'takeout.field.notes.placeholder': '例如：少糖、醬分開',
    'takeout.submit': '送出外帶',
    'takeout.submit.sending': '外帶送出中，請稍候。',
    'takeout.submit.success': '已收到外帶預訂：{summary} 我們會再確認取餐時間。',
    'takeout.submit.error': '外帶送出失敗，請稍後再試或直接來電。',
    'takeout.submit.already': '已送出外帶預訂，如需更新請修改資料後再送出。',
    'takeout.summary.inline': '{date} {time}，{name}。',
    'takeout.validation.required': '請完整填寫取餐日期、時段、品項與聯絡資訊。',
    'takeout.validation.phone': '請輸入正確的手機或電話格式。',
    'access.eyebrow': 'Access & Directions',
    'access.title': '地圖與交通資訊',
    'access.address.label': '地址',
    'access.address.value': '台南市中西區衛民街129號',
    'access.address.text': '樂沐 La Miu 位於台南市中西區衛民街，步行可達台南火車站與海安路商圈，適合早餐約會與週末早午餐聚會。',
    'access.station.label': '車站',
    'access.station.value': '台南火車站',
    'access.station.text': '步行約 12 分鐘，沿北門路轉衛民街即可抵達。',
    'access.bus.label': '公車',
    'access.bus.value': '衛民街口站',
    'access.bus.text': '可搭乘 2、5、77、藍幹線，步行約 3 分鐘。',
    'access.parking.label': '停車',
    'access.parking.value': '衛民街停車場 / 海安路地下停車場',
    'access.parking.text': '周邊步行 3 至 5 分鐘內皆有付費停車場。',
    'access.note.label': '來店建議',
    'access.note.value': '假日建議提早 10 分鐘',
    'access.note.text': '週末車流較多，若已訂位建議預留交通時間。',
    'access.map.cta': '使用 Google Maps 開啟',
    'footer.eyebrow': 'La Miu Tainan',
    'footer.title': '樂沐 La Miu',
    'footer.text': '一間以暖木調性、季節早餐盤與安靜晨光為核心的城市晨間餐廳，位於台南市中西區。',
    'footer.text.menu': '以暖木調性、季節餐盤與安靜晨光構成的台南精品早午餐餐廳。',
    'footer.text.category': '早餐、咖啡與甜點皆維持一致的暖木品牌語言。',
    'footer.text.item': '從單品頁也能延續完整品牌攝影與餐桌敘事。',
    'footer.address.title': '地址',
    'footer.address.line1': '台南市中西區衛民街129號',
    'footer.address.line2': '近台南火車站與海安路商圈，步行約 10 至 12 分鐘',
    'footer.address.line2.menu': '步行可達台南火車站與海安路商圈',
    'footer.address.link': '查看交通資訊',
    'footer.contact.title': '聯絡方式',
    'footer.hours.title': '營業資訊',
    'footer.hours.line1': '週一至週五 09:00 - 16:30',
    'footer.hours.line2': '週六至週日 08:30 - 17:00',
    'footer.social.title': '社群連結',
    'footer.category.title': '分類頁',
    'footer.category.breakfast': '早餐頁',
    'footer.category.coffee': '咖啡頁',
    'footer.category.dessert': '甜點頁',
    'footer.manage.title': '管理',
    'footer.manage.admin': '菜單後台',
    'footer.manage.menu': '返回總覽',
    'footer.manage.item': '單品示範頁',
    'footer.quick.title': '快速連結',
    'footer.quick.menu': '菜單總覽',
    'footer.quick.admin': '菜單後台',
    'footer.reserve.title': '訂位',
    'footer.reserve.cta': '線上訂位',
    'footer.review.cta': '留下 Google 評論',
    'footer.newsletter.title': '電子報',
    'footer.newsletter.text': '每週或每月寄出主廚推薦與限定餐點。',
    'footer.newsletter.label': 'Email',
    'footer.newsletter.placeholder': 'name@example.com',
    'footer.newsletter.button': '訂閱',
    'footer.newsletter.sending': '訂閱送出中，請稍候。',
    'footer.newsletter.success': '已送出訂閱，請留意信箱確認。',
    'footer.newsletter.unconfigured': '請先在 config.js 設定 EDM 訂閱連結。',
    'menu.pills.overview': '總覽',
    'menu.pills.today': '今日推薦',
    'menu.pills.hot': '熱門榜',
    'menu.pills.categories': '分類',
    'menu.pills.featured': '本日推薦',
    'menu.pills.seasonal': '季節限定',
    'menu.pills.filter': '快速篩選',
    'menu.hero.eyebrow': 'Full Menu',
    'menu.hero.title': '以晨間風味、季節食材與溫潤器皿，構成完整的一日菜單。',
    'menu.hero.text': '本頁會從後端載入樂沐 La Miu 的招牌早餐盤、季節限定、手作甜點與咖啡飲品。',
    'menu.hero.cta.reserve': '立即訂位',
    'menu.hero.cta.admin': '後台編輯',
    'menu.hero.note.label': "Today's Table",
    'menu.hero.note.title': '主廚以季節食材更新菜單細節',
    'menu.hero.note.text': '後台更新後，菜單總覽、分類頁與單品頁會同步顯示最新資料。',
    'menu.today.eyebrow': 'Today Picks',
    'menu.today.title': '今日推薦',
    'menu.hot.eyebrow': 'Popular Now',
    'menu.hot.title': '熱門榜',
    'menu.categories.eyebrow': 'Menu Categories',
    'menu.categories.title': '真實菜單分類頁',
    'menu.featured.eyebrow': 'Featured Items',
    'menu.featured.title': '本日推薦品項',
    'menu.seasonal.eyebrow': 'Seasonal Picks',
    'menu.seasonal.title': '季節限定餐點',
    'menu.filter.eyebrow': 'Quick Filters',
    'menu.filter.title': '快速篩選與排序',
    'menu.filter.sort': '排序',
    'menu.filter.sort.default': '預設排序',
    'menu.filter.sort.popular': '人氣最高',
    'menu.filter.sort.priceAsc': '價格低到高',
    'menu.filter.sort.priceDesc': '價格高到低',
    'menu.filter.price': '價位',
    'menu.filter.price.under200': 'NT$ 200 以下',
    'menu.filter.price.200-300': 'NT$ 200-300',
    'menu.filter.price.300-400': 'NT$ 300-400',
    'menu.filter.price.over400': 'NT$ 400 以上',
    'menu.filter.popular': '人氣',
    'menu.filter.popular.label': '人氣推薦',
    'menu.filter.diet': '飲食',
    'menu.filter.diet.vegetarian': '素食',
    'menu.filter.diet.glutenFree': '無麩質',
    'menu.filter.availability': '供應時段',
    'menu.filter.availability.all': '全時段',
    'menu.filter.availability.weekend': '週末',
    'menu.filter.availability.seasonal': '季節限定',
    'menu.filter.clear': '清除全部',
    'category.cta.reserve.breakfast': '預約早餐時段',
    'category.cta.reserve.coffee': '預留座位',
    'category.cta.reserve.dessert': '預約午後時段',
    'category.cta.back': '返回菜單總覽',
    'category.list.eyebrow': 'Category Items',
    'category.list.title': '{name}品項',
    'category.note.eyebrow': 'Serving Note',
    'filter.vegetarian': '素食',
    'filter.eggDairy': '含蛋奶',
    'filter.nuts': '含堅果',
    'filter.glutenFree': '無麩質',
    'filter.clear': '清除',
    'filter.status.zero': '顯示 0 / 0 項',
    'item.meta.price': '價格',
    'item.meta.availability': '供應',
    'item.meta.pairing': '搭配建議',
    'item.ingredients.eyebrow': 'Ingredients',
    'item.ingredients.title': '食材構成',
    'item.tags.eyebrow': 'Tags',
    'item.tags.title': '品項標籤',
    'item.related.eyebrow': 'Related Items',
    'item.related.title': '同分類推薦',
    'cta.reserve': '立即訂位',
    'cta.reserve.quick': '快速訂位',
    'cta.scrollTop': '回到頂部',
    'audio.toggle.on': '開啟音樂',
    'audio.toggle.off': '靜音',
    'audio.toggle.loading': '載入音樂',
    'audio.toggle.aria': '背景音樂控制',
    'dietary.vegetarian': '素食',
    'dietary.eggDairy': '含蛋奶',
    'dietary.nuts': '含堅果',
    'dietary.glutenFree': '無麩質',
    'availability.remaining': '剩餘 {count}',
    'availability.full': '已滿',
    'availability.dateSummary': '{date} 可預約時段 {available} / {total}',
    'availability.recommend.note': '推薦 {target} 較寬裕時段',
    'availability.recommend.today': '今日',
    'availability.recommend.guests': '{count} 位',
    'availability.recommend.none': '目前沒有可推薦時段',
    'availability.slot': '{time} · 剩餘 {remaining}',
    'filter.status': '顯示 {shown} / {total} 項',
    'filter.empty': '目前沒有符合條件的品項。',
    'menu.today.segment.morning': '早晨推薦',
    'menu.today.segment.midday': '午間推薦',
    'menu.today.segment.afternoon': '午後推薦',
    'menu.today.segment.evening': '晚間甜點推薦',
    'menu.today.note': '{segment}，依當前時間更新',
    'menu.category.count': '{count} 項品項',
    'preview.label': 'Quick Preview',
    'preview.button': '快速預覽',
    'preview.button.aria': '快速預覽 {name}',
    'preview.dialog.aria': '單品快速預覽',
    'preview.nav.prev': '上一個品項',
    'preview.nav.next': '下一個品項',
    'preview.action.favorite': '收藏',
    'preview.action.favorited': '已收藏',
    'preview.action.share': '分享',
    'preview.meta.price': '價格',
    'preview.meta.availability': '供應',
    'preview.meta.pairing': '搭配',
    'preview.action.view': '查看單品介紹',
    'preview.action.close': '關閉',
    'preview.feedback.added': '已加入收藏。',
    'preview.feedback.removed': '已從收藏移除。',
    'preview.feedback.shareOpen': '已開啟分享視窗。',
    'preview.feedback.linkCopied': '連結已複製。',
    'preview.feedback.linkCopyFail': '連結複製失敗。',
    'preview.feedback.shareCancel': '分享已取消。',
    'item.fallback.availability': '依現場供應',
    'item.fallback.pairing': '請洽現場',
    'search.trigger.label': '搜尋',
    'search.panel.aria': '全站搜尋',
    'search.input.placeholder': '搜尋菜單、分類或頁面',
    'search.clear': '清除',
    'search.close': 'Esc',
    'search.panel.title.recent': '最近項目',
    'search.panel.title.results': '搜尋結果（{count}）',
    'search.panel.hint.default': '輸入關鍵字可進行模糊搜尋',
    'search.panel.hint.results': '可直接點選跳轉內容',
    'search.empty.recent': '還沒有最近瀏覽的單品，試著點選菜單項目吧。',
    'search.empty.results': '找不到符合的內容，試著改用其他關鍵字。',
    'search.group.recent': '最近瀏覽',
    'search.group.quick': '快速連結',
    'search.group.items': '菜單單品',
    'search.group.categories': '菜單分類',
    'search.group.pages': '站內頁面',
    'search.result.category': '分類',
    'search.result.page': '頁面',
    'search.results.aria': '搜尋結果',
    'reserve.validation.required': '請完整填寫日期、時段、人數與聯絡資訊。',
    'reserve.validation.phone': '請輸入正確的手機或電話格式。',
    'reserve.validation.email': '請輸入正確的 Email 格式。',
    'reserve.validation.full': '該時段已滿，請選擇其他時段。',
    'reserve.step.error.basic': '請先選擇日期、時段與人數。',
    'reserve.step.error.contact': '請填寫姓名、電話與 Email。',
    'reserve.submit.sending': '訂位送出中，請稍候。',
    'reserve.submit.success': '已成功訂位：{summary} 我們將以電話或 Email 與你確認。',
    'reserve.submit.error': '送出失敗，請稍後再試或直接來電。',
    'reserve.submit.already': '已送出訂位，如需更改請調整資訊後再送出。',
    'reserve.submit.successSummary': '預約完成：{summary} 可點擊下方加入行事曆。',
    'reserve.summary.inline': '{date} {time}，{guests} 位，{name}。',
    'reserve.calendar.title': '樂沐 La Miu 訂位',
    'reserve.calendar.details.name': '訂位姓名：{name}',
    'reserve.calendar.details.guests': '人數：{count} 位',
    'reserve.calendar.details.notes': '備註：{notes}',
    'reserve.calendar.details.none': '無',
    'search.page.home.title': '品牌首頁',
    'search.page.home.description': 'La Miu 首頁、理念與空間敘事',
    'search.page.home.keywords': '首頁 品牌 故事 空間',
    'search.page.reserve.title': '線上訂位',
    'search.page.reserve.description': '填寫訂位資訊，預留晨間座位',
    'search.page.reserve.keywords': '訂位 預約 reserve',
    'search.page.menu.title': '菜單總覽',
    'search.page.menu.description': '完整菜單分類與推薦品項',
    'search.page.menu.keywords': '菜單 總覽 menu',
    'search.page.seasonal.title': '季節餐點',
    'search.page.seasonal.description': '當季限定餐點與推薦',
    'search.page.seasonal.keywords': '季節 餐點 限定 seasonal',
    'search.page.breakfast.title': '早餐頁',
    'search.page.breakfast.description': '招牌早餐盤與晨食選擇',
    'search.page.breakfast.keywords': '早餐 brunch',
    'search.page.coffee.title': '咖啡頁',
    'search.page.coffee.description': '手沖咖啡與咖啡飲品',
    'search.page.coffee.keywords': '咖啡 coffee',
    'search.page.dessert.title': '甜點頁',
    'search.page.dessert.description': '甜點與午茶選擇',
    'search.page.dessert.keywords': '甜點 dessert',
    'seo.home.title': '樂沐 La Miu | 台南精品早午餐與季節晨食',
    'seo.home.description': '樂沐 La Miu 位於台南市中西區衛民街，提供暖木風精品早午餐、季節餐點、甜點咖啡與線上訂位服務。',
    'seo.home.ogDescription': '暖木風精品餐桌、季節早餐盤、咖啡甜點與線上訂位，收斂成台南市中心一段更安靜的晨間款待。',
    'seo.home.twitterDescription': '查看樂沐 La Miu 首頁、完整菜單、季節餐點與訂位資訊。',
    'seo.menu.title': '樂沐 La Miu 菜單 | 季節餐點與咖啡甜點',
    'seo.menu.description': '瀏覽樂沐 La Miu 完整菜單，包含招牌早午餐、季節限定、咖啡與甜點。',
    'seo.menu.ogDescription': '招牌早午餐、季節限定盤、咖啡與甜點，完整收錄於樂沐 La Miu 菜單頁。',
    'seo.category.title': '樂沐 La Miu {name}頁 | {english}',
    'seo.item.title': '樂沐 La Miu | {name}',
    'status.loadError': '資料載入失敗，請確認 Render API 已啟動，且 config.js 的 apiBase 設定正確。'
  },
  en: {
    'nav.menu': 'Full Menu',
    'nav.story': 'Our Philosophy',
    'nav.space': 'Space & Atmosphere',
    'nav.reserve': 'Reservations',
    'nav.home': 'Home',
    'nav.menuOverview': 'Menu Overview',
    'nav.seasonal': 'Seasonal',
    'nav.breakfast': 'Breakfast',
    'nav.coffee': 'Coffee',
    'nav.dessert': 'Dessert',
    'hero.title': 'With quiet morning light, wooden tables, and thoughtful dishes, we host each morning with care.',
    'hero.text': 'La Miu sits on Weimin Street in Tainan\'s West Central District, distilling light, tableware, cuisine, and service into a calm morning experience.',
    'hero.cta.reserve': 'Reserve a Table',
    'hero.cta.menu': 'Full Menu',
    'hero.fact.hours': 'Hours',
    'hero.fact.hoursValue': '09:00 - 16:30',
    'hero.fact.vibe': 'Signature Vibe',
    'hero.fact.vibeValue': 'Warm wood, coffee, morning light',
    'hero.fact.booking': 'Booking',
    'hero.fact.bookingValue': 'Walk-ins and reservations',
    'hero.overlay.label': 'House Signature',
    'hero.overlay.title': 'Pancakes, coffee, and morning light define La Miu\'s most iconic table scene.',
    'hero.float.label': 'Dining Note',
    'hero.float.title': 'Measured spacing, relaxed dining',
    'hero.float.text': 'Spacing, light, and service tempo are carefully tuned so every visit feels steady and comfortable.',
    'signature.eyebrow': 'Seasonal Selections',
    'signature.title': "Today's Table Selections",
    'story.eyebrow': 'About La Miu',
    'story.title': 'La Miu believes breakfast should be served in a calm, considered space that can hold everyday life.',
    'story.text1': 'From the woodwork and ceramics to the flavor of each dish, we keep a restrained, balanced palette. No excess, just the right light, warmth, and service, so the site mirrors the experience of sitting down in person.',
    'story.text2': 'For La Miu, breakfast is more than a meal; it is one of the few moments in the city where the pace softens. That is the hospitality we preserve, and the scene shared by our photography and site narrative.',
    'editorial.eyebrow': 'Editorial Narrative',
    'editorial.title': 'Brand storytelling and photography flow from the homepage to every dish served.',
    'editorial.text': 'We use the same wooden surfaces, warm morning light, low-saturation ceramics, and generous negative space throughout. The hero visual, menu photos, and space story follow one photographic direction, so the site shapes dining expectations.',
    'editorial.cta': 'View seasonal dishes',
    'space.eyebrow': 'Dining Atmosphere',
    'space.title': 'Space, light, and table proportions create the complete dining experience.',
    'space.carousel.1': 'Morning daylight on wooden tables',
    'space.carousel.2': 'A calm rhythm in the kitchen',
    'space.carousel.3': 'Seasonal ingredients and warm-toned ceramics',
    'space.card.material.title': 'Materials',
    'space.card.material.text': 'Pale oak, creamy walls, and matte ceramics keep the space warm without feeling busy.',
    'space.card.light.title': 'Light',
    'space.card.light.text': 'Morning daylight on tables and plates is La Miu\'s most important, and most restrained, visual language.',
    'space.card.rhythm.title': 'Rhythm',
    'space.card.rhythm.text': 'Unhurried and uncrowded, so every guest can finish breakfast on their own time.',
    'reserve.eyebrow': 'Reservations',
    'reserve.title': 'Reserve a calm, well-prepared seat for your morning gathering.',
    'reserve.text': 'Weekdays 09:00-16:30, weekends 08:30-17:00. If you\'d like a window seat, please book in advance.',
    'reserve.note1.label': 'Booking Notes',
    'reserve.note1.title': 'Held for 10 minutes',
    'reserve.note1.text': 'If you\'re late, the table may be released to waiting guests.',
    'reserve.note2.label': 'Arrival Tips',
    'reserve.note2.title': 'Parties of 4+',
    'reserve.note2.text': 'We\'ll arrange the best table based on the day\'s layout.',
    'reserve.form.eyebrow': 'Online Booking',
    'reserve.form.title': 'Online Reservation',
    'reserve.form.text': 'Submit your details and we will notify the team to confirm your reservation.',
    'reserve.step1': 'Choose Time',
    'reserve.step2': 'Contact Details',
    'reserve.step3': 'Finish',
    'reserve.field.date': 'Date',
    'reserve.field.time': 'Time',
    'reserve.field.time.placeholder': 'Select a time',
    'reserve.field.guests': 'Guests',
    'reserve.field.guests.placeholder': 'Select guests',
    'reserve.field.guests.1': '1 guest',
    'reserve.field.guests.2': '2 guests',
    'reserve.field.guests.3': '3 guests',
    'reserve.field.guests.4': '4 guests',
    'reserve.field.guests.5': '5 guests',
    'reserve.field.guests.6': '6+ guests',
    'reserve.availability.eyebrow': 'Availability',
    'reserve.availability.title': 'Available Slots',
    'reserve.availability.recommend': 'Recommended',
    'reserve.availability.recommend.note': 'Based on current seating availability.',
    'reserve.availability.note': 'Select a date to update availability.',
    'reserve.step.next': 'Next',
    'reserve.step.prev': 'Back',
    'reserve.field.name': 'Name',
    'reserve.field.name.placeholder': 'Reservation name',
    'reserve.field.phone': 'Phone',
    'reserve.field.phone.placeholder': '09xx-xxx-xxx',
    'reserve.field.email': 'Email',
    'reserve.field.email.placeholder': 'name@example.com',
    'reserve.field.notes': 'Notes',
    'reserve.field.notes.placeholder': 'Example: window seat, baby chair, party of 6+',
    'reserve.summary.date': 'Date',
    'reserve.summary.time': 'Time',
    'reserve.summary.guests': 'Guests',
    'reserve.summary.name': 'Name',
    'reserve.submit': 'Submit Reservation',
    'reserve.success.eyebrow': 'Reservation',
    'reserve.success.title': 'Reservation Confirmed!',
    'reserve.success.google': 'Add to Google Calendar',
    'reserve.success.ics': 'Download .ics',
    'service.eyebrow': 'Guest Services',
    'service.title': 'Waitlist & Takeout',
    'waitlist.eyebrow': 'Waitlist',
    'waitlist.title': 'Instant Waitlist',
    'waitlist.text': 'Join the queue and we will notify you by SMS when a table opens.',
    'waitlist.field.date': 'Date',
    'waitlist.field.time': 'Time',
    'waitlist.field.guests': 'Guests',
    'waitlist.field.guests.placeholder': 'Select guests',
    'waitlist.field.guests.1': '1 guest',
    'waitlist.field.guests.2': '2 guests',
    'waitlist.field.guests.3': '3 guests',
    'waitlist.field.guests.4': '4 guests',
    'waitlist.field.guests.5': '5 guests',
    'waitlist.field.guests.6': '6+ guests',
    'waitlist.field.name': 'Name',
    'waitlist.field.name.placeholder': 'Enter your name',
    'waitlist.field.phone': 'Phone',
    'waitlist.field.phone.placeholder': '09xx-xxx-xxx',
    'waitlist.field.notes': 'Notes',
    'waitlist.field.notes.placeholder': 'Window seat, baby chair, etc.',
    'waitlist.submit': 'Join Waitlist',
    'waitlist.submit.sending': 'Submitting waitlist...',
    'waitlist.submit.success': 'Waitlist confirmed: {summary} We will notify you by SMS.',
    'waitlist.submit.error': 'Submission failed. Please try again or call us.',
    'waitlist.submit.already': 'Waitlist already submitted. Update the details to submit again.',
    'waitlist.summary.inline': '{date} {time}, {guests}, {name}.',
    'waitlist.validation.required': 'Please enter date, time, guests, and contact details.',
    'waitlist.validation.phone': 'Please enter a valid phone number.',
    'takeout.eyebrow': 'Takeout',
    'takeout.title': 'Takeout Preorder',
    'takeout.text': 'Send your items and pickup time, and we will reserve it for you.',
    'takeout.field.date': 'Pickup Date',
    'takeout.field.time': 'Pickup Time',
    'takeout.field.name': 'Name',
    'takeout.field.name.placeholder': 'Enter your name',
    'takeout.field.phone': 'Phone',
    'takeout.field.phone.placeholder': '09xx-xxx-xxx',
    'takeout.field.items': 'Items',
    'takeout.field.items.placeholder': 'Example: pancakes x1, latte x1',
    'takeout.field.notes': 'Notes',
    'takeout.field.notes.placeholder': 'Less sugar, sauce on the side',
    'takeout.submit': 'Submit Takeout',
    'takeout.submit.sending': 'Submitting takeout...',
    'takeout.submit.success': 'Takeout received: {summary} We will confirm pickup time.',
    'takeout.submit.error': 'Submission failed. Please try again or call us.',
    'takeout.submit.already': 'Takeout already submitted. Update details to submit again.',
    'takeout.summary.inline': '{date} {time}, {name}.',
    'takeout.validation.required': 'Please enter pickup date, time, items, and contact details.',
    'takeout.validation.phone': 'Please enter a valid phone number.',
    'access.eyebrow': 'Access & Directions',
    'access.title': 'Map & Directions',
    'access.address.label': 'Address',
    'access.address.value': 'No.129, Weimin St., West Central District, Tainan',
    'access.address.text': 'La Miu sits on Weimin Street in Tainan\'s West Central District, walkable to Tainan Station and the Hai\'an Road district, ideal for breakfast dates and weekend brunch.',
    'access.station.label': 'Station',
    'access.station.value': 'Tainan Station',
    'access.station.text': 'About a 12-minute walk, via Beimen Road to Weimin Street.',
    'access.bus.label': 'Bus',
    'access.bus.value': 'Weimin St. Stop',
    'access.bus.text': 'Take routes 2, 5, 77, or the Blue Line, then walk about 3 minutes.',
    'access.parking.label': 'Parking',
    'access.parking.value': 'Weimin St. Lot / Hai\'an Rd. Underground Lot',
    'access.parking.text': 'Paid parking lots are within a 3-5 minute walk.',
    'access.note.label': 'Tip',
    'access.note.value': 'Arrive 10 minutes early on weekends',
    'access.note.text': 'Weekend traffic is heavier; if you\'ve booked, allow extra travel time.',
    'access.map.cta': 'Open in Google Maps',
    'footer.eyebrow': 'La Miu Tainan',
    'footer.title': 'La Miu',
    'footer.text': 'A morning dining house in Tainan\'s West Central District, centered on warm wood tones, seasonal breakfast plates, and quiet morning light.',
    'footer.text.menu': 'A refined Tainan brunch spot defined by warm wood tones, seasonal plates, and quiet morning light.',
    'footer.text.category': 'Breakfast, coffee, and dessert share the same warm-wood brand language.',
    'footer.text.item': 'The item page continues the full brand photography and table story.',
    'footer.address.title': 'Address',
    'footer.address.line1': 'No.129, Weimin St., West Central District, Tainan',
    'footer.address.line2': 'Near Tainan Station and the Hai\'an Road district, about a 10-12 minute walk.',
    'footer.address.line2.menu': 'Walkable to Tainan Station and the Hai\'an Road district',
    'footer.address.link': 'View directions',
    'footer.contact.title': 'Contact',
    'footer.hours.title': 'Hours',
    'footer.hours.line1': 'Mon-Fri 09:00-16:30',
    'footer.hours.line2': 'Sat-Sun 08:30-17:00',
    'footer.social.title': 'Social',
    'footer.category.title': 'Categories',
    'footer.category.breakfast': 'Breakfast',
    'footer.category.coffee': 'Coffee',
    'footer.category.dessert': 'Dessert',
    'footer.manage.title': 'Management',
    'footer.manage.admin': 'Menu Admin',
    'footer.manage.menu': 'Back to Overview',
    'footer.manage.item': 'Item Demo',
    'footer.quick.title': 'Quick Links',
    'footer.quick.menu': 'Menu Overview',
    'footer.quick.admin': 'Menu Admin',
    'footer.reserve.title': 'Reservations',
    'footer.reserve.cta': 'Reserve Online',
    'footer.review.cta': 'Leave a Google Review',
    'footer.newsletter.title': 'Newsletter',
    'footer.newsletter.text': 'Weekly or monthly chef picks and seasonal dishes.',
    'footer.newsletter.label': 'Email',
    'footer.newsletter.placeholder': 'name@example.com',
    'footer.newsletter.button': 'Subscribe',
    'footer.newsletter.sending': 'Submitting your subscription...',
    'footer.newsletter.success': 'Subscription sent. Please check your inbox.',
    'footer.newsletter.unconfigured': 'Please set the newsletter action in config.js first.',
    'menu.pills.overview': 'Overview',
    'menu.pills.today': 'Today',
    'menu.pills.hot': 'Popular',
    'menu.pills.categories': 'Categories',
    'menu.pills.featured': 'Featured',
    'menu.pills.seasonal': 'Seasonal',
    'menu.pills.filter': 'Quick Filters',
    'menu.hero.eyebrow': 'Full Menu',
    'menu.hero.title': 'Morning flavors, seasonal ingredients, and warm ceramics form a complete day menu.',
    'menu.hero.text': 'This page loads La Miu\'s signature breakfast plates, seasonal specials, handmade desserts, and coffee.',
    'menu.hero.cta.reserve': 'Reserve Now',
    'menu.hero.cta.admin': 'Edit in Admin',
    'menu.hero.note.label': "Today's Table",
    'menu.hero.note.title': 'Chef updates the menu with seasonal ingredients.',
    'menu.hero.note.text': 'Updates in the admin panel sync across the overview, category pages, and item pages.',
    'menu.today.eyebrow': 'Today Picks',
    'menu.today.title': "Today's Picks",
    'menu.hot.eyebrow': 'Popular Now',
    'menu.hot.title': 'Popular',
    'menu.categories.eyebrow': 'Menu Categories',
    'menu.categories.title': 'Real menu category pages',
    'menu.featured.eyebrow': 'Featured Items',
    'menu.featured.title': 'Featured today',
    'menu.seasonal.eyebrow': 'Seasonal Picks',
    'menu.seasonal.title': 'Seasonal dishes',
    'menu.filter.eyebrow': 'Quick Filters',
    'menu.filter.title': 'Quick filters & sorting',
    'menu.filter.sort': 'Sort',
    'menu.filter.sort.default': 'Default order',
    'menu.filter.sort.popular': 'Most popular',
    'menu.filter.sort.priceAsc': 'Price low to high',
    'menu.filter.sort.priceDesc': 'Price high to low',
    'menu.filter.price': 'Price',
    'menu.filter.price.under200': 'NT$ under 200',
    'menu.filter.price.200-300': 'NT$ 200-300',
    'menu.filter.price.300-400': 'NT$ 300-400',
    'menu.filter.price.over400': 'NT$ 400+',
    'menu.filter.popular': 'Popular',
    'menu.filter.popular.label': 'Popular picks',
    'menu.filter.diet': 'Diet',
    'menu.filter.diet.vegetarian': 'Vegetarian',
    'menu.filter.diet.glutenFree': 'Gluten-free',
    'menu.filter.availability': 'Availability',
    'menu.filter.availability.all': 'All day',
    'menu.filter.availability.weekend': 'Weekend',
    'menu.filter.availability.seasonal': 'Seasonal',
    'menu.filter.clear': 'Clear all',
    'category.cta.reserve.breakfast': 'Reserve breakfast',
    'category.cta.reserve.coffee': 'Reserve a seat',
    'category.cta.reserve.dessert': 'Reserve afternoon slots',
    'category.cta.back': 'Back to menu overview',
    'category.list.eyebrow': 'Category Items',
    'category.list.title': '{name} items',
    'category.note.eyebrow': 'Serving Note',
    'filter.vegetarian': 'Vegetarian',
    'filter.eggDairy': 'Egg & Dairy',
    'filter.nuts': 'Contains nuts',
    'filter.glutenFree': 'Gluten-free',
    'filter.clear': 'Clear',
    'filter.status.zero': 'Showing 0 / 0',
    'item.meta.price': 'Price',
    'item.meta.availability': 'Availability',
    'item.meta.pairing': 'Pairing',
    'item.ingredients.eyebrow': 'Ingredients',
    'item.ingredients.title': 'Ingredients',
    'item.tags.eyebrow': 'Tags',
    'item.tags.title': 'Tags',
    'item.related.eyebrow': 'Related Items',
    'item.related.title': 'More in this category',
    'cta.reserve': 'Reserve Now',
    'cta.reserve.quick': 'Quick Reserve',
    'cta.scrollTop': 'Back to Top',
    'audio.toggle.on': 'Enable Sound',
    'audio.toggle.off': 'Mute',
    'audio.toggle.loading': 'Loading Audio',
    'audio.toggle.aria': 'Background music control',
    'dietary.vegetarian': 'Vegetarian',
    'dietary.eggDairy': 'Egg & Dairy',
    'dietary.nuts': 'Contains nuts',
    'dietary.glutenFree': 'Gluten-free',
    'availability.remaining': '{count} left',
    'availability.full': 'Full',
    'availability.dateSummary': '{date} availability {available}/{total}',
    'availability.recommend.note': 'Recommended time slots for {target}',
    'availability.recommend.today': 'today',
    'availability.recommend.guests': 'party of {count}',
    'availability.recommend.none': 'No recommended slots right now.',
    'availability.slot': '{time} · {remaining} left',
    'filter.status': 'Showing {shown} / {total}',
    'filter.empty': 'No items match your filters.',
    'menu.today.segment.morning': 'Morning picks',
    'menu.today.segment.midday': 'Midday picks',
    'menu.today.segment.afternoon': 'Afternoon picks',
    'menu.today.segment.evening': 'Evening desserts',
    'menu.today.note': 'Updated for the current time: {segment}',
    'menu.category.count': '{count} items',
    'preview.label': 'Quick Preview',
    'preview.button': 'Quick Preview',
    'preview.button.aria': 'Quick preview {name}',
    'preview.dialog.aria': 'Item quick preview',
    'preview.nav.prev': 'Previous item',
    'preview.nav.next': 'Next item',
    'preview.action.favorite': 'Save',
    'preview.action.favorited': 'Saved',
    'preview.action.share': 'Share',
    'preview.meta.price': 'Price',
    'preview.meta.availability': 'Availability',
    'preview.meta.pairing': 'Pairing',
    'preview.action.view': 'View item details',
    'preview.action.close': 'Close',
    'preview.feedback.added': 'Added to favorites.',
    'preview.feedback.removed': 'Removed from favorites.',
    'preview.feedback.shareOpen': 'Share dialog opened.',
    'preview.feedback.linkCopied': 'Link copied.',
    'preview.feedback.linkCopyFail': 'Failed to copy link.',
    'preview.feedback.shareCancel': 'Share canceled.',
    'item.fallback.availability': 'Subject to availability',
    'item.fallback.pairing': 'Ask our team',
    'search.trigger.label': 'Search',
    'search.panel.aria': 'Site search',
    'search.input.placeholder': 'Search menu, categories, or pages',
    'search.clear': 'Clear',
    'search.close': 'Esc',
    'search.panel.title.recent': 'Recent Items',
    'search.panel.title.results': 'Results ({count})',
    'search.panel.hint.default': 'Type to search with fuzzy matching',
    'search.panel.hint.results': 'Click a result to jump',
    'search.empty.recent': 'No recently viewed items yet. Try opening a menu item.',
    'search.empty.results': 'No matches found. Try a different keyword.',
    'search.group.recent': 'Recently Viewed',
    'search.group.quick': 'Quick Links',
    'search.group.items': 'Menu Items',
    'search.group.categories': 'Categories',
    'search.group.pages': 'Pages',
    'search.result.category': 'Category',
    'search.result.page': 'Page',
    'search.results.aria': 'Search results',
    'reserve.validation.required': 'Please complete date, time, guests, and contact details.',
    'reserve.validation.phone': 'Please enter a valid phone number.',
    'reserve.validation.email': 'Please enter a valid email.',
    'reserve.validation.full': 'That slot is full. Please choose another time.',
    'reserve.step.error.basic': 'Please select date, time, and guests first.',
    'reserve.step.error.contact': 'Please enter name, phone, and email.',
    'reserve.submit.sending': 'Submitting your reservation...',
    'reserve.submit.success': 'Reservation confirmed: {summary} We\'ll confirm by phone or email.',
    'reserve.submit.error': 'Submission failed. Please try again or call us.',
    'reserve.submit.already': 'Your reservation was already sent. Update the details to submit again.',
    'reserve.submit.successSummary': 'Reservation complete: {summary} Add it to your calendar below.',
    'reserve.summary.inline': '{date} {time}, {guests} guests, {name}.',
    'reserve.calendar.title': 'La Miu Reservation',
    'reserve.calendar.details.name': 'Name: {name}',
    'reserve.calendar.details.guests': 'Guests: {count}',
    'reserve.calendar.details.notes': 'Notes: {notes}',
    'reserve.calendar.details.none': 'None',
    'search.page.home.title': 'Homepage',
    'search.page.home.description': 'Homepage, philosophy, and space story.',
    'search.page.home.keywords': 'home brand story space',
    'search.page.reserve.title': 'Reservations',
    'search.page.reserve.description': 'Reserve a morning seat.',
    'search.page.reserve.keywords': 'reservation booking reserve',
    'search.page.menu.title': 'Menu Overview',
    'search.page.menu.description': 'Full menu categories and featured items.',
    'search.page.menu.keywords': 'menu overview',
    'search.page.seasonal.title': 'Seasonal Menu',
    'search.page.seasonal.description': 'Seasonal dishes and recommendations.',
    'search.page.seasonal.keywords': 'seasonal limited',
    'search.page.breakfast.title': 'Breakfast',
    'search.page.breakfast.description': 'Signature breakfast plates.',
    'search.page.breakfast.keywords': 'breakfast brunch',
    'search.page.coffee.title': 'Coffee',
    'search.page.coffee.description': 'Pour-over and coffee drinks.',
    'search.page.coffee.keywords': 'coffee',
    'search.page.dessert.title': 'Dessert',
    'search.page.dessert.description': 'Desserts and afternoon treats.',
    'search.page.dessert.keywords': 'dessert',
    'seo.home.title': 'La Miu | Tainan Brunch & Seasonal Morning Dining',
    'seo.home.description': 'La Miu on Weimin Street in Tainan serves warm-wood brunch, seasonal dishes, desserts, coffee, and online reservations.',
    'seo.home.ogDescription': 'Warm wood tables, seasonal breakfast plates, coffee and dessert, and online reservations, an unhurried morning welcome in central Tainan.',
    'seo.home.twitterDescription': 'Explore La Miu\'s homepage, full menu, seasonal dishes, and reservations.',
    'seo.menu.title': 'La Miu Menu | Seasonal Dishes, Coffee & Desserts',
    'seo.menu.description': 'Browse La Miu\'s full menu of signature brunch, seasonal specials, coffee, and desserts.',
    'seo.menu.ogDescription': 'Signature brunch plates, seasonal specials, coffee, and desserts, everything in the La Miu menu.',
    'seo.category.title': 'La Miu | {name}',
    'seo.item.title': 'La Miu | {name}',
    'status.loadError': 'Data failed to load. Please confirm the Render API is running and `config.js` has the correct `apiBase`.'
  }
};

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
      <a class="text-link" href="${getItemPageHref(item.slug)}" data-item-link data-item-slug="${item.slug}" data-item-name="${item.name}" data-item-category="${item.category}" data-item-image="${item.image}" data-item-price="${item.price}" data-item-short="${item.shortDescription}">${t('preview.action.view')}</a>
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
      <a class="text-link" href="${getItemPageHref(item.slug)}" data-item-link data-item-slug="${item.slug}" data-item-name="${item.name}" data-item-category="${item.category}" data-item-image="${item.image}" data-item-price="${item.price}" data-item-short="${item.shortDescription}">${t('preview.action.view')}</a>
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
setupGlobalSearch();
setupQuickPreview();
setupSpaceCarousel();
setupMobileQuickActions();
setupBackgroundAudio();
finishLoadingAfterReady();
initDataDrivenPages();
