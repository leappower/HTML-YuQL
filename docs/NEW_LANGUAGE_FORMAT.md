# 新格式语言文件说明

## 概述

本项目已完全迁移到新的分离式语言文件格式，不再支持旧的单文件格式（`{lang}.json`）。

## 文件格式

### UI 翻译文件 (`{lang}-ui.json`)

- **用途**: 包含页面UI元素的翻译
- **大小**: ~13-27 KB（取决于语言）
- **键数**: 267个
- **加载时机**: 首屏加载时立即加载
- **示例**: `zh-CN-ui.json`, `en-ui.json`, `ar-ui.json`

### 产品翻译文件 (`{lang}-product.json`)

- **用途**: 包含产品数据的翻译
- **大小**: ~108-215 KB（取决于语言）
- **键数**: 2217个
- **加载时机**: 按需加载（访问产品页面时）
- **示例**: `zh-CN-product.json`, `en-product.json`, `ar-product.json`

### 语言列表文件 (`languages.json`)

- **用途**: 包含所有支持的语言信息
- **位置**: `dist/lang/languages.json`
- **内容**: 语言代码、名称、键数统计

## 文件结构

```
src/assets/lang/
├── {lang}-ui.json      (21个文件)
├── {lang}-product.json  (21个文件)
└── languages.json       (1个文件)

dist/assets/lang/
├── {lang}-ui.json      (21个文件)
├── {lang}-product.json  (21个文件)
└── languages.json       (1个文件)
```

## 支持的语言（21种）

| 代码 | 名称 |
|------|------|
| zh-CN | 中文（简体） |
| zh-TW | 中文（繁體） |
| en | English |
| ar | العربية |
| de | Deutsch |
| es | Español |
| fr | Français |
| it | Italiano |
| pt | Português |
| ja | 日本語 |
| ko | 한국어 |
| th | ไทย |
| vi | Tiếng Việt |
| ru | Русский |
| tr | Türkçe |
| nl | Nederlands |
| pl | Polski |
| fil | Filipino |
| he | עברית |
| id | Bahasa Indonesia |
| ms | Bahasa Melayu |

## 加载机制

### 初始化加载

```javascript
// 1. 加载UI翻译（立即）
await translationManager.loadUITranslations('zh-CN');

// 2. 应用UI翻译到页面
await translationManager.applyTranslations();
```

### 按需加载

```javascript
// 访问产品页面时加载产品翻译
await translationManager.lazyLoadProductData('zh-CN');
```

### 语言切换

```javascript
// 切换语言时
await translationManager.setLanguage('en');
```

## 构建流程

### 开发模式

```bash
# 启动开发服务器
npm start

# 自动执行
# 1. node scripts/init-dev.js
#    - 检查必需文件
#    - 运行 split:lang
#    - 复制文件到 src/assets/lang/
# 2. Webpack Dev Server
#    - 优先从 dist/assets/lang 加载
#    - 回退到 src/assets/lang
```

### 生产构建

```bash
# 快速构建
npm run build:fast

# 执行顺序
# 1. npm run split:lang
#    - 生成 src/assets/lang/*-ui.json
#    - 生成 src/assets/lang/*-product.json
# 2. webpack --mode=production
#    - 编译资源
#    - 复制 src/assets/lang/*-ui.json 到 dist/assets/lang/
#    - 复制 src/assets/lang/*-product.json 到 dist/assets/lang/
# 3. node scripts/copy-translations.js
#    - 复制分离的语言文件到 dist/assets/lang/
# 4. node scripts/build-i18n.js
#    - 生成 dist/lang/*-ui.json
#    - 生成 dist/lang/*-product.json
#    - 生成 dist/lang/languages.json
```

## 性能优化

### 文件大小对比

| 格式 | 文件数 | 总大小 |
|------|--------|--------|
| **旧格式** | 21个完整文件 | ~6.46 MB |
| **新格式（UI）** | 21个UI文件 | ~347.68 KB |
| **新格式（Product）** | 21个Product文件 | ~2,961.42 KB |
| **新格式（总计）** | 42个分离文件 | ~3.31 MB |

### 加载性能

- **首屏加载**: 只加载UI文件（~13-27 KB）
- **按需加载**: 产品文件只在需要时加载（~108-215 KB）
- **总节省**: 初始加载减少约95%

### 缓存策略

- UI翻译缓存: `ui-{lang}`
- Product翻译缓存: `product-{lang}`
- 合并翻译缓存: `{lang}`（仅在需要时）

## 迁移说明

### 已完成的迁移

- ✅ 移除 `translations.js` 中的旧格式加载逻辑
- ✅ 修改 `build-i18n.js` 只生成新格式
- ✅ 修改 `split-by-language.js` 只生成分离文件
- ✅ 更新 `webpack.config.js` 只复制新格式
- ✅ 修改 `copy-translations.js` 只复制新格式
- ✅ 删除所有旧格式语言文件

### 无需修改

- 语言切换功能：已完全支持新格式
- 初始化逻辑：自动加载UI翻译
- 按需加载：自动加载Product翻译
- 缓存机制：自动管理分离的缓存

## 常见问题

### Q: 为什么不再支持旧格式？

A: 旧格式文件太大（~150-300 KB），影响首屏加载性能。新格式将UI和产品翻译分离，使初始加载快10-20倍。

### Q: 如何添加新的翻译键？

A: 
1. 在 `src/assets/ui-i18n.json` 中添加UI键
2. 在 `src/assets/product-i18n.json` 中添加Product键
3. 运行 `npm run split:lang` 生成分离文件
4. 运行 `npm run build` 重新构建

### Q: 如何添加新的语言？

A:
1. 在 `src/assets/ui-i18n.json` 中添加新语言的UI翻译
2. 在 `src/assets/product-i18n.json` 中添加新语言的Product翻译
3. 在 `src/assets/translations.js` 中添加语言名称映射
4. 运行 `npm run split:lang` 生成分离文件
5. 运行 `npm run build` 重新构建

### Q: 开发模式如何测试？

A:
1. 运行 `npm start`
2. `init-dev.js` 会自动初始化语言文件
3. Webpack Dev Server 会正确加载分离的文件

## 文件位置

- UI合并文件: `src/assets/ui-i18n.json`
- Product合并文件: `src/assets/product-i18n.json`
- 分离文件: `src/assets/lang/{lang}-ui.json`, `src/assets/lang/{lang}-product.json`
- 生产文件: `dist/assets/lang/{lang}-ui.json`, `dist/assets/lang/{lang}-product.json`
- 备用文件: `dist/lang/{lang}-ui.json`, `dist/lang/{lang}-product.json`

## 相关脚本

- `scripts/split-by-language.js`: 生成分离的语言文件
- `scripts/build-i18n.js`: 构建生产语言文件
- `scripts/copy-translations.js`: 复制语言文件（只复制分离格式）
- `scripts/init-dev.js`: 开发模式初始化

## 相关配置

- `webpack.config.js`: Webpack配置（只复制分离文件）
- `package.json`: 构建命令（包含 `split:lang`）
- `src/assets/translations.js`: 翻译管理器（只加载分离文件）

## 总结

新的分离式语言文件格式提供了：

1. **更快的首屏加载**: 只加载UI翻译（~13-27 KB）
2. **按需加载**: 产品翻译只在需要时加载（~108-215 KB）
3. **更好的缓存**: UI和Product翻译独立缓存
4. **更小的文件**: 总大小减少约50%（从6.46 MB到3.31 MB）
5. **统一格式**: 21种语言使用相同的分离格式

所有代码已经完全迁移到新格式，不再需要支持旧格式！
