import { PRODUCT_DEFAULTS, PRODUCT_SERIES } from './product-list.js';
import { IMAGE_ASSETS } from './image-assets.js';

// utils.js - Shared asset and product helpers
(function attachAppUtils(global) {
  function resolveImage(imageKey) {
    return IMAGE_ASSETS[imageKey] || '';
  }

  function applyImageAssets(root = document) {
    root.querySelectorAll('[data-image-key]').forEach((img) => {
      const src = resolveImage(img.dataset.imageKey);
      if (src) img.src = src;
    });

    root.querySelectorAll('[data-poster-key]').forEach((video) => {
      const poster = resolveImage(video.dataset.posterKey);
      if (poster) video.poster = poster;
    });

    root.querySelectorAll('[data-bg-image-key]').forEach((el) => {
      const bg = resolveImage(el.dataset.bgImageKey);
      if (bg) el.style.backgroundImage = `url('${bg}')`;
    });
  }

  function buildProductCatalog() {
    let nextId = 1;
    return PRODUCT_SERIES.flatMap((series) =>
      series.products.map((product) => {
        const imageKey = product.productImageKey || `product_${series.key}`;
        const imageUrl = product.imageUrl || resolveImage(imageKey);
        return {
          ...PRODUCT_DEFAULTS,
          id: nextId++,
          category: series.key,
          filterKey: series.key,
          imageKey,
          productImageKey: imageKey,
          imageUrl,
          productImage: imageUrl,
          ...product
        };
      })
    );
  }

  function getSeriesFilters() {
    return PRODUCT_SERIES.map((series) => ({
      key: series.key,
      filterKey: `filter_${series.key}`
    }));
  }

  global.AppUtils = {
    IMAGE_ASSETS,
    PRODUCT_SERIES,
    resolveImage,
    applyImageAssets,
    buildProductCatalog,
    getSeriesFilters
  };
})(window);

// BEGIN: Extracted page logic from index.html
(function attachPageLogic(global) {
function tr(key, fallback) {
  const value = typeof window.t === 'function' ? window.t(key) : key;
  return value && value !== key ? value : fallback;
}

// ============================================
// 回到顶部按钮系统
// ============================================
function setupBackToTopButton() {
  const backToTopBtn = document.getElementById('back-to-top');
  if (!backToTopBtn) return;
  window.addEventListener('scroll', function() {
    if (window.pageYOffset > 300) {
      backToTopBtn.classList.add('show');
    } else {
      backToTopBtn.classList.remove('show');
    }
  });
  backToTopBtn.addEventListener('click', function(e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.classList.add('pulse');
    setTimeout(() => this.classList.remove('pulse'), 1000);
  });
  setTimeout(() => {
    if (window.pageYOffset > 300) {
      backToTopBtn.classList.add('show', 'pulse');
      setTimeout(() => backToTopBtn.classList.remove('pulse'), 1000);
    }
  }, 8000);
}

document.getElementById('language-dropdown')?.addEventListener('click', function(event) {
  event.stopPropagation();
});

// ============================================
// 导航栏滚动高亮系统
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  // 初始化翻译系统（来自 translations.js）
  setupLanguageSystem();

  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('header nav a[href^="#"]');
  let sectionPositions = [];

  function calculateSectionPositions() {
    sectionPositions = [];
    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      const offset = 100;
      if (section.id) {
        sectionPositions.push({
          id: section.id,
          top: rect.top + scrollY - offset,
          bottom: rect.top + scrollY + rect.height - offset
        });
      }
    });
    sectionPositions.sort((a, b) => a.top - b.top);
  }

  function updateActiveNavLink() {
    if (sectionPositions.length === 0) return;
    const currentScroll = window.scrollY || window.pageYOffset;
    let currentSection = null;
    for (let i = 0; i < sectionPositions.length; i++) {
      const section = sectionPositions[i];
      if (currentScroll >= section.top && (i === sectionPositions.length - 1 || currentScroll < sectionPositions[i + 1].top)) {
        currentSection = section.id;
        break;
      }
    }
    if (!currentSection && currentScroll > sectionPositions[sectionPositions.length - 1].top) {
      currentSection = sectionPositions[sectionPositions.length - 1].id;
    }

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      const linkSection = href.startsWith('#') ? href.substring(1) : href;
      if (currentSection === linkSection) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  calculateSectionPositions();

  let scrollTimeout;
  window.addEventListener('scroll', function() {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateActiveNavLink, 100);
  });

  window.addEventListener('resize', function() {
    calculateSectionPositions();
    updateActiveNavLink();
  });

  setTimeout(function() {
    calculateSectionPositions();
    updateActiveNavLink();
  }, 100);

  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (!targetId.startsWith('#')) return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        navLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        window.scrollTo({ top: targetElement.offsetTop - 80, behavior: 'smooth' });
        history.pushState(null, null, targetId);
      }
    });
  });

  const mobileNavLinks = document.querySelectorAll('#mobile-menu nav a[href^="#"]');
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      setTimeout(() => {
        navLinks.forEach(navLink => {
          if (navLink.getAttribute('href') === this.getAttribute('href')) {
            navLink.classList.add('active');
          } else {
            navLink.classList.remove('active');
          }
        });
      }, 300);
    });
  });
});

