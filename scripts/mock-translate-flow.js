const { generateI18nKey, I18N_FIELDS } = require('./product-translate-adapter.js');

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
      const zhText = product.i18n && product.i18n[field] && (product.i18n[field]['zh-CN'] || product.i18n[field].zh);
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
