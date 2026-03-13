// assets/translations.js - Internationalization Module
const languageNames = {
  'zh-CN': '中文 (简体)',
  'de': 'Deutsch',
  'en': 'English',
  'es': 'Español',
  'fr': 'Français',
  'it': 'Italiano',
  'pt': 'Português',
  'ja': '日本語',
  'nl': 'Nederlands',
  'pl': 'Polski',
  'ru': 'Русский',
  'tr': 'Türkçe',
  'ko': '한국어',
  'th': 'ไทย',
  'vi': 'Tiếng Việt',
  'ar': 'العربية',
  'he': 'עברית',
  'zh-TW': '中文 (繁體)',
  'fil': 'Filipino',
  'id': 'Bahasa Indonesia',
  'ms': 'Bahasa Melayu'
};

class TranslationManager {
  constructor() {
    this.currentLanguage = this.getInitialLanguage();
    this.translationsCache = new Map();
    this.pendingLoads = new Map();
    this.keyPathCache = new Map();
    this.isInitialized = false;
    this.eventListeners = new Map();
    this.cacheInvalidated = true;
    this.domObserver = null;
    this.cachedElements = {
      i18nElements: [],
      placeholderElements: [],
      ariaElements: [],
      languageLabel: null,
      dropdown: null,
      container: null,
      langOptions: []
    };
  }

  getInitialLanguage() {
    // Always prioritize user's explicit choice
    const userChoice = localStorage.getItem('userLanguage');
    if (userChoice && languageNames[userChoice]) {
      console.log('Using user-selected language:', userChoice);
      return userChoice;
    }

    // Default to Chinese, don't use browser language for initial choice
    console.log('Using default language: zh-CN');
    return 'zh-CN';
  }

  /**
   * Load UI and product translations (separate files)
   * UI translations are loaded first for initial page load
   * Product translations are loaded on-demand
   */
  async loadTranslations(lang) {
    // Check if already loaded
    if (this.translationsCache.has(lang)) {
      return this.translationsCache.get(lang);
    }

    if (this.pendingLoads.has(lang)) {
      return this.pendingLoads.get(lang);
    }

    const loadPromise = this.fetchTranslations(lang);
    this.pendingLoads.set(lang, loadPromise);

    try {
      return await loadPromise;
    } finally {
      this.pendingLoads.delete(lang);
    }
  }

  /**
   * Fetch and merge UI and product translations
   */
  async fetchTranslations(lang) {
    try {
      // Load UI translations first (required for initial page load)
      const uiTranslations = await this.loadUITranslations(lang);

      // Merge UI and product translations
      const productTranslations = await this.loadProductTranslations(lang);
      const mergedTranslations = this.mergeTranslations(uiTranslations, productTranslations);

      // Cache merged translations
      this.translationsCache.set(lang, mergedTranslations);

      console.log(`✅ Loaded ${lang} (UI: ${Object.keys(uiTranslations).length} keys, Product: ${Object.keys(productTranslations).length} keys)`);

      return mergedTranslations;
    } catch (error) {
      console.error(`Failed to load translations for ${lang}:`, error);
      // Fallback to Chinese (Simplified)
      if (lang !== 'zh-CN') {
        console.log('Attempting fallback to zh-CN');
        return this.loadTranslations('zh-CN');
      }
      throw error;
    }
  }