// ============================================
// PRODUCT DATA & RENDERING
// ============================================
function getAppUtils() {
  return window.AppUtils || null;
}

function resolveImage(imageKey) {
  const utils = getAppUtils();
  return utils ? utils.resolveImage(imageKey) : '';
}

let products = [];

function getProducts() {
  if (products.length > 0) return products;

  const utils = getAppUtils();
  if (!utils) return [];

  products = utils.buildProductCatalog();
  return products;
}

function renderProductFilters() {
  const filterBar = document.getElementById('product-filter-bar');
  if (!filterBar) return '';

  const utils = getAppUtils();
  const seriesFilters = utils ? utils.getSeriesFilters() : [];
  const defaultFilter = seriesFilters[0]?.key || '';

  filterBar.innerHTML = seriesFilters.map(({ key, filterKey }) => {
    const isActive = key === currentFilter || (!currentFilter && key === defaultFilter);
    const baseClass = 'filter-btn px-5 py-2 rounded-full text-sm font-bold transition-all';
    const stateClass = isActive
      ? 'bg-primary text-white'
      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700';
    const fallbackLabel = key;
    return `<button onclick="filterProducts('${key}')" class="${baseClass} ${stateClass}" data-i18n="${filterKey}" data-filter="${key}">${fallbackLabel}</button>`;
  }).join('');

  return defaultFilter;
}

document.addEventListener('DOMContentLoaded', () => {
  const utils = getAppUtils();
  if (utils) {
    utils.applyImageAssets();
  }
  currentFilter = renderProductFilters();
  renderProducts();
});

let currentPage = 1;
const itemsPerPage = 6;
let currentFilter = '';

function filterProducts(filter) {
  currentFilter = filter;
  currentPage = 1;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.getAttribute('data-filter') === filter) {
      btn.classList.remove('bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');
      btn.classList.add('bg-primary', 'text-white');
    } else {
      btn.classList.add('bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');
      btn.classList.remove('bg-primary', 'text-white');
    }
  });
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  const allProducts = getProducts();
  const filtered = currentFilter ? allProducts.filter(p => p.category === currentFilter) : allProducts;
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const pageProducts = filtered.slice(start, start + itemsPerPage);

  grid.innerHTML = pageProducts.map((p) => {
    const highlights = (p.highlights || []).slice(0, 3).map((item) => `<span class="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">${item}</span>`).join('');
    const specs = p.detailParams || {};
    return `
    <div class="product-card bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all border border-primary/5 group" data-category="${p.category}">
      <div class="aspect-[4/3] overflow-hidden relative">
        <img src="${p.productImage || resolveImage(p.imageKey)}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
        ${p.badgeKey ? `<span class="absolute top-3 left-3 ${p.badgeColor} text-white px-3 py-1 rounded-full text-xs font-bold">${tr(p.badgeKey, p.badgeKey)}</span>` : ''}
        ${p.status ? `<span class="absolute top-3 right-3 bg-slate-900/75 text-white px-2 py-1 rounded text-xs">${p.status}</span>` : ''}
      </div>
      <div class="p-4 lg:p-6">
        <h3 class="text-lg font-bold text-primary dark:text-white mb-1">${p.name}</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">${tr('product_label_model', 'Model')}: ${p.model || '-'}</p>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">${tr('product_label_brand', 'Brand')}: ${p.brand || '-'}</p>
        <span class="text-xs font-medium text-primary uppercase">${tr('category_' + p.category, p.category)}</span>

        <div class="flex flex-wrap gap-2 my-4">${highlights}</div>

        <div class="space-y-2 text-xs text-slate-600 dark:text-slate-300 my-4">
          <div><strong>${tr('product_label_launch_date', 'Launch Date')}:</strong> ${p.launchDate || '-'}</div>
          <div><strong>${tr('product_label_shipping_lead_time', 'Shipping Lead Time')}:</strong> ${p.shippingLeadTime || '-'}</div>
          <div><strong>${tr('product_label_min_order_qty', 'Minimum Order Quantity')}:</strong> ${p.minOrderQty || '-'}</div>
          <div><strong>${tr('product_label_price', 'Price')}:</strong> ${p.price || '-'}</div>
          <div><strong>${tr('product_label_scene', 'Application Scenario')}:</strong> ${p.scene || '-'}</div>
          <div><strong>${tr('product_label_usage', 'Usage')}:</strong> ${p.usage || '-'}</div>
          <div><strong>${tr('product_label_material', 'Material')}:</strong> ${specs.material || '-'}</div>
          <div><strong>${tr('product_label_voltage_frequency', 'Voltage/Frequency')}:</strong> ${specs.voltage || '-'} / ${specs.frequency || '-'}</div>
          <div><strong>${tr('product_label_capacity_throughput', 'Capacity/Throughput')}:</strong> ${specs.capacity || '-'} / ${specs.throughput || '-'}</div>
          <div><strong>${tr('product_label_avg_cook_time', 'Average Cooking Time')}:</strong> ${specs.avgCookTime || '-'}</div>
        </div>

        <div class="flex items-center justify-between">
          <button onclick="showSmartPopupManual()" class="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">request_page</span>
            ${tr('product_request', 'Request Quote')}
          </button>
        </div>
      </div>
    </div>
  `;
  }).join('');

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const pagination = document.getElementById('pagination');
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  let html = '';
  html += `<button onclick="goToPage(${currentPage - 1})" class="pagination-btn px-3 py-2 rounded-lg text-sm ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}" ${currentPage === 1 ? 'disabled' : ''}>
    <span class="material-symbols-outlined text-lg">chevron_left</span>
  </button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `<button onclick="goToPage(${i})" class="pagination-btn px-4 py-2 rounded-lg text-sm font-medium ${i === currentPage ? 'bg-primary text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<span class="px-2">...</span>`;
    }
  }
  html += `<button onclick="goToPage(${currentPage + 1})" class="pagination-btn px-3 py-2 rounded-lg text-sm ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}" ${currentPage === totalPages ? 'disabled' : ''}>
    <span class="material-symbols-outlined text-lg">chevron_right</span>
  </button>`;
  pagination.innerHTML = html;
}

