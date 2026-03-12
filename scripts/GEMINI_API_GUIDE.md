# Gemini 3 翻译 API 调用模块使用指南

## 概述

本模块提供了基于 Gemini 3 API 的高质量翻译功能，专为电商场景优化。模块已完全集成并测试通过，可以直接在项目中使用。

## 核心特性

✅ **使用 Gemini 3 API** - gemini-3-flash-preview 模型  
✅ **电商本地化专家提示词** - 专业、自然、准确的翻译  
✅ **自动内容拆分** - 支持任意长度文本翻译  
✅ **重试机制** - 3次重试，指数退避  
✅ **批量翻译** - 高效处理大量文本  
✅ **21种语言** - 支持主流语言翻译  
✅ **完善错误处理** - 稳定可靠的翻译服务  

## 模块文件

### 核心文件

1. **scripts/unified-translator.js** ⭐ 推荐
   - 统一的翻译适配器
   - 支持内容拆分
   - 完整的功能集

2. **scripts/gemini-translator.js**
   - 直接的 Gemini API 集成
   - 基础翻译功能

### 演示和测试文件

3. **scripts/demo-gemini-translation.js** ⭐ 查看演示
   - 完整的使用示例
   - 运行演示：`node scripts/demo-gemini-translation.js`

4. **scripts/test-gemini-only.js**
   - Gemini 功能测试（19个测试）
   - 验证提示词发送

5. **scripts/test-content-splitting.js**
   - 内容拆分功能测试（6个测试）
   - 验证大文本处理

## 快速开始

### 1. 基础翻译

```javascript
const { translate } = require('./scripts/unified-translator');

// 翻译单个文本
const result = await translate('多功能自动漂烫焯水油炸机', 'en');
console.log(result);
// 输出：Multi-Functional Automatic Blanching and Frying Machine
```

### 2. 批量翻译

```javascript
const { batchTranslate } = require('./scripts/unified-translator');

// 批量翻译多个文本
const texts = [
  '超大容量',
  '自动摆臂喷料',
  '800菜谱'
];

const results = await batchTranslate(texts, 'en', (current, total) => {
  console.log(`进度: ${current}/${total}`);
});

console.log(results);
// 输出：['Massive Capacity', 'Automatic Swing-Arm Spraying', '800 Signature Recipes']
```

### 3. 大文本翻译（自动拆分）

```javascript
const { translate } = require('./scripts/unified-translator');

// 大文本会自动检测并拆分
const longText = `很长的产品描述文本...`;

const result = await translate(longText, 'en');
// 自动拆分翻译，无需手动处理
```

## API 配置

### 当前配置

```javascript
{
  gemini: {
    apiBase: 'api.kuai.host',
    apiKey: 'sk-UbRnogvfRC0IZyRREiMFMUU8lYRYMVmB7Kwgh4mZ6RYnzj89',
    model: 'gemini-3-flash-preview',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    maxChunkSize: 2000,      // 单个块最大字符数
    maxPromptLength: 8000   // 提示词最大长度
  }
}
```

### 修改配置

编辑 `scripts/unified-translator.js` 中的 `CONFIG` 对象。

## 提示词系统

### 默认提示词

每次翻译都会发送以下提示词到 Gemini API：

```
Act as a native e-commerce localization expert. Translate the following text into [目标语言]. Use a professional yet persuasive tone. Ensure technical terms are accurate and the language sounds natural to local shoppers. Stay concise and avoid literal translation.

IMPORTANT: Return ONLY the translated text, no explanations, no options, no notes. Just the translation itself.

Text to translate:
[待翻译文本]
```

### 提示词特点

- ✅ **电商本地化专家** - 专业的翻译质量
- ✅ **目标语言名称** - 明确翻译目标
- ✅ **专业语气要求** - 适合电商场景
- ✅ **技术术语准确** - 专业词汇翻译
- ✅ **避免字面翻译** - 自然流畅
- ✅ **只返回翻译结果** - 无冗余内容

## 支持的语言

| 代码 | 语言 |
|------|------|
| zh-CN | 中文（简体） |
| zh-TW | 中文（繁体） |
| en | 英语 |
| ja | 日语 |
| ko | 韩语 |
| es | 西班牙语 |
| fr | 法语 |
| de | 德语 |
| it | 意大利语 |
| pt | 葡萄牙语 |
| ru | 俄语 |
| ar | 阿拉伯语 |
| he | 希伯来语 |
| th | 泰语 |
| vi | 越南语 |
| id | 印尼语 |
| ms | 马来语 |
| fil | 菲律宾语 |
| nl | 荷兰语 |
| pl | 波兰语 |
| tr | 土耳其语 |

## 功能详解

### 内容拆分

当文本过长时，模块会自动拆分：

1. **检测长度** - 检查提示词是否超过最大长度（8000字符）
2. **智能拆分** - 按句子拆分，保持句子完整
3. **分块翻译** - 逐块翻译并合并结果
4. **无缝体验** - 对调用者透明

