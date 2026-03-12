/**
 * 产品中文数据多语言翻译适配脚本
 * 
 * 功能：
 * 1. 从Feishu读取中文产品数据
 * 2. 调用Gemini 3 API翻译成22种语言
 * 3. 生成i18n key和翻译数据
 * 4. 填充到translations所有语言文件
 * 
 * 使用方法：
 *   npm run translate:products
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { prepareForTranslation, postprocessText } = require('./product-translation-handler');
const { translateWithRetry } = require('./gemini-translator');

const TRANSLATIONS_DIR = path.join(process.cwd(), 'src/assets/lang');
const PRODUCT_TABLE_PATH = path.join(process.cwd(), 'src/assets/product-data-table.js');

/**
 * 支持的语言和对应的Google Translate语言代码
 */
const LANGUAGE_MAP = {
  en: 'en',
  zh: 'zh',
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  de: 'de',
  es: 'es',
  fr: 'fr',
  ja: 'ja',
  ko: 'ko',
  pt: 'pt',
  ru: 'ru',
  it: 'it',
  nl: 'nl',
  pl: 'pl',
  vi: 'vi',
  th: 'th',
  id: 'id',
  ms: 'ms',
  fil: 'fil',
  ar: 'ar',
  he: 'he',
  tr: 'tr'
};

const SUPPORTED_LANGS = Object.keys(LANGUAGE_MAP);

/**
 * i18n字段列表
 */
// 需要翻译的产品字段（排除代码类字段：badgecolor/imagerecognitionkey/model/subcategory）
const I18N_FIELDS = [
  'name',
  'highlights',
  'scenarios',
  'usage',
  'badge',
  'category',
  'color',
  'controlmethod',
  'frequency',
  'material',
  'power',
  'productdimensions',
  'status',
  'throughput',
  'averagetime',
  'netweight',
  'outerboxdimensions',
  'packagedimensions',
  'temperaturerange',
  'voltage'
];

const FIELD_SOURCE_ALIASES = {
  averagetime: ['averageTime'],
  controlmethod: ['controlMethod'],
  imagerecognitionkey: ['imageRecognitionKey'],
  netweight: ['netWeight'],
  outerboxdimensions: ['outerBoxDimensions'],
  packagedimensions: ['packageDimensions'],
  productdimensions: ['productDimensions'],
  subcategory: ['subCategory'],
  temperaturerange: ['temperatureRange']
};

/**
 * 生成i18n key
 */
function generateI18nKey(category, subCategory, model, field) {
  const baseParts = [
    String(category || '').trim().replace(/\s+/g, '_'),
    String(subCategory || '').trim().replace(/\s+/g, '_'),
    String(model || '').trim().replace(/\s+/g, '_')
  ].filter(Boolean);
  const base = baseParts.join('_').toLowerCase();
  const hash = base
    ? crypto.createHash('sha1').update(base, 'utf8').digest('hex').slice(0, 8)
    : 'unknown';
  return `${hash}_${String(field || '').trim()}`.toLowerCase();
}

/**
 * 使用 Gemini 3 API 进行翻译
 * @param {string} text
 * @param {string} targetLang
 * @returns {Promise<string>}
 */
async function translateWithGemini(text, targetLang) {
  try {
    // 输入验证
    if (!text || typeof text !== 'string') {
      return text || '';
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return text;
    }

    // 如果已经是目标语言，直接返回
    if (targetLang === 'zh-CN' || targetLang === 'zh') {
      return text;
    }

    // 调用 Gemini API（带重试机制）
    const result = await translateWithRetry(trimmedText, targetLang);
    return result;
  } catch (error) {
    console.warn(`⚠️  Translation failed for ${targetLang}: "${text}" - ${error.message}`);
    return text; // 降级返回原文本
  }
}

/**
 * 批量翻译（使用 Gemini API）
 */