function goToPage(page) {
  const allProducts = getProducts();
  const filtered = currentFilter ? allProducts.filter(p => p.category === currentFilter) : allProducts;
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    renderProducts();
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
  }
}

// ============================================
// USER TRACKING
// ============================================
const userState = {
  firstVisit: Date.now(), visitCount: 0, scrollDepth: 0, timeOnPage: 0,
  productViews: [], formInteractions: 0, popupShown: false,
  popupCount: { header: 0, hero: 0, custom: 0, product: {} },
  lastPopupTime: 0, maxScrollReached: 0
};

function loadUserState() {
  const saved = localStorage.getItem('userState');
  if (saved) {
    const parsed = JSON.parse(saved);
    Object.assign(userState, parsed);
    userState.visitCount++;
    userState.timeOnPage = 0;
    userState.scrollDepth = 0;
  } else {
    userState.visitCount = 1;
  }
  saveUserState();
}

function saveUserState() {
  localStorage.setItem('userState', JSON.stringify(userState));
}

function trackScrollDepth() {
  const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
  userState.scrollDepth = Math.max(userState.scrollDepth, scrollPercent);
  userState.maxScrollReached = Math.max(userState.maxScrollReached, scrollPercent);
}

function trackTimeOnPage() {
  userState.timeOnPage++;
  saveUserState();
}

// ============================================
// SIDEBAR SYSTEM
// ============================================
let secondaryExpanded = false;

function toggleSecondaryContacts() {
  secondaryExpanded = !secondaryExpanded;
  const secondary = document.getElementById('secondary-contacts');
  const btn = document.getElementById('expand-btn');
  const btnIcon = document.getElementById('expand-btn-icon');
  const tooltip = btn.querySelector('.contact-tooltip');
  if (secondaryExpanded) {
    secondary.classList.add('expanded');
    if (btnIcon) btnIcon.textContent = 'expand_less';
    if (tooltip) tooltip.setAttribute('data-i18n', 'sidebar_collapse');
    btn.classList.add('expanded');
  } else {
    secondary.classList.remove('expanded');
    if (btnIcon) btnIcon.textContent = 'expand_more';
    if (tooltip) tooltip.setAttribute('data-i18n', 'sidebar_expand');
    btn.classList.remove('expanded');
  }
  applyTranslations();
}

function showIndicator() {
  const indicator = document.getElementById('sidebar-indicator');
  if (!indicator) return;
  indicator.classList.add('show');
  setTimeout(hideIndicator, 15000);
}

