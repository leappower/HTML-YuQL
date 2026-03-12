const fs = require('fs');
const path = require('path');

const translationsDir = path.resolve(__dirname, '../src/assets/translations');
const outputPath = path.resolve(__dirname, '../src/assets/i18n.json');

const languageOrder = [
  'zh',      // 中文
  'zh-CN',   // 简体中文
  'zh-TW',   // 繁体中文
  'en',      // English
  'ar',      // Arabic
  'de',      // German
  'es',      // Spanish
  'fil',     // Filipino
  'fr',      // French
  'he',      // Hebrew
  'id',      // Indonesian
  'it',      // Italian
  'ja',      // Japanese
  'ko',      // Korean
  'ms',      // Malay
  'nl',      // Dutch
  'pl',      // Polish
  'pt',      // Portuguese
  'ru',      // Russian
  'th',      // Thai
  'tr',      // Turkish
  'vi'       // Vietnamese
];

function mergeTranslations() {
  const merged = {};
  let totalKeys = 0;
  let languageStats = {};

  console.log('🔄 Merging translations...\n');

  languageOrder.forEach(lang => {
    const filePath = path.join(translationsDir, `${lang}.json`);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Warning: ${lang}.json not found, skipping...`);
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const translations = JSON.parse(content);
      const keyCount = Object.keys(translations).length;

      merged[lang] = translations;
      totalKeys += keyCount;
      languageStats[lang] = keyCount;

      console.log(`✅ ${lang.padEnd(6)} - ${keyCount} keys`);
    } catch (error) {
      console.error(`❌ Error reading ${lang}.json:`, error.message);
    }
  });

  // Write merged file
  fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2), 'utf-8');

  console.log('\n📊 Statistics:');
  console.log(`   Total languages: ${Object.keys(merged).length}`);
  console.log(`   Total keys: ${totalKeys}`);
  console.log(`   Average keys per language: ${Math.round(totalKeys / Object.keys(merged).length)}`);
  console.log(`\n✨ Successfully merged to: ${outputPath}`);

  return {
    success: true,
    languages: Object.keys(merged).length,
    totalKeys,
    outputPath
  };
}

// Run merge
if (require.main === module) {
  mergeTranslations();
}

module.exports = { mergeTranslations };
