#!/usr/bin/env node

/**
 * Gemini 翻译适配器
 *
 * 仅使用 Gemini 3 API 进行高质量翻译
 * 支持内容拆分以处理大文本
 */

const https = require('https');

// 配置
const CONFIG = {
  // Gemini API配置
  gemini: {
    apiBase: 'api.kuai.host',
    apiKey: 'sk-UbRnogvfRC0IZyRREiMFMUU8lYRYMVmB7Kwgh4mZ6RYnzj89',
    model: 'gemini-3-flash-preview',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    // 内容拆分配置
    maxChunkSize: 2000, // 单个块的最大字符数
    maxPromptLength: 8000, // 提示词最大长度（包括系统提示）
  },
};

// 语言代码映射
const LANGUAGE_NAMES = {
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'en': 'English',
  'ja': 'Japanese',
  'ko': 'Korean',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'ar': 'Arabic',
  'he': 'Hebrew',
  'th': 'Thai',
  'vi': 'Vietnamese',
  'id': 'Indonesian',
  'ms': 'Malay',
  'fil': 'Filipino',
  'nl': 'Dutch',
  'pl': 'Polish',
  'tr': 'Turkish',
  'zh': 'Chinese',
};

/**
 * 将文本拆分成多个块
 * @param {string} text - 要拆分的文本
 * @param {number} maxChunkSize - 每个块的最大字符数
 * @returns {Array<string>} 拆分后的文本块数组
 */
function splitTextIntoChunks(text, maxChunkSize) {
  const chunks = [];
  let currentChunk = '';
  let currentLength = 0;

  // 按句子拆分（保持句子完整）
  const sentences = text.split(/([.。!！?？;；\n]+)/);

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceLength = sentence.length;

    // 如果单个句子超过最大长度，强制拆分
    if (sentenceLength > maxChunkSize) {
      // 先保存当前块（如果有内容）
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = '';
        currentLength = 0;
      }

      // 拆分长句子
      for (let start = 0; start < sentenceLength; start += maxChunkSize) {
        chunks.push(sentence.substring(start, start + maxChunkSize));
      }
      continue;
    }

    // 检查添加这个句子是否会超过最大长度
    if (currentLength + sentenceLength <= maxChunkSize) {
      currentChunk += sentence;
      currentLength += sentenceLength;
    } else {
      // 保存当前块，开始新块
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
      currentChunk = sentence;
      currentLength = sentenceLength;
    }
  }

  // 添加最后一个块
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * 构建翻译提示词
 */
function buildTranslationPrompt(text, targetLang) {
  const langName = LANGUAGE_NAMES[targetLang] || targetLang;
  return `Act as a native e-commerce localization expert. Translate the following text into ${langName}. Use a professional yet persuasive tone. Ensure technical terms are accurate and the language sounds natural to local shoppers. Stay concise and avoid literal translation.

IMPORTANT: Return ONLY the translated text, no explanations, no options, no notes. Just the translation itself.

Text to translate:
${text}`;
}

/**
 * 调用 Gemini API
 * @param {string} text - 要翻译的文本
 * @param {string} targetLang - 目标语言
 * @returns {Promise<string>} 翻译结果
 */
async function translateWithGemini(text, targetLang) {
  const prompt = buildTranslationPrompt(text, targetLang);

  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model: CONFIG.gemini.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const requestOptions = {
      hostname: CONFIG.gemini.apiBase,
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.gemini.apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody),
      },
      timeout: CONFIG.gemini.timeout,
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (res.statusCode === 200) {
            if (response.choices && response.choices[0] && response.choices[0].message) {
              resolve(response.choices[0].message.content.trim());
            } else {
              reject(new Error('Unexpected response format'));
            }
          } else {
            const errorMsg = response.error?.message || `HTTP ${res.statusCode}`;
            reject(new Error(`Gemini API error: ${errorMsg}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse Gemini response: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gemini API timeout'));
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * 带重试的翻译函数（支持内容拆分）
 * @param {string} text - 待翻译文本
 * @param {string} targetLang - 目标语言代码
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<string>} 翻译结果
 */
async function translateWithRetry(text, targetLang, retryCount = 0) {
  const maxRetries = CONFIG.gemini.maxRetries;

  // 输入验证
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return text || '';
  }

  // 如果已经是中文，直接返回
  if (targetLang === 'zh-CN' || targetLang === 'zh') {
    return text;
  }

  try {
    // 检查文本长度，决定是否需要拆分
    const promptLength = buildTranslationPrompt(text, targetLang).length;

    if (promptLength > CONFIG.gemini.maxPromptLength) {
      // 文本过长，需要拆分翻译
      return await translateInChunks(text, targetLang);
    } else {
      // 文本长度合适，直接翻译
      const result = await translateWithGemini(text, targetLang);
      return result;
    }
  } catch (error) {
    console.error(`[Gemini] 翻译失败 (尝试 ${retryCount + 1}/${maxRetries + 1}): ${error.message}`);

    if (retryCount < maxRetries) {
      // 指数退避
      const delay = CONFIG.gemini.retryDelay * Math.pow(2, retryCount);
      console.log(`[Gemini] 等待 ${delay}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return translateWithRetry(text, targetLang, retryCount + 1);
    }

    // 重试耗尽，返回原始文本
    console.error(`[Gemini] 翻译失败，返回原始文本: ${text.substring(0, 50)}...`);
    return text;
  }
}

