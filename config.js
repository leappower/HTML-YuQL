// config.js - Application configuration
const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    host: process.env.HOST || 'localhost'
  },

  // Cache configuration
  cache: {
    htmlMaxAge: 300, // 5 minutes
    translationMaxAge: 3600, // 1 hour
    assetMaxAge: 2592000, // 30 days
    jsMaxAge: 31536000, // 1 year
    staleWhileRevalidate: 86400 // 1 day
  },

  // Security configuration
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // requests per window
    },
    cors: {
      origin: process.env.ALLOWED_ORIGINS || false,
      credentials: true
    }
  },

  // Translation configuration
  i18n: {
    defaultLanguage: 'zh-CN',
    supportedLanguages: [
      'zh-CN', 'zh-TW', 'en', 'de', 'es', 'fr', 'it', 'pt',
      'ja', 'ko', 'nl', 'pl', 'ru', 'tr', 'th', 'vi',
      'ar', 'he', 'fil', 'id', 'ms'
    ],
    fallbackLanguage: 'zh-CN'
  },

  // Performance configuration
  performance: {
    compression: {
      level: 6,
      threshold: 1024
    },
    lazyLoading: {
      rootMargin: '50px',
      threshold: 0.1
    }
  },

  // Feature flags
  features: {
    enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
    enableErrorReporting: process.env.ENABLE_ERROR_REPORTING === 'true',
    enableServiceWorker: false, // Future enhancement
    enablePWA: false // Future enhancement
  },

  // External services
  services: {
    analytics: {
      gtag: process.env.GTAG_ID || null
    },
    errorReporting: {
      sentry: process.env.SENTRY_DSN || null
    }
  }
};

// Environment-specific overrides
if (config.server.env === 'production') {
  config.cache.htmlMaxAge = 1800; // 30 minutes in production
  config.security.rateLimit.max = 200; // Higher limit for production
}

if (config.server.env === 'development') {
  config.features.enableErrorReporting = true;
  config.performance.compression.level = 0; // Disable compression for easier debugging
}

module.exports = config;