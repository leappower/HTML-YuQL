const fs = require('fs');
const path = require('path');

const sourceFile = path.resolve(__dirname, '../src/assets/i18n.json');
const targetDir = path.resolve(__dirname, '../dist');
const targetFile = path.join(targetDir, 'i18n.json');

if (!fs.existsSync(sourceFile)) {
  console.error('❌ Error: i18n.json not found');
  console.error(`   Expected at: ${sourceFile}`);
  process.exit(1);
}

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy the file
fs.copyFileSync(sourceFile, targetFile);

console.log('✅ i18n.json copied to dist/');
console.log(`   Source: ${sourceFile}`);
console.log(`   Target: ${targetFile}`);
