# Gemini API Translation Integration Guide

## Overview

This project has been integrated with the Gemini 3 API from `https://api.kuai.host` to provide high-quality AI-powered translations for e-commerce content.

## API Configuration

### API Details

- **API Base URL**: `https://api.kuai.host/v1`
- **API Key**: `sk-UbRnogvfRC0IZyRREiMFMUU8lYRYMVmB7Kwgh4mZ6RYnzj89`
- **Model**: `gemini-3-flash-preview`

### Available Models

The API supports the following Gemini 3 models:
- `gemini-3.1-flash-image-preview`
- `gemini-3.1-flash-lite-preview`
- `gemini-3.1-pro-preview`
- `gemini-3-pro-preview`
- `gemini-3-flash-preview` (currently used)

## Translation Scripts

### 1. Unified Translator (`scripts/unified-translator.js`)

A robust translation adapter that supports multiple translation services:

**Features:**
- Primary: Gemini 3 API (high quality)
- Fallback: Google Translate (free, no API key required)
- Automatic retry with exponential backoff
- Batch translation support
- Progress callbacks
- Error handling

**Usage:**

```javascript
const { translate, batchTranslate } = require('./scripts/unified-translator');

// Single translation
const result = await translate('多功能自动漂烫焯水油炸机', 'en');

// Batch translation
const texts = ['文本1', '文本2', '文本3'];
const results = await batchTranslate(texts, 'en', (current, total) => {
  console.log(`Progress: ${current}/${total}`);
});
```

**Configuration:**

The translation strategy can be controlled via environment variable:
```bash
export TRANSLATION_STRATEGY=gemini-first  # Default: use Gemini first
export TRANSLATION_STRATEGY=google-only   # Use only Google Translate
```

### 2. Gemini Translator (`scripts/gemini-translator.js`)

Direct integration with the Gemini 3 API:

**Features:**
- Optimized e-commerce translation prompts
- Native localization expert persona
- Retry mechanism with exponential backoff
- Connection health check
- Batch translation support

**Usage:**

```javascript
const { translateWithRetry, batchTranslate, checkConnection } = require('./scripts/gemini-translator.js');

// Check API connection
const isConnected = await checkConnection();

// Translate with retry
const result = await translateWithRetry('待翻译文本', 'en');

// Batch translate
const results = await batchTranslate(texts, 'en');
```

### 3. Integration Test Suite (`scripts/test-translation-integration.js`)

Comprehensive test suite covering all translation functionality:

**Test Suites:**
1. Basic Translation (4 test cases)
2. Multi-Language Support (8 languages)
3. Batch Translation (5 texts)
4. Error Handling (5 edge cases)
5. Performance Testing (5 iterations)

**Run Tests:**

```bash
node scripts/test-translation-integration.js
```

**Test Results:**
```
总计: 19/19 通过
🎉 所有测试通过！
```

## Supported Languages

The translation system supports the following languages:

| Code | Language |
|------|----------|
| zh-CN | Chinese (Simplified) |
| zh-TW | Chinese (Traditional) |
| en | English |
| ja | Japanese |
| ko | Korean |
| es | Spanish |
| fr | French |
| de | German |
| it | Italian |
| pt | Portuguese |
| ru | Russian |
| ar | Arabic |
| he | Hebrew |
| th | Thai |
| vi | Vietnamese |
| id | Indonesian |
| ms | Malay |
| fil | Filipino |
| nl | Dutch |
| pl | Polish |
| tr | Turkish |

## Translation Quality

### Prompt Design

The translation prompt uses a native e-commerce localization expert persona:

```
Act as a native e-commerce localization expert.
Translate the following text into [target language].
Use a professional yet persuasive tone.
Ensure technical terms are accurate and the language sounds natural to local shoppers.
Stay concise and avoid literal translation.

IMPORTANT: Return ONLY the translated text, no explanations, no options, no notes.
Just the translation itself.
```

### Performance Metrics

Based on testing with `gemini-3-flash-preview`:

- **Average Response Time**: ~4.2 seconds
- **Fastest Response**: ~4.0 seconds
- **Slowest Response**: ~4.5 seconds
- **Success Rate**: 100% (19/19 tests passing)

### Translation Quality Examples

**Original:**
```
多功能自动漂烫焯水油炸机大容量触屏版
```

**Translation (English):**
```
High-Capacity Multi-Function Automatic Blancher & Fryer (Touchscreen Model)
```

**Original:**
```
超大容量；自动摆臂喷料；800菜谱；语音播报
```

**Translation (English):**
```
Extra-large capacity; automatic swing-arm dispensing; 800+ built-in recipes; smart voice guidance.
```

## Integration with Existing i18n System

### Current State

The project currently uses:
- Static JSON translation files in `src/assets/i18n.json`
- 22 languages supported
- UI translations: ~267 keys (16KB)
- Product translations: ~2217 keys (140KB)
- Lazy loading strategy implemented (Solution B)

### Future Integration Options

To integrate AI translation with the existing system, consider these approaches:

#### Option 1: Dynamic On-Demand Translation

Use AI translation for new or missing translations:

```javascript
// In src/assets/translations.js
async function translateOnDemand(key, targetLang) {
  // Check cache first
  if (translationsCache[targetLang]?.[key]) {
    return translationsCache[targetLang][key];
  }

  // Use AI translation
  const originalText = i18nData['zh-CN'][key];
  const translated = await translate(originalText, targetLang);

  // Cache result
  if (!translationsCache[targetLang]) {
    translationsCache[targetLang] = {};
  }
  translationsCache[targetLang][key] = translated;

  return translated;
}
```

