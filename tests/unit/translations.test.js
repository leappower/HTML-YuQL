/**
 * Unit tests for Translation Manager
 */
import { TranslationManager } from '../../src/assets/translations.js';

describe('TranslationManager', () => {
  let tm;

  beforeEach(() => {
    tm = new TranslationManager();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (tm.currentLanguage) {
      tm.cleanup();
    }
  });

  describe('initialization', () => {
    it('should initialize with default language', async () => {
      await tm.initialize();
      expect(tm.currentLanguage).toBe('zh-CN');
    });

    it('should load translations on initialization', async () => {
      const loadSpy = jest.spyOn(tm, 'loadTranslations').mockResolvedValue({});

      await tm.initialize();
      expect(loadSpy).toHaveBeenCalled();

      loadSpy.mockRestore();
    });

    it('should handle initialization errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      jest.spyOn(tm, 'loadTranslations').mockRejectedValue(new Error('Failed to load'));

      await tm.initialize();

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('language switching', () => {
    it('should switch language successfully', async () => {
      await tm.initialize();

      const setLanguageSpy = jest.spyOn(tm, 'setLanguage');

      await tm.setLanguage('en');

      expect(setLanguageSpy).toHaveBeenCalledWith('en');
      expect(tm.currentLanguage).toBe('en');
    });

    it('should fallback to default language if target language fails', async () => {
      await tm.initialize();

      const loadTranslationsMock = jest.spyOn(tm, 'loadTranslations')
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({});

      await tm.setLanguage('invalid-lang');

      expect(tm.currentLanguage).toBe('zh-CN');

      loadTranslationsMock.mockRestore();
    });

    it('should not reload if already using the language', async () => {
      await tm.initialize();

      const loadSpy = jest.spyOn(tm, 'loadTranslations');

      await tm.setLanguage('zh-CN');

      expect(loadSpy).not.toHaveBeenCalled();

      loadSpy.mockRestore();
    });
  });

  describe('translation application', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div data-i18n="nav_contact">Contact</div>
        <div data-i18n="nav_products">Products</div>
        <input data-i18n-placeholder="placeholder_search" placeholder="Search">
      `;
    });

    it('should apply translations to DOM elements', async () => {
      tm.translationsCache.set('en', {
        nav_contact: 'Contact Us',
        nav_products: 'Our Products',
        placeholder_search: 'Search...',
      });

      await tm.setLanguage('en');
      await tm.applyTranslations();

      expect(document.querySelector('[data-i18n="nav_contact"]').textContent).toBe('Contact Us');
      expect(document.querySelector('[data-i18n="nav_products"]').textContent).toBe('Our Products');
      expect(document.querySelector('[data-i18n-placeholder="placeholder_search"]').placeholder).toBe('Search...');
    });

    it('should handle missing translations', async () => {
      tm.translationsCache.set('en', {});

      await tm.setLanguage('en');
      await tm.applyTranslations();

      expect(document.querySelector('[data-i18n="nav_contact"]').textContent).toBe('Contact');
    });
  });

  describe('caching', () => {
    it('should cache loaded translations', async () => {
      const translations = { key: 'value' };

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(translations),
      });

      await tm.loadTranslations('en');

      expect(tm.translationsCache.has('en')).toBe(true);
      expect(tm.translationsCache.get('en')).toEqual(translations);
    });

    it('should use cached translations if available', async () => {
      const cachedTranslations = { key: 'cached value' };
      tm.translationsCache.set('en', cachedTranslations);

      const translations = await tm.loadTranslations('en');

      expect(translations).toEqual(cachedTranslations);
    });
  });

  describe('event system', () => {
    it('should emit language change events', async () => {
      await tm.initialize();

      const eventSpy = jest.fn();
      tm.on('languageChanged', eventSpy);

      await tm.setLanguage('en');

      expect(eventSpy).toHaveBeenCalledWith('en');
    });

    it('should allow multiple event listeners', async () => {
      await tm.initialize();

      const spy1 = jest.fn();
      const spy2 = jest.fn();

      tm.on('languageChanged', spy1);
      tm.on('languageChanged', spy2);

      await tm.setLanguage('en');

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should disconnect MutationObserver', () => {
      jest.spyOn(tm, 'disconnectDOMObserver');

      tm.cleanup();

      expect(tm.disconnectDOMObserver).toHaveBeenCalled();
    });

    it('should clear event listeners', () => {
      tm.on('languageChanged', () => {});

      tm.cleanup();

      expect(tm.eventListeners.size).toBe(0);
    });
  });
});