async function translateTexts(texts, targetLang, apiKey, delayMs = 100) {
  // 防护性检查
  if (!texts || !Array.isArray(texts)) {
    console.warn(`⚠️  Invalid texts parameter for ${targetLang}:`, texts);
    return {};
  }
  
  if (texts.length === 0) {
    console.log(`📝 No texts to translate for ${targetLang}`);
    return {};
  }
  
  const results = {};
  const validTexts = texts.filter(text => text && typeof text === 'string' && text.trim().length > 0);
  
  if (validTexts.length === 0) {
    console.warn(`⚠️  No valid texts found for ${targetLang}`);
    return {};
  }
  
  console.log(`🔤 Processing ${validTexts.length} valid texts for ${targetLang} (using Gemini 3 API)...`);
  
  for (let i = 0; i < validTexts.length; i++) {
    const text = validTexts[i];
    try {
      // 追加输入验证
      if (!text || typeof text !== 'string') {
        console.warn(`⚠️  Invalid text at index ${i} for ${targetLang}:`, text);
        results[text] = text || '';
        continue;
      }
      
      const trimmedText = text.trim();
      if (trimmedText.length === 0) {
        results[text] = text;
        continue;
      }
      
      // 使用 Gemini API 翻译
      results[text] = await translateWithGemini(trimmedText, targetLang);
      
      // 添加进度提示（每50个）
      if ((i + 1) % 50 === 0) {
        console.log(`  Progress: ${i + 1}/${validTexts.length} translated (${targetLang})`);
      }
      
      if (i < validTexts.length - 1) {
        // Gemini API 本身有限速机制，但我们可以添加少量延迟
        await new Promise(r => setTimeout(r, Math.min(delayMs, 200)));
      }
    } catch (err) {
      console.warn(`⚠️  Failed to translate: "${text}" to ${targetLang}: ${err.message}`);
      results[text] = text || ''; // 降级返回原文本或空字符串
    }
  }
  console.log(`✅ Completed ${targetLang} translation: ${Object.keys(results).length} results`);
  return results;
}

/**
 * 从product-data-table提取中文数据
 */
function extractChineseProductData() {
  if (!fs.existsSync(PRODUCT_TABLE_PATH)) {
    console.error(`❌ Product data table not found: ${PRODUCT_TABLE_PATH}`);
    return [];
  }

  try {
    const content = fs.readFileSync(PRODUCT_TABLE_PATH, 'utf-8');
    const match = content.match(/export const PRODUCT_DATA_TABLE\s*=\s*(\[.*\])\s*;/s);
    if (!match) {
      console.error('❌ Cannot parse PRODUCT_DATA_TABLE');
      return [];
    }
    return JSON.parse(match[1]);
  } catch (err) {
    console.error(`❌ Error reading product table: ${err.message}`);
    return [];
  }
}

/**
 * 保存翻译数据到 src/assets/translations/*.json（合并模式）
 * producti18n.json 是中文原始文件，翻译结果只写 translations 目录
 */
function saveTranslationFiles(translationsByLang) {
  let saved = 0;
  for (const [lang, data] of Object.entries(translationsByLang)) {
    const filePath = path.join(TRANSLATIONS_DIR, `${lang}.json`);
    try {
      // 加载现有文件做合并
      let existing = {};
      if (fs.existsSync(filePath)) {
        existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
      const merged = { ...existing, ...data };
      const sortedKeys = Object.keys(merged).sort();
      const sorted = {};
      sortedKeys.forEach(k => { sorted[k] = merged[k]; });
      fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
      saved++;
    } catch (err) {
      console.error(`❌ Error saving ${lang}.json: ${err.message}`);
    }
  }
  console.log(`✅ Saved ${saved} translation files to ${TRANSLATIONS_DIR}`);
  return saved > 0;
}

/**
 * 加载现有翻译文件
 */
function loadTranslations() {
  const translations = {};
  
  if (!fs.existsSync(TRANSLATIONS_DIR)) {
    console.warn(`⚠️  Translations dir not found: ${TRANSLATIONS_DIR}`);
    return translations;
  }

  const files = fs.readdirSync(TRANSLATIONS_DIR).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const lang = file.replace('.json', '');
    const filePath = path.join(TRANSLATIONS_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      translations[lang] = JSON.parse(content);
    } catch (err) {
      console.error(`❌ Error loading translation ${lang}: ${err.message}`);
    }
  }

  return translations;
}


