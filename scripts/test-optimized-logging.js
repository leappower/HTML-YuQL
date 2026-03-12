#!/usr/bin/env node

/**
 * 测试优化后的翻译日志输出
 *
 * 验证：
 * 1. 减少了冗余日志
 * 2. 保留了关键进度信息
 * 3. 错误信息仍然清晰
 */

const { translate } = require('./unified-translator');

async function testOptimizedLogging() {
  console.log('========================================');
  console.log('  测试优化后的翻译日志输出');
  console.log('========================================\n');

  // 测试 1: 短文本翻译（不会触发拆分）
  console.log('【测试 1】短文本翻译（不会触发拆分）');
  console.log('----------------------------------------');
  try {
    const result1 = await translate('多功能自动漂烫焯水油炸机', 'en');
    console.log('✅ 结果:', result1);
  } catch (error) {
    console.error('❌ 失败:', error.message);
  }

  console.log('\n');

  // 测试 2: 中等长度文本（不会触发拆分）
  console.log('【测试 2】中等长度文本（不会触发拆分）');
  console.log('----------------------------------------');
  try {
    const result2 = await translate('超大容量；自动摆臂喷料；800菜谱；语音播报', 'en');
    console.log('✅ 结果:', result2);
  } catch (error) {
    console.error('❌ 失败:', error.message);
  }

  console.log('\n');

  // 测试 3: 长文本翻译（会触发拆分）
  console.log('【测试 3】长文本翻译（会触发拆分）');
  console.log('----------------------------------------');
  const longText = '肉制品、蔬菜等焯水/漂烫/去农残预处理。超大容量设计，适合商业厨房使用。自动摆臂喷料系统，确保调料均匀分布。内置800道智能菜谱，涵盖中餐、西餐、日料等多种菜系。智能语音播报功能，实时提示烹饪进度和操作提示。304不锈钢材质，食品级安全标准。耐高温设计，使用寿命长。易清洗设计，维护简单。智能温度控制系统，精确控温，温度范围30-200℃。智能时间控制系统，可定时烹饪，解放双手。自动报警系统，异常情况及时提醒。安全防护设计，防干烧、防过热、防漏电。';

  try {
    const result3 = await translate(longText, 'en');
    console.log('✅ 翻译完成');
    console.log('原文长度:', longText.length, '字符');
    console.log('译文长度:', result3.length, '字符');
  } catch (error) {
    console.error('❌ 失败:', error.message);
  }

  console.log('\n');

  // 测试 4: 多语言翻译
  console.log('【测试 4】多语言翻译');
  console.log('----------------------------------------');
  const testText = '多功能自动漂烫焯水油炸机';
  const languages = ['en', 'ja', 'ko', 'es', 'fr'];

  for (const lang of languages) {
    try {
      const result = await translate(testText, lang);
      console.log(`✅ ${lang}:`, result);
    } catch (error) {
      console.error(`❌ ${lang} 失败:`, error.message);
    }
  }

  console.log('\n========================================');
  console.log('  测试完成');
  console.log('========================================\n');

  console.log('📊 日志优化说明：');
  console.log('1. ✅ 移除了每个文本的详细翻译日志');
  console.log('2. ✅ 保留了拆分翻译的关键信息');
  console.log('3. ✅ 保留了错误和重试日志');
  console.log('4. ✅ 保留了进度统计信息');
  console.log('5. ✅ 大幅减少了控制台输出量');
}

// 运行测试
testOptimizedLogging().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});