function hideIndicator() {
  const indicator = document.getElementById('sidebar-indicator');
  if (!indicator) return;
  indicator.classList.remove('show');
}

function startWhatsApp() { window.open('https://wa.me/4975112345678?text=' + encodeURIComponent(tr('contact_whatsapp_prefill', 'Hello! I am interested in your products.')), '_blank'); }
function startLine() { window.open('https://line.me/ti/p/@baeckerei-profi', '_blank'); }
function startPhone() { window.location.href = 'tel:+497511234567'; }
function startTelegram() { window.open('https://t.me/baeckerei-profi', '_blank'); }
function startEmail() {
  const subject = encodeURIComponent(tr('contact_email_subject', 'Product Inquiry'));
  const body = encodeURIComponent(tr('contact_email_body', 'Hello,\n\nI am interested in your products.\n\nPlease contact me.\n\nBest regards'));
  window.location.href = `mailto:info@baeckereitechnik-profi.de?subject=${subject}&body=${body}`;
}
function startFacebook() { window.open('https://facebook.com/baeckereitechnikprofi', '_blank'); }
function startInstagram() { window.open('https://instagram.com/baeckerei.profi', '_blank'); }
function startTwitter() { window.open('https://twitter.com/baeckerei_profi', '_blank'); }
function startLinkedIn() { window.open('https://linkedin.com/company/baeckereitechnik-profi', '_blank'); }
function startTikTok() { window.open('https://tiktok.com/@baeckerei.profi', '_blank'); }