function logTranslationKeyValue(stage, lang, key, value, source) {
  const sourcePart = source ? ` | source=${source}` : '';
  console.log(`[${stage}][${lang}] ${key} = ${value}${sourcePart}`);
}

function normalizeSourceText(v) {
  if (!v && v !== 0) return null;
  if (typeof v !== 'string') v = String(v);
  const s = v.trim();
  if (!s) return null;
  const low = s.toLowerCase();
  if (low === 'null' || low === 'undefined') return null;
  return s;
}

function getProductFieldSource(series, product, field) {
  const fieldI18n = (product.i18n && product.i18n[field]) || {};
  const i18nCandidate =
    fieldI18n['zh-CN'] ||
    fieldI18n.zh ||
    fieldI18n.zh_CN ||
    fieldI18n['zh-cn'] ||
    Object.values(fieldI18n)[0];
  const fromI18n = normalizeSourceText(i18nCandidate);
  if (fromI18n) return fromI18n;

  if (field === 'category') {
    return normalizeSourceText(product.category || (series && series.category));
  }
  if (field === 'subcategory') {
    return normalizeSourceText(product.subCategory || product.subcategory);
  }

  const aliases = [field, ...(FIELD_SOURCE_ALIASES[field] || [])];
  for (const k of aliases) {
    const val = normalizeSourceText(product[k]);
    if (val) return val;
  }

  return null;
}

function isLikelyChineseText(value) {
  if (value == null) return false;
  const text = String(value).trim();
  if (!text) return false;
  return /[\u4e00-\u9fff]/.test(text);
}

function shouldWriteTranslation(lang, existingValue, sourceChinese) {
  // 源语言保持原逻辑
  if (lang === 'zh' || lang === 'zh-CN') {
    return !existingValue;
  }

  // 目标语言：空值直接写入
  if (!existingValue) return true;

  const existing = String(existingValue).trim();
  const source = String(sourceChinese || '').trim();

  // 之前被中文占位污染，允许覆盖
  if (existing && source && existing === source) return true;
  if (isLikelyChineseText(existing)) return true;

  // 已有有效非中文翻译，不覆盖
  return false;
}

function shouldAcceptTranslatedText(lang, sourceChinese, translatedText) {
  // Chinese-script targets should not be rejected by generic "still Chinese" checks.
  if (lang === 'zh' || lang === 'zh-CN' || lang === 'zh-TW') return true;

  const source = String(sourceChinese || '').trim();
  const translated = String(translatedText || '').trim();
  if (!translated) return false;

  // 非中文语言：若翻译结果与中文源文完全相同，视为翻译失败，不写入。
  if (source && translated === source) return false;

  // 非中文语言：若源文本含中文且翻译结果仍是明显中文，视为失败，不写入。
  if (isLikelyChineseText(source) && isLikelyChineseText(translated)) return false;

  return true;
}

/**
 * 主工作流程
 */
