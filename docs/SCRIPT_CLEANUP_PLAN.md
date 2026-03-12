# 脚本文件整理方案

## 当前脚本列表（31个文件）

### 核心功能脚本（保留）
1. **ensure-product-data-table.js** - 确保产品数据表存在（从飞书获取）
2. **gemini-translator.js** - Gemini翻译核心模块
3. **product-i18n-adapter.js** - 产品i18n提取器
4. **product-sync-i18n.js** - 产品i18n同步器
5. **product-translate-adapter.js** - 产品翻译适配器
6. **product-translation-handler.js** - 产品翻译处理器
7. **merge-translations.js** - 翻译文件合并器
8. **extract-lang.js** - 语言提取工具

### 文件复制脚本（需要合并）
1. **copy-i18n.js** - 复制 i18n.json（旧方式）
2. **copy-i18n-separated.js** - 复制分离后的翻译文件
3. **copy-translations.js** - 复制翻译文件到 dist

### 构建脚本（需要合并）
1. **build-product-i18n.js** - 构建产品翻译文件
2. **build-ui-i18n.js** - 构建UI翻译文件

### 分离/分割脚本（可能需要）
1. **split-translations.js** - 分离翻译文件

### 测试脚本（保留用于开发）
1. **test-content-splitting.js** - 测试内容分割
2. **test-gemini-only.js** - 测试Gemini翻译
3. **test-on-demand-loading.js** - 测试按需加载
4. **test-translation-integration.js** - 测试翻译集成

### Demo/演示脚本（可以删除）
1. **demo-gemini-translation.js** - Gemini翻译演示

### 工具脚本（需要合并）
1. **unified-translator.js** - 统一翻译器
2. **translate-helper.js** - 翻译辅助工具
3. **mock-translate-flow.js** - 模拟翻译流程

### 验证/检查脚本（可以合并）
1. **check-chinese-fields.js** - 检查中文字段
2. **fix-producti18n-format.js** - 修复producti18n格式
3. **validate-producti18n-format.js** - 验证producti18n格式
4. **verify-static-build.js** - 验证静态构建

### 调试/检查脚本（可以删除）
1. **inspect-feishu-headers.js** - 检查飞书请求头
2. **generate-products-data-table.js** - 生成产品数据表（已被ensure替代）

### 配置文件（保留）
1. **feishu-config.json** - 飞书配置
2. **producti18n.json** - 产品i18n临时数据

---

## 整理方案

### 第一阶段：删除不需要的脚本
- ❌ demo-gemini-translation.js
- ❌ inspect-feishu-headers.js
- ❌ generate-products-data-table.js
- ❌ copy-i18n.js (旧方式)
- ❌ mock-translate-flow.js

### 第二阶段：合并相似功能的脚本

#### 合并1：构建和复制脚本
创建 `build-i18n.js` 合并以下功能：
- build-product-i18n.js
- build-ui-i18n.js
- copy-i18n-separated.js
- copy-translations.js
- split-translations.js

#### 合并2：翻译工具脚本
将以下功能整合到 `gemini-translator.js`：
- unified-translator.js
- translate-helper.js

#### 合并3：验证脚本
创建 `validate.js` 合并以下功能：
- check-chinese-fields.js
- fix-producti18n-format.js
- validate-producti18n-format.js
- verify-static-build.js

### 第三阶段：优化后的脚本列表（12个）

#### 核心功能（7个）
1. **ensure-product-data-table.js** - 确保产品数据表
2. **gemini-translator.js** - Gemini翻译器
3. **product-i18n-adapter.js** - 产品i18n提取
4. **product-sync-i18n.js** - 产品i18n同步
5. **product-translate-adapter.js** - 产品翻译适配
6. **product-translation-handler.js** - 产品翻译处理
7. **merge-translations.js** - 翻译合并

#### 构建工具（2个）
8. **build-i18n.js** - 构建和复制i18n（新合并）
9. **validate.js** - 验证工具（新合并）

#### 测试脚本（3个）
10. **test-content-splitting.js** - 内容分割测试
11. **test-gemini-only.js** - Gemini测试
12. **test-on-demand-loading.js** - 按需加载测试

#### 配置文件（2个）
13. **feishu-config.json** - 飞书配置
14. **producti18n.json** - 产品i18n数据

---

## 执行步骤

1. 创建合并后的脚本文件
2. 删除不需要的脚本文件
3. 更新 package.json 中的脚本命令
4. 测试所有构建流程
