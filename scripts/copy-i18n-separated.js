#!/usr/bin/env node

/**
 * 复制分离后的翻译文件到dist目录
 *
 * 将分离后的翻译文件复制到正确的位置
 */

const fs = require('fs');
const path = require('path');

// 配置
const config = {
  srcDir: path.join(__dirname, '../src/assets'),
  distDir: path.join(__dirname, '../dist'),
  langDir: path.join(__dirname, '../dist/lang'),
};

/**
 * 确保目录存在
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 复制文件
 */
function copyFile(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  ✅ ${path.basename(src)} → ${path.basename(dest)}`);
    return true;
  } else {
    console.log(`  ⚠️  ${src} 不存在，跳过`);
    return false;
  }
}

/**
 * 主函数
 */
function main() {
  console.log('========================================');
  console.log('  复制分离后的翻译文件');
  console.log('========================================\n');

  try {
    // 确保目录存在
    ensureDir(config.distDir);
    ensureDir(config.langDir);

    console.log('复制翻译文件到dist目录...\n');

    // 复制合并的文件
    copyFile(
      path.join(config.srcDir, 'i18n.json'),
      path.join(config.distDir, 'i18n.json')
    );

    copyFile(
      path.join(config.srcDir, 'ui-i18n.json'),
      path.join(config.distDir, 'ui-i18n.json')
    );

    copyFile(
      path.join(config.srcDir, 'product-i18n.json'),
      path.join(config.distDir, 'product-i18n.json')
    );

    console.log('\n复制完成!');
    console.log('\n文件位置:');
    console.log(`  - ${config.distDir}/i18n.json (完整翻译)`);
    console.log(`  - ${config.distDir}/ui-i18n.json (UI翻译)`);
    console.log(`  - ${config.distDir}/product-i18n.json (产品数据)`);
    console.log(`  - ${config.langDir}/ (单语言文件)`);

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

module.exports = { copyFile };
