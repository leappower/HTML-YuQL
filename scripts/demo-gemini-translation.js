#!/usr/bin/env node

/**
 * Gemini 3 翻译 API 调用模块演示
 */

const { translate, batchTranslate, CONFIG } = require('./unified-translator');

async function demo() {
  console.log('========================================');
  console.log('  Gemini 3 翻译 API 调用模块');
  console.log('========================================\n');

  console.log('API 配置:');
  console.log(`  模型: ${CONFIG.gemini.model}`);
  console.log(`  地址: ${CONFIG.gemini.apiBase}`);
  console.log(`  最大块大小: ${CONFIG.gemini.maxChunkSize} 字符`);
  console.log(`  最大提示词长度: ${CONFIG.gemini.maxPromptLength} 字符`);

  console.log('\n========================================');
  console.log('  演示 1: 单文本翻译');
  console.log('========================================\n');

  const text = '多功能自动漂烫焯水油炸机大容量触屏版';
  const result = await translate(text, 'en');
  console.log(`原文: ${text}`);
  console.log(`译文: ${result}\n`);

  console.log('========================================');
  console.log('  演示 2: 批量翻译');
  console.log('========================================\n');

  const texts = [
    '超大容量',
    '自动摆臂喷料',
    '800菜谱'
  ];

  const results = await batchTranslate(texts, 'en', (current, total) => {
    console.log(`进度: ${current}/${total}`);
  });

  console.log('\n翻译结果:');
  texts.forEach((text, i) => {
    console.log(`  ${text} -> ${results[i]}`);
  });

  console.log('\n========================================');
  console.log('  演示 3: 大文本翻译（自动拆分）');
  console.log('========================================\n');

  const longText = '多功能自动漂烫焯水油炸机大容量触屏版。超大容量设计，适合商业厨房使用。自动摆臂喷料系统，确保调料均匀分布。内置800道智能菜谱，涵盖中餐、西餐、日料等多种菜系。智能语音播报功能，实时提示烹饪进度和操作提示。304不锈钢材质，食品级安全标准。耐高温设计，使用寿命长。易清洗设计，维护简单。';

  console.log(`原始文本长度: ${longText.length} 字符`);
  const longResult = await translate(longText, 'en');
  console.log(`翻译结果长度: ${longResult.length} 字符`);
  console.log(`\n翻译结果:\n${longResult}\n`);

  console.log('========================================');
  console.log('  使用方法');
  console.log('========================================\n');

  console.log('// 基础翻译');
  console.log('const { translate } = require(\'./scripts/unified-translator\');');
  console.log('const result = await translate(\'文本\', \'en\');\n');

  console.log('// 批量翻译');
  console.log('const { batchTranslate } = require(\'./scripts/unified-translator\');');
  console.log('const results = await batchTranslate([\'文本1\', \'文本2\'], \'en\');\n');

  console.log('========================================');
  console.log('  模块功能');
  console.log('========================================\n');

  console.log('✅ 使用 Gemini 3 API (gemini-3-flash-preview)');
  console.log('✅ 发送电商本地化专家提示词');
  console.log('✅ 自动检测并拆分大文本');
  console.log('✅ 支持重试机制（3次，指数退避）');
  console.log('✅ 支持 21 种语言');
  console.log('✅ 批量翻译支持');
  console.log('✅ 完善的错误处理');

  console.log('\n========================================');
  console.log('  支持的语言');
  console.log('========================================\n');

  const { LANGUAGE_NAMES } = require('./unified-translator');
  const langs = Object.entries(LANGUAGE_NAMES).map(([code, name]) => `${code}: ${name}`).join(', ');
  console.log(langs);

  console.log('\n========================================');
  console.log('  演示完成');
  console.log('========================================\n');
}

if (require.main === module) {
  demo().catch(error => {
    console.error('演示运行失败:', error);
    process.exit(1);
  });
}

module.exports = { demo };
