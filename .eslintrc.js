module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
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
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '*.min.js',
    'src/assets/product-data-table.js',
  ],
};