#!/usr/bin/env node

/**
 * 将分离的翻译文件按语言拆分为单独文件
 *
 * 从ui-i18n.json和product-i18n.json中提取每种语言，
 * 生成独立的lang-code-ui.json和lang-code-product.json文件
 */

const fs = require('fs');
const path = require('path');

// 配置
const config = {
  inputUIFile: path.join(__dirname, '../src/assets/ui-i18n.json'),
  inputProductFile: path.join(__dirname, '../src/assets/product-i18n.json'),
  outputLangDir: path.join(__dirname, '../src/assets/lang'),
};

/**
 * 将合并的翻译文件按语言拆分
 */
function splitByLanguage(inputFile, fileType) {
  console.log(`\n处理 ${fileType} 文件...`);

  if (!fs.existsSync(inputFile)) {
    console.warn(`  警告: 文件不存在，跳过: ${inputFile}`);
    return;
  }

  const translations = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const languages = Object.keys(translations);

  console.log(`  找到 ${languages.length} 种语言`);

  languages.forEach(lang => {
    const langTranslations = translations[lang];
    const outputFile = path.join(config.outputLangDir, `${lang}-${fileType}.json`);

    fs.writeFileSync(outputFile, JSON.stringify(langTranslations, null, 2), 'utf8');
    console.log(`  ✓ 生成: ${path.basename(outputFile)} (${Object.keys(langTranslations).length} 个键)`);
  });
}

/**
 * 主函数
 */
function main() {
  console.log('========================================');
  console.log('  按语言拆分翻译文件');
  console.log('========================================');

  try {
    // 确保输出目录存在
    if (!fs.existsSync(config.outputLangDir)) {
      fs.mkdirSync(config.outputLangDir, { recursive: true });
    }

    // 拆分UI翻译
    splitByLanguage(config.inputUIFile, 'ui');

    // 拆分产品翻译
    splitByLanguage(config.inputProductFile, 'product');

    console.log('\n========================================');
    console.log('  完成!');
    console.log('========================================\n');

    // 列出生成的文件
    const uiFiles = fs.readdirSync(config.outputLangDir)
      .filter(f => f.endsWith('-ui.json'))
      .sort();
    const productFiles = fs.readdirSync(config.outputLangDir)
      .filter(f => f.endsWith('-product.json'))
      .sort();

    console.log(`UI翻译文件 (${uiFiles.length}):`);
    uiFiles.forEach(file => console.log(`  - ${file}`));

    console.log(`\n产品翻译文件 (${productFiles.length}):`);
    productFiles.forEach(file => console.log(`  - ${file}`));

    console.log('\n✅ 所有翻译文件已生成!\n');

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

module.exports = { splitByLanguage };