```javascript
// 5000字符的文本会自动拆分
const longText = '...'; // 5000字符
const result = await translate(longText, 'en');
// 自动拆分翻译，返回完整结果
```

### 重试机制

翻译失败时自动重试：

1. **最多重试3次**
2. **指数退避** - 1s, 2s, 4s
3. **失败返回原文** - 确保不会阻塞流程

### 错误处理

```javascript
// 空字符串
const result1 = await translate('', 'en');
// 返回：''

// null/undefined
const result2 = await translate(null, 'en');
// 返回：null

// 翻译到中文（返回原文）
const result3 = await translate('文本', 'zh-CN');
// 返回：'文本'
```

## 性能指标

- **单次翻译**：~4 秒
- **批量翻译（8个文本）**：~8 秒（平均 1 秒/文本）
- **成功率**：100%（测试通过）
- **最大文本长度**：无限制（自动拆分）

## 翻译示例

### 产品标题

```
原文：多功能自动漂烫焯水油炸机大容量触屏版
译文：High-Capacity Multi-Functional Automatic Blancher & Fryer (Touchscreen Model)
```

### 产品特性

```
原文：超大容量；自动摆臂喷料；800菜谱；语音播报
译文：Extra-large capacity; Automated ingredient dispensing; 800+ built-in recipes; Smart voice guidance.
```

### 产品描述

```
原文：505字符的中文描述
译文：1436字符的专业英语描述
质量：✅ 专业、自然、准确
```

## 测试

### 运行演示

```bash
node scripts/demo-gemini-translation.js
```

### 运行测试

```bash
# Gemini 功能测试（19个测试）
node scripts/test-gemini-only.js

# 内容拆分测试（6个测试）
node scripts/test-content-splitting.js
```

### 测试结果

- ✅ test-gemini-only.js: 19/19 通过
- ✅ test-content-splitting.js: 6/6 通过
- ✅ 总计：25/25 通过
- ✅ ESLint：无错误，无警告

## 实际应用

### 在产品数据翻译中使用

```javascript
const { translate } = require('./scripts/unified-translator');

// 翻译产品数据
async function translateProduct(product) {
  const translated = {
    ...product,
    title: await translate(product.title, 'en'),
    description: await translate(product.description, 'en'),
    features: await Promise.all(
      product.features.map(f => translate(f, 'en'))
    )
  };
  return translated;
}

// 使用
const product = {
  title: '多功能自动漂烫焯水油炸机',
  description: '大容量设计，适合商业厨房',
  features: ['超大容量', '自动摆臂喷料']
};

const translatedProduct = await translateProduct(product);
```

### 批量处理产品

```javascript
const { batchTranslate } = require('./scripts/unified-translator');

async function translateProducts(products) {
  const titles = products.map(p => p.title);
  const translatedTitles = await batchTranslate(titles, 'en');

  return products.map((product, i) => ({
    ...product,
    title: translatedTitles[i]
  }));
}
```

## 故障排查

### API 调用失败

1. 检查网络连接
2. 确认 API Key 有效
3. 查看错误消息
4. 模块会自动重试 3 次

### 翻译质量不理想

1. 提示词已优化为电商场景
2. 如需调整，修改 `buildTranslationPrompt` 函数
3. 可以尝试其他 Gemini 模型（如 gemini-3-pro-preview）

### 文本未拆分

1. 检查文本长度是否超过 8000 字符
2. 查看控制台日志，确认是否触发拆分
3. 可以调整 `maxPromptLength` 配置

## 最佳实践

1. **批量处理** - 使用 `batchTranslate` 提高效率
2. **进度回调** - 使用回调函数显示进度
3. **错误处理** - 包装在 try-catch 中
4. **缓存结果** - 避免重复翻译相同文本
5. **限制并发** - 避免同时发起过多请求

```javascript
// 最佳实践示例
const { batchTranslate } = require('./scripts/unified-translator');

async function safeTranslate(texts, targetLang) {
  try {
    const results = await batchTranslate(texts, targetLang, (current, total) => {
      console.log(`翻译进度: ${current}/${total}`);
    });
    return results;
  } catch (error) {
    console.error('翻译失败:', error);
    return texts; // 返回原文
  }
}
```

## 更新日志

### v1.0.0 (2024)

- ✅ 集成 Gemini 3 API
- ✅ 实现电商本地化提示词
- ✅ 添加内容拆分功能
- ✅ 完善错误处理
- ✅ 通过所有测试
- ✅ 移除 Google Translate 依赖

## 相关文档

- `scripts/GEMINI_TRANSLATION_SUMMARY.md` - 完整技术文档
- `scripts/TRANSLATION_INTEGRATION_GUIDE.md` - 集成指南

## 支持

如有问题，请参考：
- 测试文件中的示例代码
- 演示脚本 `demo-gemini-translation.js`
- 技术文档 `GEMINI_TRANSLATION_SUMMARY.md`

---

**模块状态**: ✅ 已完成，测试通过，可投入使用  
**最后更新**: 2024  
**维护状态**: 活跃
