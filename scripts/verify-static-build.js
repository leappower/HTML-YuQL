// verify-static-build.js - Verify static deployment build
// Checks that all required files are present for static deployment

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.resolve(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    const size = (stats.size / 1024).toFixed(2);
    log(`✓ ${description}: ${filePath} (${size} KB)`, 'green');
    return true;
  } else {
    log(`✗ ${description}: ${filePath} - NOT FOUND`, 'red');
    return false;
  }
}

function checkDirectory(dirPath, description) {
  const fullPath = path.resolve(__dirname, '..', dirPath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    const files = fs.readdirSync(fullPath);
    log(`✓ ${description}: ${dirPath} (${files.length} items)`, 'green');
    return true;
  } else {
    log(`✗ ${description}: ${dirPath} - NOT FOUND`, 'red');
    return false;
  }
}

function checkLanguageFiles() {
  const langDir = path.resolve(__dirname, '..', 'dist', 'assets', 'lang');
  
  if (!fs.existsSync(langDir)) {
    log('\n✗ Language directory not found: dist/assets/lang/', 'red');
    return false;
  }

  const files = fs.readdirSync(langDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  log('\n📊 Language Files Summary:', 'blue');
  log(`   Total files: ${jsonFiles.length}`, 'blue');
  
  // Expected languages
  const expectedLanguages = [
    'zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt',
    'ru', 'ar', 'he', 'th', 'vi', 'id', 'ms', 'fil', 'nl', 'pl', 'tr'
  ];
  
  let allPresent = true;
  expectedLanguages.forEach(lang => {
    const fileName = `${lang}.json`;
    const filePath = path.join(langDir, fileName);
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024).toFixed(2);
      const icon = size > 200 ? '⚠' : '✓';
      const color = size > 200 ? 'yellow' : 'green';
      log(`   ${icon} ${fileName}: ${size} KB`, color);
    } else {
      log(`   ✗ ${fileName}: NOT FOUND`, 'red');
      allPresent = false;
    }
  });
  
  return allPresent;
}

function checkServiceWorker() {
  const swPath = path.resolve(__dirname, '..', 'dist', 'sw.js');
  
  if (!fs.existsSync(swPath)) {
    log('\n✗ Service Worker not found: dist/sw.js', 'red');
    return false;
  }
  
  log('\n✓ Service Worker found: dist/sw.js', 'green');
  
  // Check Service Worker content
  const content = fs.readFileSync(swPath, 'utf-8');
  const checks = {
    'CACHE_NAME': content.includes('CACHE_NAME'),
    'LANGUAGE_FILES': content.includes('LANGUAGE_FILES'),
    'install event': content.includes('addEventListener(\'install\''),
    'fetch event': content.includes('addEventListener(\'fetch\''),
    'Cache-First strategy': content.includes('cache.match')
  };
  
  log('\n📋 Service Worker Content Check:', 'blue');
  let allValid = true;
  Object.entries(checks).forEach(([key, valid]) => {
    if (valid) {
      log(`   ✓ ${key}`, 'green');
    } else {
      log(`   ✗ ${key}`, 'red');
      allValid = false;
    }
  });
  
  return allValid;
}

function checkHTML() {
  const htmlPath = path.resolve(__dirname, '..', 'dist', 'index.html');
  
  if (!fs.existsSync(htmlPath)) {
    log('\n✗ HTML file not found: dist/index.html', 'red');
    return false;
  }
  
  log('\n✓ HTML file found: dist/index.html', 'green');
  
  const content = fs.readFileSync(htmlPath, 'utf-8');
  const checks = {
    'bundle.js referenced': content.includes('bundle.js'),
    'CSS file referenced': content.includes('styles.'),
    'lang attribute': content.includes('lang='),
    'UTF-8 charset': content.includes('charset="utf-8"')
  };
  
  log('\n📋 HTML Content Check:', 'blue');
  let allValid = true;
  Object.entries(checks).forEach(([key, valid]) => {
    if (valid) {
      log(`   ✓ ${key}`, 'green');
    } else {
      log(`   ✗ ${key}`, 'red');
      allValid = false;
    }
  });
  
  return allValid;
}

function checkBundleSize() {
  const bundlePath = path.resolve(__dirname, '..', 'dist', 'bundle.js');
  
  if (!fs.existsSync(bundlePath)) {
    return false;
  }
  
  const stats = fs.statSync(bundlePath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  
  log('\n📦 Bundle Size:', 'blue');
  log(`   bundle.js: ${sizeKB} KB (${sizeMB} MB)`, 'blue');
  
  if (stats.size > 1024 * 1024) {
    log('   ⚠ Bundle size exceeds 1 MB', 'yellow');
  } else {
    log('   ✓ Bundle size is reasonable', 'green');
  }
  
  return true;
}

function main() {
  log('\n' + '='.repeat(60), 'blue');
  log('🔍 Static Deployment Build Verification', 'blue');
  log('='.repeat(60) + '\n', 'blue');
  
  const results = {
    coreFiles: [
      checkFile('dist/index.html', 'HTML file'),
      checkFile('dist/bundle.js', 'JavaScript bundle'),
      checkDirectory('dist/assets', 'Assets directory')
    ],
    languageFiles: checkLanguageFiles(),
    serviceWorker: checkServiceWorker(),
    html: checkHTML(),
    bundleSize: checkBundleSize()
  };
  
  log('\n' + '='.repeat(60), 'blue');
  log('📋 Verification Summary', 'blue');
  log('='.repeat(60) + '\n', 'blue');
  
  const allPassed = results.coreFiles.every(r => r) && 
                    results.languageFiles && 
                    results.serviceWorker && 
                    results.html;
  
  if (allPassed) {
    log('✅ All checks passed! Static deployment is ready.', 'green');
    log('\n🚀 Next Steps:', 'blue');
    log('   1. Deploy the dist/ directory to your static hosting platform', 'blue');
    log('   2. Test the application in a browser', 'blue');
    log('   3. Verify Service Worker is registered (Check DevTools > Application)', 'blue');
    log('   4. Test language switching functionality', 'blue');
    log('   5. Test offline capability (disconnect network and reload)', 'blue');
    process.exit(0);
  } else {
    log('❌ Some checks failed. Please review the issues above.', 'red');
    log('\n💡 Suggestions:', 'yellow');
    log('   1. Run: npm run build:static', 'yellow');
    log('   2. Check webpack.config.js for CopyWebpackPlugin configuration', 'yellow');
    log('   3. Verify language files exist in src/assets/lang/', 'yellow');
    process.exit(1);
  }
}

main();
