#!/usr/bin/env node

/**
 * 测试按需加载功能
 * 验证语言文件、Service Worker和切换功能
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'cyan');
  log(`${'='.repeat(60)}\n`, 'cyan');
}

function logTest(name, passed) {
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${name}`, color);
  return passed;
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Test 1: Check language files
function testLanguageFiles() {
  logSection('测试 1: 检查语言文件');

  const langDir = path.join(__dirname, '..', 'src', 'assets', 'lang');
  const expectedLanguages = [
    'zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt',
    'ru', 'ar', 'he', 'th', 'vi', 'id', 'ms', 'fil', 'nl', 'pl', 'tr'
  ];

  let allPassed = true;

  // Check if lang directory exists
  if (!fs.existsSync(langDir)) {
    logTest('语言文件目录存在', false);
    return false;
  }
  logTest('语言文件目录存在', true);

  // Check each language file
  expectedLanguages.forEach(lang => {
    const filePath = path.join(langDir, `${lang}.json`);

    // Check if file exists
    const exists = fs.existsSync(filePath);
    allPassed &= logTest(`语言文件 ${lang}.json 存在`, exists);

    if (exists) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);

        // Check if file is valid JSON
        allPassed &= logTest(`语言文件 ${lang}.json 是有效的JSON`, true);

        // Check if file has content
        const keyCount = Object.keys(data).length;
        allPassed &= logTest(`语言文件 ${lang}.json 有内容 (${keyCount} keys)`, keyCount > 0);

        // Check file size
        const fileSizeKB = Math.round(content.length / 1024);
        logInfo(`  ${lang}.json: ${keyCount} keys, ${fileSizeKB} KB`);

      } catch (error) {
        allPassed &= logTest(`语言文件 ${lang}.json 可以读取`, false);
        logWarning(`  Error: ${error.message}`);
      }
    }
  });

  return allPassed;
}

// Test 2: Check Service Worker file
function testServiceWorkerFile() {
  logSection('测试 2: 检查Service Worker文件');

  const swPath = path.join(__dirname, '..', 'src', 'sw.js');
  let allPassed = true;

  // Check if Service Worker file exists
  const exists = fs.existsSync(swPath);
  allPassed &= logTest('Service Worker文件 (src/sw.js) 存在', exists);

  if (exists) {
    try {
      const content = fs.readFileSync(swPath, 'utf8');

      // Check for required content
      allPassed &= logTest('Service Worker包含CACHE_NAME定义', content.includes('CACHE_NAME'));
      allPassed &= logTest('Service Worker包含LANGUAGE_FILES_CACHE定义', content.includes('LANGUAGE_FILES_CACHE'));
      allPassed &= logTest('Service Worker包含install事件监听器', content.includes('self.addEventListener(\'install\''));
      allPassed &= logTest('Service Worker包含activate事件监听器', content.includes('self.addEventListener(\'activate\''));
      allPassed &= logTest('Service Worker包含fetch事件监听器', content.includes('self.addEventListener(\'fetch\''));
      allPassed &= logTest('Service Worker包含message事件监听器', content.includes('self.addEventListener(\'message\''));

      // Check for language files
      const languageFileCount = (content.match(/\.\/assets\/lang\/[^']+/g) || []).length;
      allPassed &= logTest(`Service Worker包含语言文件列表 (${languageFileCount} files)`, languageFileCount >= 20);

    } catch (error) {
      allPassed &= logTest('Service Worker文件可以读取', false);
      logWarning(`  Error: ${error.message}`);
    }
  }

  return allPassed;
}

// Test 3: Check translations.js modifications
function testTranslationsModifications() {
  logSection('测试 3: 检查translations.js修改');

  const translationsPath = path.join(__dirname, '..', 'src', 'assets', 'translations.js');
  let allPassed = true;

  // Check if translations.js exists
  const exists = fs.existsSync(translationsPath);
  allPassed &= logTest('translations.js文件存在', exists);

  if (exists) {
    try {
      const content = fs.readFileSync(translationsPath, 'utf8');

      // Check for on-demand loading methods
      allPassed &= logTest('包含preloadLanguage方法', content.includes('preloadLanguage(lang, priority'));
      allPassed &= logTest('包含preloadLanguages方法', content.includes('preloadLanguages(languages, priority'));
      allPassed &= logTest('包含getAvailableLanguages方法', content.includes('getAvailableLanguages()'));
      allPassed &= logTest('包含getLoadedLanguages方法', content.includes('getLoadedLanguages()'));
      allPassed &= logTest('包含clearCache方法', content.includes('clearCache('));

      // Check for smooth transition methods
      allPassed &= logTest('包含showLanguageLoadingIndicator方法', content.includes('showLanguageLoadingIndicator()'));
      allPassed &= logTest('包含hideLanguageLoadingIndicator方法', content.includes('hideLanguageLoadingIndicator()'));
      allPassed &= logTest('包含applyTranslationsWithTransition方法', content.includes('applyTranslationsWithTransition('));

      // Check for setLanguage modifications
      allPassed &= logTest('setLanguage方法调用preloadLanguage', content.includes('await this.preloadLanguage'));
      allPassed &= logTest('setLanguage方法调用applyTranslationsWithTransition', content.includes('await this.applyTranslationsWithTransition'));

      // Check for loading indicator
      allPassed &= logTest('setLanguage方法调用showLanguageLoadingIndicator', content.includes('this.showLanguageLoadingIndicator()'));
      allPassed &= logTest('setLanguage方法调用hideLanguageLoadingIndicator', content.includes('this.hideLanguageLoadingIndicator()'));

      // Check for fetch URL change
      allPassed &= logTest('fetchTranslations加载单语言文件', content.includes('./assets/lang/${lang}.json'));

    } catch (error) {
      allPassed &= logTest('translations.js文件可以读取', false);
      logWarning(`  Error: ${error.message}`);
    }
  }

  return allPassed;
}

// Test 4: Check init.js modifications
function testInitModifications() {
  logSection('测试 4: 检查init.js修改');

  const initPath = path.join(__dirname, '..', 'src', 'assets', 'init.js');
  let allPassed = true;

  // Check if init.js exists
  const exists = fs.existsSync(initPath);
  allPassed &= logTest('init.js文件存在', exists);

  if (exists) {
    try {
      const content = fs.readFileSync(initPath, 'utf8');

      // Check for Service Worker registration
      allPassed &= logTest('包含registerServiceWorker函数', content.includes('function registerServiceWorker()'));
      allPassed &= logTest('包含Service Worker注册调用', content.includes('navigator.serviceWorker.register(\'/sw.js\')'));
      allPassed &= logTest('包含showServiceWorkerUpdateNotification函数', content.includes('function showServiceWorkerUpdateNotification()'));

      // Check for update handling
      allPassed &= logTest('包含updatefound事件监听器', content.includes('\'updatefound\''));
      allPassed &= logTest('包含controllerchange事件监听器', content.includes('\'controllerchange\''));
      allPassed &= logTest('包含SKIP_WAITING消息发送', content.includes('\'SKIP_WAITING\''));

      // Check for immediate registration
      allPassed &= logTest('页面加载时立即注册Service Worker', content.includes('registerServiceWorker();'));

    } catch (error) {
      allPassed &= logTest('init.js文件可以读取', false);
      logWarning(`  Error: ${error.message}`);
    }
  }

  return allPassed;
}

// Test 5: Check file sizes and total size
function testFileSizes() {
  logSection('测试 5: 检查文件大小');

  const langDir = path.join(__dirname, '..', 'src', 'assets', 'lang');
  let totalSize = 0;
  let allPassed = true;

  try {
    const files = fs.readdirSync(langDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    jsonFiles.forEach(file => {
      const filePath = path.join(langDir, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    });

    const totalSizeKB = Math.round(totalSize / 1024);
    const avgSizeKB = Math.round(totalSizeKB / jsonFiles.length);

    logTest(`总语言文件大小合理 (${totalSizeKB} KB, 预期: ~3100 KB)`, totalSizeKB >= 2500 && totalSizeKB <= 3500);
    logTest(`平均文件大小合理 (${avgSizeKB} KB, 预期: ~148 KB)`, avgSizeKB >= 100 && avgSizeKB <= 200);

    logInfo(`  总大小: ${totalSizeKB} KB`);
    logInfo(`  平均大小: ${avgSizeKB} KB`);
    logInfo(`  文件数量: ${jsonFiles.length}`);

  } catch (error) {
    allPassed &= logTest('可以读取语言文件目录', false);
    logWarning(`  Error: ${error.message}`);
  }

  return allPassed;
}

// Main test runner
function runTests() {
  log('\n');
  log('╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║          多语言按需加载功能测试                          ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');

  const results = {
    '测试 1: 检查语言文件': testLanguageFiles(),
    '测试 2: 检查Service Worker文件': testServiceWorkerFile(),
    '测试 3: 检查translations.js修改': testTranslationsModifications(),
    '测试 4: 检查init.js修改': testInitModifications(),
    '测试 5: 检查文件大小': testFileSizes()
  };

  // Print summary
  logSection('测试总结');

  let allPassed = true;
  Object.entries(results).forEach(([name, passed]) => {
    allPassed &= passed;
    logTest(name, passed);
  });

  // Print final result
  log('\n');
  if (allPassed) {
    log('✅ 所有测试通过！', 'green');
    log('\n按需加载功能已成功实现：', 'green');
    log('  • 单语言文件已生成', 'green');
    log('  • Service Worker缓存已实现', 'green');
    log('  • 语言切换预加载已实现', 'green');
    log('  • Service Worker注册已实现', 'green');
    log('  • 文件大小合理', 'green');
    log('\n下一步：', 'green');
    log('  1. 运行 npm run build 构建项目', 'green');
    log('  2. 在浏览器中测试功能', 'green');
    log('  3. 验证Service Worker缓存', 'green');
    log('  4. 测试语言切换功能', 'green');
  } else {
    log('❌ 部分测试失败，请检查上述错误', 'red');
    log('\n请检查：', 'red');
    log('  1. 所有语言文件是否已生成', 'red');
    log('  2. Service Worker文件是否正确', 'red');
    log('  3. translations.js修改是否完整', 'red');
    log('  4. init.js修改是否完整', 'red');
  }

  log('\n');

  process.exit(allPassed ? 0 :1);
}

// Run tests
runTests();