async function translateProducts(apiKey) {
  console.log('\n🔄 Starting product translation process (using Gemini 3 API)...\n');

  // 1. 读取中文产品数据
  console.log('📖 Reading Chinese product data...');
  const productSeries = extractChineseProductData();
  if (productSeries.length === 0) {
    console.error('❌ No product series found');
    process.exit(1);
  }

  const totalProducts = productSeries.reduce((sum, series) => sum + ((series.products || []).length), 0);
  if (totalProducts === 0) {
    console.error('❌ PRODUCT_DATA_TABLE contains 0 products. Cannot write product translations to zh.json.');
    console.error('💡 Please check Feishu field mapping (category/subCategory/model/name) and regenerate product-data-table.js.');
    process.exit(1);
  }

  // 收集所有需要翻译的文本（从 product.i18n 子结构中取中文）
  const textsToTranslate = new Set();
  for (const series of productSeries) {
    for (const product of series.products || []) {
      for (const field of I18N_FIELDS) {
        const zhVal = getProductFieldSource(series, product, field);
        if (zhVal) textsToTranslate.add(zhVal);
      }
    }
  }

  const uniqueTexts = Array.from(textsToTranslate);
  console.log(`✓ Found ${productSeries.length} series, ${uniqueTexts.length} unique texts to translate\n`);

  // 2. 加载现有翻译
  console.log('📚 Loading existing translations...');
  const translations = loadTranslations();
  const allLangs = new Set(Object.keys(translations));
  SUPPORTED_LANGS.forEach(lang => allLangs.add(lang));
  console.log(`✓ Loaded ${allLangs.size} language files\n`);

  // 记录统计信息，用于打印详细日志（added: 新增写入; skipped: 已存在未覆盖的键）
  const stats = {};
  for (const lang of SUPPORTED_LANGS) stats[lang] = { added: 0, skipped: 0, samples: [] };

  // 3. 为每个语言翻译
  const translatePromises = [];
  for (const lang of SUPPORTED_LANGS) {
    if (lang === 'zh' || lang === 'zh-CN') {
      // 中文：直接使用原文本
      console.log(`⏭️  Skipping ${lang} (source language)`);
      continue;
    }

    const targetLang = LANGUAGE_MAP[lang];
    console.log(`🌐 Translating to ${lang}...`);

    translatePromises.push(
      (async () => {
        const geminiTranslations = await translateTexts(uniqueTexts, targetLang, apiKey);
        
        // 为每个产品生成 i18nId 并写入翻译数据（结构：translations[lang][i18nId] = { name, highlights, ... }）
        for (const series of productSeries) {
          for (const product of series.products || []) {
            for (const field of I18N_FIELDS) {
              const chineseText = getProductFieldSource(series, product, field);
              if (chineseText) {
                const key = generateI18nKey(series.category, product.subCategory, product.model, field);
                
                // 准备翻译：用占位符保护品牌、数字、表情等特殊内容
                const { protected: protectedText, placeholderMap } = prepareForTranslation(chineseText, field);
                
                // 获取翻译结果
                const rawTranslatedText = geminiTranslations[protectedText] || geminiTranslations[chineseText] || chineseText;
                
                // 恢复占位符：还原品牌、数字、表情等特殊内容
                const { recovered: translatedText, warnings: recoveryWarnings } = postprocessText(rawTranslatedText, placeholderMap);
                
                // 如果恢复过程中有警告，记录它们
                if (recoveryWarnings && recoveryWarnings.length > 0) {
                  console.warn(`  ⚠️  Placeholder recovery warnings for "${key}" in ${lang}:`, recoveryWarnings);
                }

                // 打印生成的翻译 key/value
                logTranslationKeyValue('generated', lang, key, translatedText, chineseText);

                if (!translations[lang]) translations[lang] = {};
                // 合并模式：若现有值是中文占位，允许覆盖为目标语言翻译；否则保留现有有效翻译
                if (!shouldAcceptTranslatedText(lang, chineseText, translatedText)) {
                  logTranslationKeyValue('skip-failed', lang, key, translatedText, chineseText);
                  if (stats[lang]) stats[lang].skipped += 1;
                  continue;
                }

                if (shouldWriteTranslation(lang, translations[lang][key], chineseText)) {
                  translations[lang][key] = translatedText;
                  // 打印实际写入的 key/value
                  logTranslationKeyValue('write', lang, key, translatedText, chineseText);
                  // 安全访问stats对象
                  if (stats[lang]) {
                    stats[lang].added += 1;
                    if (stats[lang].samples && Array.isArray(stats[lang].samples) && stats[lang].samples.length < 10) {
                      stats[lang].samples.push({ key, source: chineseText, target: translatedText });
                    }
                  }
                } else {
                  // 打印跳过写入的 key/value
                  logTranslationKeyValue('skip', lang, key, translations[lang][key], chineseText);
                  // 安全访问stats对象
                  if (stats[lang]) {
                    stats[lang].skipped += 1;
                  }
                }
              }
            }
          }
        }

        console.log(`✅ Translated to ${lang}`);
      })()
    );
  }

  // 4. 并行翻译所有语言
  await Promise.all(translatePromises);

  // 5. 中文处理（直接使用原文本）
  console.log('\n📝 Processing Chinese (source language)...');
  for (const lang of ['zh', 'zh-CN']) {
    if (!translations[lang]) translations[lang] = {};
    for (const series of productSeries) {
      for (const product of series.products || []) {
        for (const field of I18N_FIELDS) {
          const chineseText = getProductFieldSource(series, product, field);
          if (chineseText) {
            const key = generateI18nKey(series.category, product.subCategory, product.model, field);
            // 打印中文源 key/value
            logTranslationKeyValue('generated', lang, key, chineseText, chineseText);
            // 合并模式：仅在目标文件中不存在该键或值为空时写入
            if (!Object.prototype.hasOwnProperty.call(translations[lang], key) || !translations[lang][key]) {
              translations[lang][key] = chineseText;
              logTranslationKeyValue('write', lang, key, chineseText, chineseText);
              // 统计中文写入 - 安全访问stats对象
              if (!stats[lang]) stats[lang] = { added: 0, skipped: 0, samples: [] };
              stats[lang].added += 1;
              if (stats[lang].samples && Array.isArray(stats[lang].samples) && stats[lang].samples.length < 10) {
                stats[lang].samples.push({ key, source: chineseText, target: chineseText });
              }
            } else {
              logTranslationKeyValue('skip', lang, key, translations[lang][key], chineseText);
              if (!stats[lang]) stats[lang] = { added: 0, skipped: 0, samples: [] };
              stats[lang].skipped += 1;
            }
          }
        }
      }
    }
    console.log(`✅ Processed ${lang}`);
  }

  // 6. 保存翻译结果到 src/assets/translations/*.json
  console.log('\n💾 Saving product translations to translations/*.json...\n');
  try {
    saveTranslationFiles(translations);

    // 打印统计信息
    for (const lang of SUPPORTED_LANGS) {
      if (!translations[lang]) continue;
      const langStats = stats[lang] || { added: 0, skipped: 0, samples: [] };
      console.log(`  • ${lang}: newly added ${langStats.added} keys`);
      if (langStats.samples && Array.isArray(langStats.samples) && langStats.samples.length > 0) {
        console.log('    Examples:');
        for (const s of langStats.samples) {
          if (s && s.key && s.target) {
            console.log(`      ${s.key} -> ${s.target}`);
          }
        }
      }
    }
  } catch (err) {
    console.error(`❌ Failed saving translations: ${err.message}`);
  }

  console.log('\n✨ Done! All products translated and saved to translations/*.json.\n');
}

