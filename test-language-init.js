// Test language initialization behavior
console.log('🧪 Testing Language Initialization Logic...\n');

// Mock localStorage for testing
const mockLocalStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
};

// Mock navigator for testing
const mockNavigator = {
  language: 'en-US'
};

// Test scenarios
const testScenarios = [
  {
    name: 'First visit - no stored preferences',
    setup: () => {
      mockLocalStorage.clear();
    },
    expected: 'zh-CN' // Default fallback
  },
  {
    name: 'User has chosen English',
    setup: () => {
      mockLocalStorage.clear();
      mockLocalStorage.setItem('userLanguage', 'en');
    },
    expected: 'en'
  },
  {
    name: 'Browser language detected (German)',
    setup: () => {
      mockLocalStorage.clear();
      mockLocalStorage.setItem('browserLang', 'de');
      mockNavigator.language = 'de-DE';
    },
    expected: 'de'
  },
  {
    name: 'User choice overrides browser language',
    setup: () => {
      mockLocalStorage.clear();
      mockLocalStorage.setItem('userLanguage', 'fr');
      mockLocalStorage.setItem('browserLang', 'de');
    },
    expected: 'fr'
  }
];

// Mock TranslationManager for testing
class MockTranslationManager {
  constructor() {
    this.currentLanguage = null;
  }

  getInitialLanguage() {
    // Always prioritize user's explicit choice
    const userChoice = mockLocalStorage.getItem('userLanguage');
    if (userChoice && this.isValidLanguage(userChoice)) {
      console.log('Using user-selected language:', userChoice);
      return userChoice;
    }

    // Then check browser language
    const browserChoice = mockLocalStorage.getItem('browserLang');
    if (browserChoice && this.isValidLanguage(browserChoice)) {
      console.log('Using browser-detected language:', browserChoice);
      return browserChoice;
    }

    // Default fallback
    console.log('Using default language: zh-CN');
    return 'zh-CN';
  }

  isValidLanguage(lang) {
    const supportedLanguages = [
      'zh-CN', 'de', 'en', 'es', 'fr', 'it', 'pt', 'ja', 'nl', 'pl', 'ru', 'tr', 'ko', 'th', 'vi', 'ar', 'he', 'zh-TW', 'fil', 'id', 'ms'
    ];
    return supportedLanguages.includes(lang);
  }

  detectBrowserLanguage() {
    const browserLang = mockNavigator.language || 'en';
    const langMap = {
      'zh': 'zh-CN',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
      'en': 'en',
      'en-US': 'en',
      'de': 'de',
      'de-DE': 'de',
      'fr': 'fr',
      'ja': 'ja',
      'ko': 'ko'
    };
    return langMap[browserLang] || langMap[browserLang.split('-')[0]] || 'zh-CN';
  }
}

// Run tests
let passedTests = 0;
let totalTests = testScenarios.length;

testScenarios.forEach((scenario, index) => {
  console.log(`\n📋 Test ${index + 1}: ${scenario.name}`);
  scenario.setup();

  const manager = new MockTranslationManager();
  const result = manager.getInitialLanguage();

  if (result === scenario.expected) {
    console.log(`✅ PASS: Expected "${scenario.expected}", got "${result}"`);
    passedTests++;
  } else {
    console.log(`❌ FAIL: Expected "${scenario.expected}", but got "${result}"`);
  }
});

console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All language initialization tests passed!');
} else {
  console.log('⚠️  Some tests failed. Please check the implementation.');
}