// ============================================
// NOTIFICATION SYSTEM
// ============================================
function showNotification(message, type = 'success') {
  const container = document.getElementById('notification-container') || createNotificationContainer();
  const notification = document.createElement('div');
  notification.className = `notification flex items-center gap-3 p-4 rounded-lg shadow-lg mb-3 transform translate-x-full transition-transform duration-300 ${type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`;
  notification.innerHTML = `<span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'error'}</span><span class="text-sm font-medium">${message}</span>`;
  container.appendChild(notification);
  setTimeout(() => notification.classList.remove('translate-x-full'), 10);
  setTimeout(() => {
    notification.classList.add('translate-x-full');
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

function createNotificationContainer() {
  const container = document.createElement('div');
  container.id = 'notification-container';
  container.className = 'fixed top-20 right-4 z-[9999] max-w-sm';
  document.body.appendChild(container);
  return container;
}

// ============================================
// DARK MODE TOGGLE
// ============================================
function initDarkMode() {
  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) document.documentElement.classList.add('dark');
}

// ============================================
// MOBILE MENU
// ============================================
function toggleMobileMenu() {
  const overlay = document.getElementById('mobile-menu-overlay');
  const menu = document.getElementById('mobile-menu');
  overlay.classList.toggle('hidden');
  if (menu.classList.contains('translate-x-full')) {
    menu.classList.remove('translate-x-full');
    menu.classList.add('translate-x-0');
    document.body.style.overflow = 'hidden';
  } else {
    menu.classList.add('translate-x-full');
    menu.classList.remove('translate-x-0');
    document.body.style.overflow = '';
  }
}

// ============================================
// 测试环境判断 (localhost / 127.0.0.1)
// ============================================
function isTestEnvironment() {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.includes('.local') || host.includes('test');
}

function setupJumpingAnimation() {
  const jumpButtons = [
    document.getElementById('jump-btn-1'),
    document.getElementById('jump-btn-2'),
    document.getElementById('jump-btn-3'),
    document.getElementById('jump-btn-4')
  ];
  if (jumpButtons.some(btn => !btn)) return;
  let currentIndex = 0, animationTimer = null, isAnimating = false;
  const originalStyles = jumpButtons.map(btn => ({
    transform: btn.style.transform, boxShadow: btn.style.boxShadow,
    zIndex: btn.style.zIndex, animation: btn.style.animation
  }));

  function stopAllJumping() {
    jumpButtons.forEach((btn, index) => {
      if (btn) {
        btn.classList.remove('jump-active');
        btn.style.transform = originalStyles[index].transform || '';
        btn.style.boxShadow = originalStyles[index].boxShadow || '';
        btn.style.zIndex = originalStyles[index].zIndex || '';
        btn.style.animation = '';
      }
    });
    isAnimating = false;
  }

  function gentleStopButton(btn, index) {
    if (!btn) return;
    btn.style.transition = 'all 0.3s ease-out';
    setTimeout(() => {
      btn.classList.remove('jump-active');
      btn.style.transform = originalStyles[index].transform || '';
      btn.style.boxShadow = originalStyles[index].boxShadow || '';
      btn.style.zIndex = originalStyles[index].zIndex || '';
      setTimeout(() => { btn.style.transition = ''; }, 300);
    }, 100);
  }

  function startNextJump() {
    if (isAnimating) return;
    isAnimating = true;
    if (jumpButtons[currentIndex]) gentleStopButton(jumpButtons[currentIndex], currentIndex);

    let nextIndex = currentIndex, attempts = 0;
    do {
      nextIndex = (nextIndex + 1) % jumpButtons.length;
      attempts++;
      if (attempts > jumpButtons.length) { isAnimating = false; return; }
      const nextBtn = jumpButtons[nextIndex];
      if (nextBtn) {
        const rect = nextBtn.getBoundingClientRect();
        const isVisible = (rect.top >= -100 && rect.left >= -100 && rect.bottom <= window.innerHeight + 100 && rect.right <= window.innerWidth + 100);
        if (isVisible && !nextBtn.matches(':hover')) {
          currentIndex = nextIndex;
          break;
        }
      }
    } while (true);

    const currentBtn = jumpButtons[currentIndex];
    if (!currentBtn) { isAnimating = false; return; }

    originalStyles[currentIndex] = {
      transform: currentBtn.style.transform, boxShadow: currentBtn.style.boxShadow,
      zIndex: currentBtn.style.zIndex, animation: currentBtn.style.animation
    };
    currentBtn.classList.add('jump-active');
    const rect = currentBtn.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      currentBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    setTimeout(() => {
      if (currentBtn && currentBtn.classList.contains('jump-active')) gentleStopButton(currentBtn, currentIndex);
      isAnimating = false;
    }, 800);
  }

  function startAnimationCycle() {
    stopAllJumping();
    if (animationTimer) clearInterval(animationTimer);
    setTimeout(startNextJump, 1000);
    animationTimer = setInterval(startNextJump, 1200);
  }

  function stopAnimationCycle() {
    if (animationTimer) { clearInterval(animationTimer); animationTimer = null; }
    stopAllJumping();
  }

  function setupButtonInteractions() {
    jumpButtons.forEach((btn, index) => {
      if (btn) {
        btn.addEventListener('mouseenter', () => {
          btn.classList.remove('jump-active');
          btn.style.transform = 'scale(1.05)';
          btn.style.transition = 'transform 0.2s ease-out';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.transform = '';
          btn.style.transition = '';
        });
        btn.addEventListener('click', (e) => {
          btn.style.transform = 'scale(0.95)';
          setTimeout(() => { btn.style.transform = ''; }, 150);
          btn.dataset.lastClicked = Date.now();
          stopAnimationCycle();
          setTimeout(startAnimationCycle, 2000);
        });
      }
    });
  }

  function setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAnimationCycle();
      else setTimeout(startAnimationCycle, 500);
    });
  }

  function init() {
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => setTimeout(init, 500));
      return;
    }
    setupButtonInteractions();
    setupVisibilityHandler();
    setTimeout(startAnimationCycle, 3000);
    let lastActivity = Date.now();
    const activityCheck = setInterval(() => {
      if (Date.now() - lastActivity > 30000 && animationTimer) {
        clearInterval(animationTimer);
        animationTimer = setInterval(startNextJump, 5000);
      }
    }, 10000);
    ['mousemove', 'click', 'keydown', 'scroll'].forEach(event => {
      window.addEventListener(event, () => { lastActivity = Date.now(); }, { passive: true });
    });
  }
  init();
  return { start: startAnimationCycle, stop: stopAnimationCycle, next: startNextJump };
}

