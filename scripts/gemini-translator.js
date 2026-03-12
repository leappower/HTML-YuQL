#!/usr/bin/env node

/**
 * Gemini 3 翻译API调用模块
 *
 * 使用 Gemini 3 模型进行高质量翻译
 * API地址: https://api.kuai.host
 * 模型: gemini-3 开头的模型
 */

const https = require('https');

// 配置
const CONFIG = {
  apiBase: 'api.kuai.host',
  apiKey: 'sk-UbRnogvfRC0IZyRREiMFMUU8lYRYMVmB7Kwgh4mZ6RYnzj89',
  model: 'gemini-3-flash-preview',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
};

// 语言代码映射（Gemini API可能需要）
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
 * 构建翻译提示词
 * @param {string} text - 待翻译文本
 * @param {string} targetLang - 目标语言代码
 * @returns {string} 提示词
 */
function buildTranslationPrompt(text, targetLang) {
  const langName = LANGUAGE_NAMES[targetLang] || targetLang;
  return `Act as a native e-commerce localization expert. Translate the following text into ${langName}. Use a professional yet persuasive tone. Ensure technical terms are accurate and the language sounds natural to local shoppers. Stay concise and avoid literal translation.

IMPORTANT: Return ONLY the translated text, no explanations, no options, no notes. Just the translation itself.

Text to translate:
${text}`;
}

/**
 * 调用Gemini API
 * @param {string} prompt - 提示词
 * @param {Object} options - 选项
 * @returns {Promise<string>} 翻译结果
 */
async function callGeminiAPI(prompt, options = {}) {
  const {
    temperature = 0.3,
    maxTokens = 2000,
  } = options;

  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model: CONFIG.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        }
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const requestOptions = {
      hostname: CONFIG.apiBase,
      port: 443,
      path: '/v1/chat/completions', // OpenAI兼容格式
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody),
      },
      timeout: CONFIG.timeout,
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
            // OpenAI兼容格式响应
            if (response.choices && response.choices[0] && response.choices[0].message) {
              resolve(response.choices[0].message.content.trim());
            } else {
              reject(new Error(`Unexpected response format: ${JSON.stringify(response)}`));
            }
          } else {
            const errorMsg = response.error?.message || `HTTP ${res.statusCode}`;
            reject(new Error(`API error: ${errorMsg}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * 带重试的翻译函数
 * @param {string} text - 待翻译文本
 * @param {string} targetLang - 目标语言代码
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<string>} 翻译结果
 */
async function translateWithRetry(text, targetLang, retryCount = 0) {
  const maxRetries = CONFIG.maxRetries;

  // 输入验证
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return text || '';
  }

  // 如果已经是目标语言，直接返回
  if (targetLang === 'zh-CN' || targetLang === 'zh') {
    return text;
  }

  try {
    const prompt = buildTranslationPrompt(text, targetLang);
    const result = await callGeminiAPI(prompt);
    return result;
  } catch (error) {
    console.error(`翻译失败 (尝试 ${retryCount + 1}/${maxRetries + 1}):`, error.message);

    if (retryCount < maxRetries) {
      // 指数退避
      const delay = CONFIG.retryDelay * Math.pow(2, retryCount);
      console.log(`等待 ${delay}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return translateWithRetry(text, targetLang, retryCount + 1);
    }

    // 重试耗尽，返回原始文本
    console.error('翻译失败，返回原始文本');
    return text;
  }
}

/**
 * 批量翻译
 * @param {Array<string>} texts - 文本数组
 * @param {string} targetLang - 目标语言代码
 * @param {Function} progressCallback - 进度回调
 * @returns {Promise<Array<string>>} 翻译结果数组
 */
async function batchTranslate(texts, targetLang, progressCallback) {
  const results = [];
  const total = texts.length;

  for (let i = 0; i < total; i++) {
    try {
      const result = await translateWithRetry(texts[i], targetLang);
      results.push(result);

      if (progressCallback) {
        progressCallback(i + 1, total, texts[i], result);
      }
    } catch (error) {
      console.error(`批量翻译第 ${i + 1} 项失败:`, error.message);
      results.push(texts[i]); // 返回原始文本
    }
  }

  return results;
}

/**
 * 检查API连接
 * @returns {Promise<boolean>} 是否连接成功
 */
async function checkConnection() {
  try {
    const testText = 'Hello';
    const result = await translateWithRetry(testText, 'zh-CN');
    return result && result !== testText;
  } catch (error) {
    console.error('API连接检查失败:', error.message);
    return false;
  }
}

/**
 * 主函数：测试翻译
 */
async function main() {
  console.log('========================================');
  console.log('  Gemini 3 翻译测试');
  console.log('========================================\n');

  const testText = '多功能自动漂烫焯水油炸机大容量触屏版';
  const targetLang = 'en';

  console.log(`原始文本: ${testText}`);
  console.log(`目标语言: ${targetLang}\n`);

  console.log('正在翻译...');
  const result = await translateWithRetry(testText, targetLang);

  console.log(`\n翻译结果: ${result}`);

  if (result && result !== testText) {
    console.log('\n✅ 翻译成功！');
  } else {
    console.log('\n❌ 翻译失败');
  }
}

// 导出函数
module.exports = {
  translateWithRetry,
  batchTranslate,
  checkConnection,
  buildTranslationPrompt,
  CONFIG,
  LANGUAGE_NAMES,
};

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}
