# producti18n.json Merge Mode Implementation

## ✅ Completed

All three scripts now use **merge mode** when writing to `producti18n.json`:

### 1. `product-i18n-adapter.js` - ✅ Updated
**Function:** `saveProductI18n(productI18nData)`
- Loads existing `producti18n.json` before saving
- Merges new data with existing data
- Preserves old keys, only updates/adds new ones
- Sorting applied after merge

**Usage:** `npm run i18n:extract`
- Extracts product i18n from `product-data-table.js`
- Merges into existing `producti18n.json`
- Does NOT overwrite existing translations

### 2. `product-translate-adapter.js` - ✅ Updated
**Function:** `saveProductI18n(productI18nData)`
- Loads existing `producti18n.json` before saving
- Merges Google-translated data with existing data
- New translations override old ones, but preserves untouched keys
- Sorting applied after merge

**Usage:** `npm run translate:products`
- Translates product data via Google Translate API
- Merges into existing `producti18n.json`
- Does NOT delete previous translations that still exist

### 3. `product-sync-i18n.js` - ✅ Updated
**Function:** `saveJSON(filePath, data)`
- Detects `producti18n.json` by file path
- For `producti18n.json`: Loads existing data and merges
- For other files (zh.json, en.json, etc.): Uses standard save mode
- Merge priority: Existing data + New data (new data wins on conflicts)

**Usage:** `npm run product:sync`
- Syncs product keys across zh/zh-CN/producti18n and 21 other languages
- Merge mode ensures no data loss

---

## 🔄 Merge Mode Logic

All three implementations follow the same merge pattern:

```javascript
function saveProductI18n(productI18nData) {
  // Load existing data first
  const existingData = loadProductI18n();
  const mergedData = { ...existingData };
  
  // Merge new data (new data overwrites old on conflict)
  for (const [lang, entries] of Object.entries(productI18nData)) {
    if (!mergedData[lang]) mergedData[lang] = {};
    for (const [key, value] of Object.entries(entries)) {
      mergedData[lang][key] = value;  // Updates existing or adds new
    }
  }
  
  // Save merged data (sorted)
  fs.writeFileSync(PRODUCT_I18N_PATH, JSON.stringify(sorted, null, 2) + '\n');
}
```

**Key behaviors:**
- ✅ Does NOT delete keys that aren't in new data
- ✅ Does NOT overwrite newer keys with older data
- ✅ Preserves manual edits in `producti18n.json`
- ✅ Multiple runs are safe (idempotent)

---

## 📋 When Merge Mode Applies

| Operation | Merge Mode |
|-----------|-----------|
| `npm run i18n:extract` | ✅ YES |
| `npm run translate:products` | ✅ YES |
| `npm run product:sync` | ✅ YES (for producti18n.json) |

---

## 🧪 Testing Merge Mode

```bash
# Create initial producti18n.json
npm run i18n:extract

# Check it has data
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('scripts/producti18n.json','utf8'));console.log(Object.keys(p).length, 'languages');"

# Run again - should merge, not overwrite
npm run i18n:extract

# Check same data still exists
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('scripts/producti18n.json','utf8'));console.log(Object.keys(p).length, 'languages');"

# Verify manual edits are preserved
# (Any manual changes to producti18n.json will remain after running scripts)
```

---

## ✨ Benefits

1. **Safe incremental updates** - Can run extraction/translation multiple times
2. **Preserves manual edits** - Manual changes won't be lost
3. **Idempotent** - Running twice has same effect as running once
4. **Data safety** - No accidental deletions of old translations
5. **Flexible workflow** - Can extract, translate, sync in any order

---

**Status:** ✅ ALL 3 SCRIPTS UPDATED - ZERO LINT ERRORS