// ============================================
// 智能弹窗系统 (优化版)
// ============================================
const smartPopup = {
  state: {
    popupShownThisSession: 0, maxPopupsPerSession: 4, lastPopupTime: null,
    popupCooldown: 60000,
    conditions: {
      initialLoadTime: { triggered: false, threshold: 20 },
      productSectionTime: { triggered: false, threshold: 15 },
      nonLinkClick: { triggered: false },
      nonHeroScrollTime: { triggered: false, threshold: 20 }
    },
    hasScrolledPastHero: false
  },
  init() {
    this.setupTracking();
    this.checkConditionsLoop();
  },
  setupTracking() {
    document.addEventListener('click', (e) => {
      const isLink = e.target.closest('a, button, [role="button"]');
      const isInput = e.target.closest('input, textarea, select');
      if (!isLink && !isInput) {
        this.state.conditions.nonLinkClick.triggered = true;
      }
    });
    this.setupScrollTracking();
    this.setupProductSectionObserver();
  },
  setupScrollTracking() {
    let nonHeroTimer = 0, nonHeroInterval = null;
    window.addEventListener('scroll', () => {
      const heroSection = document.querySelector('section:first-of-type');
      if (heroSection) {
        const heroRect = heroSection.getBoundingClientRect();
        const isPastHero = window.scrollY > heroRect.height;
        if (isPastHero && !this.state.hasScrolledPastHero) {
          this.state.hasScrolledPastHero = true;
        }
      }
      if (this.state.hasScrolledPastHero) {
        if (!nonHeroInterval) {
          nonHeroTimer = 0;
          nonHeroInterval = setInterval(() => {
            nonHeroTimer++;
            if (nonHeroTimer >= this.state.conditions.nonHeroScrollTime.threshold) {
              this.state.conditions.nonHeroScrollTime.triggered = true;
              clearInterval(nonHeroInterval);
            }
          }, 1000);
        }
      } else if (nonHeroInterval) {
        clearInterval(nonHeroInterval);
        nonHeroInterval = null;
      }
    });
  },
  setupProductSectionObserver() {
    const productSection = document.getElementById('products');
    if (!productSection) return;
    let productTimer = 0, productInterval = null;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          productTimer = 0;
          productInterval = setInterval(() => {
            productTimer++;
            if (productTimer >= this.state.conditions.productSectionTime.threshold) {
              this.state.conditions.productSectionTime.triggered = true;
              clearInterval(productInterval);
            }
          }, 1000);
        } else {
          if (productInterval) { clearInterval(productInterval); productInterval = null; }
        }
      });
    }, { threshold: 0.3 });
    observer.observe(productSection);
  },
  checkConditionsLoop() {
    let initialTimer = 0;
    const initialInterval = setInterval(() => {
      initialTimer++;
      if (initialTimer >= this.state.conditions.initialLoadTime.threshold) {
        this.state.conditions.initialLoadTime.triggered = true;
        clearInterval(initialInterval);
      }
    }, 1000);
    setInterval(() => this.evaluateConditions(), 1000);
  },
  evaluateConditions() {
    if (this.state.popupShownThisSession >= this.state.maxPopupsPerSession) return;
    if (this.state.lastPopupTime && (Date.now() - this.state.lastPopupTime) < this.state.popupCooldown) return;
    const shouldTrigger = this.shouldTriggerPopup();
    if (shouldTrigger) this.showPopup(shouldTrigger.reason);
  },
  shouldTriggerPopup() {
    if (this.state.conditions.initialLoadTime.triggered) return { reason: 'initial-time' };
    if (this.state.conditions.productSectionTime.triggered) return { reason: 'product-section' };
    if (this.state.conditions.nonLinkClick.triggered) return { reason: 'non-link-click' };
    if (this.state.conditions.nonHeroScrollTime.triggered) return { reason: 'non-hero-scroll' };
    return null;
  },
  showPopup(triggerReason) {
    this.state.popupShownThisSession++;
    this.state.lastPopupTime = Date.now();
    this.updateSessionCount();
    this.updateTriggerReason(triggerReason);
    applyPopupVisibility();

    const overlay = document.getElementById('smart-popup-overlay');
    if (overlay) {
      // 滚动条补偿
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = scrollbarWidth + 'px';
      document.body.style.overflow = 'hidden';

      overlay.classList.add('show');
      this.resetTrigger(triggerReason);
    }
  },
  updateSessionCount() {
    const countElement = document.getElementById('today-popup-count');
    if (countElement) {
      countElement.textContent = `${this.state.popupShownThisSession}/${this.state.maxPopupsPerSession}`;
    }
  },
  updateTriggerReason(triggerReason) {
    const reasonElement = document.getElementById('trigger-reason');
    if (reasonElement) {
      let message = tr('popup_trigger_default', 'We noticed your interest in our products');
      if (triggerReason === 'initial-time') message = tr('popup_trigger_initial_time', 'You have stayed on this page for more than 20 seconds');
      if (triggerReason === 'product-section') message = tr('popup_trigger_product_section', 'You stayed in the product section for more than 15 seconds');
      if (triggerReason === 'non-link-click') message = tr('popup_trigger_non_link_click', 'You interacted with non-link content on this page');
      if (triggerReason === 'non-hero-scroll') message = tr('popup_trigger_non_hero_scroll', 'You stayed in a non-hero area for more than 20 seconds');
      reasonElement.innerHTML = `<span class="material-symbols-outlined">info</span><span>${message}</span>`;
    }
  },
  resetTrigger(triggerReason) {
    if (triggerReason === 'initial-time') this.state.conditions.initialLoadTime.triggered = false;
    if (triggerReason === 'product-section') this.state.conditions.productSectionTime.triggered = false;
    if (triggerReason === 'non-link-click') this.state.conditions.nonLinkClick.triggered = false;
    if (triggerReason === 'non-hero-scroll') this.state.conditions.nonHeroScrollTime.triggered = false;
  },
  closePopup() {
    const overlay = document.getElementById('smart-popup-overlay');
    if (!overlay) return;
    
    overlay.classList.add('closing');
    setTimeout(() => {
      overlay.classList.remove('show', 'closing');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }, 200);
  }
};

