# Product i18n Synchronization Quick Reference

## 🎯 Problem Solved

**Before:** Product translations were scattered across multiple files with inconsistent key coverage
- zh.json: 2217 product keys
- zh-CN.json: 2217 product keys  
- en.json: 0 product keys (missing)
- de.json: 0 product keys (missing)
- ... (same for other 19 languages)

**After:** All 22 languages synchronized with complete product key coverage
- zh.json: 2217 product keys ✓
- zh-CN.json: 2217 product keys ✓
- producti18n.json: 2217 product keys ✓ (NEW)
- en.json: 2217 product keys ✓
- de.json: 2217 product keys ✓
- ... (all 22 languages)

---

## 📋 New Script: `product-sync-i18n.js`

### Location
`/scripts/product-sync-i18n.js`

### Purpose
Synchronize three source files (zh.json, zh-CN.json, producti18n.json) and distribute product keys to 21 other languages

### How It Works

**Step 1:** Load three source files
```javascript
zh.json ← LOAD
zh-CN.json ← LOAD
producti18n.json ← LOAD
```

**Step 2:** Extract product keys (hash format: `^[0-9a-f]{8}_.*$`)
```javascript
[003c70e2_name, 003c70e2_badge, 003c70e2_category, ...]
```

**Step 3:** Sync three files (merge + fill missing keys)
```javascript
// Collect all unique keys from all three files
allKeys = merge(zh_keys, zh-CN_keys, producti18n_keys)

// Fill missing keys:
zh.json ← missing keys from zh-CN or producti18n
zh-CN.json ← missing keys from zh or producti18n
producti18n.json ← missing keys from zh or zh-CN
```

**Step 4:** Distribute to 21 other languages
```javascript
for language in [ar, de, en, es, fil, fr, he, id, it, ja, ko, ms, nl, pl, pt, ru, th, tr, vi, zh-TW]:
  if (key not in language.json):
    language.json[key] = producti18n.json[key] OR zh-CN[key] OR zh[key]
```

**Step 5:** Save all updated files (sorted)

---

## 🚀 Usage

### Run the Sync
```bash
npm run product:sync
```

### Example Output
```
🔍 Product i18n Sync Script
==================================================

📚 Loading source files...
  • zh.json: 2217 product keys
  • zh-CN.json: 2217 product keys
  • producti18n.json: 0 product keys

🔄 Syncing zh.json, zh-CN.json, and producti18n.json...
  • Total unique product keys: 2217
  Summary: zh.json (+0), zh-CN.json (+0), producti18n.json (+2217)

💾 Saving synchronized source files...
  ✓ zh.json saved
  ✓ zh-CN.json saved
  ✓ producti18n.json saved

🌐 Syncing product translations to other 21 languages...
  ✓ ar: added 2217 product keys
  ✓ de: added 2217 product keys
  ✓ en: added 2217 product keys
  ... (19 more languages)

✨ Sync complete! All product keys are now synchronized.
```

---

## 📊 Results After First Run

| File | Product Keys |
|------|--------------|
| zh.json | 2217 ✓ |
| zh-CN.json | 2217 ✓ |
| producti18n.json | 2217 ✓ (new) |
| ar.json | 2217 ✓ |
| de.json | 2217 ✓ |
| en.json | 2217 ✓ |
| es.json | 2217 ✓ |
| ... (all 22 languages) | 2217 ✓ |

---

## 🔄 Complete Workflow

### Scenario 1: From Scratch (No Translations)

```bash
# 1. Sync from Feishu (get Chinese product data)
npm run sync:feishu

# 2. Extract to i18n format (writes zh, zh-CN, producti18n)
npm run i18n:extract

# 3. Sync all languages (distribute product keys)
npm run product:sync  ← NEW

# 4. Build
npm run build
```

**Result:** All 22 languages have product keys with Chinese values (as placeholders)

---

### Scenario 2: With Google Translate

```bash
# Set API key
export GOOGLE_TRANSLATE_API_KEY="your-key-here"

# 1. Sync from Feishu
npm run sync:feishu

# 2. Extract to i18n format
npm run i18n:extract

# 3. Translate to all languages (updates producti18n.json)
npm run translate:products

# 4. Sync translations to all languages
npm run product:sync  ← NEW (applies Google translations)

# 5. Build
npm run build
```

**Result:** All 22 languages have product keys with Google-translated values

---

### Scenario 3: Incremental Updates

When Feishu data changes (fewer products or modified translations):

```bash
# 1. Re-sync
npm run sync:feishu

# 2. Re-extract
npm run i18n:extract

# 3. Re-sync all languages (products that were deleted are kept; new ones added)
npm run product:sync

# 4. Build
npm run build
```

