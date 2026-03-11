const fs = require('fs');
const path = require('path');
const scriptsDir = path.join(process.cwd(), 'scripts');
const translationsDir = path.join(process.cwd(), 'src/assets/translations');
const targetFile = path.join(translationsDir, 'zh-CN.json');

const backups = fs.readdirSync(scriptsDir).filter(d => d.startsWith('translations-backup-')).sort();
if (backups.length === 0) {
  console.error('No translation backups found in scripts/');
  process.exit(2);
}
const latest = backups.pop();
const backupFile = path.join(scriptsDir, latest, 'zh-CN.json');
if (!fs.existsSync(backupFile)) {
  console.error('Backup zh-CN.json not found in', latest);
  process.exit(3);
}

const ts = Date.now();
const beforeBackup = path.join(scriptsDir, `zh-CN-before-restore-${ts}.json`);
if (fs.existsSync(targetFile)) {
  fs.copyFileSync(targetFile, beforeBackup);
  console.log('Backed up current zh-CN.json ->', beforeBackup);
} else {
  console.log('No current zh-CN.json exists, nothing to backup');
}

const current = fs.existsSync(targetFile) ? JSON.parse(fs.readFileSync(targetFile, 'utf8')) : {};
const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

const currentKeys = new Set(Object.keys(current));
const restored = {};
for (const k of Object.keys(backup)) {
  if (!currentKeys.has(k)) {
    restored[k] = backup[k];
  }
}

const restoredCount = Object.keys(restored).length;
if (restoredCount === 0) {
  console.log('No keys to restore.');
  process.exit(0);
}

const merged = Object.fromEntries(
  Object.entries(Object.assign({}, current, restored)).sort(([a],[b]) => a.localeCompare(b))
);
fs.writeFileSync(targetFile, JSON.stringify(merged, null, 2) + '\n', 'utf8');
console.log(`Restored ${restoredCount} keys from backup ${latest} into ${targetFile}`);
console.log('Examples of restored keys:');
console.log(Object.keys(restored).slice(0,50).join('\n'));
console.log('\nDone.');
