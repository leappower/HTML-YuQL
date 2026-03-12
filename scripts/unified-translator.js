#!/usr/bin/env node

/**
 * 统一翻译适配器
 *
 * 支持多种翻译服务:
 * 1. Google Translate (免费, 无需API Key)
 * 2. Gemini 3 API (高质量, 需要API Key)
 *
 * 优先使用Gemini API，失败时降级到Google Translate
 */

const https = require('https');

// 配置
const CONFIG = {
  // Gemini API配置
  gemini: {
    enabled: true,
    apiBase: 'api.kuai.host',
    apiKey: 'sk-UbRnogvfRC0IZyRREiMFMUU8lYRYMVmB7Kwgh4mZ6RYnzj89',
    model: 'gemini-3-flash-preview',
    timeout: 30000,
    maxRetries: 2,
  },
  // Google Translate配置
  google: {
    enabled: true,
    timeout: 10000,
    maxRetries: 2,
  },
  // 翻译策略: 'gemini-first' (优先Gemini) 或 'google-only' (仅Google)
  strategy: process.env.TRANSLATION_STRATEGY || 'gemini-first',
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
 * 调用Gemini API
 */
async function translateWithGemini(text, targetLang) {
  if (!CONFIG.gemini.enabled || CONFIG.strategy === 'google-only') {
    throw new Error('Gemini API disabled or strategy is google-only');
  }

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
 * 调用Google Translate API
 */
async function translateWithGoogle(text, targetLang) {
  if (!CONFIG.google.enabled) {
    throw new Error('Google Translate disabled');
  }

  return new Promise((resolve, reject) => {
    const sourceLang = 'zh-CN';
    const query = new URLSearchParams({
      client: 'gtx',
      sl: sourceLang,
      tl: targetLang,
      dt: 't',
      q: String(text || ''),
    }).toString();

    const options = {
      hostname: 'translate.googleapis.com',
      port: 443,
      path: `/translate_a/single?${query}`,
      method: 'GET',
      headers: {
        'User-Agent': 'HTML-YuQL-Translate/1.0',
      },
      timeout: CONFIG.google.timeout,
    };

    let timeoutId = null;
    let isResolved = false;

    const safeResolve = (value) => {
      if (!isResolved) {
        isResolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        resolve(value);
      }
    };

    const safeReject = (error) => {
      if (!isResolved) {
        isResolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        reject(error);
      }
    };

    timeoutId = setTimeout(() => {
      safeReject(new Error('Google Translate timeout'));
    }, options.timeout);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json[0]) {
            const translated = json[0].map(item => item[0]).filter(Boolean).join('');
            safeResolve(translated);
          } else {
            safeResolve(text);
          }
        } catch (error) {
          console.error('Google Translate parsing error:', error.message);
          safeResolve(text);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Google Translate request error:', error.message);
      safeResolve(text);
    });

    req.end();
  });
}

/**
 * 统一翻译函数
 * 优先使用Gemini，失败时降级到Google Translate
 */
async function translate(text, targetLang, options = {}) {
  const {
    retries = 0,
    maxRetries = 3,
    useGemini = true,
  } = options;

  // 输入验证
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return text || '';
  }

  // 如果已经是中文，直接返回
  if (targetLang === 'zh-CN' || targetLang === 'zh') {
    return text;
  }

  // 根据策略选择翻译服务
  if (CONFIG.strategy === 'gemini-first' && useGemini && CONFIG.gemini.enabled) {
    try {
      console.log(`[Gemini] 翻译到 ${targetLang}: ${text.substring(0, 50)}...`);
      const result = await translateWithGemini(text, targetLang);
      if (result && result !== text) {
        console.log('[Gemini] 翻译成功');
        return result;
      }
    } catch (error) {
      console.error(`[Gemini] 翻译失败: ${error.message}`);
      console.log('[Google] 降级到Google Translate...');
    }
  }

  // 使用Google Translate
  try {
    console.log(`[Google] 翻译到 ${targetLang}: ${text.substring(0, 50)}...`);
    const result = await translateWithGoogle(text, targetLang);
    console.log('[Google] 翻译成功');
    return result;
  } catch (error) {
    console.error(`[Google] 翻译失败: ${error.message}`);

    // 重试
    if (retries < maxRetries) {
      const delay = 1000 * Math.pow(2, retries);
      console.log(`等待 ${delay}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return translate(text, targetLang, { ...options, retries: retries + 1 });
    }

    // 重试耗尽，返回原始文本
    console.error('翻译失败，返回原始文本');
    return text;
  }
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
  console.log('  统一翻译适配器测试');
  console.log('========================================\n');

  console.log(`翻译策略: ${CONFIG.strategy}\n`);

  const testCases = [
    { text: '多功能自动漂烫焯水油炸机大容量触屏版', target: 'en' },
    { text: '超大容量；自动摆臂喷料；800菜谱；语音播报', target: 'en' },
    { text: '肉制品、蔬菜等焯水/漂烫/去农残预处理', target: 'en' },
  ];

  for (const test of testCases) {
    console.log(`\n测试: ${test.text.substring(0, 40)}...`);
    console.log(`目标语言: ${test.target}`);

    const result = await translate(test.text, test.target);
    console.log(`结果: ${result}`);

    if (result && result !== test.text) {
      console.log('✅ 成功');
    } else {
      console.log('❌ 失败');
    }
  }

  console.log('\n========================================');
  console.log('  测试完成');
  console.log('========================================\n');
}

// 导出
module.exports = {
  translate,
  batchTranslate,
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
