// test-translations.js - Translation system test script
// Run this in browser console to test translation functionality

async function testTranslations() {
  console.log('=== Translation System Test ===');

  // Test 1: Check if translation manager is available
  if (!window.translationManager) {
    console.error('❌ Translation manager not found');
    return;
  }
  console.log('✅ Translation manager available');

  // Test 2: Check current language
  console.log('Current language:', window.translationManager.currentLanguage);

  // Test 3: Check cache status
  console.log('Cache size:', window.translationManager.translationsCache.size);
  console.log('Cached languages:', Array.from(window.translationManager.translationsCache.keys()));

  // Test 4: Test translation function
  const testKey = 'nav_contact';
  const translation = window.translationManager.translate(testKey);
  console.log(`Translation for '${testKey}':`, translation);

  // Test 5: Test language switching
  console.log('Testing language switch to Korean...');
  try {
    await window.translationManager.setLanguage('ko');
    console.log('✅ Switched to Korean successfully');

    const koTranslation = window.translationManager.translate(testKey);
    console.log(`Korean translation for '${testKey}':`, koTranslation);

    // Test 6: Switch back to Chinese
    console.log('Testing switch back to Chinese...');
    await window.translationManager.setLanguage('zh-CN');
    console.log('✅ Switched back to Chinese successfully');

    const zhTranslation = window.translationManager.translate(testKey);
    console.log(`Chinese translation for '${testKey}':`, zhTranslation);

  } catch (error) {
    console.error('❌ Language switch failed:', error);
  }

  // Test 7: Check DOM elements
  const navContactElements = document.querySelectorAll('[data-i18n="nav_contact"]');
  console.log('Found nav_contact elements:', navContactElements.length);
  navContactElements.forEach((el, index) => {
    console.log(`Element ${index + 1} text:`, el.textContent);
  });

  console.log('=== Test Complete ===');
}

// Auto-run test when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testTranslations);
} else {
  testTranslations();
}

// Expose test function globally
window.testTranslations = testTranslations;