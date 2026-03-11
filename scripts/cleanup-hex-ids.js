const fs = require('fs');
const path = require('path');
const TRANSLATIONS_DIR = path.join(process.cwd(), 'src/assets/translations');

if (!fs.existsSync(TRANSLATIONS_DIR)) {
  console.error('Translations dir not found:', TRANSLATIONS_DIR);
  process.exit(1);
}

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(process.cwd(), 'scripts', 'translations-backup-hex-' + ts);
fs.mkdirSync(backupDir, { recursive: true });

const files = fs.readdirSync(TRANSLATIONS_DIR).filter(f => f.endsWith('.json'));
let totalRemoved = 0;
for (const file of files) {
  const fp = path.join(TRANSLATIONS_DIR, file);
  const bak = path.join(backupDir, file);
  fs.copyFileSync(fp, bak);
  try {
    const raw = fs.readFileSync(fp, 'utf-8');
    const obj = JSON.parse(raw);
    const keys = Object.keys(obj);
    let removed = 0;
    for (const k of keys) {
      // match keys with pattern: 8-hex characters followed by underscore (case-insensitive)
      if (/^[0-9a-fA-F]{8}_/.test(k)) {
        delete obj[k];
        removed += 1;
      }
    }
    if (removed > 0) {
      const sorted = Object.fromEntries(Object.entries(obj).sort(([a],[b]) => a.localeCompare(b)));
      fs.writeFileSync(fp, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
    }
    console.log(`${file}: removed ${removed} hex-prefixed keys`);
    totalRemoved += removed;
  } catch (err) {
    console.error('Failed processing', file, err.message);
  }
}
console.log('Backup of originals is at', backupDir);
console.log('Total removed:', totalRemoved);