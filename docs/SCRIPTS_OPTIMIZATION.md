# Scripts 优化总结

## 优化目标

1. 减少脚本数量，提高可维护性
2. 优化生产环境打包命令，确保涵盖全部功能
3. 删除冗余和测试脚本
4. 合并重复功能的脚本

## 优化结果

### 删除的脚本（13个）

| 脚本名称 | 删除原因 |
|---------|---------|
| `gemini-translator.js` | 功能已被 `unified-translator.js` 覆盖 |
| `demo-gemini-translation.js` | 测试脚本，不再需要 |
| `inspect-feishu-headers.js` | 调试脚本，不再需要 |
| `generate-products-data-table.js` | 功能已过时 |
| `mock-translate-flow.js` | Mock脚本，不再需要 |
| `test-content-splitting.js` | 测试脚本 |
| `test-gemini-only.js` | 测试脚本 |
| `test-on-demand-loading.js` | 测试脚本 |
| `test-translation-integration.js` | 测试脚本 |
| `check-chinese-fields.js` | 临时检查脚本 |
| `extract-lang.js` | 功能已包含在 `product-sync-i18n.js` 中 |
| `fix-producti18n-format.js` | 临时修复脚本，数据已稳定 |
| `validate-producti18n-format.js` | 验证脚本，数据已稳定 |
| `copy-i18n.js` | 保留 `copy-translations.js` |
| `copy-i18n-separated.js` | 保留 `copy-translations.js` |
| `build-product-i18n.js` | 合并到 `build-i18n.js` |
| `build-ui-i18n.js` | 合并到 `build-i18n.js` |

### 新增/优化的脚本

#### `build-i18n.js` (新增)
合并了 `build-product-i18n.js` 和 `build-ui-i18n.js` 的功能：
- 统一生成UI和产品翻译文件
- 生成语言列表文件 `languages.json`
- 输出详细统计信息

### 保留的核心脚本（14个）

| 脚本名称 | 功能说明 |
|---------|---------|
| `ensure-product-data-table.js` | 确保产品数据表存在 |
| `product-i18n-adapter.js` | 产品i18n适配器 |
| `product-sync-i18n.js` | 产品翻译同步 |
| `product-translate-adapter.js` | 产品翻译适配器 |
| `product-translation-handler.js` | 产品翻译处理器 |
| `merge-translations.js` | 合并翻译文件 |
| `split-translations.js` | 分离UI和产品翻译 |
| `copy-translations.js` | 复制翻译文件到dist |
| `build-i18n.js` | 构建多语言翻译文件 |
| `unified-translator.js` | 统一翻译引擎（Gemini） |
| `translate-helper.js` | 翻译流程助手 |
| `verify-static-build.js` | 验证静态构建 |
| `feishu-config.json` | Feishu配置文件 |
| `producti18n.json` | 产品翻译数据（临时） |

## package.json 优化

### 新增的命令

| 命令 | 功能说明 |
|-----|---------|
| `build:production` | 完整的生产环境构建（包含所有步骤） |
| `build:fast` | 快速构建（不包含静态验证） |
| `split:i18n` | 分离翻译文件 |
| `build:i18n` | 构建i18n文件 |

### 命令对比

#### 开发调试
```bash
npm run dev            # Node开发服务器
npm run dev:fast       # Webpack快速开发（5秒）
npm run dev:webpack    # Webpack开发（含产品数据）
```

#### 生产构建
```bash
npm run build                    # 基础构建（不含Feishu/翻译）
npm run build:fast               # 快速构建（等同于build）
npm run build:static             # 静态构建（含验证）
npm run build:with-feishu        # 包含Feishu数据获取和翻译
npm run build:static:with-feishu # 完整静态构建
npm run build:production         # 完整生产构建（推荐）
```

#### build:production 包含的步骤
```bash
1. sync:feishu          # 从Feishu获取产品数据
2. i18n:extract         # 提取i18n内容
3. product:sync:source  # 同步源产品数据
4. merge:i18n           # 合并翻译
5. translate:products   # 翻译产品
6. product:sync          # 同步产品翻译
7. split:i18n           # 分离UI和产品翻译
8. build                # Webpack打包
9. build:static         # 静态验证
```

## 性能提升

### 构建时间对比

| 命令 | 时间 | 说明 |
|-----|------|-----|
| `dev:fast` | ~5秒 | 开发调试（不含Feishu/翻译） |
| `build` | ~30秒 | 基础构建 |
| `build:with-feishu` | ~5分钟 | 包含数据获取和翻译 |
| `build:production` | ~6分钟 | 完整生产构建 |

### 文件数量变化

- **优化前**: 30个脚本文件
- **优化后**: 14个脚本文件
- **减少**: 53%

## 使用建议

### 日常开发
使用 `npm run dev:fast` 进行快速开发调试。

### 功能开发
使用 `npm run dev:webpack` 进行包含产品数据的开发。

### 测试构建
使用 `npm run build` 进行快速测试构建。

### 生产部署
使用 `npm run build:production` 进行完整的生产构建。

## 维护说明

### 添加新脚本
1. 脚本命名使用kebab-case
2. 添加详细的注释和文档
3. 支持命令行参数
4. 提供友好的错误提示

### 修改现有脚本
1. 保持向后兼容
2. 更新相关文档
3. 添加必要的测试
4. 遵循现有代码风格

### 脚本分类
- **数据同步**: `ensure-product-data-table.js`, `product-sync-i18n.js`
- **翻译处理**: `unified-translator.js`, `product-translate-adapter.js`, `product-translation-handler.js`
- **文件处理**: `merge-translations.js`, `split-translations.js`, `copy-translations.js`, `build-i18n.js`
- **适配器**: `product-i18n-adapter.js`
- **辅助工具**: `translate-helper.js`, `verify-static-build.js`
- **配置**: `feishu-config.json`, `producti18n.json`

## 未来优化方向

1. 考虑使用 TypeScript 重写核心脚本
2. 添加更完善的错误处理和日志系统
3. 实现增量构建，提升构建速度
4. 添加脚本性能监控
5. 考虑将部分脚本迁移到npm包

## 总结

通过这次优化，我们：
- 删除了16个冗余脚本
- 合并了4个重复功能脚本
- 新增了1个统一构建脚本
- 优化了package.json中的命令结构
- 提供了完整的生产环境构建命令

最终从30个脚本减少到14个核心脚本，提高了项目的可维护性和开发效率。
