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
    this.isInitialized = false;
    this.eventListeners = new Map();
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

  async loadTranslations(lang) {
    if (this.translationsCache.has(lang)) {
      return this.translationsCache.get(lang);
    }

    try {
      const response = await fetch(`./translations/${lang}.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      this.translationsCache.set(lang, data);
      return data;
    } catch (error) {
      console.error(`Failed to load translations for ${lang}:`, error);
      // Fallback to Chinese (Simplified)
      if (lang !== 'zh-CN') {
        return this.loadTranslations('zh-CN');
      }
      throw error;
    }
  }

  translate(key) {
    const lang = this.translationsCache.get(this.currentLanguage);
    if (!lang) return key;

    const keys = key.split('.');
    let value = lang;
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  }

  async applyTranslations() {
    try {
      // Ensure translations are loaded
      if (!this.translationsCache.has(this.currentLanguage)) {
        await this.loadTranslations(this.currentLanguage);
      }

      const translations = this.translationsCache.get(this.currentLanguage);
      if (!translations) {
        console.warn(`No translations available for ${this.currentLanguage}`);
        return;
      }

      // Apply data-i18n attributes
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = this.translate(key);

        // Only update if translation is different from current content
        if (translation && translation !== key) {
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = translation;
          } else {
            el.textContent = translation;
          }
        } else if (!translation || translation === key) {
          // Fallback to default language if translation fails
          const fallbackTranslation = this.getFallbackTranslation(key);
          if (fallbackTranslation && fallbackTranslation !== key) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
              el.placeholder = fallbackTranslation;
            } else {
              el.textContent = fallbackTranslation;
            }
          }
        }
      });

      // Apply data-i18n-placeholder
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const translation = this.translate(key);
        if (translation && translation !== key) {
          el.placeholder = translation;
        } else {
          const fallbackTranslation = this.getFallbackTranslation(key);
          if (fallbackTranslation && fallbackTranslation !== key) {
            el.placeholder = fallbackTranslation;
          }
        }
      });

      // Update current language label
      const label = document.getElementById('current-lang-label');
      if (label) {
        label.textContent = languageNames[this.currentLanguage] || this.currentLanguage.toUpperCase();
      }

      this.emit('translationsApplied', { language: this.currentLanguage });
    } catch (error) {
      console.error('Error applying translations:', error);
      // Try to apply fallback translations
      this.applyFallbackTranslations();
    }
  }

  getFallbackTranslation(key) {
    // Try Chinese Simplified as fallback
    if (this.currentLanguage !== 'zh-CN' && this.translationsCache.has('zh-CN')) {
      const zhTranslations = this.translationsCache.get('zh-CN');
      const keys = key.split('.');
      let value = zhTranslations;
      for (const k of keys) {
        value = value?.[k];
      }
      return value || key;
    }
    return key;
  }

  applyFallbackTranslations() {
    // Apply Chinese Simplified translations as fallback
    if (this.translationsCache.has('zh-CN')) {
      const zhTranslations = this.translationsCache.get('zh-CN');

      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const keys = key.split('.');
        let value = zhTranslations;
        for (const k of keys) {
          value = value?.[k];
        }
        const translation = value || key;

        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = translation;
        } else {
          el.textContent = translation;
        }
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

      // Load new translations
      await this.loadTranslations(lang);

      // Update current language
      const previousLanguage = this.currentLanguage;
      this.currentLanguage = lang;

      // Save to localStorage
      localStorage.setItem('userLanguage', lang);

      // Apply translations with error handling
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

      // Show success notification
      if (window.showNotification) {
        const message = `Language changed to ${languageNames[lang] || lang}`;
        window.showNotification(message, 'success');
      }

      this.emit('languageChanged', { language: lang, previousLanguage });

      console.log(`Successfully switched to language: ${lang}`);

    } catch (error) {
      console.error('Failed to set language:', error);

      // Try fallback to Chinese Simplified
      if (lang !== 'zh-CN') {
        console.log('Attempting fallback to zh-CN');
        try {
          await this.setLanguage('zh-CN');
          if (window.showNotification) {
            window.showNotification('Switched to Chinese (Simplified) due to error', 'warning');
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          if (window.showNotification) {
            window.showNotification('Language switch failed', 'error');
          }
        }
      } else {
        if (window.showNotification) {
          window.showNotification('Failed to load language', 'error');
        }
      }
    }
  }

  // Dropdown management
  toggleLanguageDropdown(event) {
    event?.stopPropagation();
    const dropdown = document.getElementById('language-dropdown');
    if (!dropdown) return;

    const isVisible = dropdown.classList.contains('show');
    if (isVisible) {
      this.closeLanguageDropdown();
    } else {
      this.openLanguageDropdown();
    }
  }

  openLanguageDropdown() {
    const dropdown = document.getElementById('language-dropdown');
    if (dropdown) {
      dropdown.classList.add('show');
    }
  }

  closeLanguageDropdown() {
    const dropdown = document.getElementById('language-dropdown');
    if (dropdown) {
      dropdown.classList.remove('show');
    }
  }

  filterLanguages(query) {
    const langOptions = document.querySelectorAll('.lang-option');
    const q = query.toLowerCase();
    langOptions.forEach(opt => {
      const code = opt.getAttribute('data-code').toLowerCase();
      const name = opt.textContent.toLowerCase();
      opt.style.display = (code.includes(q) || name.includes(q)) ? '' : 'none';
    });
  }

  setupEventListeners() {
    // Click outside to close dropdown
    document.addEventListener('click', (event) => {
      const container = document.querySelector('.lang-dropdown-container');
      if (container && !container.contains(event.target)) {
        this.closeLanguageDropdown();
      }
    });

    // Prevent dropdown internal clicks from closing
    const dropdown = document.getElementById('language-dropdown');
    if (dropdown) {
      dropdown.addEventListener('click', (event) => {
        event.stopPropagation();
      });
    }
  }

  // Debug function to help diagnose issues
  debug() {
    console.log('Translation Manager Debug Info:');
    console.log('- Current Language:', this.currentLanguage);
    console.log('- Cache Size:', this.translationsCache.size);
    console.log('- Cached Languages:', Array.from(this.translationsCache.keys()));
    console.log('- Available Languages:', Object.keys(languageNames));

    // Check if current language translations are loaded
    const currentTranslations = this.translationsCache.get(this.currentLanguage);
    console.log('- Current Language Loaded:', !!currentTranslations);

    if (currentTranslations) {
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
      console.log('Initializing translation system...');

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

      // Load and apply translations
      await this.loadTranslations(initialLang);
      await this.applyTranslations();

      // Set up event listeners
      this.setupEventListeners();

      // Update document language
      document.documentElement.lang = this.currentLanguage;

      // Mark as initialized
      this.isInitialized = true;

      console.log('Translation system initialized successfully with language:', this.currentLanguage);

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
let currentLanguage = translationManager.currentLanguage;
let translationsCache = translationManager.translationsCache;

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