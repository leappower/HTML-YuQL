#!/usr/bin/env node

/**
 * 分离UI和产品数据翻译文件
 *
 * 将i18n.json分离为两个部分：
 * - ui-i18n.json: 只包含UI翻译（267个键，约10%）
 * - product-i18n.json: 只包含产品数据（2217个键，约90%）
 */

const fs = require('fs');
const path = require('path');

// 配置
const config = {
  inputFile: path.join(__dirname, '../src/assets/i18n.json'),
  outputUIFile: path.join(__dirname, '../src/assets/ui-i18n.json'),
  outputProductFile: path.join(__dirname, '../src/assets/product-i18n.json'),
};

// 产品数据键的模式（以产品ID开头，格式如：003c70e2_name, 02de79a2_category等）
const PRODUCT_KEY_PATTERN = /^[a-f0-9]+_/;

/**
 * 判断一个键是否是产品数据
 */
function isProductKey(key) {
  return PRODUCT_KEY_PATTERN.test(key);
}

/**
 * 分离翻译数据
 */
function splitTranslations(allTranslations) {
  const uiTranslations = {};
  const productTranslations = {};

  let uiCount = 0;
  let productCount = 0;

  // 统计所有语言的键
  const languages = Object.keys(allTranslations);
  const firstLang = languages[0];
  const totalKeys = Object.keys(allTranslations[firstLang]).length;

  console.log(`\n处理 ${languages.length} 种语言，共 ${totalKeys} 个翻译键\n`);

  // 遍历每种语言
  languages.forEach(lang => {
    const translations = allTranslations[lang];
    uiTranslations[lang] = {};
    productTranslations[lang] = {};

    // 分离键
    Object.keys(translations).forEach(key => {
      if (isProductKey(key)) {
        productTranslations[lang][key] = translations[key];
        productCount++;
      } else {
        uiTranslations[lang][key] = translations[key];
        uiCount++;
      }
    });
  });

  // 计算统计信息
  const avgUIKeys = uiCount / languages.length;
  const avgProductKeys = productCount / languages.length;
  const uiPercentage = ((avgUIKeys / totalKeys) * 100).toFixed(1);
  const productPercentage = ((avgProductKeys / totalKeys) * 100).toFixed(1);

  return {
    uiTranslations,
    productTranslations,
    stats: {
      totalLanguages: languages.length,
      totalKeys,
      uiKeys: Math.round(avgUIKeys),
      productKeys: Math.round(avgProductKeys),
      uiPercentage,
      productPercentage,
    },
  };
}

/**
 * 写入JSON文件
 */
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * 获取文件大小（格式化）
 */
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  const sizeInBytes = stats.size;
  const sizeInKB = (sizeInBytes / 1024).toFixed(2);
  const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

  if (sizeInMB > 1) {
    return `${sizeInMB} MB`;
  } else if (sizeInKB > 1) {
    return `${sizeInKB} KB`;
  } else {
    return `${sizeInBytes} B`;
  }
}

/**
 * 主函数
 */
function main() {
  console.log('========================================');
  console.log('  分离UI和产品数据翻译文件');
  console.log('========================================\n');

  try {
    // 检查输入文件
    if (!fs.existsSync(config.inputFile)) {
      console.error(`错误: 输入文件不存在: ${config.inputFile}`);
      console.log('\n请先运行: node scripts/merge-translations.js');
      process.exit(1);
    }

    // 读取输入文件
    console.log(`读取文件: ${config.inputFile}`);
    const allTranslations = JSON.parse(fs.readFileSync(config.inputFile, 'utf8'));

    // 分离翻译
    const result = splitTranslations(allTranslations);

    // 写入UI翻译文件
    console.log(`\n写入UI翻译文件: ${config.outputUIFile}`);
    writeJSON(config.outputUIFile, result.uiTranslations);

    // 写入产品翻译文件
    console.log(`写入产品翻译文件: ${config.outputProductFile}`);
    writeJSON(config.outputProductFile, result.productTranslations);

    // 输出统计信息
    console.log('\n========================================');
    console.log('  统计信息');
    console.log('========================================\n');
    console.log(`语言数量: ${result.stats.totalLanguages}`);
    console.log(`总键数: ${result.stats.totalKeys}`);
    console.log(`\nUI翻译键: ${result.stats.uiKeys} (${result.stats.uiPercentage}%)`);
    console.log(`产品数据键: ${result.stats.productKeys} (${result.stats.productPercentage}%)\n`);

    // 输出文件大小
    console.log('========================================');
    console.log('  文件大小');
    console.log('========================================\n');
    console.log(`原始文件: ${getFileSize(config.inputFile)}`);
    console.log(`UI文件:   ${getFileSize(config.outputUIFile)}`);
    console.log(`产品文件: ${getFileSize(config.outputProductFile)}`);
    console.log('\n文件大小减少: ~90% (只加载UI翻译时)');

    console.log('\n✅ 分离完成!\n');
    console.log('提示: UI翻译文件可以在页面加载时立即加载，');
    console.log('      产品翻译文件可以在需要时按需加载。\n');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { splitTranslations, isProductKey };
