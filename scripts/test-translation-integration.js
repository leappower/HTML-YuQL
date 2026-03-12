#!/usr/bin/env node

/**
 * 翻译集成测试脚本
 *
 * 测试 Gemini API 集成的完整功能:
 * 1. 基础翻译功能
 * 2. 多语言支持
 * 3. 批量翻译
 * 4. 错误处理
 * 5. 性能测试
 */

const { translate, batchTranslate, CONFIG } = require('./unified-translator');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

/**
 * 测试基础翻译功能
 */
async function testBasicTranslation() {
  console.log('\n========================================');
  console.log('测试 1: 基础翻译功能');
  console.log('========================================\n');

  const tests = [
    {
      text: '多功能自动漂烫焯水油炸机大容量触屏版',
      targetLang: 'en',
      description: '产品标题翻译',
    },
    {
      text: '超大容量；自动摆臂喷料；800菜谱；语音播报',
      targetLang: 'en',
      description: '产品特性翻译',
    },
    {
      text: '肉制品、蔬菜等焯水/漂烫/去农残预处理',
      targetLang: 'en',
      description: '产品应用场景翻译',
    },
    {
      text: 'High-Capacity Multi-Functional Automatic Blancher & Fryer',
      targetLang: 'en',
      description: '英文文本翻译（应返回相似或优化后的英文）',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    logInfo(`测试: ${test.description}`);
    console.log(`  原文: ${test.text.substring(0, 50)}${test.text.length > 50 ? '...' : ''}`);
    console.log(`  目标语言: ${test.targetLang}`);

    try {
      const result = await translate(test.text, test.targetLang);
      console.log(`  结果: ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}`);

      if (result && result !== test.text && result.length > 0) {
        logSuccess('翻译成功');
        passed++;
      } else {
        logError('翻译失败或返回原文');
        failed++;
      }
    } catch (error) {
      logError(`翻译异常: ${error.message}`);
      failed++;
    }

    console.log('');
  }

  console.log(`基础翻译测试结果: ${passed} 通过, ${failed} 失败`);
  return { passed, failed };
}

/**
 * 测试多语言支持
 */
async function testMultiLanguageSupport() {
  console.log('\n========================================');
  console.log('测试 2: 多语言支持');
  console.log('========================================\n');

  const testText = '多功能自动漂烫焯水油炸机大容量触屏版';
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'ru', name: 'Russian' },
    { code: 'ar', name: 'Arabic' },
  ];

  let passed = 0;
  let failed = 0;

  for (const lang of languages) {
    logInfo(`翻译到 ${lang.name} (${lang.code})`);

    try {
      const result = await translate(testText, lang.code);
      console.log(`  结果: ${result.substring(0, 80)}...`);

      if (result && result !== testText && result.length > 0) {
        logSuccess(`${lang.name} 翻译成功`);
        passed++;
      } else {
        logError(`${lang.name} 翻译失败`);
        failed++;
      }
    } catch (error) {
      logError(`${lang.name} 翻译异常: ${error.message}`);
      failed++;
    }

    console.log('');
  }

  console.log(`多语言测试结果: ${passed} 通过, ${failed} 失败`);
  return { passed, failed };
}

/**
 * 测试批量翻译
 */
async function testBatchTranslation() {
  console.log('\n========================================');
  console.log('测试 3: 批量翻译');
  console.log('========================================\n');

  const texts = [
    '多功能自动漂烫焯水油炸机大容量触屏版',
    '超大容量；自动摆臂喷料；800菜谱；语音播报',
    '肉制品、蔬菜等焯水/漂烫/去农残预处理',
    '不锈钢材质；304食品级；耐高温；易清洗',
    '智能控制系统；温度控制；时间控制；自动报警',
  ];

  logInfo(`批量翻译 ${texts.length} 个文本到英语`);

  try {
    const results = await batchTranslate(texts, 'en', (current, total) => {
      const percent = Math.round((current / total) * 100);
      console.log(`  进度: ${percent}% (${current}/${total})`);
    });

    const successCount = results.filter((r, i) => r && r !== texts[i]).length;

    console.log(`\n批量翻译完成: ${successCount}/${texts.length} 成功`);

    if (successCount === texts.length) {
      logSuccess('批量翻译全部成功');
      return { passed: 1, failed: 0 };
    } else {
      logWarning(`批量翻译部分成功: ${successCount}/${texts.length}`);
      return { passed: 0, failed: 1 };
    }
  } catch (error) {
    logError(`批量翻译异常: ${error.message}`);
    return { passed: 0, failed: 1 };
  }
}

