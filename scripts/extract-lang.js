#!/usr/bin/env node

/**
 * 单语言提取脚本
 *
 * 从i18n.json提取指定语言的翻译，生成独立的JSON文件
 * 支持提取单个语言或所有语言
 */

const fs = require('fs');
const path = require('path');

// 语言代码映射
const LANGUAGE_NAMES = {
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  'en': 'en',
  'ja': 'ja',
  'ko': 'ko',
  'es': 'es',
  'fr': 'fr',
  'de': 'de',
  'it': 'it',
  'pt': 'pt',
  'ru': 'ru',
  'ar': 'ar',
  'he': 'he',
  'th': 'th',
  'vi': 'vi',
  'id': 'id',
  'ms': 'ms',
  'fil': 'fil',
  'nl': 'nl',
  'pl': 'pl',
  'tr': 'tr',
};

/**
 * 提取单个语言的翻译
 * @param {Object} i18nData - i18n.json 数据
 * @param {string} langCode - 语言代码
 * @returns {Object} 单语言翻译对象
 */
function extractLanguage(i18nData, langCode) {
  // i18n.json 结构是 {语言代码: {键: 值}}
  // 直接返回指定语言的翻译
  return i18nData[langCode] || {};
}

/**
 * 提取单个语言文件
 * @param {string} langCode - 语言代码
 */
function extractSingleLanguage(langCode) {
  console.log(`\n提取语言: ${langCode}`);

  // 读取i18n.json (支持src和dist两个位置)
  const i18nPath = path.join(__dirname, '..', 'src', 'assets', 'i18n.json');
  if (!fs.existsSync(i18nPath)) {
    console.error('错误: 找不到 src/assets/i18n.json');
    console.error('请先运行: npm run merge:i18n');
    process.exit(1);
  }
  const i18nData = JSON.parse(fs.readFileSync(i18nPath, 'utf-8'));

  // 提取指定语言
  const langData = extractLanguage(i18nData, langCode);

  // 创建目标目录
  const targetDir = path.join(__dirname, '..', 'src', 'assets', 'lang');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 写入单语言文件
  const targetPath = path.join(targetDir, `${langCode}.json`);
  fs.writeFileSync(targetPath, JSON.stringify(langData, null, 2), 'utf-8');

  const fileSize = Math.round(Buffer.byteLength(JSON.stringify(langData)) / 1024);
  const keyCount = Object.keys(langData).length;

  console.log(`  文件路径: ${targetPath}`);
  console.log(`  翻译键数: ${keyCount}`);
  console.log(`  文件大小: ${fileSize} KB`);
  console.log('✅ 提取成功');
}

/**
 * 提取所有语言
 */
function extractAllLanguages() {
  console.log('========================================');
  console.log('  提取所有语言文件');
  console.log('========================================');

  // 读取i18n.json (支持src和dist两个位置)
  const i18nPath = path.join(__dirname, '..', 'src', 'assets', 'i18n.json');
  if (!fs.existsSync(i18nPath)) {
    console.error('错误: 找不到 src/assets/i18n.json');
    console.error('请先运行: npm run merge:i18n');
    process.exit(1);
  }
  const i18nData = JSON.parse(fs.readFileSync(i18nPath, 'utf-8'));

  // 创建目标目录
  const targetDir = path.join(__dirname, '..', 'src', 'assets', 'lang');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let totalKeys = 0;
  let totalSize = 0;

  // 提取所有语言
  for (const langCode of Object.values(LANGUAGE_NAMES)) {
    const langData = extractLanguage(i18nData, langCode);
    const targetPath = path.join(targetDir, `${langCode}.json`);
    fs.writeFileSync(targetPath, JSON.stringify(langData, null, 2), 'utf-8');

    const fileSize = Math.round(Buffer.byteLength(JSON.stringify(langData)) / 1024);
    const keyCount = Object.keys(langData).length;

    totalKeys += keyCount;
    totalSize += fileSize;

    console.log(`✅ ${langCode}: ${keyCount} 键, ${fileSize} KB`);
  }

  console.log('\n========================================');
  console.log('  提取完成');
  console.log('========================================');
  console.log(`总语言数: ${Object.values(LANGUAGE_NAMES).length}`);
  console.log(`总键数: ${totalKeys}`);
  console.log(`总大小: ${totalSize} KB`);
  console.log(`平均大小: ${Math.round(totalSize / Object.values(LANGUAGE_NAMES).length)} KB`);
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // 无参数，提取所有语言
    extractAllLanguages();
  } else if (args.length === 1) {
    // 提取指定语言
    const langCode = args[0];
    if (!Object.values(LANGUAGE_NAMES).includes(langCode)) {
      console.error(`错误: 不支持的语言代码 "${langCode}"`);
      console.error(`支持的语言: ${Object.values(LANGUAGE_NAMES).join(', ')}`);
      process.exit(1);
    }
    extractSingleLanguage(langCode);
  } else {
    console.error('用法: node scripts/extract-lang.js [语言代码]');
    console.error('示例:');
    console.error('  node scripts/extract-lang.js              # 提取所有语言');
    console.error('  node scripts/extract-lang.js en            # 提取英语');
    console.error('  node scripts/extract-lang.js zh-CN         # 提取简体中文');
    process.exit(1);
  }
}

// 运行
if (require.main === module) {
  main().catch(error => {
    console.error('错误:', error);
    process.exit(1);
  });
}

module.exports = {
  extractLanguage,
  extractSingleLanguage,
  extractAllLanguages,
  LANGUAGE_NAMES,
};
