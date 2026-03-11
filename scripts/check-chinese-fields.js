const fs = require('fs');
const P = 'src/assets/product-data-table.js';
const I = ['name','highlights','scenarios','usage'];
const content = fs.readFileSync(P, 'utf8');
const m = content.match(/export const PRODUCT_DATA_TABLE\s*=\s*(\[.*\])\s*;/s);
if(!m){ console.error('PARSE_FAIL'); process.exit(1); }
const arr = JSON.parse(m[1]);
let totalProducts = 0;
let productsWithAnyChineseField = 0;
let totalFieldValues = 0;
const samples = [];
for (const series of arr) {
  for (const p of series.products || []) {
    totalProducts++;
    let found = false;
    for (const f of I) {
      const map = (p.i18n && p.i18n[f]) || {};
      const cand = map['zh-CN'] || map['zh'] || map['zh_CN'] || Object.values(map)[0] || p[f];
      if (cand && typeof cand === 'string' && cand.trim()) {
        totalFieldValues++;
        found = true;
        if (samples.length < 20) samples.push({ category: series.category, model: p.model, field: f, text: cand });
      }
    }
    if (found) productsWithAnyChineseField++;
  }
}
console.log('totalProducts:' + totalProducts);
console.log('productsWithAnyChineseField:' + productsWithAnyChineseField);
console.log('totalFieldValuesFound:' + totalFieldValues);
console.log('samples:', JSON.stringify(samples, null, 2));