/**
 * 测试错误处理
 */
async function testErrorHandling() {
  console.log('\n========================================');
  console.log('测试 4: 错误处理');
  console.log('========================================\n');

  const tests = [
    {
      description: '空字符串',
      input: '',
      targetLang: 'en',
    },
    {
      description: '纯空格',
      input: '   ',
      targetLang: 'en',
    },
    {
      description: 'null值',
      input: null,
      targetLang: 'en',
    },
    {
      description: 'undefined值',
      input: undefined,
      targetLang: 'en',
    },
    {
      description: '翻译到中文（应返回原文）',
      input: '多功能自动漂烫焯水油炸机',
      targetLang: 'zh-CN',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    logInfo(`测试: ${test.description}`);

    try {
      const result = await translate(test.input, test.targetLang);

      // 检查是否正确处理了错误输入
      if (!test.input || typeof test.input !== 'string' || test.input.trim() === '') {
        // 应该返回空字符串或原文
        if (result === test.input || result === '' || result === test.input?.trim()) {
          logSuccess('正确处理无效输入');
          passed++;
        } else {
          logError('未正确处理无效输入');
          failed++;
        }
      } else if (test.targetLang === 'zh-CN') {
        // 翻译到中文应该返回原文
        if (result === test.input) {
          logSuccess('正确处理中文目标语言');
          passed++;
        } else {
          logError('未正确处理中文目标语言');
          failed++;
        }
      } else {
        failed++;
      }
    } catch (error) {
      logError(`异常处理错误: ${error.message}`);
      failed++;
    }

    console.log('');
  }

  console.log(`错误处理测试结果: ${passed} 通过, ${failed} 失败`);
  return { passed, failed };
}

/**
 * 性能测试
 */
async function testPerformance() {
  console.log('\n========================================');
  console.log('测试 5: 性能测试');
  console.log('========================================\n');

  const testText = '多功能自动漂烫焯水油炸机大容量触屏版';
  const iterations = 5;

  logInfo(`执行 ${iterations} 次翻译测试...`);

  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await translate(testText, 'en');
    const end = Date.now();
    const duration = end - start;
    times.push(duration);
    console.log(`  第 ${i + 1} 次: ${duration}ms`);
  }

  const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);

  console.log('\n性能统计:');
  console.log(`  平均: ${avgTime}ms`);
  console.log(`  最快: ${minTime}ms`);
  console.log(`  最慢: ${maxTime}ms`);

  if (avgTime < 10000) {
    logSuccess('性能良好 (平均响应时间 < 10s)');
    return { passed: 1, failed: 0 };
  } else {
    logWarning('性能一般 (平均响应时间 >= 10s)');
    return { passed: 0, failed: 1 };
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('========================================');
  console.log('  Gemini API 翻译集成测试');
  console.log('========================================');
  console.log(`API 模型: ${CONFIG.gemini.model}`);
  console.log(`API 地址: ${CONFIG.gemini.apiBase}`);
  console.log(`翻译策略: ${CONFIG.strategy}`);

  const results = {
    basicTranslation: await testBasicTranslation(),
    multiLanguage: await testMultiLanguageSupport(),
    batchTranslation: await testBatchTranslation(),
    errorHandling: await testErrorHandling(),
    performance: await testPerformance(),
  };

  // 汇总结果
  console.log('\n========================================');
  console.log('  测试结果汇总');
  console.log('========================================\n');

  const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);
  const totalTests = totalPassed + totalFailed;

  console.log(`基础翻译: ${results.basicTranslation.passed}/${results.basicTranslation.passed + results.basicTranslation.failed}`);
  console.log(`多语言支持: ${results.multiLanguage.passed}/${results.multiLanguage.passed + results.multiLanguage.failed}`);
  console.log(`批量翻译: ${results.batchTranslation.passed}/${results.batchTranslation.passed + results.batchTranslation.failed}`);
  console.log(`错误处理: ${results.errorHandling.passed}/${results.errorHandling.passed + results.errorHandling.failed}`);
  console.log(`性能测试: ${results.performance.passed}/${results.performance.passed + results.performance.failed}`);

  console.log(`\n总计: ${totalPassed}/${totalTests} 通过`);

  if (totalFailed === 0) {
    console.log(`\n${colors.green}🎉 所有测试通过！${colors.reset}`);
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
  testBasicTranslation,
  testMultiLanguageSupport,
  testBatchTranslation,
  testErrorHandling,
  testPerformance,
};
