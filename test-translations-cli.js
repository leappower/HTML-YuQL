// test-translations-cli.js - Command line translation test
const fs = require('fs');
const path = require('path');

class TranslationTester {
  constructor() {
    this.translationsDir = path.join(__dirname, 'src', 'assets', 'translations');
    this.results = {
      totalFiles: 0,
      validFiles: 0,
      invalidFiles: 0,
      missingKeys: {},
      errors: []
    };
  }

  async runTests() {
    console.log('🚀 Starting Translation System Tests...\n');

    await this.testTranslationFiles();
    await this.testKeyConsistency();
    await this.testLanguageSupport();

    this.printResults();
  }

  async testTranslationFiles() {
    console.log('📁 Testing translation files...');

    const files = fs.readdirSync(this.translationsDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      this.results.totalFiles++;
      const filePath = path.join(this.translationsDir, file);
      const langCode = file.replace('.json', '');

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);

        // Basic validation
        if (typeof data === 'object' && data !== null) {
          this.results.validFiles++;
          console.log(`  ✅ ${langCode}: Valid JSON`);
        } else {
          this.results.invalidFiles++;
          this.results.errors.push(`${langCode}: Invalid JSON structure`);
          console.log(`  ❌ ${langCode}: Invalid JSON structure`);
        }
      } catch (error) {
        this.results.invalidFiles++;
        this.results.errors.push(`${langCode}: ${error.message}`);
        console.log(`  ❌ ${langCode}: ${error.message}`);
      }
    }
  }

  async testKeyConsistency() {
    console.log('\n🔍 Testing key consistency...');

    const files = fs.readdirSync(this.translationsDir).filter(f => f.endsWith('.json'));
    const allKeys = new Map();

    // Collect all keys from all files
    for (const file of files) {
      const filePath = path.join(this.translationsDir, file);
      const langCode = file.replace('.json', '');

      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const keys = this.flattenKeys(data);

        for (const key of keys) {
          if (!allKeys.has(key)) {
            allKeys.set(key, []);
          }
          allKeys.get(key).push(langCode);
        }
      } catch (error) {
        // Skip invalid files
      }
    }

    // Check for missing keys
    const criticalKeys = ['nav_contact', 'nav_produkte', 'nav_vorteile', 'nav_vertrauen'];

    for (const key of criticalKeys) {
      const languages = allKeys.get(key) || [];
      const missingLangs = files.map(f => f.replace('.json', '')).filter(lang => !languages.includes(lang));

      if (missingLangs.length > 0) {
        this.results.missingKeys[key] = missingLangs;
        console.log(`  ⚠️  ${key}: Missing in ${missingLangs.join(', ')}`);
      } else {
        console.log(`  ✅ ${key}: Present in all languages`);
      }
    }
  }

  async testLanguageSupport() {
    console.log('\n🌐 Testing language support...');

    // Test language names mapping
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

    const files = fs.readdirSync(this.translationsDir).filter(f => f.endsWith('.json'));
    const fileLangs = files.map(f => f.replace('.json', ''));

    const supportedLangs = Object.keys(languageNames);
    const missingFiles = supportedLangs.filter(lang => !fileLangs.includes(lang));
    const extraFiles = fileLangs.filter(lang => !supportedLangs.includes(lang));

    if (missingFiles.length > 0) {
      console.log(`  ⚠️  Missing translation files: ${missingFiles.join(', ')}`);
    }

    if (extraFiles.length > 0) {
      console.log(`  ⚠️  Extra translation files: ${extraFiles.join(', ')}`);
    }

    if (missingFiles.length === 0 && extraFiles.length === 0) {
      console.log(`  ✅ All ${supportedLangs.length} languages have translation files`);
    }
  }

  flattenKeys(obj, prefix = '') {
    const keys = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...this.flattenKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }

    return keys;
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log(`   Files tested: ${this.results.totalFiles}`);
    console.log(`   Valid files: ${this.results.validFiles}`);
    console.log(`   Invalid files: ${this.results.invalidFiles}`);

    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.forEach(error => console.log(`   ${error}`));
    }

    if (Object.keys(this.results.missingKeys).length > 0) {
      console.log('\n⚠️  Missing Keys:');
      for (const [key, langs] of Object.entries(this.results.missingKeys)) {
        console.log(`   ${key}: Missing in ${langs.join(', ')}`);
      }
    }

    const hasIssues = this.results.invalidFiles > 0 || this.results.errors.length > 0 || Object.keys(this.results.missingKeys).length > 0;

    if (!hasIssues) {
      console.log('\n🎉 All tests passed! Translation system is healthy.');
    } else {
      console.log('\n⚠️  Some issues found. Please review the errors above.');
    }
  }
}

// Run tests
const tester = new TranslationTester();
tester.runTests().catch(console.error);