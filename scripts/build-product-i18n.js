#!/usr/bin/env node

/**
 * 构建产品数据翻译文件
 *
 * 从分离的product-i18n.json生成独立的单语言产品翻译文件
 * 输出到 dist/lang/ 目录，用于按需加载
 */

const fs = require('fs');
const path = require('path');

// 配置
const config = {
  inputProductFile: path.join(__dirname, '../src/assets/product-i18n.json'),
  outputDir: path.join(__dirname, '../dist/lang'),
};

/**
 * 创建输出目录
 */
function ensureOutputDir() {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
    console.log(`✅ 创建输出目录: ${config.outputDir}`);
  }
}

/**
 * 生成单语言产品文件
 */
function generateSingleLanguageFiles(productTranslations) {
  const languages = Object.keys(productTranslations);
  let totalFiles = 0;
  let totalSize = 0;

  console.log(`\n生成 ${languages.length} 个单语言产品翻译文件...\n`);

  languages.forEach(lang => {
    const filePath = path.join(config.outputDir, `${lang}-product.json`);
    const content = productTranslations[lang];

    // 写入文件
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');

    // 统计
    const stats = fs.statSync(filePath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    totalFiles++;
    totalSize += stats.size;

    console.log(`  ✅ ${lang}: ${Object.keys(content).length} 键, ${fileSizeKB} KB`);
  });

  return {
    totalFiles,
    totalSize: (totalSize / 1024).toFixed(2),
    avgSize: (totalSize / totalFiles / 1024).toFixed(2),
  };
}

/**
 * 生成产品语言列表文件
 */
function generateProductLanguageList(productTranslations) {
  const languages = Object.keys(productTranslations).map(lang => ({
    code: lang,
    name: productTranslations[lang].language || lang,
    keys: Object.keys(productTranslations[lang]).length,
  }));

  const filePath = path.join(config.outputDir, 'product-languages.json');
  fs.writeFileSync(filePath, JSON.stringify(languages, null, 2), 'utf8');

  console.log(`\n✅ 生成产品语言列表: ${filePath}`);
  console.log(`   包含 ${languages.length} 种语言\n`);

  return filePath;
}

/**
 * 主函数
 */
function main() {
  console.log('========================================');
  console.log('  构建产品数据翻译文件');
  console.log('========================================\n');

  try {
    // 检查输入文件
    if (!fs.existsSync(config.inputProductFile)) {
      console.error(`错误: 产品翻译文件不存在: ${config.inputProductFile}`);
      console.log('\n请先运行: node scripts/split-translations.js');
      process.exit(1);
    }

    // 读取产品翻译文件
    console.log(`读取文件: ${config.inputProductFile}`);
    const productTranslations = JSON.parse(fs.readFileSync(config.inputProductFile, 'utf8'));

    // 创建输出目录
    ensureOutputDir();

    // 生成单语言文件
    const stats = generateSingleLanguageFiles(productTranslations);

    // 生成语言列表
    generateProductLanguageList(productTranslations);

    // 输出统计信息
    console.log('========================================');
    console.log('  统计信息');
    console.log('========================================\n');
    console.log(`生成文件数: ${stats.totalFiles}`);
    console.log(`总大小: ${stats.totalSize} KB`);
    console.log(`平均大小: ${stats.avgSize} KB`);
    console.log(`输出目录: ${config.outputDir}`);
    console.log('\n✅ 产品翻译文件构建完成!\n');
    console.log('提示: 这些文件可以在访问产品页面时按需加载，');
    console.log('      避免阻塞首屏渲染。\n');

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

module.exports = { generateSingleLanguageFiles };
