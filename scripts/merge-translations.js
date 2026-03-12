const fs = require('fs');
const path = require('path');

const translationsDir = path.resolve(__dirname, '../src/assets/lang');
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

/**
 * Clean up hex-prefixed keys from translations
 * @param {string} filePath - Path to translation file
 * @returns {Object} - Statistics about removed keys
 */
function cleanupHexIds(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const obj = JSON.parse(raw);
    const keys = Object.keys(obj);
    let removed = 0;

    for (const k of keys) {
      // Match keys with pattern: 8-hex characters followed by underscore (case-insensitive)
      if (/^[0-9a-fA-F]{8}_/.test(k)) {
        delete obj[k];
        removed += 1;
      }
    }

    if (removed > 0) {
      // Sort keys for consistency
      const sorted = Object.fromEntries(Object.entries(obj).sort(([a],[b]) => a.localeCompare(b)));
      fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
    }

    return { removed, total: keys.length };
  } catch (err) {
    console.error(`Failed processing ${path.basename(filePath)}:`, err.message);
    return { removed: 0, total: 0 };
  }
}

function mergeTranslations(options = {}) {
  const { cleanupHex = false } = options;
  const merged = {};
  let totalKeys = 0;
  let totalHexRemoved = 0;
  let languageStats = {};

  console.log('🔄 Merging translations...\n');

  languageOrder.forEach(lang => {
    const filePath = path.join(translationsDir, `${lang}.json`);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Warning: ${lang}.json not found, skipping...`);
      return;
    }

    try {
      // Clean up hex IDs if requested
      if (cleanupHex) {
        const stats = cleanupHexIds(filePath);
        if (stats.removed > 0) {
          console.log(`   🔍 Cleaned ${stats.removed} hex-prefixed keys from ${lang}.json`);
          totalHexRemoved += stats.removed;
        }
      }

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
  if (cleanupHex && totalHexRemoved > 0) {
    console.log(`   Total hex IDs removed: ${totalHexRemoved}`);
  }
  console.log(`\n✨ Successfully merged to: ${outputPath}`);

  return {
    success: true,
    languages: Object.keys(merged).length,
    totalKeys,
    hexRemoved: totalHexRemoved,
    outputPath
  };
}

// Run merge
if (require.main === module) {
  const args = process.argv.slice(2);
  const cleanupHex = args.includes('--cleanup-hex') || args.includes('-c');

  console.log('='.repeat(60));
  console.log('Translation Merge Utility');
  console.log('='.repeat(60));
  if (cleanupHex) {
    console.log('Mode: Clean up hex-prefixed keys + Merge');
  } else {
    console.log('Mode: Merge only');
  }
  console.log('='.repeat(60) + '\n');

  mergeTranslations({ cleanupHex });
}

module.exports = { mergeTranslations, cleanupHexIds };