/**
 * Mock 翻译流程（无网络、无文件写入）
 */
function runMockTranslationFlow() {
  const mockProductSeries = [
    {
      category: 'Oven',
      products: [
        {
          subCategory: 'Deck',
          model: 'DK-100',
          i18n: {
            name: { 'zh-CN': '甲板烤箱100' },
            highlights: { 'zh-CN': '大容量; 节能' },
            usage: { 'zh-CN': '面包店' },
            scenarios: { 'zh-CN': '商业厨房' }
          }
        },
        {
          subCategory: 'Convection',
          model: 'CV-50',
          i18n: {
            name: { 'zh-CN': '热风烤箱50' },
            highlights: { 'zh-CN': '升温快' }
          }
        }
      ]
    }
  ];

  const targetLangs = ['en', 'fr', 'de'];
  const existingTranslations = {
    en: {
      ae482821_name: 'Deck Oven 100 (existing)'
    },
    fr: {},
    de: {}
  };

  function mockTranslate(text, lang) {
    return `[${lang}] ${text}`;
  }

  function isValidText(v) {
    if (!v && v !== 0) return false;
    const s = String(v).trim();
    if (!s) return false;
    const low = s.toLowerCase();
    return low !== 'null' && low !== 'undefined';
  }

  const generatedByLang = {};
  for (const lang of targetLangs) generatedByLang[lang] = {};

  for (const series of mockProductSeries) {
    for (const product of series.products || []) {
      for (const field of I18N_FIELDS) {
        const zhText =
          product.i18n &&
          product.i18n[field] &&
          (product.i18n[field]['zh-CN'] || product.i18n[field].zh);

        if (!isValidText(zhText)) continue;

        const key = generateI18nKey(series.category, product.subCategory, product.model, field);
        for (const lang of targetLangs) {
          generatedByLang[lang][key] = mockTranslate(zhText, lang);
        }
      }
    }
  }

  console.log('=== MOCK GENERATED key/value ===');
  for (const [lang, kv] of Object.entries(generatedByLang)) {
    for (const [key, value] of Object.entries(kv)) {
      console.log(`[generated][${lang}] ${key} = ${value}`);
    }
  }

  const toWriteByLang = {};
  for (const lang of targetLangs) {
    const existing = existingTranslations[lang] || {};
    const next = generatedByLang[lang] || {};
    toWriteByLang[lang] = {};

    for (const [key, value] of Object.entries(next)) {
      if (!Object.prototype.hasOwnProperty.call(existing, key) || !existing[key]) {
        toWriteByLang[lang][key] = value;
        existing[key] = value;
      }
    }
  }

  console.log('\n=== MOCK TO-WRITE key/value ===');
  for (const [lang, kv] of Object.entries(toWriteByLang)) {
    for (const [key, value] of Object.entries(kv)) {
      console.log(`[write][${lang}] ${key} = ${value}`);
    }
  }

  console.log('\n=== MOCK SUMMARY ===');
  for (const lang of targetLangs) {
    const genCount = Object.keys(generatedByLang[lang]).length;
    const writeCount = Object.keys(toWriteByLang[lang]).length;
    console.log(`${lang}: generated=${genCount}, write=${writeCount}`);
  }
}

