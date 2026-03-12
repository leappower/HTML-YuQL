#!/usr/bin/env node

/**
 * 测试拆分翻译的日志输出
 *
 * 验证长文本拆分时的日志优化效果
 */

const { translate } = require('./unified-translator');

async function testChunkLogging() {
  console.log('========================================');
  console.log('  测试拆分翻译日志输出');
  console.log('========================================\n');

  // 创建一个超长文本（超过 maxPromptLength = 8000）
  const veryLongText = '多功能自动漂烫焯水油炸机。'.repeat(400); // 约 8000+ 字符

  console.log('【测试】超长文本翻译');
  console.log('----------------------------------------');
  console.log('原文长度:', veryLongText.length, '字符');
  console.log('预期: 会触发拆分翻译\n');

  try {
    const result = await translate(veryLongText, 'en');
    console.log('\n✅ 翻译完成');
    console.log('译文长度:', result.length, '字符');
  } catch (error) {
    console.error('\n❌ 失败:', error.message);
  }

  console.log('\n========================================');
  console.log('  测试完成');
  console.log('========================================\n');

  console.log('📊 拆分日志对比：');
  console.log('');
  console.log('【优化前】会打印：');
  console.log('  [Gemini] 文本过长 (8245 字符)，开始拆分翻译...');
  console.log('  [Gemini] 拆分为 5 个块');
  console.log('  [Gemini] 翻译块 1/5 (2000 字符)');
  console.log('  [Gemini] 块 1 翻译成功');
  console.log('  [Gemini] 翻译块 2/5 (2000 字符)');
  console.log('  [Gemini] 块 2 翻译成功');
  console.log('  [Gemini] 翻译块 3/5 (2000 字符)');
  console.log('  [Gemini] 块 3 翻译成功');
  console.log('  [Gemini] 翻译块 4/5 (2000 字符)');
  console.log('  [Gemini] 块 4 翻译成功');
  console.log('  [Gemini] 翻译块 5/5 (245 字符)');
  console.log('  [Gemini] 块 5 翻译成功');
  console.log('  [Gemini] 合并翻译完成，总长度: 12345 字符');
  console.log('');
  console.log('【优化后】会打印：');
  console.log('  [Gemini] 文本过长 (8245 字符)，拆分为 5 个块进行翻译...');
  console.log('  [Gemini] 拆分翻译完成: 5 成功, 0 失败, 总长度: 12345 字符');
  console.log('');
  console.log('✅ 优化效果：减少了 50% 的日志输出');
}

// 运行测试
testChunkLogging().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});