// 控制弹窗中测试环境才显示的元素
function applyPopupVisibility() {
  const isTest = isTestEnvironment();
  const countEl = document.getElementById('popup-today-count');
  const reasonEl = document.getElementById('trigger-reason');
  if (countEl) countEl.style.display = isTest ? 'flex' : 'none';
  if (reasonEl) reasonEl.style.display = isTest ? 'flex' : 'none';
}

function showSmartPopupManual() {
  const overlay = document.getElementById('smart-popup-overlay');
  if (!overlay) return;
  if (window.smartPopup && smartPopup.state.popupShownThisSession >= smartPopup.state.maxPopupsPerSession) return;
  if (window.smartPopup && smartPopup.state.lastPopupTime && (Date.now() - smartPopup.state.lastPopupTime) < smartPopup.state.popupCooldown) return;
  if (window.smartPopup) {
    smartPopup.state.popupShownThisSession++;
    smartPopup.state.lastPopupTime = Date.now();
  }
  const countElement = document.getElementById('today-popup-count');
  if (countElement) countElement.textContent = `${smartPopup.state.popupShownThisSession}/${smartPopup.state.maxPopupsPerSession}`;
  const reasonElement = document.getElementById('trigger-reason');
  if (reasonElement) reasonElement.innerHTML = `<span class="material-symbols-outlined">info</span><span>${tr('popup_trigger_manual_click', 'You clicked the consultation button')}</span>`;
  // 同样应用环境可见性
  applyPopupVisibility();
  overlay.classList.add('show');
  // 在显示弹窗前，获取滚动条宽度并设置 padding
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.paddingRight = scrollbarWidth + 'px';
  document.body.style.overflow = 'hidden';
}

function closeSmartPopup() {
  smartPopup.closePopup();
}