// 命令行入口
if (require.main === module) {
  const args = process.argv.slice(2);
  const apiKeyArg = args.find(arg => arg.startsWith('--api-key='));
  const apiKey = apiKeyArg
    ? apiKeyArg.split('=')[1]
    : process.env.GOOGLE_TRANSLATE_API_KEY;

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node scripts/product-translate-adapter.js [options]

Options:
  --help                    Show this help
  --demo                    Show demo without translation (uses mock data)
  --mock                    Run mock translation flow (no network, no file write)

Notes:
  This script uses the Gemini 3 API for high-quality translation.
  API configuration is in scripts/gemini-translator.js
  Use --demo flag to inspect structure without making API calls.
  `);
    process.exit(0);
  }

  if (args.includes('--demo')) {
    console.log('📋 Demo Mode: Showing translation structure without actual API calls\n');
    const productSeries = extractChineseProductData();
    const firstSeriesWithProduct = productSeries.find(series => (series.products || []).length > 0);

    if (!firstSeriesWithProduct) {
      console.log('No products available in PRODUCT_DATA_TABLE.');
      process.exit(0);
    }

    const p = firstSeriesWithProduct.products[0];
    const zhName = (p.i18n && p.i18n.name && (p.i18n.name['zh-CN'] || p.i18n.name.zh || p.i18n.name['zh_CN'])) || p.name || '(missing)';
    console.log('First product:');
    console.log(`  Category: ${firstSeriesWithProduct.category}`);
    console.log(`  Model: ${p.model || '(missing)'}`);
    console.log(`  Name (Chinese): ${zhName}`);
    const key = generateI18nKey(firstSeriesWithProduct.category, p.subCategory, p.model, 'name');
    console.log(`  Generated key: ${key}`);
    console.log(`\nTranslation keys in translations/en.json:\n  "${key}": "English translation of name"`);
    console.log(`\nTranslation keys in translations/zh-CN.json:\n  "${key}": "${zhName}"`);
    process.exit(0);
  }

  if (args.includes('--mock')) {
    runMockTranslationFlow();
    process.exit(0);
  }

  translateProducts(apiKey).catch(err => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  });
}

module.exports = {
  generateI18nKey,
  translateWithGemini,
  translateTexts,
  runMockTranslationFlow,
  LANGUAGE_MAP,
  I18N_FIELDS
};