  /**
   * Load UI translations only (lightweight, ~16KB per language)
   * Used for initial page load to improve TTI
   */
  async loadUITranslations(lang) {
    const cacheKey = `ui-${lang}`;
    if (this.translationsCache.has(cacheKey)) {
      return this.translationsCache.get(cacheKey);
    }

    try {
      // Check if fetch is available
      if (typeof fetch !== 'function') {
        throw new Error('Fetch is not available');
      }

      const response = await fetch(`./assets/lang/${lang}-ui.json?ts=${Date.now()}`, {
        cache: 'no-store'
      });

      if (!response) {
        throw new Error('Failed to fetch translations: response is undefined');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const uiTranslations = await response.json();
      const normalizedData = this.normalizeTranslationKeys(uiTranslations);
      this.translationsCache.set(cacheKey, normalizedData);
      console.log(`✅ Loaded UI translations for ${lang} (${Object.keys(uiTranslations).length} keys)`);
      return normalizedData;
    } catch (error) {
      console.error(`Failed to load UI translations for ${lang}:`, error);
      // Fallback to Chinese (Simplified)
      if (lang !== 'zh-CN') {
        return this.loadUITranslations('zh-CN');
      }
      throw error;
    }
  }

  /**
   * Load product data translations (heavy, ~140KB per language)
   * Used when accessing product pages
   */
  async loadProductTranslations(lang) {
    const cacheKey = `product-${lang}`;
    if (this.translationsCache.has(cacheKey)) {
      return this.translationsCache.get(cacheKey);
    }

    try {
      const response = await fetch(`./assets/lang/${lang}-product.json?ts=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const productTranslations = await response.json();
      const normalizedData = this.normalizeTranslationKeys(productTranslations);
      this.translationsCache.set(cacheKey, normalizedData);
      console.log(`✅ Loaded product translations for ${lang} (${Object.keys(productTranslations).length} keys)`);
      return normalizedData;
    } catch (error) {
      console.error(`Failed to load product translations for ${lang}:`, error);
      // Fallback to Chinese (Simplified)
      if (lang !== 'zh-CN') {
        return this.loadProductTranslations('zh-CN');
      }
      throw error;
    }
  }

  /**
   * Merge UI and product translations
   */
  mergeTranslations(uiTranslations, productTranslations) {
    return {
      ...uiTranslations,
      ...productTranslations
    };
  }

  /**
   * Lazy load product data when needed
   * Automatically shows loading indicator
   */
  async lazyLoadProductData(lang, showLoadingIndicator = true) {
    const cacheKey = `product-${lang}`;

    // Check if already loaded
    if (this.translationsCache.has(cacheKey)) {
      console.log(`✅ Product data already loaded for ${lang}`);
      return this.translationsCache.get(cacheKey);
    }

    // Show loading indicator
    if (showLoadingIndicator) {
      this.showLoadingIndicator();
    }

    try {
      console.log(`🔄 Lazy loading product data for ${lang}...`);
      const productTranslations = await this.loadProductTranslations(lang);

      // Merge with existing UI translations
      const uiCacheKey = `ui-${lang}`;
      const uiTranslations = this.translationsCache.get(uiCacheKey) || {};
      const mergedTranslations = this.mergeTranslations(uiTranslations, productTranslations);

      // Update cache with merged data
      this.translationsCache.set(lang, mergedTranslations);

      // Hide loading indicator
      if (showLoadingIndicator) {
        this.hideLoadingIndicator();
      }

      console.log(`✅ Product data loaded and merged for ${lang}`);
      return mergedTranslations;
    } catch (error) {
      console.error(`❌ Failed to lazy load product data for ${lang}:`, error);

      // Hide loading indicator
      if (showLoadingIndicator) {
        this.hideLoadingIndicator();
      }

      throw error;
    }
  }

  /**
   * Show loading indicator for product data
   */
  showLoadingIndicator() {
    let indicator = document.getElementById('product-loading-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'product-loading-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      `;
      indicator.innerHTML = `
        <div style="
          background: white;
          padding: 20px 40px;
          border-radius: 8px;
          text-align: center;
        ">
          <div style="
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
          "></div>
          <p style="margin: 0; color: #333;">${this.uiText('loading', '加载中...')}</p>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;
      document.body.appendChild(indicator);
    }
    indicator.style.display = 'flex';
  }

  /**
   * Hide loading indicator
   */
  hideLoadingIndicator() {
    const indicator = document.getElementById('product-loading-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  /**
   * Show language loading indicator for smooth language switching (without spinner)
   */
  showLanguageLoadingIndicator() {
    let indicator = document.getElementById('language-loading-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'language-loading-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: none;
        align-items: center;
        gap: 12px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
      `;
      indicator.innerHTML = `
        <span style="color: #333; font-size: 14px; font-weight: 500;">${this.uiText('loading_language', 'Loading language...')}</span>
        <style>
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes fadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
          }
        </style>
      `;
      document.body.appendChild(indicator);
    }
    indicator.style.display = 'flex';
  }

  /**
   * Hide language loading indicator with fade out animation
   */
  hideLanguageLoadingIndicator() {
    const indicator = document.getElementById('language-loading-indicator');
    if (indicator) {
      indicator.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }
  }

  /**
   * Apply translations with smooth transition animation
   */
  async applyTranslationsWithTransition(previousLanguage, newLanguage) {
    const { i18nElements } = this.getCachedElements();

    // Add fade out class to all translatable elements
    i18nElements.forEach(el => {
      el.style.transition = 'opacity 0.2s ease-out';
      el.style.opacity = '0';
    });

    // Wait for fade out animation
    await new Promise(resolve => setTimeout(resolve, 200));

    // Apply new translations
    await this.applyTranslations();

    // Update company name and title
    this.refreshCompanyName();
    this.refreshDocumentTitle(this.translationsCache.get(newLanguage));

    // Fade in with new translations
    i18nElements.forEach(el => {
      el.style.opacity = '1';
    });

    // Wait for fade in animation
    await new Promise(resolve => setTimeout(resolve, 200));

    // Remove transition styles
    i18nElements.forEach(el => {
      el.style.transition = '';
      el.style.opacity = '';
    });

    console.log(`✅ Smooth transition completed: ${previousLanguage} → ${newLanguage}`);
  }

  /**
   * Preload product data in the background
   * Uses requestIdleCallback to avoid blocking main thread
   */
  preloadProductData(lang, priority = 'low') {
    const cacheKey = `product-${lang}`;

    // Check if already loaded or loading
    if (this.translationsCache.has(cacheKey)) {
      console.log(`✅ Product data already loaded for ${lang}`);
      return Promise.resolve(this.translationsCache.get(cacheKey));
    }

    if (this.pendingLoads.has(cacheKey)) {
      console.log(`⏳ Product data already loading for ${lang}`);
      return this.pendingLoads.get(cacheKey);
    }

    const loadPromise = new Promise((resolve, reject) => {
      const loadFunction = async () => {
        try {
          console.log(`🔄 Preloading product data for ${lang} (priority: ${priority})...`);
          const productTranslations = await this.loadProductTranslations(lang);

          // Merge with existing UI translations
          const uiCacheKey = `ui-${lang}`;
          const uiTranslations = this.translationsCache.get(uiCacheKey) || {};
          const mergedTranslations = this.mergeTranslations(uiTranslations, productTranslations);

          // Update cache
          this.translationsCache.set(lang, mergedTranslations);

          console.log(`✅ Product data preloaded for ${lang}`);
          resolve(mergedTranslations);
        } catch (error) {
          console.error(`❌ Failed to preload product data for ${lang}:`, error);
          reject(error);
        }
      };

      // Use different strategies based on priority
      if (priority === 'high') {
        // High priority: load immediately
        loadFunction();
      } else if (priority === 'medium') {
        // Medium priority: use setTimeout with short delay
        setTimeout(loadFunction, 100);
      } else {
        // Low priority: use requestIdleCallback
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(() => loadFunction(), {
            timeout: 2000 // Fallback to immediate after 2s
          });
        } else {
          // Fallback: use setTimeout
          setTimeout(loadFunction, 200);
        }
      }
    });

    this.pendingLoads.set(cacheKey, loadPromise);

    // Cleanup pending loads
    loadPromise.finally(() => {
      this.pendingLoads.delete(cacheKey);
    });

    return loadPromise;
  }

  /**
   * Observe when product section is visible and trigger preload
   */
  setupProductSectionPreload() {
    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          console.log('👀 Product section visible, triggering preload...');
          const lang = this.currentLanguage;
          this.preloadProductData(lang, 'medium');
          observer.disconnect(); // Only preload once
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '200px', // Start preloading 200px before visible
      threshold: 0.1
    });