// ============================================
// 邮件发送功能 - 发送到指定邮箱 (增强数据收集)
// ============================================
async function submitSmartPopupForm(event) {
  event.preventDefault();
  const form = document.getElementById('smart-popup-form');
  if (!form) { showNotification(tr('notify_form_not_found', 'Form not found'), 'error'); return; }
  const formData = {
    formType: 'smart_popup',
    name: form.querySelector('input[name="name"]')?.value,
    email: form.querySelector('input[name="email"]')?.value,
    phone: form.querySelector('input[name="phone"]')?.value,
    country: form.querySelector('input[name="country"]')?.value,
    message: form.querySelector('textarea[name="message"]')?.value,
    language: currentLanguage,
    browserLanguage: navigator.language,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    pageUrl: window.location.href,
    timeOnPage: userState?.timeOnPage || 0,
    scrollDepth: userState?.scrollDepth || 0,
    userAgent: navigator.userAgent
  };
  showNotification(tr('notify_submitting_info', 'Submitting your information...'), 'success');
  try {
    await fetch('https://script.google.com/macros/s/AKfycbyikM1ArEFhJhQUSAp6l4DHJcGzDDK1cckL-KOrVbjipoMGSKsOOlhFWJGTPB6qOys/exec', {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    showNotification(tr('notify_submit_success', 'Submitted successfully!'), 'success');
    form.reset();
    setTimeout(closeSmartPopup, 500);
  } catch (error) {
    console.error('提交失败:', error);
    showNotification(tr('notify_submit_received', 'Submitted successfully! We have received your information.'), 'success');
    form.reset();
    setTimeout(closeSmartPopup, 500);
  }
}

async function submitContactForm(event) {
  event.preventDefault();
  const form = document.getElementById('contact-form');
  if (!form) { showNotification(tr('notify_form_not_found', 'Form not found'), 'error'); return; }
  const formData = {
    formType: 'contact_page',
    name: form.querySelector('input[name="name"]')?.value || '',
    company: form.querySelector('input[name="company"]')?.value || '',
    email: form.querySelector('input[name="email"]')?.value || '',
    phone: form.querySelector('input[name="phone"]')?.value || '',
    country: form.querySelector('input[name="country"]')?.value || '',
    message: form.querySelector('textarea[name="message"]')?.value || '',
    language: currentLanguage,
    browserLanguage: navigator.language,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    pageUrl: window.location.href,
    timeOnPage: userState?.timeOnPage || 0,
    scrollDepth: userState?.scrollDepth || 0,
    userAgent: navigator.userAgent
  };
  showNotification(tr('notify_sending_inquiry', 'Sending your inquiry...'), 'success');
  try {
    await fetch('https://script.google.com/macros/s/AKfycbyikM1ArEFhJhQUSAp6l4DHJcGzDDK1cckL-KOrVbjipoMGSKsOOlhFWJGTPB6qOys/exec', {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    showNotification(tr('notify_submit_success', 'Submitted successfully!'), 'success');
  } catch (error) {
    console.warn('Fetch 失败，降级到 mailto 备用方案', error);
    submitViaMailto(formData, 'contact_page');
  }
}

function submitViaMailto(formData, formType) {
  const subject = encodeURIComponent(`${formType === 'smart_popup' ? tr('mailto_subject_smart_popup', 'Smart Popup') : tr('mailto_subject_contact_form', 'Contact Form')} ${tr('mailto_subject_inquiry', 'Inquiry')} - ${formData.name}`);
  const body = encodeURIComponent(`
${tr('mailto_label_name', 'Name')}: ${formData.name}
${tr('mailto_label_email', 'Email')}: ${formData.email}
${tr('mailto_label_phone', 'Phone')}: ${formData.phone}
${tr('mailto_label_company', 'Company')}: ${formData.company || tr('mailto_not_provided', 'Not provided')}
${tr('mailto_label_country', 'Country')}: ${formData.country || tr('mailto_not_provided', 'Not provided')}
${tr('mailto_label_message', 'Message')}: ${formData.message}

------------ ${tr('mailto_section_user_info', 'User Information')} ------------
${tr('mailto_label_ip', 'IP Address')}: ${tr('mailto_ip_fetching', 'Fetching...')}
${tr('mailto_label_user_language', 'User Language')}: ${currentLanguage}
${tr('mailto_label_browser_language', 'Browser Language')}: ${navigator.language}
${tr('mailto_label_screen_resolution', 'Screen Resolution')}: ${window.screen.width}x${window.screen.height}
${tr('mailto_label_timezone', 'Timezone')}: ${Intl.DateTimeFormat().resolvedOptions().timeZone}
${tr('mailto_label_page_url', 'Page URL')}: ${window.location.href}
${tr('mailto_label_submit_time', 'Submit Time')}: ${new Date().toLocaleString()}
${tr('mailto_label_time_on_page', 'Time on Page')}: ${userState.timeOnPage || 0}${tr('mailto_unit_seconds', 's')}
${tr('mailto_label_scroll_depth', 'Scroll Depth')}: ${userState.scrollDepth || 0}%
${tr('mailto_label_product_interest_clicks', 'Product Interest Clicks')}: 0
------------ ${tr('mailto_section_browser_info', 'Browser Information')} ------------
${tr('mailto_label_user_agent', 'User Agent')}: ${navigator.userAgent}
${tr('mailto_label_language', 'Language')}: ${navigator.language}
${tr('mailto_label_resolution', 'Resolution')}: ${window.screen.width}x${window.screen.height}
  `);
  window.location.href = `mailto:179564128@qq.com?subject=${subject}&body=${body}`;
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => smartPopup.init(), 1000);
  setTimeout(setupJumpingAnimation, 1000);
  setTimeout(showIndicator, 2500);
});

window.addEventListener('beforeunload', () => {
  const jumpAnimations = setupJumpingAnimation();
  if (jumpAnimations && jumpAnimations.stop) jumpAnimations.stop();
});

let jumpAnimationSystem = null;
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => jumpAnimationSystem = setupJumpingAnimation(), 1000);
});

  global.smartPopup = smartPopup;
  global.userState = userState;
  Object.assign(global, {
    tr,
    setupBackToTopButton,
    getAppUtils,
    resolveImage,
    getProducts,
    renderProductFilters,
    filterProducts,
    renderProducts,
    renderPagination,
    goToPage,
    loadUserState,
    saveUserState,
    trackScrollDepth,
    trackTimeOnPage,
    toggleSecondaryContacts,
    showIndicator,
    hideIndicator,
    startWhatsApp,
    startLine,
    startPhone,
    startTelegram,
    startEmail,
    startFacebook,
    startInstagram,
    startTwitter,
    startLinkedIn,
    startTikTok,
    showNotification,
    createNotificationContainer,
    initDarkMode,
    toggleMobileMenu,
    isTestEnvironment,
    setupJumpingAnimation,
    applyPopupVisibility,
    showSmartPopupManual,
    closeSmartPopup,
    submitSmartPopupForm,
    submitContactForm,
    submitViaMailto
  });
})(window);
// END: Extracted page logic from index.html
