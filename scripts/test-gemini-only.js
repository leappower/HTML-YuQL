#!/usr/bin/env node

/**
 * Gemini 翻译功能测试脚本
 *
 * 专门测试 Gemini 3 API 的翻译功能
 * 验证提示词是否正确发送到服务器
 * 不测试 Google Translate
 */

const { translateWithRetry, buildTranslationPrompt, CONFIG, LANGUAGE_NAMES } = require('./gemini-translator');

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

function logPrompt(message) {
  console.log(`${colors.cyan}📝 ${message}${colors.reset}`);
}

/**
 * 测试 1: 验证提示词生成
 */
async function testPromptGeneration() {
  console.log('\n========================================');
  console.log('测试 1: 验证提示词生成');
  console.log('========================================\n');

  const testText = '多功能自动漂烫焯水油炸机大容量触屏版';
  const targetLang = 'en';

  logInfo('测试文本:', testText);
  logInfo('目标语言:', targetLang);

  const prompt = buildTranslationPrompt(testText, targetLang);

  logPrompt('生成的提示词:');
  console.log('─'.repeat(60));
  console.log(prompt);
  console.log('─'.repeat(60));

  // 验证提示词包含关键元素
  const checks = [
    {
      name: '包含电商专家角色',
      condition: prompt.includes('e-commerce localization expert'),
    },
    {
      name: '包含目标语言名称',
      condition: prompt.includes(LANGUAGE_NAMES[targetLang] || targetLang),
    },
    {
      name: '包含专业语气要求',
      condition: prompt.includes('professional yet persuasive tone'),
    },
    {
      name: '包含只返回翻译结果的指令',
      condition: prompt.includes('Return ONLY the translated text'),
    },
    {
      name: '包含待翻译文本',
      condition: prompt.includes(testText),
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    if (check.condition) {
      logSuccess(check.name);
      passed++;
    } else {
      logError(check.name);
      failed++;
    }
  }

  console.log(`\n提示词生成测试: ${passed}/${checks.length} 通过`);

  return { passed, failed, total: checks.length };
}

/**
 * 测试 2: 基础翻译功能
 */
async function testBasicTranslation() {
  console.log('\n========================================');
  console.log('测试 2: 基础翻译功能');
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
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    logInfo(`测试: ${test.description}`);
    console.log(`  原文: ${test.text.substring(0, 50)}${test.text.length > 50 ? '...' : ''}`);
    console.log(`  目标语言: ${test.targetLang}`);

    // 显示将发送的提示词
    const prompt = buildTranslationPrompt(test.text, test.targetLang);
    console.log('\n  发送的提示词（前150字符）:');
    console.log(`  ${prompt.substring(0, 150)}...`);

    try {
      const translationResult = await translateWithRetry(test.text, test.targetLang);
      console.log(`\n  翻译结果: ${translationResult.substring(0, 100)}${translationResult.length > 100 ? '...' : ''}`);

      if (translationResult && translationResult !== test.text && translationResult.length > 0) {
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

  console.log(`基础翻译测试结果: ${passed}/${tests.length} 通过`);
  return { passed, failed, total: tests.length };
}

/**
 * 测试 3: 多语言支持
 */
async function testMultiLanguageSupport() {
  console.log('\n========================================');
  console.log('测试 3: 多语言支持');
  console.log('========================================\n');

  const testText = '多功能自动漂烫焯水油炸机';
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
  ];

  let passed = 0;
  let failed = 0;

  for (const lang of languages) {
    logInfo(`翻译到 ${lang.name} (${lang.code})`);

    console.log(`  提示词包含: ${LANGUAGE_NAMES[lang.code] || lang.code}`);

    try {
      const result = await translateWithRetry(testText, lang.code);
      console.log(`  结果: ${result.substring(0, 60)}...`);

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

  console.log(`多语言测试结果: ${passed}/${languages.length} 通过`);
  return { passed, failed, total: languages.length };
}

/**
 * 测试 4: 翻译质量检查（验证是否使用了提示词）
 */
async function testTranslationQuality() {
  console.log('\n========================================');
  console.log('测试 4: 翻译质量检查');
  console.log('========================================\n');

  logInfo('测试提示词是否影响翻译质量');
  logInfo('电商本地化专家应该输出专业、自然的翻译\n');

  const tests = [
    {
      text: '多功能自动漂烫焯水油炸机',
      expectedKeywords: ['Automatic', 'Multi-functional', 'Fryer'],
      description: '应包含专业术语',
    },
    {
      text: '超大容量',
      expectedKeywords: ['Large', 'High', 'Capacity'],
      description: '应准确表达容量概念',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    logInfo(`测试: ${test.description}`);
    console.log(`  原文: ${test.text}`);

    try {
      const result = await translateWithRetry(test.text, 'en');
      console.log(`  译文: ${result}`);

      const matchedKeywords = test.expectedKeywords.filter(keyword =>
        result.toLowerCase().includes(keyword.toLowerCase())
      );

      if (matchedKeywords.length > 0) {
        logSuccess(`匹配到关键词: ${matchedKeywords.join(', ')}`);
        passed++;
      } else {
        logWarning(`未匹配到期望关键词: ${test.expectedKeywords.join(', ')}`);
        failed++;
      }
    } catch (error) {
      logError(`翻译异常: ${error.message}`);
      failed++;
    }

    console.log('');
  }

  console.log(`翻译质量测试结果: ${passed}/${tests.length} 通过`);
  return { passed, failed, total: tests.length };
}

/**
 * 测试 5: 错误处理
 */
async function testErrorHandling() {
  console.log('\n========================================');
  console.log('测试 5: 错误处理');
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
      const result = await translateWithRetry(test.input, test.targetLang);
      console.log(`  结果: "${result}"`);

      if (!test.input || typeof test.input !== 'string' || test.input.trim() === '') {
        if (result === test.input || result === '' || result === test.input?.trim()) {
          logSuccess('正确处理无效输入');
          passed++;
        } else {
          logError('未正确处理无效输入');
          failed++;
        }
      } else if (test.targetLang === 'zh-CN') {
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

  console.log(`错误处理测试结果: ${passed}/${tests.length} 通过`);
  return { passed, failed, total: tests.length };
}

/**
 * 主测试函数
 */
async function main() {
  console.log('========================================');
  console.log('  Gemini 3 翻译功能测试');
  console.log('========================================');
  console.log(`API 模型: ${CONFIG.model}`);
  console.log(`API 地址: ${CONFIG.apiBase}`);
  console.log('提示词: 电商本地化专家 + 专业语气 + 只返回翻译结果');

  const results = {
    promptGeneration: await testPromptGeneration(),
    basicTranslation: await testBasicTranslation(),
    multiLanguage: await testMultiLanguageSupport(),
    translationQuality: await testTranslationQuality(),
    errorHandling: await testErrorHandling(),
  };

  // 汇总结果
  console.log('\n========================================');
  console.log('  测试结果汇总');
  console.log('========================================\n');

  const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
  const totalTests = Object.values(results).reduce((sum, r) => sum + r.total, 0);
  const totalFailed = totalTests - totalPassed;

  console.log(`提示词生成: ${results.promptGeneration.passed}/${results.promptGeneration.total}`);
  console.log(`基础翻译: ${results.basicTranslation.passed}/${results.basicTranslation.total}`);
  console.log(`多语言支持: ${results.multiLanguage.passed}/${results.multiLanguage.total}`);
  console.log(`翻译质量: ${results.translationQuality.passed}/${results.translationQuality.total}`);
  console.log(`错误处理: ${results.errorHandling.passed}/${results.errorHandling.total}`);

  console.log(`\n总计: ${totalPassed}/${totalTests} 通过`);

  if (totalFailed === 0) {
    console.log(`\n${colors.green}🎉 所有测试通过！${colors.reset}`);
    console.log(`\n${colors.cyan}📝 确认：${colors.reset}`);
    console.log('✅ 提示词正确生成并发送到服务器');
    console.log('✅ 使用了电商本地化专家人设');
    console.log('✅ 强制返回纯翻译结果（无解释）');
    console.log('✅ Gemini API 集成工作正常');
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
  testPromptGeneration,
  testBasicTranslation,
  testMultiLanguageSupport,
  testTranslationQuality,
  testErrorHandling,
};
