// main.js - Core functionality with modular architecture
class App {
  constructor() {
    this.modules = new Map();
    this.initialized = false;
  }

  registerModule(name, module) {
    this.modules.set(name, module);
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize all modules
      for (const [, module] of this.modules) {
        if (typeof module.init === 'function') {
          await module.init();
        }
      }

      // Mark main content as loaded to prevent FOUC
      const main = document.querySelector('main');
      if (main) {
        main.classList.add('loaded');
      }

      this.initialized = true;
      console.log('App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }
}

// Create global app instance
const app = new App();

// Back to Top Module
class BackToTopModule {
  init() {
    this.setupBackToTopButton();
  }

  setupBackToTopButton() {
    const backToTopBtn = document.getElementById('back-to-top');
    if (!backToTopBtn) return;

    // 初始隐藏按钮
    backToTopBtn.classList.add('hide');

    const checkScrollPosition = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollableHeight = documentHeight - windowHeight;
      
      // 手机端（< 768px）显示阈值为40%，桌面端为60%
      const isMobile = window.innerWidth < 768;
      const threshold = isMobile ? 0.4 : 0.6;
      const scrollThreshold = scrollableHeight * threshold;

      if (window.pageYOffset > scrollThreshold) {
        backToTopBtn.classList.remove('hide');
      } else {
        backToTopBtn.classList.add('hide');
      }
    };

    window.addEventListener('scroll', checkScrollPosition, { passive: true });
    window.addEventListener('resize', checkScrollPosition, { passive: true });
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    checkScrollPosition();
  }
}

// Mobile Menu Module
class MobileMenuModule {
  init() {
    this.setupMobileMenu();
  }

  setupMobileMenu() {
    // Mobile menu is handled by utils.js toggleMobileMenu() function
    // This module is disabled to avoid conflicts
    return;

    // Original code disabled:
    /*
    const mobileMenuToggle = document.querySelector('[onclick="toggleMobileMenu()"]');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');

    if (!mobileMenuToggle || !mobileMenu) return;

    const toggleMenu = () => {
      mobileMenu.classList.toggle('open');
      mobileMenuOverlay?.classList.toggle('hidden');
      document.body.classList.toggle('overflow-hidden');
    };

    mobileMenuToggle.addEventListener('click', toggleMenu);
    mobileMenuOverlay?.addEventListener('click', toggleMenu);

    // Close menu when clicking on links
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', toggleMenu);
    });
    */
  }
}

// Form Validation Module
class FormValidationModule {
  init() {
    this.setupFormValidation();
  }

  setupFormValidation() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', (e) => this.validateForm(e));
    });
  }

  validateForm(e) {
    const form = e.target;
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    let firstInvalidField = null;

    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        field.classList.add('error');
        if (!firstInvalidField) firstInvalidField = field;
        isValid = false;
      } else {
        field.classList.remove('error');
      }
    });

    if (!isValid) {
      e.preventDefault();
      firstInvalidField?.focus();
      this.showFormError('Please fill in all required fields');
    }
  }

  showFormError(message) {
    // Create or update error message element
    let errorEl = document.getElementById('form-error-message');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.id = 'form-error-message';
      errorEl.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(errorEl);
    }

    errorEl.textContent = message;
    errorEl.style.display = 'block';

    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }
}

// Lazy Loading Module
class LazyLoadingModule {
  init() {
    this.setupLazyLoading();
    this.setupProductSectionTracking();
  }

  setupLazyLoading() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    if (lazyImages.length === 0) return;

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          this.loadImage(img);
          imageObserver.unobserve(img);
        }
      });
    }, { rootMargin: '50px' });

    lazyImages.forEach(img => imageObserver.observe(img));
  }

  loadImage(img) {
    const src = img.dataset.src;
    if (!src) return;

    img.src = src;
    img.classList.remove('lazy-loading');
    img.classList.add('loaded');

    // Handle load/error events
    img.addEventListener('load', () => {
      img.classList.add('fade-in');
    });

    img.addEventListener('error', () => {
      console.warn(`Failed to load image: ${src}`);
      img.src = '/assets/placeholder.png'; // Fallback image
    });
  }

  setupProductSectionTracking() {
    const productSection = document.getElementById('produkten');
    if (!productSection) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadProductImages();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '50px' });

    observer.observe(productSection);
  }

  loadProductImages() {
    const images = document.querySelectorAll('.product-image[data-src]');
    images.forEach(img => this.loadImage(img));
  }
}

// Error Handling Module
class ErrorHandlingModule {
  init() {
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    // Global error handler
    window.addEventListener('error', (e) => {
      console.error('JavaScript error:', e.error);
      this.reportError(e.error, e.filename, e.lineno, e.colno);
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (e) => {
      console.error('Unhandled promise rejection:', e.reason);
      this.reportError(e.reason);
    });

    // Network error handler
    window.addEventListener('offline', () => {
      this.showNetworkStatus('You are currently offline', 'warning');
    });

    window.addEventListener('online', () => {
      this.showNetworkStatus('You are back online', 'success');
    });
  }

  reportError(error, filename, lineno, colno) {
    // In a real app, send to error reporting service
    const errorData = {
      message: error.message || error,
      stack: error.stack,
      filename,
      lineno,
      colno,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    console.log('Error reported:', errorData);

    // Could send to analytics service
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false
      });
    }
  }

  showNetworkStatus(message, type) {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
      type === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
    } text-white`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Register modules
app.registerModule('backToTop', new BackToTopModule());
app.registerModule('mobileMenu', new MobileMenuModule());
app.registerModule('formValidation', new FormValidationModule());
app.registerModule('lazyLoading', new LazyLoadingModule());
app.registerModule('errorHandling', new ErrorHandlingModule());

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
  app.initialize();
}

// Expose app instance for debugging
window.app = app;
// Export App class for testing
export { App };