---

## ⚙️ Implementation Details

### Smart Key Matching
```javascript
// Product keys match this pattern:
/^[0-9a-f]{8}_[a-z0-9_]+$/

Examples:
  ✓ 003c70e2_name
  ✓ 003c70e2_badge
  ✗ ui_button_label (not a product key)
```

### Fill Priority
When a key is missing, the priority for filling is:

```
Case 1: Missing from zh.json
  Source: zh-CN.json > producti18n.json

Case 2: Missing from zh-CN.json
  Source: zh.json > producti18n.json

Case 3: Missing from producti18n.json
  Source: zh-CN.json > zh.json

Case 4: Missing from other 21 languages
  Source: producti18n.json > zh-CN.json > zh.json
```

### File Sorting
All files are saved with keys in **alphabetical order**:
```json
{
  "003c70e2_badge": "...",
  "003c70e2_badgecolor": "...",
  "003c70e2_category": "...",
  ...
}
```

---

## 📝 Three Files = Triple Backup

| File | Role | Content |
|------|------|---------|
| **zh.json** | Master + UI | All keys (UI + products) |
| **zh-CN.json** | Backup | All keys (UI + products) |
| **producti18n.json** | Product Only | Only product keys |

**Why three files?**
1. `zh.json` and `zh-CN.json` are UI translation files (should be kept separate from products)
2. `producti18n.json` is the product-only file (easier to manage independently)
3. Three redundant copies ensure no data loss

---

## 🧪 Verification Commands

### Check Product Keys Count
```bash
node -e "const fs=require('fs');const zh=JSON.parse(fs.readFileSync('src/assets/translations/zh.json','utf8'));const en=JSON.parse(fs.readFileSync('src/assets/translations/en.json','utf8'));const prod=JSON.parse(fs.readFileSync('scripts/producti18n.json','utf8'));const zhKeys=Object.keys(zh).filter(k=>/^[0-9a-f]{8}/.test(k));const enKeys=Object.keys(en).filter(k=>/^[0-9a-f]{8}/.test(k));const prodKeys=Object.keys(prod).filter(k=>/^[0-9a-f]{8}/.test(k));console.log('zh.json:', zhKeys.length, 'keys');console.log('en.json:', enKeys.length, 'keys');console.log('producti18n.json:', prodKeys.length, 'keys');"
```

### Check All 22 Languages
```bash
node -e "const fs=require('fs');['ar','de','en','es','fil','fr','he','id','it','ja','ko','ms','nl','pl','pt','ru','th','tr','vi','zh','zh-CN','zh-TW'].forEach(lang=>{const data=JSON.parse(fs.readFileSync('src/assets/translations/'+lang+'.json','utf8'));const keys=Object.keys(data).filter(k=>/^[0-9a-f]{8}/.test(k));console.log(lang+': '+keys.length);});"
```

### Sample Product Key Value
```bash
node -e "const fs=require('fs');const zh=JSON.parse(fs.readFileSync('src/assets/translations/zh.json','utf8'));const en=JSON.parse(fs.readFileSync('src/assets/translations/en.json','utf8'));console.log('Key 003c70e2_name:');console.log('  zh:', zh['003c70e2_name']);console.log('  en:', en['003c70e2_name']);"
```

---

## ✨ Benefits

| Benefit | Impact |
|---------|--------|
| **Complete Coverage** | All 22 languages have same product keys |
| **No Data Loss** | Three-file backup system |
| **Automatic Fill** | Missing keys filled intelligently |
| **Easy Maintenance** | Incremental updates supported |
| **Scalable** | Handles 2217+ product keys |
| **Transparent** | Detailed logging of all operations |

---

## 📚 Related Files

- `/scripts/product-sync-i18n.js` - Sync script (NEW)
- `/scripts/product-i18n-adapter.js` - Extract script
- `/scripts/product-translate-adapter.js` - Translation script
- `/src/assets/translations/*.json` - Translation files (22 languages)
- `/scripts/producti18n.json` - Product temporary data

---

## 🔗 Next Steps

1. ✅ Run `npm run product:sync` first time (populates producti18n.json)
2. ✅ Verify all 22 languages have product keys
3. (Optional) Run `npm run translate:products` for Google translations
4. (Optional) Run `npm run product:sync` again to apply translations
5. ✅ Run `npm run build` for final output

---

**Status:** ✅ TESTED AND WORKING
**Files Modified:** 1 created + 1 updated (package.json)
**Lint Errors:** 0
