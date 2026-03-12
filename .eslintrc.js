module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'no-unused-vars': ['warn', {
      'argsIgnorePattern': '^next$',
      'varsIgnorePattern': '^(currentLanguage|translationsCache|loadTranslations|applyTranslations|setupProductSectionTracking|setupLanguageSystem|t|setLanguage|toggleLanguageDropdown|filterLanguages)$'
    }],
    'no-console': 'off',
    'no-undef': ['off'], // Temporarily disable no-undef for Jest files
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '*.min.js',
    'src/assets/product-data-table.js',
    'jest.config.js',
    'jest.setup.js',
    'tests/',
    'tsconfig.json',
    'src/types/',
    'src/assets/error-handler.js',
    'src/assets/performance-monitor.js',
    'src/assets/sentry-init.js',
    'src/assets/store.js',
  ],
};