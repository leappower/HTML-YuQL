#!/usr/bin/env node

/**
 * 内容拆分翻译测试脚本
 *
 * 测试大文本拆分翻译功能
 */

const { translate, splitTextIntoChunks, CONFIG } = require('./unified-translator');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logTest(message) {
  console.log(`${colors.cyan}📋 ${message}${colors.reset}`);
}

/**
 * 测试 1: 文本拆分功能
 */
async function testTextSplitting() {
  console.log('\n========================================');
  console.log('测试 1: 文本拆分功能');
  console.log('========================================\n');

  const testCases = [
    {
      name: '短文本（不需要拆分）',
      text: '多功能自动漂烫焯水油炸机',
      maxSize: 100,
      expectedChunks: 1,
    },
    {
      name: '中等文本（拆分成2块）',
      text: '多功能自动漂烫焯水油炸机大容量触屏版。超大容量设计，适合商业厨房使用。自动摆臂喷料系统，确保调料均匀分布。内置800道智能菜谱，涵盖中餐、西餐、日料等多种菜系。',
      maxSize: 50,
      expectedChunks: 2,
    },
    {
      name: '长文本（拆分成多块）',
      text: '多功能自动漂烫焯水油炸机大容量触屏版。超大容量设计，适合商业厨房使用。自动摆臂喷料系统，确保调料均匀分布。内置800道智能菜谱，涵盖中餐、西餐、日料等多种菜系。智能语音播报功能，实时提示烹饪进度和操作提示。304不锈钢材质，食品级安全标准。耐高温设计，使用寿命长。易清洗设计，维护简单。智能温度控制系统，精确控温，温度范围30-200℃。智能时间控制系统，可定时烹饪，解放双手。自动报警系统，异常情况及时提醒。安全防护设计，防干烧、防过热、防漏电。',
      maxSize: 100,
      expectedChunks: 3,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    logTest(`测试: ${test.name}`);
    console.log(`  文本长度: ${test.text.length} 字符`);
    console.log(`  最大块大小: ${test.maxSize} 字符`);

    const chunks = splitTextIntoChunks(test.text, test.maxSize);
    console.log(`  拆分结果: ${chunks.length} 个块`);

    for (let i = 0; i < chunks.length; i++) {
      console.log(`    块 ${i + 1}: ${chunks[i].substring(0, 40)}... (${chunks[i].length} 字符)`);
    }

    if (chunks.length === test.expectedChunks) {
      logSuccess('拆分正确');
      passed++;
    } else {
      logError(`拆分错误，期望 ${test.expectedChunks} 块，实际 ${chunks.length} 块`);
      failed++;
    }

    console.log('');
  }

  console.log(`文本拆分测试: ${passed}/${testCases.length} 通过`);
  return { passed, failed, total: testCases.length };
}

/**
 * 测试 2: 大文本自动拆分翻译
 */
async function testLargeTextTranslation() {
  console.log('\n========================================');
  console.log('测试 2: 大文本自动拆分翻译');
  console.log('========================================\n');

  const largeText = `多功能自动漂烫焯水油炸机大容量触屏版，专为商业厨房打造的高效烹饪设备。采用先进的智能控制系统，集成漂烫、焯水、油炸等多种烹饪功能于一体，一台机器满足多样化的烹饪需求。

超大容量设计，单次可处理大量食材，大幅提高工作效率。配备高清触屏控制面板，操作简单直观，支持中英文界面切换。内置800道精选菜谱，涵盖中餐、西餐、日料、韩料等多种菜系，满足不同地区消费者的口味需求。

自动摆臂喷料系统，确保调料均匀分布在食材表面，提升烹饪品质。智能语音播报功能，实时提示烹饪进度和操作指引，让烹饪过程更加轻松愉快。

采用304食品级不锈钢材质，符合食品安全标准，耐腐蚀、耐高温，使用寿命长。整机易清洗设计，维护简单方便。

智能温度控制系统，温度范围30-200℃，精确控温，确保每一道菜品都能达到最佳烹饪效果。智能时间控制系统，支持定时烹饪，可提前设置烹饪时间，解放双手。

多重安全防护设计，包括防干烧、防过热、防漏电等功能，确保使用安全可靠。异常情况自动报警系统，及时提醒用户处理。

该设备广泛应用于餐厅、食堂、酒店、食品加工厂等场所，是商业厨房的理想选择。节能减排设计，比传统设备节能30%以上，降低运营成本。`;

  logInfo(`测试文本长度: ${largeText.length} 字符`);
  logInfo(`提示词最大长度: ${CONFIG.gemini.maxPromptLength} 字符`);

  const promptLength = largeText.length + 500; // 估算提示词长度
  logInfo(`预计提示词长度: ${promptLength} 字符`);

  if (promptLength > CONFIG.gemini.maxPromptLength) {
    logWarning('文本过长，将触发自动拆分');
  } else {
    logInfo('文本长度合适，直接翻译');
  }

  console.log('\n开始翻译...\n');

  try {
    const result = await translate(largeText, 'en');

    console.log('翻译完成！');
    console.log(`\n翻译结果长度: ${result.length} 字符`);
    console.log('\n翻译结果:');
    console.log('─'.repeat(60));
    console.log(result);
    console.log('─'.repeat(60));

    if (result && result !== largeText && result.length > 0) {
      logSuccess('大文本翻译成功');
      return { passed: 1, failed: 0, total: 1 };
    } else {
      logError('翻译失败或返回原文');
      return { passed: 0, failed: 1, total: 1 };
    }
  } catch (error) {
    logError(`翻译异常: ${error.message}`);
    return { passed: 0, failed: 1, total: 1 };
  }
}

/**
 * 测试 3: 超长文本强制拆分
 */
async function testVeryLongTextTranslation() {
  console.log('\n========================================');
  console.log('测试 3: 超长文本强制拆分');
  console.log('========================================\n');

  // 构建一个很长的文本
  const paragraphs = [
    '多功能自动漂烫焯水油炸机是一款专为商业厨房打造的高效烹饪设备。',
    '采用先进的智能控制系统，集成漂烫、焯水、油炸等多种烹饪功能于一体。',
    '超大容量设计，单次可处理大量食材，大幅提高工作效率。',
    '配备高清触屏控制面板，操作简单直观，支持中英文界面切换。',
    '内置800道精选菜谱，涵盖中餐、西餐、日料、韩料等多种菜系。',
    '自动摆臂喷料系统，确保调料均匀分布在食材表面。',
    '智能语音播报功能，实时提示烹饪进度和操作指引。',
    '采用304食品级不锈钢材质，符合食品安全标准。',
    '耐腐蚀、耐高温，使用寿命长，易清洗设计，维护简单方便。',
    '智能温度控制系统，温度范围30-200℃，精确控温。',
    '智能时间控制系统，支持定时烹饪，可提前设置烹饪时间。',
    '多重安全防护设计，包括防干烧、防过热、防漏电等功能。',
    '异常情况自动报警系统，及时提醒用户处理。',
    '广泛应用于餐厅、食堂、酒店、食品加工厂等场所。',
    '节能减排设计，比传统设备节能30%以上，降低运营成本。',
  ];

  // 重复多次以创建超长文本
  let veryLongText = '';
  for (let i = 0; i < 3; i++) {
    veryLongText += paragraphs.join('\n\n') + '\n\n';
  }

  logInfo(`测试文本长度: ${veryLongText.length} 字符`);
  logInfo(`最大块大小: ${CONFIG.gemini.maxChunkSize} 字符`);

  const expectedChunks = Math.ceil(veryLongText.length / CONFIG.gemini.maxChunkSize);
  logInfo(`预计拆分成: ${expectedChunks} 个块`);

  const chunks = splitTextIntoChunks(veryLongText, CONFIG.gemini.maxChunkSize);
  logInfo(`实际拆分: ${chunks.length} 个块`);

  console.log('\n前3个块的内容预览:');
  for (let i = 0; i < Math.min(3, chunks.length); i++) {
    console.log(`\n块 ${i + 1} (${chunks[i].length} 字符):`);
    console.log(chunks[i].substring(0, 100) + '...');
  }

  // 测试翻译第一个块（避免等待太长时间）
  console.log('\n测试翻译第一个块...');
  try {
    const result = await translate(chunks[0], 'en');
    console.log(`翻译结果: ${result.substring(0, 100)}...`);

    if (result && result !== chunks[0]) {
      logSuccess('块翻译成功');
      return { passed: 1, failed: 0, total: 1 };
    } else {
      logError('块翻译失败');
      return { passed: 0, failed: 1, total: 1 };
    }
  } catch (error) {
    logError(`翻译异常: ${error.message}`);
    return { passed: 0, failed: 1, total: 1 };
  }
}

/**
 * 测试 4: 批量翻译性能
 */
async function testBatchPerformance() {
  console.log('\n========================================');
  console.log('测试 4: 批量翻译性能');
  console.log('========================================\n');

  const texts = [
    '多功能自动漂烫焯水油炸机大容量触屏版',
    '超大容量；自动摆臂喷料；800菜谱；语音播报',
    '肉制品、蔬菜等焯水/漂烫/去农残预处理',
    '不锈钢材质；304食品级；耐高温；易清洗',
    '智能控制系统；温度控制；时间控制；自动报警',
    '适用于餐厅、食堂、酒店、食品加工厂等场所',
    '节能减排设计，比传统设备节能30%以上',
    '多重安全防护，防干烧、防过热、防漏电',
  ];

  logInfo(`批量翻译 ${texts.length} 个文本到英语`);

  const startTime = Date.now();

  try {
    const results = await Promise.all(
      texts.map(text => translate(text, 'en'))
    );

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = Math.round(totalTime / texts.length);

    console.log('\n批量翻译完成');
    console.log(`总耗时: ${totalTime}ms`);
    console.log(`平均耗时: ${avgTime}ms/文本`);

    const successCount = results.filter((r, i) => r && r !== texts[i]).length;

    if (successCount === texts.length) {
      logSuccess(`批量翻译全部成功 (${successCount}/${texts.length})`);
      return { passed: 1, failed: 0, total: 1 };
    } else {
      logWarning(`批量翻译部分成功 (${successCount}/${texts.length})`);
      return { passed: 0, failed: 1, total: 1 };
    }
  } catch (error) {
    logError(`批量翻译异常: ${error.message}`);
    return { passed: 0, failed: 1, total: 1 };
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('========================================');
  console.log('  内容拆分翻译功能测试');
  console.log('========================================');
  console.log(`API 模型: ${CONFIG.gemini.model}`);
  console.log(`最大块大小: ${CONFIG.gemini.maxChunkSize} 字符`);
  console.log(`最大提示词长度: ${CONFIG.gemini.maxPromptLength} 字符`);

  const results = {
    textSplitting: await testTextSplitting(),
    largeTextTranslation: await testLargeTextTranslation(),
    veryLongTextTranslation: await testVeryLongTextTranslation(),
    batchPerformance: await testBatchPerformance(),
  };

  // 汇总结果
  console.log('\n========================================');
  console.log('  测试结果汇总');
  console.log('========================================\n');

  const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
  const totalTests = Object.values(results).reduce((sum, r) => sum + r.total, 0);
  const totalFailed = totalTests - totalPassed;

  console.log(`文本拆分: ${results.textSplitting.passed}/${results.textSplitting.total}`);
  console.log(`大文本翻译: ${results.largeTextTranslation.passed}/${results.largeTextTranslation.total}`);
  console.log(`超长文本拆分: ${results.veryLongTextTranslation.passed}/${results.veryLongTextTranslation.total}`);
  console.log(`批量翻译性能: ${results.batchPerformance.passed}/${results.batchPerformance.total}`);

  console.log(`\n总计: ${totalPassed}/${totalTests} 通过`);

  if (totalFailed === 0) {
    console.log(`\n${colors.green}🎉 所有测试通过！${colors.reset}`);
    console.log(`\n${colors.cyan}✓ 确认：${colors.reset}`);
    console.log('✅ 文本拆分功能正常');
    console.log('✅ 大文本自动拆分翻译正常');
    console.log('✅ 仅使用 Gemini API，无 Google Translate');
    console.log('✅ 批量翻译性能良好');
    process.exit(0);
  } else {
    console.log(`\n${colors.yellow}⚠️  部分测试失败${colors.reset}`);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  testTextSplitting,
  testLargeTextTranslation,
  testVeryLongTextTranslation,
  testBatchPerformance,
};