#### Option 2: Batch Translation for New Content

Generate translations for new products or features:

```javascript
// Translate new product data
async function translateNewProductData(productData, languages) {
  const translations = {};

  for (const lang of languages) {
    if (lang === 'zh-CN') continue;

    translations[lang] = await batchTranslate(
      Object.values(productData),
      lang
    );
  }

  return translations;
}
```

#### Option 3: Hybrid Approach

Combine static translations with AI fallback:

```javascript
function t(key, lang = currentLanguage) {
  // Try static translation first
  if (i18nData[lang]?.[key]) {
    return i18nData[lang][key];
  }

  // Fallback to Chinese (original)
  if (i18nData['zh-CN']?.[key]) {
    return i18nData['zh-CN'][key];
  }

  // Use AI translation as last resort
  return translateOnDemand(key, lang);
}
```

## Error Handling

### Retry Strategy

The translation system implements automatic retry with exponential backoff:

```javascript
{
  maxRetries: 3,
  retryDelay: 1000,  // Base delay in ms
  // Actual delays: 1000ms, 2000ms, 4000ms
}
```

### Fallback Mechanism

When Gemini API fails, the system automatically falls back to Google Translate:

```javascript
try {
  // Try Gemini first
  result = await translateWithGemini(text, targetLang);
} catch (error) {
  console.error('Gemini failed, falling back to Google Translate');
  result = await translateWithGoogle(text, targetLang);
}
```

### Edge Cases Handled

- Empty strings
- Null/undefined values
- Translating to source language
- Network timeouts
- API rate limits
- Invalid language codes

## Security Considerations

### API Key Management

The API key is currently stored in the script files. For production deployment:

1. **Environment Variables** (Recommended):
   ```bash
   export GEMINI_API_KEY=sk-xxxxx
   ```

2. **Configuration File**:
   ```javascript
   // config.js
   module.exports = {
     gemini: {
       apiKey: process.env.GEMINI_API_KEY,
     }
   };
   ```

3. **Secrets Management**:
   - Use AWS Secrets Manager
   - Use HashiCorp Vault
   - Use CloudBase secrets

### Rate Limiting

The translation system includes built-in rate limiting through:
- Request timeouts (30s for Gemini, 10s for Google)
- Retry delays
- Error handling for rate limit errors

## Monitoring and Logging

### Logging

The translation system provides detailed logging:

```
[Gemini] 翻译到 en: 多功能自动漂烫焯水油炸机大容量触屏版...
[Gemini] 翻译成功
```

### Metrics to Monitor

- Translation success rate
- Average response time
- API error rate
- Fallback to Google Translate frequency
- Cache hit rate

## Cost Considerations

### API Usage

- **Gemini API**: Currently using free tier API endpoint
- **Google Translate**: Free, no API key required
- **Translation volume**: Depends on usage patterns

### Optimization Strategies

1. **Caching**: Cache translations to avoid repeated API calls
2. **Batch Processing**: Use `batchTranslate()` for multiple texts
3. **Lazy Loading**: Load translations only when needed
4. **Static Pre-generation**: Pre-generate common translations during build

## Troubleshooting

### Common Issues

#### 1. Translation Returns Original Text

**Cause**: Target language is same as source language

**Solution**: Check language codes and ensure they're different

#### 2. API Timeout

**Cause**: Network issues or API response time too slow

**Solution**:
- Increase timeout in configuration
- Check network connectivity
- Verify API endpoint is accessible

#### 3. Poor Translation Quality

**Cause**: Model or prompt needs adjustment

**Solution**:
- Try different model (e.g., `gemini-3-pro-preview`)
- Adjust prompt in `buildTranslationPrompt()`
- Add domain-specific terminology

#### 4. Rate Limiting

**Cause**: Too many requests in short time

**Solution**:
- Implement request queuing
- Add delays between requests
- Use batch translation instead of individual calls

## Development Workflow

### Adding New Translations

1. **Static Translations**:
   ```bash
   # Add to i18n.json
   # Run build scripts
   npm run build:ui-i18n
   npm run build:product-i18n
   ```

2. **AI Translation**:
   ```javascript
   // Use translate() function
   const result = await translate('新文本', 'en');
   ```

### Testing

Always test translation changes:

```bash
# Run lint
npm run lint

# Run integration tests
node scripts/test-translation-integration.js

# Run specific test
node scripts/gemini-translator.js
node scripts/unified-translator.js
```

### Deployment Checklist

- [ ] Update API key configuration
- [ ] Set appropriate translation strategy
- [ ] Configure timeout values
- [ ] Test all supported languages
- [ ] Verify error handling
- [ ] Monitor initial deployment
- [ ] Set up logging and monitoring

## References

- **Gemini API Documentation**: Available at API endpoint
- **Translation Scripts**:
  - `scripts/unified-translator.js`
  - `scripts/gemini-translator.js`
  - `scripts/test-translation-integration.js`
- **Existing i18n System**:
  - `src/assets/translations.js`
  - `src/assets/i18n.json`
  - `I18N_MIGRATION_SUMMARY.md`
  - `LAZY_LOADING_TEST_GUIDE.md`

## Support

For issues or questions:
1. Check test results: `node scripts/test-translation-integration.js`
2. Review logs for error messages
3. Verify API configuration
4. Test network connectivity to `api.kuai.host`

## Version History

- **v1.0** (2026-03-12): Initial integration with Gemini 3 API
  - API configuration: `gemini-3-flash-preview`
  - Comprehensive test suite (19/19 passing)
  - Average response time: 4.2s
  - Support for 22 languages