    // Observe product section
    const productSection = document.getElementById('product-section') ||
                           document.querySelector('[data-product-section]');
    if (productSection) {
      observer.observe(productSection);
    }

    return observer;
  }

  /**
   * Preload language file (on-demand loading)
   * Loads a language file without switching to it
   * Useful for preloading frequently accessed languages
   */
  async preloadLanguage(lang, priority = 'low') {
    // Check if UI translations already loaded
    const uiCacheKey = `ui-${lang}`;
    if (this.translationsCache.has(uiCacheKey)) {
      console.log(`✅ UI translations for ${lang} already loaded`);
      return this.translationsCache.get(uiCacheKey);
    }

    // Check if already loading
    if (this.pendingLoads.has(uiCacheKey)) {
      console.log(`⏳ UI translations for ${lang} already loading`);
      return this.pendingLoads.get(uiCacheKey);
    }

    const loadPromise = new Promise((resolve, reject) => {
      const loadFunction = async () => {
        try {
          console.log(`🔄 Preloading UI translations for ${lang} (priority: ${priority})...`);
          const uiTranslations = await this.loadUITranslations(lang);
          console.log(`✅ UI translations for ${lang} preloaded`);
          resolve(uiTranslations);
        } catch (error) {
          console.error(`❌ Failed to preload UI translations for ${lang}:`, error);
          reject(error);
        }
      };

      // Use different strategies based on priority
      if (priority === 'high') {
        // High priority: load immediately
        loadFunction();
      } else if (priority === 'medium') {
        // Medium priority: use setTimeout with short delay
        setTimeout(loadFunction, 100);
      } else {
        // Low priority: use requestIdleCallback
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(() => loadFunction(), {
            timeout: 2000 // Fallback to immediate after 2s
          });
        } else {
          // Fallback: use setTimeout
          setTimeout(loadFunction, 200);
        }
      }
    });

    this.pendingLoads.set(uiCacheKey, loadPromise);

    // Cleanup pending loads
    loadPromise.finally(() => {
      this.pendingLoads.delete(uiCacheKey);
    });

    return loadPromise;
  }

  /**
   * Preload multiple languages at once
   * Useful for preloading frequently accessed language pairs
   */
  async preloadLanguages(languages, priority = 'low') {
    console.log(`🔄 Preloading ${languages.length} languages (priority: ${priority})...`);

    const loadPromises = languages.map(lang => {
      return this.preloadLanguage(lang, priority).catch(error => {
        console.warn(`⚠️ Failed to preload ${lang}:`, error.message);
        return null;
      });
    });

    const results = await Promise.allSettled(loadPromises);

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    console.log(`✅ Preloaded ${successCount}/${languages.length} languages`);

    return results;
  }

  /**
   * Get all available languages that can be loaded
   */
  getAvailableLanguages() {
    return Object.keys(languageNames);
  }

  /**
   * Get loaded languages (cached in memory)
   */
  getLoadedLanguages() {
    return Array.from(this.translationsCache.keys());
  }

  /**
   * Clear language cache (free memory)
   * Optionally keeps specified languages
   */
  clearCache(exceptLanguages = []) {
    const languagesToKeep = new Set([
      this.currentLanguage,
      'zh-CN', // Always keep Chinese as fallback
      'en',    // Always keep English as fallback
      ...exceptLanguages
    ]);

    const clearedCount = this.translationsCache.size;
    const cacheKeys = Array.from(this.translationsCache.keys());

    cacheKeys.forEach(lang => {
      if (!languagesToKeep.has(lang)) {
        this.translationsCache.delete(lang);
      }
    });

    const remainingCount = this.translationsCache.size;
    console.log(`🧹 Cache cleared: ${clearedCount - remainingCount} languages removed, ${remainingCount} kept`);
  }

  normalizeTranslationKeys(value) {
    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeTranslationKeys(item));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const normalized = {};
    Object.entries(value).forEach(([key, nestedValue]) => {
      const normalizedKey = typeof key === 'string' ? key.replace(/^\uFEFF/, '') : key;
      normalized[normalizedKey] = this.normalizeTranslationKeys(nestedValue);
    });
    return normalized;
  }

  resolveTranslationValue(dictionary, key) {
    if (!dictionary || !key) return key;

    const keys = this.getKeyPath(key);
    let value = dictionary;
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  }

  getKeyPath(key) {
    if (!this.keyPathCache.has(key)) {
      this.keyPathCache.set(key, key.split('.'));
    }
    return this.keyPathCache.get(key);
  }

  getCachedElements() {
    if (this.cacheInvalidated) {
      this.cachedElements.i18nElements = Array.from(document.querySelectorAll('[data-i18n]'));
      this.cachedElements.placeholderElements = Array.from(document.querySelectorAll('[data-i18n-placeholder]'));
      this.cachedElements.ariaElements = Array.from(document.querySelectorAll('[data-i18n-aria]'));
      this.cachedElements.languageLabel = document.getElementById('current-lang-label');
      this.cachedElements.dropdown = document.getElementById('language-dropdown');
      this.cachedElements.container = document.querySelector('.lang-dropdown-container');
      this.cachedElements.langOptions = Array.from(document.querySelectorAll('.lang-option'));
      this.cacheInvalidated = false;
    }
    return this.cachedElements;
  }

  invalidateDomCache() {
    this.cacheInvalidated = true;
  }

  setupDomObserver() {
    if (this.domObserver) return;

    this.domObserver = new MutationObserver(() => {
      this.invalidateDomCache();
    });

    this.domObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  setElementTranslation(el, translation) {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.placeholder !== translation) {
        el.placeholder = translation;
      }
      return;
    }
    if (el.textContent !== translation) {
      el.textContent = translation;
    }
  }

  translate(key) {
    // Try UI translations first
    const uiCacheKey = `ui-${this.currentLanguage}`;
    let translations = this.translationsCache.get(uiCacheKey);

    // If UI translation not found, try product translations
    if (!translations) {
      const productCacheKey = `product-${this.currentLanguage}`;
      translations = this.translationsCache.get(productCacheKey);
    }

    // If product translation not found, try merged translations
    if (!translations) {
      translations = this.translationsCache.get(this.currentLanguage);
    }

    return this.resolveTranslationValue(translations, key);
  }

  uiText(key, fallback) {
    const translated = this.translate(key);
    if (translated && translated !== key) return translated;
    const fallbackText = this.getFallbackTranslation(key);
    if (fallbackText && fallbackText !== key) return fallbackText;
    return fallback;
  }

  async applyTranslations() {
    try {
      // Ensure UI translations are loaded
      const uiCacheKey = `ui-${this.currentLanguage}`;
      if (!this.translationsCache.has(uiCacheKey)) {
        await this.loadUITranslations(this.currentLanguage);
      }

      const uiTranslations = this.translationsCache.get(uiCacheKey);
      if (!uiTranslations) {
        console.warn(`No UI translations available for ${this.currentLanguage}`);
        return;
      }

      const { i18nElements, placeholderElements, ariaElements, languageLabel } = this.getCachedElements();

      // Apply data-i18n attributes
      i18nElements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = this.resolveTranslationValue(uiTranslations, key);

        // Only update if translation is different from current content
        if (translation && translation !== key) {
          this.setElementTranslation(el, translation);
        } else if (!translation || translation === key) {
          // Fallback to default language if translation fails
          const fallbackTranslation = this.getFallbackTranslation(key);
          if (fallbackTranslation && fallbackTranslation !== key) {
            this.setElementTranslation(el, fallbackTranslation);
          }
        }
      });

      // Apply data-i18n-placeholder
      placeholderElements.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const translation = this.resolveTranslationValue(uiTranslations, key);
        if (translation && translation !== key) {
          if (el.placeholder !== translation) {
            el.placeholder = translation;
          }
        } else {
          const fallbackTranslation = this.getFallbackTranslation(key);
          if (fallbackTranslation && fallbackTranslation !== key) {
            if (el.placeholder !== fallbackTranslation) {
              el.placeholder = fallbackTranslation;
            }
          }
        }
      });

      // Apply translated aria-label values
      ariaElements.forEach(el => {
        const key = el.getAttribute('data-i18n-aria');
        const translation = this.resolveTranslationValue(uiTranslations, key);
        if (translation && translation !== key) {
          el.setAttribute('aria-label', translation);
        } else {
          const fallbackTranslation = this.getFallbackTranslation(key);
          if (fallbackTranslation && fallbackTranslation !== key) {
            el.setAttribute('aria-label', fallbackTranslation);
          }
        }
      });

      // Update current language label
      if (languageLabel) {
        const nextLabel = languageNames[this.currentLanguage] || this.currentLanguage.toUpperCase();
        if (languageLabel.textContent !== nextLabel) {
          languageLabel.textContent = nextLabel;
        }
      }

      // Ensure company name always reflects the active language.
      this.refreshCompanyName(uiTranslations);
      this.refreshDocumentTitle(uiTranslations);

      this.emit('translationsApplied', { language: this.currentLanguage });
    } catch (error) {
      console.error('Error applying translations:', error);
      // Try to apply fallback translations
      this.applyFallbackTranslations();
    }
  }

  refreshCompanyName(translations) {
    let companyName = translations?.company_name || this.getFallbackTranslation('company_name');
    if ((!companyName || companyName === 'company_name') && this.currentLanguage === 'zh-CN') {
      companyName = '佛山市跃迁力科技有限公司';
    }
    if (!companyName || companyName === 'company_name') return;

    document.querySelectorAll('[data-i18n="company_name"]').forEach((el) => {
      if (el.textContent !== companyName) {
        el.textContent = companyName;
      }
    });
  }

  refreshDocumentTitle(translations) {
    const titleEl = document.getElementById('page-title');
    if (!titleEl) return;

    const pageTitle = translations?.page_title || this.getFallbackTranslation('page_title');
    if (!pageTitle || pageTitle === 'page_title') return;

    if (document.title !== pageTitle) {
      document.title = pageTitle;
    }
  }

  getFallbackTranslation(key) {
    // Prefer English fallback first for neutral UI labels.
    if (this.currentLanguage !== 'en') {
      const enCacheKey = 'ui-en';
      if (this.translationsCache.has(enCacheKey)) {
        const enTranslations = this.translationsCache.get(enCacheKey);
        const enValue = this.resolveTranslationValue(enTranslations, key);
        if (enValue && enValue !== key) {
          return enValue;
        }
      }
    }

    // Then fallback to Chinese Simplified.
    if (this.currentLanguage !== 'zh-CN') {
      const zhCacheKey = 'ui-zh-CN';
      if (this.translationsCache.has(zhCacheKey)) {
        const zhTranslations = this.translationsCache.get(zhCacheKey);
        return this.resolveTranslationValue(zhTranslations, key);
      }
    }
    return key;
  }

  applyFallbackTranslations() {
    // Apply Chinese Simplified UI translations as fallback
    const zhCacheKey = 'ui-zh-CN';
    if (this.translationsCache.has(zhCacheKey)) {
      const zhTranslations = this.translationsCache.get(zhCacheKey);
      const { i18nElements } = this.getCachedElements();

      i18nElements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = this.resolveTranslationValue(zhTranslations, key);
        this.setElementTranslation(el, translation);
      });
    }
  }

  // Event system for better decoupling
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  emit(event, data) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  async setLanguage(lang) {
    try {
      // Validate language
      if (!languageNames[lang]) {
        throw new Error(`Unsupported language: ${lang}`);
      }

      // Prevent unnecessary switches
      if (this.currentLanguage === lang) {
        console.log(`Already using language: ${lang}`);
        this.closeLanguageDropdown();
        return;
      }

      console.log(`Switching language from ${this.currentLanguage} to ${lang}`);

      try {
        // Preload target language with high priority
        console.log(`🔄 Preloading target language ${lang} before switch...`);
        await this.preloadLanguage(lang, 'high');

        // Update current language
        const previousLanguage = this.currentLanguage;
        this.currentLanguage = lang;

        // Save to localStorage
        localStorage.setItem('userLanguage', lang);

        // Apply translations directly without transition animation
        await this.applyTranslations();

        // Update document language
        document.documentElement.lang = lang;

        // Dispatch custom event for other modules
        window.dispatchEvent(new CustomEvent('languageChanged', {
          detail: {
            language: lang,
            previousLanguage: previousLanguage
          }
        }));

        // Close language dropdown
        this.closeLanguageDropdown();

        // Reset dropdown search state so next open shows full language list.
        this.resetLanguageSearch();

        // Show success notification
        if (window.showNotification) {
          const prefix = this.uiText('notify_language_changed', 'Language changed to');
          const message = `${prefix} ${languageNames[lang] || lang}`;
          window.showNotification(message, 'success');
        }

        this.emit('languageChanged', { language: lang, previousLanguage });

        console.log(`Successfully switched to language: ${lang}`);

      } finally {
        // No loading indicator to hide
      }

    } catch (error) {
      console.error('Failed to set language:', error);

      // Try fallback to Chinese Simplified
      if (lang !== 'zh-CN') {
        console.log('Attempting fallback to zh-CN');
        try {
          await this.setLanguage('zh-CN');
          if (window.showNotification) {
            window.showNotification(this.uiText('notify_language_fallback_zh_cn', 'Switched to Chinese (Simplified) due to error'), 'warning');
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          if (window.showNotification) {
            window.showNotification(this.uiText('notify_language_switch_failed', 'Language switch failed'), 'error');
          }
        }
      } else {
        if (window.showNotification) {
          window.showNotification(this.uiText('notify_language_load_failed', 'Failed to load language'), 'error');
        }
      }
    }
  }

  // Dropdown management
  toggleLanguageDropdown(event) {
    event?.stopPropagation();
    const { dropdown } = this.getCachedElements();
    if (!dropdown) return;

    const isVisible = dropdown.classList.contains('show');
    if (isVisible) {
      this.closeLanguageDropdown();
    } else {
      this.openLanguageDropdown();
    }
  }

  openLanguageDropdown() {
    const { dropdown } = this.getCachedElements();
    if (dropdown) {
      dropdown.classList.add('show');
    }
  }

  closeLanguageDropdown() {
    const { dropdown } = this.getCachedElements();
    if (dropdown) {
      dropdown.classList.remove('show');
    }
  }

  filterLanguages(query) {
    const { langOptions } = this.getCachedElements();
    const q = query.toLowerCase();
    langOptions.forEach(opt => {
      const code = opt.getAttribute('data-code').toLowerCase();
      const name = opt.textContent.toLowerCase();
      opt.style.display = (code.includes(q) || name.includes(q)) ? '' : 'none';
    });
  }

  resetLanguageSearch() {
    const { dropdown } = this.getCachedElements();
    if (!dropdown) return;

    const input = dropdown.querySelector('input[data-i18n-placeholder="lang_search_placeholder"]');
    if (input) {
      input.value = '';
    }
    this.filterLanguages('');
  }

  setupEventListeners() {
    const { container, dropdown } = this.getCachedElements();

    // Click outside to close dropdown
    document.addEventListener('click', (event) => {
      if (container && !container.contains(event.target)) {
        this.closeLanguageDropdown();
      }
    });

    // Prevent dropdown internal clicks from closing
    if (dropdown) {
      dropdown.addEventListener('click', (event) => {
        event.stopPropagation();
      });

      // On touch devices, close immediately when a language option is tapped.
      dropdown.addEventListener('click', (event) => {
        const option = event.target.closest('.lang-option');
        if (option) {
          this.closeLanguageDropdown();
        }
      });
    }
  }

  // Debug function to help diagnose issues
  debug() {
    console.log('Translation Manager Debug Info:');
    console.log('- Current Language:', this.currentLanguage);
    console.log('- Loading Strategy:', 'On-demand (single language files)');
    console.log('- Cache Size:', this.translationsCache.size);
    console.log('- Loaded Languages:', Array.from(this.translationsCache.keys()));
    console.log('- Available Languages:', Object.keys(languageNames));
    console.log('- Pending Loads:', Array.from(this.pendingLoads.keys()));

    // Check if current language translations are loaded
    const currentTranslations = this.translationsCache.get(this.currentLanguage);
    console.log('- Current Language Loaded:', !!currentTranslations);

    if (currentTranslations) {
      const keyCount = Object.keys(currentTranslations).length;
      const sizeKB = Math.round(Buffer.byteLength(JSON.stringify(currentTranslations)) / 1024);
      console.log(`- Current Language Size: ${keyCount} keys, ${sizeKB} KB`);

      console.log('- Sample Translations:');
      console.log('  nav_contact:', currentTranslations.nav_contact);
      console.log('  nav_produkte:', currentTranslations.nav_produkte);
      console.log('  nav_vorteile:', currentTranslations.nav_vorteile);
    }
  }

  // Force reload translations for current language
  async reloadTranslations() {
    console.log(`Reloading translations for ${this.currentLanguage}`);
    this.translationsCache.delete(this.currentLanguage);
    await this.loadTranslations(this.currentLanguage);
    await this.applyTranslations();
  }

  async initialize() {
    try {
      console.log('Initializing translation system with on-demand loading strategy...');

      // Detect browser language if not already set (only once)
      if (!localStorage.getItem('browserLang')) {
        const browserLang = this.detectBrowserLanguage();
        localStorage.setItem('browserLang', browserLang);
        console.log('Detected and saved browser language:', browserLang);
      }

      // Get initial language (respect user's choice first)
      const initialLang = this.getInitialLanguage();
      console.log('Initializing with language:', initialLang);

      // Set current language without triggering save
      this.currentLanguage = initialLang;

      // Load only UI translations for initial page load (faster)
      console.log('Loading UI translations (lightweight, ~16KB)...');
      await this.loadUITranslations(initialLang);

      // Apply translations to DOM
      await this.applyTranslations();

      // Set up event listeners
      this.setupEventListeners();
      this.setupDomObserver();

      // Setup product section preload observer
      this.setupProductSectionPreload();

      // Update document language
      document.documentElement.lang = this.currentLanguage;

      // Mark as initialized
      this.isInitialized = true;

      console.log('Translation system initialized successfully');
      console.log(`Loaded UI language: ${initialLang}`);
      console.log('Product translations will be loaded on-demand');

      // Emit initialization event
      this.emit('initialized', { language: this.currentLanguage });

    } catch (error) {
      console.error('Failed to initialize translation system:', error);

      // Fallback: try to initialize with Chinese Simplified (but don't save it as user choice)
      try {
        this.currentLanguage = 'zh-CN';
        await this.loadTranslations('zh-CN');
        await this.applyTranslations();
        document.documentElement.lang = 'zh-CN';
        console.log('Fallback initialization successful');
      } catch (fallbackError) {
        console.error('Fallback initialization also failed:', fallbackError);
      }
    }
  }

  detectBrowserLanguage() {
    // Get browser language
    const browserLang = navigator.language || navigator.userLanguage || 'en';

    // Map to supported languages
    const langMap = {
      'zh': 'zh-CN',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
      'zh-HK': 'zh-TW',
      'en': 'en',
      'en-US': 'en',
      'en-GB': 'en',
      'de': 'de',
      'de-DE': 'de',
      'fr': 'fr',
      'fr-FR': 'fr',
      'it': 'it',
      'it-IT': 'it',
      'pt': 'pt',
      'pt-BR': 'pt',
      'ja': 'ja',
      'ja-JP': 'ja',
      'ko': 'ko',
      'ko-KR': 'ko',
      'nl': 'nl',
      'nl-NL': 'nl',
      'pl': 'pl',
      'pl-PL': 'pl',
      'ru': 'ru',
      'ru-RU': 'ru',
      'tr': 'tr',
      'tr-TR': 'tr',
      'th': 'th',
      'th-TH': 'th',
      'vi': 'vi',
      'vi-VN': 'vi',
      'ar': 'ar',
      'he': 'he',
      'id': 'id',
      'ms': 'ms',
      'fil': 'fil'
    };

    return langMap[browserLang] || langMap[browserLang.split('-')[0]] || 'zh-CN';
  }
}

const translationManager = new TranslationManager();

// Legacy API for backward compatibility
function loadTranslations(lang) {
  return translationManager.loadTranslations(lang);
}

function t(key) {
  return translationManager.translate(key);
}

function applyTranslations() {
  return translationManager.applyTranslations();
}

function setLanguage(lang) {
  return translationManager.setLanguage(lang);
}

function toggleLanguageDropdown(event) {
  return translationManager.toggleLanguageDropdown(event);
}

function filterLanguages(query) {
  return translationManager.filterLanguages(query);
}

function setupLanguageSystem() {
  return translationManager.initialize();
}

// Export TranslationManager class for testing
export { TranslationManager };

// Expose modern API
window.translationManager = translationManager;

// Expose debug functions
window.debugTranslations = () => translationManager.debug();
window.reloadTranslations = () => translationManager.reloadTranslations();

// Expose legacy API
window.t = t;
window.setLanguage = setLanguage;
window.toggleLanguageDropdown = toggleLanguageDropdown;
window.filterLanguages = filterLanguages;
window.setupLanguageSystem = setupLanguageSystem;