/**
 * 分块翻译大文本
 * @param {string} text - 要翻译的文本
 * @param {string} targetLang - 目标语言
 * @returns {Promise<string>} 合并后的翻译结果
 */
async function translateInChunks(text, targetLang) {
  const chunks = splitTextIntoChunks(text, CONFIG.gemini.maxChunkSize);
  console.log(`[Gemini] 文本过长 (${text.length} 字符)，拆分为 ${chunks.length} 个块进行翻译...`);

  const translatedChunks = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < chunks.length; i++) {
    try {
      const translated = await translateWithGemini(chunks[i], targetLang);
      translatedChunks.push(translated);
      successCount++;
    } catch (error) {
      console.error(`[Gemini] 块 ${i + 1}/${chunks.length} 翻译失败: ${error.message}`);
      // 翻译失败时保留原文
      translatedChunks.push(chunks[i]);
      failCount++;
    }
  }

  // 合并所有翻译块
  const result = translatedChunks.join('');
  console.log(`[Gemini] 拆分翻译完成: ${successCount} 成功, ${failCount} 失败, 总长度: ${result.length} 字符`);
  return result;
}

/**
 * 统一翻译函数
 * @param {string} text - 待翻译文本
 * @param {string} targetLang - 目标语言代码
 * @returns {Promise<string>} 翻译结果
 */
async function translate(text, targetLang) {
  return translateWithRetry(text, targetLang, 0);
}

/**
 * 批量翻译
 */
async function batchTranslate(texts, targetLang, progressCallback) {
  const results = [];
  const total = texts.length;

  for (let i = 0; i < total; i++) {
    try {
      const result = await translate(texts[i], targetLang);
      results.push(result);

      if (progressCallback) {
        progressCallback(i + 1, total, texts[i], result);
      }
    } catch (error) {
      console.error(`批量翻译第 ${i + 1} 项失败:`, error.message);
      results.push(texts[i]);
    }
  }

  return results;
}

/**
 * 主函数：测试翻译
 */
async function main() {
  console.log('========================================');
  console.log('  Gemini 翻译适配器测试');
  console.log('========================================\n');

  const testCases = [
    { text: '多功能自动漂烫焯水油炸机大容量触屏版', target: 'en', desc: '短文本' },
    { text: '超大容量；自动摆臂喷料；800菜谱；语音播报', target: 'en', desc: '中等文本' },
    { text: '肉制品、蔬菜等焯水/漂烫/去农残预处理', target: 'en', desc: '产品应用' },
  ];

  for (const test of testCases) {
    console.log(`\n测试 (${test.desc}): ${test.text.substring(0, 30)}...`);
    console.log(`目标语言: ${test.target}`);

    const result = await translate(test.text, test.target);
    console.log(`结果: ${result}`);

    if (result && result !== test.text) {
      console.log('✅ 成功');
    } else {
      console.log('❌ 失败');
    }
  }

  // 测试大文本拆分
  console.log('\n========================================');
  console.log('测试大文本拆分翻译');
  console.log('========================================\n');

  const longText = '多功能自动漂烫焯水油炸机大容量触屏版。超大容量设计，适合商业厨房使用。自动摆臂喷料系统，确保调料均匀分布。内置800道智能菜谱，涵盖中餐、西餐、日料等多种菜系。智能语音播报功能，实时提示烹饪进度和操作提示。304不锈钢材质，食品级安全标准。耐高温设计，使用寿命长。易清洗设计，维护简单。智能温度控制系统，精确控温，温度范围30-200℃。智能时间控制系统，可定时烹饪，解放双手。自动报警系统，异常情况及时提醒。安全防护设计，防干烧、防过热、防漏电。';

  console.log(`原始文本长度: ${longText.length} 字符`);
  const translationResult = await translate(longText, 'en');
  console.log(`翻译结果长度: ${translationResult.length} 字符`);
  console.log(`\n翻译结果:\n${translationResult}`);

  console.log('\n========================================');
  console.log('  测试完成');
  console.log('========================================\n');
}

// 导出
module.exports = {
  translate,
  translateWithRetry,  // 添加导出
  batchTranslate,
  splitTextIntoChunks,
  translateInChunks,
  translateWithGemini,
  CONFIG,
  LANGUAGE_NAMES,
};

// 如果直接运行
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}
